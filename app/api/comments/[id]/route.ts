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

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const comment = await prisma.comment.findUnique({ where: { id: id } })
    if (!comment) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    if (comment.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.comment.delete({ where: { id: id } })
    return NextResponse.json({ success: true })
}