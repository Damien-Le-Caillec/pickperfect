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
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Connectez-vous', needsAuth: true }, { status: 401 })
    }

    const invite = await prisma.groupInviteToken.findUnique({ where: { token: token } })
    if (!invite) return NextResponse.json({ error: 'Lien invitable' }, { status: 404 })
    if (invite.expiresAt && invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 })
    }
    if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
        return NextResponse.json({ error: 'Ce lien a atteint sa limite' }, { status: 410 })
    }

    const existing = await prisma.userGroup.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId: invite.groupId } },
    })

    if (!existing) {
        await prisma.$transaction([
            prisma.userGroup.create({
                data: { userId: session.userId, groupId: invite.groupId, role: 'MEMBER' },
            }),
            prisma.groupInviteToken.update({
                where: { token: token },
                data: { usedCount: { increment: 1 } },
            }),
        ])
    }

    return NextResponse.json({ groupId: invite.groupId })
}