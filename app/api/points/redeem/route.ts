import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { spendPoints } from "@/lib/gamification/pointsService";
import { REWARDS } from "@/lib/points/catalog";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('authè_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status : 401 })
    }

    const { rewardId } = await request.json()

    // Trouver la récompense dans le catalogue statique
    const reward = REWARDS.find(r => r.id === rewardId)
    if (!reward) {
        return NextResponse.json({ error: 'Recompense introuvable' }, { status: 404 })
    }

    // Vérifier le solde
    const points = await prisma.points.findUnique({
        where: { userId: session.userId },
    })

    if (!points || points.availablePoints < reward.cost) {
        return NextResponse.json(
            { error: `Solde insuffisant. Il vous manque ${reward.cost - (points?.availablePoints ?? 0)} points.` },
            { status: 400 }
        )
    }

    // Dépenser les points
    const success = await spendPoints(
        session.userId,
        reward.cost,
        `reward_redeemed:${reward.id}`
    )

    if (!success) {
        return NextResponse.json({ error: 'Erreur lors de l\'échange' }, { status: 500 })
    }

    // Logger la récompense (pour traitement manuel ou futur automatique)
    await prisma.activityLog.create({
        data: {
            userId: session.userId,
            action: 'REWARD_REDEEMED',
            metadata: JSON.stringify({ rewardId: reward.id, rewardName: reward.name, cost: reward.cost }),
        },
    })

    return NextResponse.json({
        success: true,
        message: `${reward.name} débloquée ! Nous vous contacterons sous 48h pour la mise en place.`,
        reward: { id: reward.id, name: reward.name },
    })
}