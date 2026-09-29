import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";

export async function POST() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('auth_session')?.value
    if (!sessionId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const session = await validateSession(sessionId)
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    await prisma.session.deleteMany({
        where: { userId: session.userId, NOT: { id: sessionId } },
    })

    return NextResponse.json({ success: true })
}