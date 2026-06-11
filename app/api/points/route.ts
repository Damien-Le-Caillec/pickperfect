import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = session.userId

    const [points, badges, transactions] = await Promise.all([
        prisma.points.findUnique({ where: { userId } }),
        prisma.userBadge.findMany({
            where: { userId },
            orderBy: { earnedAt: 'desc' },
        }),
        prisma.pointTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
    ])

    return NextResponse.json({ points, badges, transactions })
}