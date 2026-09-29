import { NextRequest } from 'next/server'

// Autorise un appel de tâche planifiée :
// - Vercel Cron envoie "Authorization: Bearer <CRON_SECRET>"
// - le conteneur cron (Docker) passe ?token=<CRON_SECRET>
export function isCronAuthorized(request: NextRequest): boolean {
    const secret = process.env.CRON_SECRET
    if (!secret) return false
    const bearer = request.headers.get('authorization')
    const token  = request.nextUrl.searchParams.get('token')
    return bearer === `Bearer ${secret}` || token === secret
}
