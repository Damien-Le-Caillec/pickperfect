import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateSession } from "@/lib/auth/sqlite-auth";
import { addPoints } from '@/lib/gamification/pointsService'
import { FREE_PRIVATE_LIST_LIMIT, hasReward } from '@/lib/points/rewards'

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const CreateSchema = z.object({
    title: z.string().min(1, 'Titre requis').max(100),
    description: z.string().max(500).optional(),
    privacy: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).default('UNLISTED'),
    eventDate: z.string().optional(),
    budget: z.number().positive().optional(),
})

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const lists = await prisma.list.findMany({
        where: { userId: session.userId },
        include: {
            _count: { select: {items: true } },
            items: { select: { reserved: true } },
        },
        orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(lists)
}

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 }
        )
    }

    if (parsed.data.privacy === 'PRIVATE') {
        const privateCount = await prisma.list.count({ where: { userId: session.userId, privacy: 'PRIVATE' } })
        if (privateCount >= FREE_PRIVATE_LIST_LIMIT && !(await hasReward(session.userId, 'r4'))) {
            return NextResponse.json({ error: `Limite de ${FREE_PRIVATE_LIST_LIMIT} listes privées atteinte. Débloquez « Listes illimitées » dans la page Points.` }, { status: 403 })
        }
    }

    const list = await prisma.list.create({
        data: {
            ...parsed.data,
            userId: session.userId,
            eventDate: parsed.data.eventDate
                ? new Date(parsed.data.eventDate)
                : undefined,
        },
    })

    await prisma.activityLog.create({
        data: { userId: session.userId, listId: list.id, action: 'LIST_CREATED' },
    })

    // Points création liste
    await addPoints(session.userId, 'list_created').catch(() => {})

    return NextResponse.json(list, { status: 201 })
}