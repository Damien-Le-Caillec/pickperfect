import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from '@/lib/prisma'
import { validateSession } from "@/lib/auth/sqlite-auth";
import { addPoints } from "@/lib/gamification/pointsService";
import crypto from 'crypto'

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id: id } })
    if (!list || list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    let shareToken = list.shareToken
    const isFirstShare = !shareToken

    if (!shareToken) {
        shareToken = crypto.randomBytes(16).toString('hex')
        await prisma.list.update({
            where: { id: id },
            data: { shareToken, shareCount: { increment: 1 } },
        })
    }

    // Points partage (seulement au premier partage)
    if (isFirstShare) {
        await addPoints(session.userId, 'list_share').catch(() => {})
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/l/${shareToken}`
    return NextResponse.json({ shareUrl, shareToken })
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id: id } })
    if (!list || list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.list.update({
        where: { id: id },
        data: { shareToken: null },
    })

    return NextResponse.json({ success: true })
}