import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { validateUser, createSession } from "@/lib/auth/sqlite-auth";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { processDailyLogin } from "@/lib/gamification/pointsService";
import { error } from "console";
import { success } from "zod";

export async function POST(request: NextRequest) {
    // Rate limiting
    const headerStore = await headers()
    const ip =
        headerStore.get('x-forwarded-for') ??
        headerStore.get('x-real-ip') ??
        'unknown'

    const limit = checkRateLimit(`login:${ip}`, {
        limit: 5,
        windowMs: 15 * 60 * 1000,
    })

    if (!limit.allowed) {
        return NextResponse.json(
            {
                error: `Trop de tentatives. Réessayez dans ${
                    Math.ceil((limit.resetAt - Date.now()) / 60000)
                } minute(s)`,
            },
            {
                status: 429,
                headers: { 'Retry-After': Math.ceil((limit.resetAt - Date.now()) / 1000).toString() },
            }
        )
    }

    // Validation
    const { email, password } = await request.json()

    if (!email || !password) {
        return NextResponse.json(
            { error: 'Email et mot de passe requis' },
            { status: 400 }
        )
    }

    const user = await validateUser(email, password)
    if (!user) {
        return NextResponse.json(
            { error: 'Email ou mot de passe incorrect' },
            { status: 401 }
        )
    }

    // Session
    const session = await createSession(user.id, {
        userAgent: headerStore.get('user-agent') ?? undefined,
        ipAddress: ip,
    })
    const cookieStore = await cookies()
    cookieStore.set('auth_session', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: session.expiresAt,
        path: '/',
    })

    // Points connexion quotidienne
    await processDailyLogin(user.id).catch(() => {})

    return NextResponse.json({ success: true })
}