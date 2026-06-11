import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateUser, createSession } from "@/lib/auth/sqlite-auth";
import { success } from "zod";

export async function POST(request: NextRequest) {
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

    const session = await createSession(user.id)

    const cookieStore = await cookies()
    cookieStore.set('auth_session', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: session.expiresAt,
        path: '/',
    })

    return NextResponse.json({ success: true })
}