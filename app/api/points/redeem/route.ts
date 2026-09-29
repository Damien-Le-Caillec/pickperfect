import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { spendPoints } from "@/lib/gamification/pointsService";
import { REWARDS } from "@/lib/points/catalog";
import { hasReward, REWARD_REASON_PREFIX } from "@/lib/points/rewards";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const SUCCESS_MESSAGES: Record<string, string> = {
    r1:  'Couleurs premium débloquées ! Choisissez-les dans votre profil.',
    r2:  'Badge « Supporter » ajouté à votre profil !',
    r3:  'Étoile premium activée à côté de votre nom !',
    r4:  'Vous pouvez désormais créer autant de listes privées que vous voulez.',
    r6:  'Vos QR codes de partage utilisent maintenant votre couleur de profil.',
    r7:  'Profil premium activé !',
    r11: 'Demande enregistrée ! Nous vous contacterons par email pour la livraison.',
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
        return NextResponse.json({ error: 'Récompense introuvable' }, { status: 404 })
    }

    if (reward.status === 'soon') {
        return NextResponse.json({ error: 'Cette récompense sera bientôt disponible' }, { status: 400 })
    }

    // Les récompenses automatiques ne s'achètent qu'une fois
    if (reward.status === 'auto' && await hasReward(session.userId, reward.id)) {
        return NextResponse.json({ error: 'Vous avez déjà cette récompense' }, { status: 400 })
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
        `${REWARD_REASON_PREFIX}${reward.id}`
    )

    if (!success) {
        return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 })
    }

    // Effets immédiats
    if (reward.id === 'r2') {
        const already = await prisma.userBadge.findFirst({ where: { userId: session.userId, badgeId: 'supporter' } })
        if (!already) {
            await prisma.userBadge.create({
                data: {
                    userId:      session.userId,
                    badgeId:     'supporter',
                    badgeName:   'Supporter',
                    description: 'Badge exclusif obtenu avec des points',
                },
            })
        }
    }

    // Récompenses manuelles : ticket visible dans Admin > Feedbacks
    if (reward.status === 'manual') {
        const user = await prisma.user.findUnique({
            where:  { id: session.userId },
            select: { email: true, name: true },
        })
        await prisma.feedback.create({
            data: {
                userId:  session.userId,
                type:    'REWARD',
                message: `Récompense à traiter : ${reward.name} (${reward.cost} pts) — ${user?.name ?? ''} <${user?.email ?? '?'}>`,
                page:    '/points',
            },
        })
    }

    await prisma.activityLog.create({
        data: {
            userId: session.userId,
            action: 'REWARD_REDEEMED',
            metadata: JSON.stringify({ rewardId: reward.id, rewardName: reward.name, cost: reward.cost }),
        },
    })

    return NextResponse.json({
        success: true,
        message: SUCCESS_MESSAGES[reward.id] ?? `${reward.name} débloquée !`,
        reward: { id: reward.id, name: reward.name },
    })
}
