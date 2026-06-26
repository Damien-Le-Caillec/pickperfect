import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createUser, createSession } from '@/lib/auth/sqlite-auth'
import { checkRateLimit } from '@/lib/security/rateLimit'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/mailer'
import { welcomeEmail } from '@/lib/email/templates'

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  name:     z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Rate limiting
  const headerStore = await headers()
  const ip =
    headerStore.get('x-forwarded-for') ??
    headerStore.get('x-real-ip') ??
    'unknow'

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

    const tpl = welcomeEmail(parsed.data.name ?? '')
    sendEmail({ to: parsed.data.email, subject: tpl.subject, html: tpl.html })
      .catch(err => console.error('Welcome email error:', err))

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erreur serveur' },
      { status: 400 }
    )
  }
}