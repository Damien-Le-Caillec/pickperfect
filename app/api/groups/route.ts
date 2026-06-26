import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateSession } from "@/lib/auth/sqlite-auth";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const CreateSchema = z.object({
    name: z.string().min(1, 'Nom requis').max(60),
    description: z.string().max(300).optional(),
})

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const groups = await prisma.group.findMany({
        where: {
            OR: [
                { ownerId: session.userId },
                { members: { some: { userId: session.userId } } },
            ],
        },
        include: {
            _count: { select: { members: true, lists: true } },
        },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(groups)
}

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    
    const body = await request.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const group = await prisma.group.create({
        data: {
            name: parsed.data.name,
            description: parsed.data.description,
            ownerId: session.userId,
            members: {
                create: {userId: session.userId, role: 'OWNER' },
            },
        },
    })

    return NextResponse.json(group, { status: 201 })
}