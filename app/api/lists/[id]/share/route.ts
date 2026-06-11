import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import crypto from 'crypto'

async function getSession() {
    const cookieStore = await cookies()
    const id          = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function POST(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id: params.id } })
    if (!list || list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Réutiliser le token existant ou en créer un nouveau
    let shareToken = list.shareToken
    if (!shareToken) {
        shareToken = crypto.randomBytes(16).toString('hex')
        await prisma.list.update({
            where: { id: params.id },
            data: {
                shareToken,
                shareCount: { increment: 1 },
            },
        })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/1/${shareToken}`

    return NextResponse.json({ shareUrl, shareToken })
}

// DELETE - Révoquer le lien
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id: params.id } })
    if (!list || list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.list.update({
        where: { id: params.id },
        data:  { shareToken: null },
    })

    return NextResponse.json({ success: true })
}