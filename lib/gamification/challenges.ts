import { prisma }    from '@/lib/prisma'
import { addPoints } from './pointsService'

export const CHALLENGES = [
  { id: 'reserve_3',   label: 'Réserver 3 cadeaux',      target: 3,  reward: 30 },
  { id: 'share_list',  label: 'Partager une liste',       target: 1,  reward: 15 },
  { id: 'add_5_items', label: 'Ajouter 5 items à une liste', target: 5, reward: 25 },
  { id: 'login_5',     label: 'Se connecter 5 jours',     target: 5,  reward: 20 },
] as const

export type ChallengeId = typeof CHALLENGES[number]['id']

function getWeekStart(): Date {
  const now  = new Date()
  const day  = now.getDay() // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day // ajuster au lundi
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Attribuer les défis de la semaine si pas encore fait
export async function ensureWeeklyChallenges(userId: string) {
  const weekStart = getWeekStart()

  const existing = await prisma.weeklyChallenge.findMany({
    where: { userId, weekStart },
  })
  if (existing.length >= CHALLENGES.length) return existing

  // Choisir 3 défis aléatoires parmi les disponibles
  const shuffled  = [...CHALLENGES].sort(() => Math.random() - 0.5).slice(0, 3)
  const existingIds = new Set(existing.map(c => c.challengeId))

  for (const c of shuffled) {
    if (!existingIds.has(c.id)) {
      await prisma.weeklyChallenge.create({
        data: {
          userId,
          weekStart,
          challengeId: c.id,
          target:      c.target,
          rewardPts:   c.reward,
          progress:    0,
        },
      }).catch(() => {}) // ignore si déjà créé en race
    }
  }

  return prisma.weeklyChallenge.findMany({ where: { userId, weekStart } })
}

// Incrémenter la progression d'un défi
export async function progressChallenge(userId: string, challengeId: ChallengeId, by = 1) {
  const weekStart = getWeekStart()

  const challenge = await prisma.weeklyChallenge.findUnique({
    where: { userId_weekStart_challengeId: { userId, weekStart, challengeId } },
  })
  if (!challenge || challenge.completed) return

  const newProgress = Math.min(challenge.progress + by, challenge.target)
  const completed   = newProgress >= challenge.target

  await prisma.weeklyChallenge.update({
    where: { userId_weekStart_challengeId: { userId, weekStart, challengeId } },
    data:  { progress: newProgress, completed },
  })

  if (completed) {
    await addPoints(userId, 'badge_earned', challenge.rewardPts)
  }
}