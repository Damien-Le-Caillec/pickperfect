import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { userInfo } from "os";
import { success } from "zod";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const list = await prisma.list.findUnique({ where: { id } })
    if (!list || list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.listMember.delete({
        where: { userId_listId: { userId, listId: id } },
    })

    return NextResponse.json({ success: true })
}