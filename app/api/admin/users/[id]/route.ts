import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await requireAdmin()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { banned } = await request.json()

    if (id === session.userId) {
     return NextResponse.json({ error: 'Vous ne pouvez pas vous bannir vous-même'}, { status: 400 })   
    }

    const updated = await prisma.user.update({
        where: { id: id },
        data: { banned: !!banned },
    })

    // Si banni, supprimer toutes ses sessions
    if (banned) {
        await prisma.session.deleteMany({ where: { userId: id } })
    }

    return NextResponse.json({ success: true, banned: updated.banned })
}