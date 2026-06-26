import { NextResponse, userAgent } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";

async function getCurrentSessionId() {
    const cookieStore = await cookies()
    return cookieStore.get('auth_session')?.value
}

export async function GET() {
    const sessionId = await getCurrentSessionId()
    if (!sessionId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const session = await validateSession(sessionId)
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const sessions = await prisma.session.findMany({
        where: { userId: session.userId },
        orderBy: { lastUsedAt: 'desc' },
    })

    return NextResponse.json(
        sessions.map(s => ({
            id: s.id,
            userAgent: s.userAgent,
            ipAddress: s.ipAddress,
            createdAt: s.createdAt,
            lastUsedAt: s.lastUsedAt,
            expiresAt: s.expiresAt,
            isCurrent: s.id === sessionId,
        }))
    )
}