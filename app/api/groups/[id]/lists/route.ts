import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma'
import { validateSession } from "@/lib/auth/sqlite-auth";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const { listId } = await request.json()
    const { id } = await params

    // Vérifier que l'utilisateur est membre du groupe et propriétaire de la liste
    const [membership, list] = await Promise.all([
        prisma.userGroup.findUnique({
            where: { userId_groupId: { userId: session.userId, groupId: id } },
        }),
        prisma.list.findUnique({ where: { id: listId } }),
    ])

    if (!membership) return NextResponse.json({ error: 'Vous n\'êtes pas membre de ce groupe' }, { status: 403 })
    if (!list || list.userId !== session.userId) {
        return NextResponse.json({ error: 'Vous n\'êtes pas propriétaire de cette liste' }, { status: 403 })
    }

    const link = await prisma.listGroup.upsert({
        where: { listId_groupId: { listId, groupId: id } },
        create: { listId, groupId: id, addedById: session.userId },
        update: {},
    })

    return NextResponse.json(link)
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const { listId } = await request.json()
    const { id } = await params

    const list = await prisma.list.findUnique({ where: { id: listId } })
    if (!list || list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.listGroup.delete({
        where: { listId_groupId: { listId, groupId: id } },
    })

    return NextResponse.json({ success: true })
}