import { prisma } from '@/lib/prisma'
import { BADGES_CONFIG } from '@/lib/points/catalog'

export const POINTS_TABLE = {
  item_reservation:      5,
  list_created:         10,
  list_complete_10:     20,
  list_share:           10,
  daily_login:           2,
  daily_login_streak_7: 15,
  affiliate_purchase:  100,
  signup_bonus:         50,
} as const

export type PointReason = keyof typeof POINTS_TABLE

export async function addPoints(
  userId:    string,
  reason:    PointReason | string,
  override?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const points = override ?? (POINTS_TABLE as Record<string, number>)[reason] ?? 0
  if (points <= 0) return

  await prisma.$transaction([
    prisma.pointTransaction.create({
      data: {
        userId,
        type:     'EARNED',
        points,
        reason,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    }),
    prisma.points.upsert({
      where:  { userId },
      create: {
        userId,
        totalPoints:     points,
        availablePoints: points,
        experience:      points,
        nextLevelExp:    100,
      },
      update: {
        totalPoints:     { increment: points },
        availablePoints: { increment: points },
        experience:      { increment: points },
      },
    }),
  ])

  await checkLevelUp(userId)
  await checkBadges(userId)
}

export async function spendPoints(
  userId: string,
  points: number,
  reason: string
): Promise<boolean> {
  // Décrément conditionnel : évite un solde négatif en cas de double clic
  return prisma.$transaction(async tx => {
    const updated = await tx.points.updateMany({
      where: { userId, availablePoints: { gte: points } },
      data:  {
        availablePoints: { decrement: points },
        spentPoints:     { increment: points },
      },
    })
    if (updated.count === 0) return false

    await tx.pointTransaction.create({
      data: { userId, type: 'SPENT', points, reason },
    })
    return true
  })
}

export async function processDailyLogin(userId: string): Promise<number> {
  const p   = await prisma.points.findUnique({ where: { userId } })
  const now = new Date()

  if (p?.lastDailyLogin) {
    const last    = p.lastDailyLogin
    const sameDay =
      last.getFullYear() === now.getFullYear() &&
      last.getMonth()    === now.getMonth()    &&
      last.getDate()     === now.getDate()

    if (sameDay) return 0

    // Vérifier si la connexion d'hier existait (streak)
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const wasYesterday =
      last.getFullYear() === yesterday.getFullYear() &&
      last.getMonth()    === yesterday.getMonth()    &&
      last.getDate()     === yesterday.getDate()

    const newStreak = wasYesterday ? (p.currentStreak ?? 0) + 1 : 1

    await prisma.points.upsert({
      where:  { userId },
      create: { userId, lastDailyLogin: now, currentStreak: 1, longestStreak: 1 },
      update: {
        lastDailyLogin: now,
        currentStreak:  newStreak,
        longestStreak:  { set: Math.max(p.longestStreak ?? 0, newStreak) },
      },
    })

    // Bonus streak 7 jours
    if (newStreak === 7) {
      await addPoints(userId, 'daily_login_streak_7')
    }

  } else {
    await prisma.points.upsert({
      where:  { userId },
      create: { userId, lastDailyLogin: now, currentStreak: 1, longestStreak: 1 },
      update: { lastDailyLogin: now, currentStreak: 1, longestStreak: 1 },
    })
  }

  await addPoints(userId, 'daily_login')
  return POINTS_TABLE.daily_login
}

async function checkLevelUp(userId: string): Promise<void> {
  const p = await prisma.points.findUnique({ where: { userId } })
  if (!p || p.level >= 50) return

  if (p.experience >= p.nextLevelExp) {
    const newNextExp = Math.floor(100 * Math.pow(1.5, p.level))
    await prisma.points.update({
      where: { userId },
      data:  { level: { increment: 1 }, nextLevelExp: newNextExp },
    })
  }
}

async function checkBadges(userId: string): Promise<void> {
  const p = await prisma.points.findUnique({ where: { userId } })
  if (!p) return

  const existing = await prisma.userBadge.findMany({
    where:  { userId },
    select: { badgeId: true },
  })
  const earned = new Set(existing.map(b => b.badgeId))

  const toCheck = BADGES_CONFIG.map(b => ({ ...b, cond: b.condition(p) }))

  for (const badge of toCheck) {
    if (!earned.has(badge.id) && badge.cond) {
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId:     badge.id,
          badgeName:   badge.name,
          description: badge.desc,
        },
      })
    }
  }
}
// Attribue un badge lié à une action précise (idempotent)
export async function awardBadge(userId: string, badgeId: string): Promise<void> {
  const badge = BADGES_CONFIG.find(b => b.id === badgeId)
  if (!badge) return
  const existing = await prisma.userBadge.findFirst({ where: { userId, badgeId } })
  if (existing) return
  await prisma.userBadge.create({
    data: { userId, badgeId, badgeName: badge.name, description: badge.desc },
  })
}
