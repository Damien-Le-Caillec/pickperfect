import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import { CreateNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')
    if (token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const now      = new Date()
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let   sent     = 0

    const santas = await prisma.secretSanta.findMany({
        where:   { status: 'ACTIVE' },
        include: {
        group:       { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        assignments: { include: { wishes: true } },
        },
    })

    for (const santa of santas) {
        const memberMap   = Object.fromEntries(santa.group.members.map(m => [m.userId, m.user]))
        const launchedAt  = santa.launchedAt ? new Date(santa.launchedAt) : null
        const eventDate   = santa.eventDate  ? new Date(santa.eventDate)  : null
        const daysSinceLaunch = launchedAt ? Math.floor((now.getTime() - launchedAt.getTime()) / 86400000) : null
        const daysUntilEvent  = eventDate  ? Math.ceil((eventDate.getTime() - now.getTime()) / 86400000)  : null

        for (const assign of santa.assignments) {
            const giver    = memberMap[assign.giverId]
            const receiver = memberMap[assign.receiverId]
            if (!giver) continue

            const hasWishes = assign.wishes.length > 0

            // Rappel J+3 si liste pas remplie
            if (daysSinceLaunch === 3 && !hasWishes) {
                await sendEmail({
                to:      giver.email,
                notification: true,
                subject: `🎅 N'oublie pas ta liste de souhaits Secret Santa !`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px">
                    <h1>🎁 Ta liste de souhaits Secret Santa</h1>
                    <p>Tu n'as pas encore rempli ta liste de souhaits pour le Secret Santa <strong>${santa.group.name}</strong>.</p>
                    <p>La personne qui t'a tiré au sort ne sait pas quoi t'offrir !</p>
                    <a href="${BASE_URL}/groups/${santa.groupId}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
                    Remplir ma liste
                    </a>
                </div>`,
                }).catch(() => {})

                await CreateNotification({
                userId:  assign.receiverId,
                type:    'GROUP_INVITE',
                title:   '🎅 Remplis ta liste de souhaits !',
                message: `La personne qui t'a tiré attend tes idées pour ${santa.group.name}`,
                link:    `/groups/${santa.groupId}`,
                }).catch(() => {})

                sent++
            }

            // Rappel J-7 avant l'événement
            if (daysUntilEvent === 7) {
                await sendEmail({
                to:      giver.email,
                notification: true,
                subject: `🎅 Plus que 7 jours pour le Secret Santa !`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px">
                    <h1>⏰ Plus que 7 jours !</h1>
                    <p>Le Secret Santa <strong>${santa.group.name}</strong> approche !</p>
                    <p>N'oublie pas de penser à ton cadeau pour <strong>${receiver?.name ?? 'ta cible'}</strong>.</p>
                    <a href="${BASE_URL}/groups/${santa.groupId}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
                    Voir les souhaits de ma cible
                    </a>
                </div>`,
                }).catch(() => {})

                await CreateNotification({
                userId:  assign.giverId,
                type:    'GROUP_INVITE',
                title:   '⏰ Plus que 7 jours pour le Secret Santa !',
                message: `Pense à acheter ton cadeau pour ${santa.group.name}`,
                link:    `/groups/${santa.groupId}`,
                }).catch(() => {})

                sent++
            }

            // Rappel J-3 avant l'événement
            if (daysUntilEvent === 3) {
                await sendEmail({
                to:      giver.email,
                notification: true,
                subject: `🚨 Secret Santa dans 3 jours — tu as ton cadeau ?`,
                html: `<div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px">
                    <h1>🚨 Plus que 3 jours !</h1>
                    <p>Le Secret Santa <strong>${santa.group.name}</strong> est dans 3 jours.</p>
                    <p>Tu as bien acheté ton cadeau pour <strong>${receiver?.name ?? 'ta cible'}</strong> ? 😅</p>
                    <a href="${BASE_URL}/groups/${santa.groupId}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
                    Voir les souhaits
                    </a>
                </div>`,
                }).catch(() => {})

                await CreateNotification({
                userId:  assign.giverId,
                type:    'GROUP_INVITE',
                title:   '🚨 Secret Santa dans 3 jours !',
                message: `Tu as ton cadeau pour ${santa.group.name} ?`,
                link:    `/groups/${santa.groupId}`,
                }).catch(() => {})

                sent++
            }
        }
    }

    return NextResponse.json({ success: true, sent })
}