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

    const reservations = await prisma.reservation.findMany({
        where: { userId: session.userId, status: 'CONFIRMED' },
        include: {
            item: {
                include: {
                    list: { select: {id: true, title: true, eventDate: true, user: { select: { name: true } } } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reservations)
}