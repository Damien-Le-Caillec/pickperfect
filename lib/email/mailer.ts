import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Créer le transporteur une seule fois
const transporteur = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    // 465 = TLS direct ; 587 = STARTTLS
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

interface SendEmailOptions {
    to: string
    subject: string
    html: string
    text?: string
    // true = email de notification (rappels…) : respecte la préférence
    // "emails de notification" du destinataire et ajoute un lien de désinscription
    notification?: boolean
}

// Renvoie le lien de désinscription, ou null si le destinataire a désactivé les notifications
async function notificationFooter(email: string): Promise<string | null | undefined> {
    const user = await prisma.user.findUnique({
        where:  { email },
        select: { id: true, emailNotifications: true, unsubscribeToken: true },
    })
    if (!user) return undefined
    if (!user.emailNotifications) return null

    let token = user.unsubscribeToken
    if (!token) {
        token = crypto.randomBytes(24).toString('hex')
        await prisma.user.update({ where: { id: user.id }, data: { unsubscribeToken: token } })
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `<p style="text-align:center;font-size:12px;color:#A8A29E;margin:16px 0;">
        <a href="${base}/unsubscribe?token=${token}" style="color:#A8A29E;">Ne plus recevoir ces emails</a>
    </p>`
}

export async function sendEmail({ to, subject, html, text, notification }: SendEmailOptions) {
    if (notification) {
        const footer = await notificationFooter(to)
        if (footer === null) return // l'utilisateur a désactivé les emails de notification
        if (footer) html += footer
    }

    // En développement, on log au lieu d'envoyer
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
        console.log('\n EMAIL (dev mode)')
        console.log('To:', to)
        console.log('Subject:', subject)
        console.log('---')
        return
    }

    await transporteur.sendMail({
        from: process.env.SMTP_FROM,
        // Les réponses reviennent toujours à l'adresse PickPerfect, même si le
        // service d'envoi réécrit l'expéditeur (ex. Brevo avec une adresse Gmail)
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
    })
}