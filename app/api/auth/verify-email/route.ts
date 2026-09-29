import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { validateSession } from '@/lib/auth/sqlite-auth'
import { readVerifyToken, sendVerificationEmail } from '@/lib/auth/emailVerification'
import { rateLimitResponse } from '@/lib/security/rateLimit'

// GET — lien cliqué depuis l'email
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token') ?? ''
    const data  = readVerifyToken(token)
    const base  = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

    if (!data) {
        return NextResponse.redirect(new URL('/dashboard?verified=invalid', base))
    }

    // L'email doit toujours être celui du compte (sinon le lien est périmé)
    const updated = await prisma.user.updateMany({
        where: { id: data.userId, email: data.email },
        data:  { emailVerified: true },
    })

    const status = updated.count > 0 ? 'ok' : 'invalid'
    return NextResponse.redirect(new URL(`/dashboard?verified=${status}`, base))
}

// POST — renvoyer l'email de confirmation
export async function POST() {
    const cookieStore = await cookies()
    const sessionId   = cookieStore.get('auth_session')?.value
    const session     = sessionId ? await validateSession(sessionId) : null
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const limited = rateLimitResponse(`verify-resend:${session.userId}`, { limit: 3, windowMs: 60 * 60 * 1000 })
    if (limited) return limited

    const user = await prisma.user.findUnique({
        where:  { id: session.userId },
        select: { id: true, email: true, name: true, emailVerified: true },
    })
    if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    if (user.emailVerified) return NextResponse.json({ success: true, alreadyVerified: true })

    try {
        await sendVerificationEmail(user)
    } catch (err) {
        console.error('Verification email error:', err)
        return NextResponse.json({ error: "Impossible d'envoyer l'email pour le moment" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
