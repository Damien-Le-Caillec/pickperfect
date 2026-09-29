import { NextResponse }      from 'next/server'
import { cookies }           from 'next/headers'
import { validateSession }   from '@/lib/auth/sqlite-auth'
import { processDailyLogin }   from '@/lib/gamification/pointsService'
import { ensureWeeklyChallenges, progressChallenge } from '@/lib/gamification/challenges'

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

  // Visite quotidienne (idempotent : 0 point si déjà compté aujourd'hui)
  const dailyPoints = await processDailyLogin(session.userId).catch(() => 0)
  if (dailyPoints > 0) {
    await ensureWeeklyChallenges(session.userId).catch(() => {})
    await progressChallenge(session.userId, 'login_5').catch(() => {})
  }

  // Ne jamais renvoyer le mot de passe hashé
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hashedPassword, ...safeUser } = session.user

  return NextResponse.json({ success: true, user: safeUser })
}