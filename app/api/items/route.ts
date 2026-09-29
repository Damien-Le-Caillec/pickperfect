import { NextRequest, NextResponse } from "next/server";
import { isHttpUrl } from '@/lib/utils/safeUrl'
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { generateAffiliateLink } from '@/lib/affiliate'
import { progressChallenge } from '@/lib/gamification/challenges'

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

const CreateItemSchema = z.object({
    listId: z.string().min(1),
    title: z.string().min(1, 'Titre requis').max(200),
    description: z.string().max(500).optional(),
    price: z.number().positive().optional(),
    currency: z.string().default('EUR'),
    url: z.string().url().refine(isHttpUrl, 'Lien http(s) requis').optional().or(z.literal('')),
    imageUrl: z.string().url().optional().or(z.literal('')),
    priority: z.number().int().min(0).max(10).default(0),
})

export async function POST(request: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = CreateItemSchema.safeParse(body)

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 }
        )
    }

    // Vérifier que la visite appartient à l'utilisateur
    const list = await prisma.list.findUnique({
        where:   { id: parsed.data.listId },
        include: { members: true },
    })
    const isOwner  = list?.userId === session.userId
    const isEditor = list?.members.some(
        m => m.userId === session.userId && m.role === 'EDITOR'
    )

    if (!list || (!isOwner && !isEditor)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Générer le lien affilié si URL fournie
    let affiliateLink: string | undefined
    let affiliateId: string | undefined
    let commissionRate: number | undefined

    const url = parsed.data.url || ''
    if (url) {
        const affiliate = generateAffiliateLink(url)
        if (affiliate) {
            affiliateLink = affiliate.link
            affiliateId = affiliate.merchant
            commissionRate = affiliate.rate
        }
    }

    const item = await prisma.item.create({
        data: {
            listId: parsed.data.listId,
            title: parsed.data.title,
            description: parsed.data.description,
            price: parsed.data.price,
            currency: parsed.data.currency,
            url: url || undefined,
            imageUrl: parsed.data.imageUrl || undefined,
            priority: parsed.data.priority,
            createdById: session.userId,
            affiliateLink,
            affiliateId,
            commissionRate,
        },
    })

    await progressChallenge(session.userId, 'add_5_items').catch(() => {})

    return NextResponse.json(item, { status: 201 })
}