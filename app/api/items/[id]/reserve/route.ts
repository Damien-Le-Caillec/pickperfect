import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { addPoints, awardBadge } from "@/lib/gamification/pointsService";
import { sendEmail } from "@/lib/email/mailer";
import { reservationEmail } from "@/lib/email/templates";
import { CreateNotification } from "@/lib/notifications";
import { progressChallenge, ensureWeeklyChallenges } from '@/lib/gamification/challenges'

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const item = await prisma.item.findUnique({
        where: { id: id },
        include: { list: { include: { user: true } } },
    })

    if (!item) {
        return NextResponse.json({ error: 'Item introuvable'}, { status: 404 })
    }

    if (item.list.userId === session.userId) {
        return NextResponse.json(
            { error: 'Vous ne pouvez pas réserver sur votre propre liste' },
            { status: 403 }
        )
    }

    if (item.reserved) {
        return NextResponse.json(
            { error: 'Ce cadeau est déjà réservé' },
            { status: 409 }
        )
    }

    let message: string | undefined
    let anonymous: boolean = false
    try {
        const body = await request.json()
        message = body.message?.trim() || undefined
        anonymous = body.anonymous === true
    } catch {}

    await prisma.$transaction([
        prisma.reservation.create({
            data: {
                itemId: id,
                userId: session.userId,
                message,
                anonymous,
                status: 'CONFIRMED',
            },
        }),
        prisma.item.update({
            where: { id: id },
            data: {
                reserved: true,
                reservedById: session.userId,
                reservedAt: new Date(),
            },
        }),
    ])

    // Points réservation
    await addPoints(session.userId, 'item_reservation').catch(() => {})
    await awardBadge(session.userId, 'first_reservation').catch(() => {})

    await ensureWeeklyChallenges(session.userId).catch(() => {})
    await progressChallenge(session.userId, 'reserve_3').catch(() => {})
    // Récupérer le propriétaire et l'item pour l'email
    const fullItem = await prisma.item.findUnique({
        where: { id: id },
        include: {
            list: { include: { user: true } },
            reservedBy: { select: { name: true } },
        },
    })

    if (fullItem && !anonymous) {
        const tpl = reservationEmail(
            fullItem.list.user.name ?? 'vous',
            session.user.name ?? 'Quelqu\'un',
            fullItem.title,
            fullItem.list.title,
            fullItem.list.id,
            anonymous
        )
        sendEmail({
            to: fullItem.list.user.email,
            notification: true,
            subject: tpl.subject,
            html: tpl.html,
        }).catch(err => console.error('Reservation email error:', err))

        if (!anonymous) {
            await CreateNotification({
                userId: item.list.userId,
                type: 'RESERVATION',
                title: 'Cadeau réservé !',
                message: `${session.user.name ?? 'Quelqu\'un'} a réservé "${item.title}"`,
                link: `/lists/${item.list.id}`,
            }).catch(() => {})
        }
    }

    return NextResponse.json({ success: true, message: 'Réservé ! +5 points' })
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const item = await prisma.item.findUnique({ where: { id: id } })

    if (!item || !item.reserved) {
        return NextResponse.json({ error: 'Aucune réservation à annuler' }, { status: 404 })
    }

    if (item.reservedById !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.$transaction([
        prisma.reservation.updateMany({
            where: { itemId: id, userId: session.userId, status: 'CONFIRMED' },
            data: { status: 'CANCELLED', canceledAt: new Date() },
        }),
        prisma.item.update({
            where: { id: id },
            data: { reserved: false, reservedById: null, reservedAt: null },
        }),
    ])

    return NextResponse.json({ success: true })
}