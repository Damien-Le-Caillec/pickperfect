import { cookies } from "next/headers";
import { validateSession } from "./sqlite-auth";

export async function requireAdmin() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('auth_session')?.value
    if (!sessionId) return null

    const session = await validateSession(sessionId)
    if (!session || session.user.role !== 'ADMIN') return null

    return session
}