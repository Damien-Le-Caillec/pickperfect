import { NextRequest,  NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    
    const user = await prisma.user.findUnique({ where: { unsubscribeToken: token } })
    if (!user) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

    await prisma.user.update({
        where: { id: user.id },
        data: { emailNotifications: false },
    })

    return NextResponse.json({ success: true })
}