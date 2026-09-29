import { prisma } from '@/lib/prisma'

// Nombre de listes privées autorisées sans la récompense "Listes illimitées" (r4)
export const FREE_PRIVATE_LIST_LIMIT = 5

export const REWARD_REASON_PREFIX = 'reward_redeemed:'

// Identifiants des récompenses déjà échangées par l'utilisateur
export async function getUnlockedRewards(userId: string): Promise<string[]> {
    const txns = await prisma.pointTransaction.findMany({
        where:  { userId, reason: { startsWith: REWARD_REASON_PREFIX } },
        select: { reason: true },
    })
    return [...new Set(txns.map(t => t.reason.slice(REWARD_REASON_PREFIX.length)))]
}

export async function hasReward(userId: string, rewardId: string): Promise<boolean> {
    const count = await prisma.pointTransaction.count({
        where: { userId, reason: `${REWARD_REASON_PREFIX}${rewardId}` },
    })
    return count > 0
}
