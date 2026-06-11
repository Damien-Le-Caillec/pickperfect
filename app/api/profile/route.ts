import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { success, z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { error } from "console";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

// GET /api/profile - Données complètes du profil
export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié'}, { status: 401 })
    }

    const userId = session.userId

    const [user, points, badges, listCount, reservationCount] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                loginCount: true,
                lastLoginAt: true,
            },
        }),
        prisma.points.findUnique({ where: { userId } }),
        prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' }, take: 4 }),
        prisma.list.count({ where: { userId } }),
        prisma.reservation.count({ where: { userId } }),
    ])

    return NextResponse.json({
        user, 
        points,
        badges,
        stats: { listCount, reservationCount},
    })
}

// PATCH /api/profile - Modifier nom et/ou email
const UpdateSchema = z.object({
    name: z.string().min(1).max(60).optional(),
    email: z.string().email('Email invalide').optional(),
})

export async function PATCH(request: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = UpdateSchema.safeParse(body)

    if (!parsed.success) {
        return NextResponse.json(
            {error: parsed.error.issues[0].message },
            { status: 400 }
        )
    }

    // Si changement d'email, vérifier qu'il n'est pas déjà pris
    if (parsed.data.email) {
        const existing = await prisma.user.findFirst({
            where: {
                email: parsed.data.email.toLowerCase().trim(),
                NOT: { id: session.userId },
            },
        })
        if (existing) {
            return NextResponse.json(
                { error: 'Cet email est déjà utilisé par un autre compte' },
                { status: 409 }
            )
        }
    }

    const updated = await prisma.user.update({
        where: { id: session.userId },
        data: {
            ...(parsed.data.name ? { name: parsed.data.name.trim () } : {}),
            ...(parsed.data.email ? { email: parsed.data.email.toLowerCase().trim() } : {}),
        },
        select: { id: true, name: true, email: true},
    })

    return NextResponse.json({ success: true, user: updated })
}