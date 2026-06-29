import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { CreateNotification } from "@/lib/notifications";
import { includes, success } from "zod";
import { error } from "console";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const [friends, pending, requests] = await Promise.all([
        prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: session.userId, status: 'ACCEPTED' },
                    { receiverId: session.userId, status: 'ACCEPTED' },
                ],
            },
            include: {
                sender: { select: { id: true, name: true, email: true } },
                receiver: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.friendship.findMany({
            where: { senderId: session.userId, status: 'PENDING' },
            include: { receiver: { select: { id: true, name: true, email: true } } },
        }),
        prisma.friendship.findMany({
            where:   { receiverId: session.userId, status: 'PENDING' },
            include: { sender: { select: { id: true, name: true, email: true } } },
        }),
    ])

    const friendList = friends.map(f => ({
        id: f.id,
        friend: f.senderId === session.userId ? f.receiver : f.senderId,
        since: f.updatedAt,
    }))

    return NextResponse.json({ friends: friendList, pending, requests })
}

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    const target = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, name: true, email: true },
    })

    if (!target) return NextResponse.json({ error: 'Aucun compte avec cet email' }, { status: 404 })
    if (target.id === session.userId) return NextResponse.json({ error: 'Vous ne pouvez pas vous ajouter vous-même' }, { status: 400 })

    const existing = await prisma.friendship.findFirst({
        where: {
            OR: [
                { senderId: session.userId,   receiverId: target.id },
                { senderId: target.id, receiverId: session.userId },
            ],
        },
    })

    if (existing) {
        if (existing.status === 'ACCEPTED') return NextResponse.json({ error: 'Vous êtes déjà amis' }, { status: 409 })
        if (existing.status === 'PENDING')  return NextResponse.json({ error: 'Une demande est déjà en cours' }, { status: 409 })
    }

    const friendship = await prisma.friendship.create({
        data: { senderId: session.userId, receiverId: target.id },
    })

    await CreateNotification({
        userId: target.id,
        type: 'GROUP_INVITE',
        title: 'Nouvelle demande d\'ami',
        message: `${session.user.name ?? 'Quelqu\'un'} veut vous ajouter comme ami`,
        link: '/friends',
    }).catch(() => {})

    return NextResponse.json({ success: true, friendship })
}