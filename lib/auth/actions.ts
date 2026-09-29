'use server'

import { z }        from 'zod'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  createUser,
  validateUser,
  createSession,
  deleteSession,
} from './sqlite-auth'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { sendEmail } from '@/lib/email/mailer'
import { welcomeEmail } from '@/lib/email/templates'
import { verifyUrl } from './emailVerification'
import { addPoints, processDailyLogin } from '@/lib/gamification/pointsService'
import { ensureWeeklyChallenges, progressChallenge } from '@/lib/gamification/challenges'

// N'autorise que les redirections internes (évite les redirections vers un autre site)
function safeRedirect(value: FormDataEntryValue | null): string {
  const target = typeof value === 'string' ? value : ''
  return target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard'
}

// ---- Schémas de validation ----
const RegisterSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  name:     z.string().min(2, 'Minimum 2 caractères').optional(),
})

const LoginSchema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

// ---- Helpers ----
async function setSessionCookie(sessionId: string, expiresAt: Date) {
  const cookieStore = await cookies()
  cookieStore.set('auth_session', sessionId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires:  expiresAt,
    path:     '/',
  })
}

// ---- Action : Inscription ----
export async function registerAction(
  _prevState: unknown,
  formData: FormData
) {
  const raw = {
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
    name:     (formData.get('name')    as string) || undefined,
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headerStore = await headers()
  const ip = getClientIp(headerStore)
  const limit = checkRateLimit(`register:${ip}`, { limit: 3, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) {
    return { error: "Trop de tentatives d'inscription. Réessayez plus tard." }
  }

  try {
    const user    = await createUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name
    )
    const session = await createSession(user.id, {
      userAgent: headerStore.get('user-agent') ?? undefined,
      ipAddress: ip,
    })
    await setSessionCookie(session.id, session.expiresAt)

    // Bonus de bienvenue (+ badge "Premier pas" via checkBadges)
    await addPoints(user.id, 'signup_bonus').catch(() => {})

    const tpl = welcomeEmail(user.name ?? '', user.unsubscribeToken ?? undefined, verifyUrl(user.id, user.email))
    sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html })
      .catch(err => console.error('Welcome email error:', err))
  } catch (err) {
    return { error: (err as Error).message || "Erreur lors de l'inscription" }
  }

  redirect(safeRedirect(formData.get('redirect')))
}

// ---- Action : Connexion ----
export async function loginAction(
  _prevState: unknown,
  formData: FormData
) {
  const raw = {
    email:    formData.get('email')    as string,
    password: formData.get('password') as string,
  }

  const parsed = LoginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headerStore = await headers()
  const ip = getClientIp(headerStore)
  const limit = checkRateLimit(`login:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })
  if (!limit.allowed) {
    return { error: 'Trop de tentatives. Réessayez dans quelques minutes.' }
  }

  const user = await validateUser(parsed.data.email, parsed.data.password)
  if (!user) {
    return { error: 'Email ou mot de passe incorrect' }
  }

  const session = await createSession(user.id, {
    userAgent: headerStore.get('user-agent') ?? undefined,
    ipAddress: ip,
  })
  await setSessionCookie(session.id, session.expiresAt)

  const dailyPoints = await processDailyLogin(user.id).catch(() => 0)
  await ensureWeeklyChallenges(user.id).catch(() => {})
  if (dailyPoints > 0) await progressChallenge(user.id, 'login_5').catch(() => {})

  redirect(safeRedirect(formData.get('redirect')))
}

// ---- Action : Déconnexion ----
export async function logoutAction() {
  const cookieStore = await cookies()
  const sessionId   = cookieStore.get('auth_session')?.value

  if (sessionId) {
    await deleteSession(sessionId)
    cookieStore.delete('auth_session')
  }

  redirect('/')
}