import crypto from 'crypto'
import { sendEmail } from '@/lib/email/mailer'
import { verifyEmailEmail } from '@/lib/email/templates'

// Jeton signé (HMAC) sans table en base : userId + email + expiration.
// Changer d'email invalide automatiquement les anciens liens.
const TTL_MS = 7 * 24 * 60 * 60 * 1000

function secret(): string {
    const s = process.env.SESSION_SECRET
    if (!s) {
        if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET manquant')
        return 'dev-only-secret'
    }
    return s
}

function sign(payload: string): string {
    return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createVerifyToken(userId: string, email: string): string {
    const payload = Buffer.from(JSON.stringify({ u: userId, e: email, x: Date.now() + TTL_MS })).toString('base64url')
    return `${payload}.${sign(payload)}`
}

export function readVerifyToken(token: string): { userId: string; email: string } | null {
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null

    const expected = sign(payload)
    if (expected.length !== signature.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
        if (typeof data.x !== 'number' || data.x < Date.now()) return null
        return { userId: data.u, email: data.e }
    } catch {
        return null
    }
}

export function verifyUrl(userId: string, email: string): string {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${base}/api/auth/verify-email?token=${createVerifyToken(userId, email)}`
}

export async function sendVerificationEmail(user: { id: string; email: string; name?: string | null }) {
    const tpl = verifyEmailEmail(user.name ?? '', verifyUrl(user.id, user.email))
    await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html })
}
