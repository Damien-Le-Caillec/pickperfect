import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const PROTECTED = [
    '/dashboard',
    '/lists',
    '/points',
    '/profile',
    '/explore',
    '/admin',
]

const AUTH_ONLY = ['/login', '/register']

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const session = request.cookies.get('auth_session')
    const isConnected = !!session?.value

    const isProtected = PROTECTED.some(r => pathname.startsWith(r))
    const isAuthOnly = AUTH_ONLY.some(r => pathname.startsWith(r))

    if (isProtected && !isConnected) {
        const url = new URL('/login', request.url)
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
    }

    if (isAuthOnly && isConnected) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api/).*)',
    ],
}