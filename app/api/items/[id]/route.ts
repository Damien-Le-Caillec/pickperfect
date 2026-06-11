import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { success, z } from "zod";
import { generateAffiliateLink } from "@/lib/affiliate";
import { error } from "console";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

// Vérifie que l'utilisateur peut modifier cet item
async function canEditItem(itemId: string, userId: string) {
    const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
            list: {
                include: { members: true },
            },
        },
    })

    if (!item) return { allowed: false, item: null }

    const isOwner = item.list.userId === userId
    const isEditor = item.list.members.some(
        m => m.userId === userId && m.role === 'EDITOR'
    )
    const isCreator = item.createdById === userId

    return {
        allowed: isOwner || isEditor || isCreator, 
        item,
    }
}

// PATCH - Modifier un item
const UpdateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    price: z.number().positive().optional().nullable(),
    url: z.string().url().optional().or(z.literal('')),
    imageUrl: z.string().url().optional().or(z.literal('')),
    priority: z.number().int().min(0).max(3).optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { allowed, item } = await canEditItem(params.id, session.userId)
    if (!allowed || !item) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = UpdateSchema.safeParse(body)

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 }
        )
    }

    // Regénérer le lien affilié si l'URL change
    let affiliateLink = item.affiliateLink
    let affiliateId = item.affiliateId
    let commissionRate = item.commissionRate

    if (parsed.data.url !== undefined && parsed.data.url !== item.url)
    {
        if (parsed.data.url) {
            const affiliate = generateAffiliateLink(parsed.data.url)
            if (affiliate) {
                affiliateLink = affiliate.link
                affiliateId = affiliate.merchant
                commissionRate = affiliate.rate
            }
        } else {
            affiliateLink = null
            affiliateId = null
            commissionRate = null
        }
    }

    const updated = await prisma.item.update({
        where: { id: params.id },
        data: {
            ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
            ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
            ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
            ...(parsed.data.url !== undefined ? { url: parsed.data.url || null } : {}),
            ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl || null } : {}),
            ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
            affiliateLink,
            affiliateId,
            commissionRate,
        },
    })

    return NextResponse.json(updated)
}

// DELETE - Supprimer un item
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 403 })
    }

    await prisma.item.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
}