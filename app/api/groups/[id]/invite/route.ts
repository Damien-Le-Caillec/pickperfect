import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import crypto from 'crypto';

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const { id } = await params

    const group = await prisma.group.findUnique({ where: { id: id } })
    if (!group || group.ownerId !== session.userId) {
        return NextResponse.json({ error: 'non autorisé' }, { status: 403 })
    }

    const token = crypto.randomBytes(20).toString('hex')

    await prisma.groupInviteToken.create({
        data: {
            groupId: id,
            token,
            createdBy: session.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/join/${token}`
    return NextResponse.json({ inviteUrl })
}

// Retirer un membre
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const { userId } = await request.json()

    const { id } = await params

    const group = await prisma.group.findUnique({ where: { id: id } })
    if (!group) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // Le propriétaire peut retirer n'importe qui . un membre peut se retirer lui-même
    const isOwner = group.ownerId === session.userId
    const isSelf = userId === session.userId
    if (!isOwner && !isSelf) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (isSelf && isOwner) {
        return NextResponse.json({ error: 'Le propriétaire ne peut pas quitter le groupe' }, { status: 400 })
    }

    await prisma.userGroup.delete({
        where: { userId_groupId: { userId, groupId: id } },
    })

    return NextResponse.json({ success: true })
}