import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params 
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('auth_session')?.value
    if (!sessionId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const session = await validateSession(sessionId)
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const target = await prisma.session.findUnique({ where: { id: id } })
    if (!target || target.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.session.delete({ where: { id: id } })

    return NextResponse.json({ success: true })
}