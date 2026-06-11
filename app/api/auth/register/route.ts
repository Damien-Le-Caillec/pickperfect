import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { createUser, createSession } from '@/lib/auth/sqlite-auth'
import { z }                         from 'zod'

const Schema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  name:     z.string().optional(),
})

export async function POST(request: NextRequest) {
  const body   = await request.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  try {
    const user    = await createUser(
      parsed.data.email,
      parsed.data.password,
      parsed.data.name
    )
    const session = await createSession(user.id)

    const cookieStore = await cookies()
    cookieStore.set('auth_session', session.id, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires:  session.expiresAt,
      path:     '/',
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erreur serveur' },
      { status: 400 }
    )
  }
}