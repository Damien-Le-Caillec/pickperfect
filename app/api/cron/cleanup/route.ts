import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Purge quotidienne (appelée par le conteneur cron) :
// durées de conservation annoncées dans la politique de confidentialité
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')
    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const now     = new Date()
    const oneYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const [sessions, resetTokens, logs, views] = await Promise.all([
        prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
        prisma.passwordResetToken.deleteMany({
            where: { OR: [{ expiresAt: { lt: now } }, { used: true }] },
        }),
        // Logs d'accès : 1 an
        prisma.activityLog.deleteMany({ where: { createdAt: { lt: oneYear } } }),
        // Adresses IP des vues de listes : anonymisées après 1 an
        prisma.listView.updateMany({
            where: { createdAt: { lt: oneYear }, ipAddress: { not: null } },
            data:  { ipAddress: null },
        }),
    ])

    return NextResponse.json({
        sessions:    sessions.count,
        resetTokens: resetTokens.count,
        logs:        logs.count,
        views:       views.count,
    })
}
