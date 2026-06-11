import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { success } from "zod";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

// POST - Réserver un item
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const item = await prisma.item.findUnique({
        where: { id: params.id },
        include: { list: true },
    })

    // Le propriétaire de la liste ne peut pas réserver ses propres items
    if (item?.list.userId === session.userId) {
        return NextResponse.json(
            { error: 'Vous ne pouvez pas réserver sur votre propre liste' },
            { status: 403 }
        )
    }

    if (item?.reserved) {
        return NextResponse.json(
            { error: 'Ce cadeau est déja réservé' },
            { status: 409 }
        )
    }

    // Lire le body optionnel (message, anonymat)
    let message: string | undefined
    let anonymous: boolean = false
    try {
        const body = await request.json()
        message = body.message?.trim() || undefined
        anonymous = body.anonymous === true
    } catch {}

    // Transaction : créer réservation + marquer l'item
    await prisma.$transaction([
        prisma.reservation.create({
            data: {
                itemId: params.id,
                userId: session.userId,
                message,
                anonymous,
                status: 'CONFIRMED',
            },
        }),
        prisma.item.update({
            where: { id: params.id },
            data: {
                reserved: true,
                reservedById: session.userId,
                reservedAt: new Date(),
            },
        }),
    ])

    // Points pour la réservation
    await prisma.points.update({
        where: { userId: session.userId },
        data: {
            totalPoints: { increment: 5 },
            availablePoints: { increment: 5 },
            experience: { increment: 5 },
        },
    }).catch(() => {}) // Pas de plantage si pas encore de points

    return NextResponse.json({ success: true, message: 'Réservé ! +5 points' })
}

// DELETE - Annuler une réservation
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const item = await prisma.item.findUnique({
        where: { id: params.id },
    })

    if (!item || !item.reserved) {
        return NextResponse.json({ error: 'Aucune réservation à annuler' }, { status: 404 })
    }

    if (item.reservedById !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.$transaction([
        prisma.reservation.updateMany({
            where: {
                itemId: params.id,
                userId: session.userId,
                status: 'CONFIRMED',
            },
            data: {
                status: 'CANCELLED',
                canceledAt: new Date(),
            },
        }),
        prisma.item.update({
            where: { id: params.id },
            data: {
                reserved: false,
                reservedById: null,
                reservedAt: null,
            },
        }),
    ])

    return NextResponse.json({ success: true })
}