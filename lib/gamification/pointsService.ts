import { metadata } from "@/app/legal/cgu/page";
import { prisma } from "@/lib/prisma";
import { no } from "zod/locales";

// Table des points par action
export const POINTS_TABLE = {
    item_reservation: 5,
    list_created: 10,
    list_complete_10: 20, // Liste avec 10+ items
    list_share: 10,
    daily_login: 2,
    daily_login_streak_7: 15, // Bonus 7 jours consécutifs
    affiliate_purchase: 100, // + 1pt/€
} as const

export type PointReason = keyof typeof POINTS_TABLE

// Ajouter des points
export async function addPoints(
    userId: string,
    reason: PointReason | string,
    override?: number // Pour les cas variables (ex: 1pt/€)
    metadata?: Record<string, unknown>
): Promise<void> {
    const points = override ?? (POINTS_TABLE as any)[reason] ?? 0
    if (points <= 0) return

    await prisma.$transaction([
        prisma.pointTransaction.create([
            data: {
                userId,
                type: 'EARNED',
                points,
                reason, 
                metadata: metadata ? JSON.stringify(metadata) : null,
            },
        ]),
        prisma.points.upsert({
            where: { userId },
            create: {
                userId,
                totalPoints: points,
                availablePoints: points,
                experience: points,
                nextLevelExp: 100,
            },
            update: {
                totalPoints: { increment: points },
                availablePoints: { increment: points },
                experience: { increment: points },
            },
        }),
    ])

    await checkLevelUp(userId)
    await checkBadges(userId)
}

// Dépenser des points
export async function spendPoints(
    userId: string,
    points: number,
    reason: string
): Promise<boolean> {
    const p = await prisma.points.findUnique({ where: { userId } })
    if (!p || p.availablePoints < points) return false

    await prisma.$transaction([
        prisma.pointTransaction.create({
            data: { userId, type: 'SPENT', points, reason },
        }),
        prisma.points.update({
            where: { userId },
            data: {
                availablePoints: { decrement: points },
                spentPoints: { increment: points },
            },
        }),
    ])

    return true
}

// Connexion quotidienne
export async function processDailyLogin(userId: string):
Promise<number> {
    const p = await prisma.points.findUnique({ where: { userId } })

    const now = new Date()

    if (p?.lastDailyLogin) {
        const last = p.lastDailyLogin
        const sameDay = 
            last.getFullYear() === now.getFullYear() &&
            last.getMonth() === now.getMonth() &&
            last.getDate() === now.getDate()

        if (sameDay) return 0 // Déjà connecté aujourd'hui
    }

    // Mettre à jour la date
    await prisma.points.upsert({
        where: { userId },
        create: { userId, lastDailyLogin: now },
        update: { lastDailyLogin: now },
    })

    await addPoints(userId, 'daily_login')
    return POINTS_TABLE.daily_login
}

// Level up
async function checkLevelUp(userId: string): Promise<void> {
    const p = await prisma.points.findUnique({ where: { userId } })
    if (!p || p.level >= 50) return

    if (p.experience >= p.nextLevelExp) {
        const newNextExp = Math.floor(100 * Math.pow(1.5, p.level))
        await prisma.points.update({
            where: { userId }, 
            data: {
                level: { increment: 1 },
                nextLevelExp: newNextExp,
            },
        })
    }
}

// Vérifier et débloquer les badges
async function checkBadges(userId: string): Promise<void> {
    const p = await prisma.points.findUnique({ where: { userId } })
    if (!p) return

    const existing = await prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
    })
    const earned = new Set(existing.map(b => b.badgeId))

    const toCheck = [
        {
            id: 'first_step',
            name: 'Premier pas',
            desc: 'Bienvenue sur PickPerfect',
            cond: true,
        },
        {
            id: 'first_reservation',
            name: 'Généreux',
            desc: 'Première réservation effectuée',
            cond: p.totalPoints >= 5,
        },
        {
            id:   'bronze',
            name: 'Bronze',
            desc: '100 points gagnés',
            cond: p.totalPoints >= 100,
        },
        {
            id:   'silver',
            name: 'Argent',
            desc: '500 points gagnés',
            cond: p.totalPoints >= 500,
        },
        {
            id:   'gold',
            name: 'Or',
            desc: '1000 points gagnés',
            cond: p.totalPoints >= 1000,
        },
        {
            id:   'level5',
            name: 'Niveau 5',
            desc: 'Atteindre le niveau 5',
            cond: p.level >= 5,
        },
    ]

    for (const badge of toCheck) {
        
    }
}