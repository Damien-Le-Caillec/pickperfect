import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/mailer'
import { resetPasswordEmail } from '@/lib/email/templates'
import crypto from 'crypto'
import { success } from 'zod'

export async function POST(request: NextRequest) {
    const { email } = await request.json()

    if (!email) {
        return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    // On retourne toujours "succès" même si l'email n'existe pas
    // (évite de confirmer l'existence d'un compte)
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
    })

    if (user) {
        // Invalider les anciens tokens
        await prisma.passwordResetToken.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        })

        // Créer un nouveau token (expire dans 1h)
        const token = crypto.randomBytes(32).toString('hex')
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
        })

        // Envoyer l'email
        const tpl = resetPasswordEmail(token)
        await sendEmail({
            to: user.email,
            subject: tpl.subject,
            html: tpl.html,
        }).catch(err => console.error('Email error:', err))
    }

    // Toujours répondre avec succès
    return NextResponse.json({
        success: true,
        message: 'Si cet email existe, un lien de réinitialisation a été ennvoyé.',
    })
}