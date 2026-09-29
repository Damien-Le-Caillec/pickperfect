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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { note } = await request.json()

    const item = await prisma.item.findUnique({
        where: { id },
        include: { list: true },
    })

    if (!item) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })

    // Seul le propriétaire de la liste peut confirmer la réception
    if (item.list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const updated = await prisma.item.update({
        where : { id },
        data: { receivedAt: new Date(), receivedNote: note ?? null },
    })

    return NextResponse.json(updated)
}