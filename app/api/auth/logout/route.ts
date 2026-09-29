import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth/sqlite-auth";

export async function POST() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('auth_session')?.value

    if (sessionId) {
        await deleteSession(sessionId)
        cookieStore.delete('auth_session')
    }

    return NextResponse.json({ success: true })
}