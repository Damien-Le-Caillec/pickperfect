import nodemailer from 'nodemailer'

// Créer le transporteur une seule fois
const transporteur = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false, // falsepour port 587 (STARTTLS)
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
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
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
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
    })
}