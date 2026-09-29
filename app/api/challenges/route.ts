import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth/sqlite-auth'
import { CHALLENGES, ensureWeeklyChallenges } from '@/lib/gamification/challenges'

// GET — défis de la semaine en cours
export async function GET() {
    const cookieStore = await cookies()
    const sessionId   = cookieStore.get('auth_session')?.value
    const session     = sessionId ? await validateSession(sessionId) : null
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const challenges = await ensureWeeklyChallenges(session.userId)

    return NextResponse.json(challenges.map(c => ({
        id:        c.id,
        label:     CHALLENGES.find(x => x.id === c.challengeId)?.label ?? c.challengeId,
        progress:  c.progress,
        target:    c.target,
        rewardPts: c.rewardPts,
        completed: c.completed,
    })))
}
