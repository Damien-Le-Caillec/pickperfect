import { NextResponse }      from 'next/server'
import { cookies }           from 'next/headers'
import { validateSession }   from '@/lib/auth/sqlite-auth'

export async function GET() {
  const cookieStore = await cookies()
  const sessionId   = cookieStore.get('auth_session')?.value

  if (!sessionId) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const session = await validateSession(sessionId)

  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  // Ne jamais renvoyer le mot de passe hashé
  const { hashedPassword: _, ...safeUser } = session.user as any

  return NextResponse.json({ success: true, user: safeUser })
}