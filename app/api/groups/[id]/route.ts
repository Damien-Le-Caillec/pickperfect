import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    const { id } = await params
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const group = await prisma.group.findUnique({
        where: { id: id },
        include: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
            lists: {
                include: {
                    list: {
                        include: { _count: {select: {items: true} }, items: { select: { reserved: true } } },
                    },
                },
            },
        },
    })

    if (!group) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    
    const isMember = group.members.some(m => m.userId === session.userId)
    if (!isMember) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    return NextResponse.json(group)
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    const { id } = await params
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const group = await prisma.group.findUnique({ where: { id: id } })
    if (!group || group.ownerId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.group.delete({ where: { id: id } })
    return NextResponse.json({ succes: true })
}