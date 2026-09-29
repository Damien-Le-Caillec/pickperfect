import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { CreateNotification } from "@/lib/notifications";
import { rateLimitResponse } from "@/lib/security/rateLimit";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const comments = await prisma.comment.findMany({
        where: { itemId: id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(comments)
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const limited = rateLimitResponse(`comment:${session.userId}`, { limit: 20, windowMs: 60 * 1000 })
    if (limited) return limited

    const { id } = await params

    const { content } = await request.json()
    if (!content?.trim()) {
        return NextResponse.json({ error: 'Le commentaire ne peut pas être vide'}, { status: 400 })
    }
    if (content.length > 500) {
        return NextResponse.json({ error: 'Maximum 500 caractères' }, { status: 400 })
    }

    const item = await prisma.item.findUnique({
        where: { id: id },
        include: { list: { include: { user: true } } },
    })
    if (!item) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
    
    const comment = await prisma.comment.create({
        data: {
            itemId: id,
            userId: session.userId,
            content: content.trim(),
        },
        include: { user: { select: { id: true, name: true } } },
    })

    // Notifier le propriétaire de la liste (si ce n'est pas lui qui commente)
    if (item.list.userId !== session.userId) {
        await CreateNotification({
            userId: item.list.userId,
            type: 'COMMENT',
            title: 'Nouveau commentaire',
            message: `${session.user.name ?? 'Quelqu\'un'} a commenté "${item.title}"`,
            link: `/lists/${item.list.id}`,
        }).catch(() => {})
    }

    return NextResponse.json(comment, { status: 201 })
}