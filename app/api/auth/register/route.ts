import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createUser, createSession } from '@/lib/auth/sqlite-auth'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/mailer'
import { welcomeEmail } from '@/lib/email/templates'
import { verifyUrl } from '@/lib/auth/emailVerification'
import { addPoints } from '@/lib/gamification/pointsService'

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  name:     z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Rate limiting
  const headerStore = await headers()
  const ip = getClientIp(headerStore)

  const ua = headerStore.get('user-agent') ?? undefined

  const limit = checkRateLimit(`register:${ip}`, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  })

  if (!limit.allowed) {
    return NextResponse.json(
      {error: 'Trop de tentatives d\'inscription. Réessayez plus tard.' },
      { status: 429 }
    )
  }

  // Validation
  const body = await request.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  // Création
  try {
    const user = await createUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name
    )
    const session = await createSession(user.id, { userAgent: ua, ipAddress: ip })

    const cookieStore = await cookies()
    cookieStore.set('auth_session', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
      path: '/',
    })

    await addPoints(user.id, 'signup_bonus').catch(() => {})

    const tpl = welcomeEmail(parsed.data.name ?? '', user.unsubscribeToken ?? undefined, verifyUrl(user.id, user.email))
    sendEmail({ to: parsed.data.email, subject: tpl.subject, html: tpl.html })
      .catch(err => console.error('Welcome email error:', err))

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Erreur serveur' },
      { status: 400 }
    )
  }
}