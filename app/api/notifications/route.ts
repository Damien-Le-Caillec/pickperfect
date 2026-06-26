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
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
        }),
        prisma.notification.count({
            where: { userId: session.userId, read: false },
        }),
    ])

    return NextResponse.json({ notifications, unreadCount })
}