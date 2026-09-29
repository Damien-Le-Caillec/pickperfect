import { NextRequest, NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/security/cron'
import { GET as birthdays } from '../birthdays/route'
import { GET as secretSanta } from '../secret-santa/route'
import { GET as cleanup } from '../cleanup/route'

// Point d'entrée unique appelé une fois par jour par Vercel Cron (voir vercel.json)
export const maxDuration = 60

export async function GET(request: NextRequest) {
    if (!isCronAuthorized(request)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const results: Record<string, unknown> = {}
    for (const [name, task] of Object.entries({ birthdays, secretSanta, cleanup })) {
        try {
            const res = await task(request)
            results[name] = await res.json()
        } catch (err) {
            console.error(`Cron ${name} error:`, err)
            results[name] = { error: (err as Error).message }
        }
    }
    return NextResponse.json(results)
}
