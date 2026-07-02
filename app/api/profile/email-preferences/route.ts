import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import crypto from 'crypto';

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

// GET - Récupérer les préférences
export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { emailNotifications: true, unsubscribeToken: true },
    })

    return NextResponse.json(user)
}

// PATCH - Mettre à jour les préférences
export async function PATCH(request: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { emailNotifications } = await request.json()

    const user = await prisma.user.update({
        where: { id: session.userId },
        data: {
            emailNotifications,
            unsubscribeToken: emailNotifications
                ? undefined
                : crypto.randomBytes(32).toString('hex'),
        },
        select: { emailNotifications: true, unsubscribeToken: true },
    })

    return NextResponse.json(user)
}