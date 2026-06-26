import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

const SALT_ROUNDS = 12

// ---- Créer un utilisateur ----
export async function createUser(
  email: string,
  password: string,
  name?: string
) {
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (existing) {
    throw new Error('Un compte existe déjà avec cet email.')
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      email:          email.toLowerCase().trim(),
      hashedPassword,
      name:           name?.trim() || null,
      // Initialiser le solde de points à la création
      points: {
        create: {},
      },
    },
  })

  return user
}

// ---- Vérifier email + mot de passe ----
export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (!user)         return null
  if (user.banned)   return null

  const valid = await bcrypt.compare(password, user.hashedPassword)
  if (!valid) return null

  // Mettre à jour la date de dernière connexion
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      loginCount:  { increment: 1 },
    },
  })

  return user
}

// ---- Créer une session ----
export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string}
) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      lastUsedAt: new Date(),
    },
  })
}

// ---- Valider une session existante ----
export async function validateSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where:   { id: sessionId },
    include: { user: true },
  })

  if (!session) return null

  // Session expirée → on la supprime
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } })
    return null
  }

  return session
}

// ---- Supprimer une session ----
export async function deleteSession(sessionId: string) {
  await prisma.session
    .delete({ where: { id: sessionId } })
    .catch(() => {}) // Ne pas planter si la session n'existe pas
}

// ---- Récupérer l'utilisateur connecté (depuis les cookies) ----
export async function getCurrentUser() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const sessionId   = cookieStore.get('auth_session')?.value

  if (!sessionId) return null

  const session = await validateSession(sessionId)
  return session?.user ?? null
}