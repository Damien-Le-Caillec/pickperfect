import { NextRequest, NextResponse } from "next/server";
import { isHttpUrl } from '@/lib/utils/safeUrl'
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

// GET - Voir les souhaits de ma cible
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    const santa = await prisma.secretSanta.findUnique({ where: { groupId: id } })
    if (!santa) return NextResponse.json({ error: 'Pas de Secret Santa' }, { status: 404 })

    // Trouver mon assignement (je suis le giver)
    const myAssign = await prisma.secretSantaAssign.findFirst({
        where: { secretSantaId: santa.id, giverId: session.userId },
        include: { wishes: { orderBy: { createdAt: 'asc' } } },
    })

    if (!myAssign) return NextResponse.json({ error: 'Vous ne participez pas' }, { status: 404 })
    
    return NextResponse.json(myAssign.wishes)
}

// POST Ajouter un souhait à MA liste (je suis le receiver)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { title, description, price, url } = await request.json()

    if (!title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
    if (url && !isHttpUrl(url)) return NextResponse.json({ error: 'Lien http(s) requis' }, { status: 400 })
    
    const santa = await prisma.secretSanta.findUnique({ where: { groupId: id } })
    if (!santa) return NextResponse.json({ error: 'Pas de Secret Santa' }, { status: 404 })

    // Je suis le receiver — trouver l'assign où je suis la cible
    const myAssign = await prisma.secretSantaAssign.findFirst({
        where: { secretSantaId: santa.id, receiverId: session.userId },
    })

    if (!myAssign) return NextResponse.json({ error: 'Vous ne participez pas' }, { status: 404 })

    const wish = await prisma.secretSantaWish.create({
        data: {
        assignId: myAssign.id,
        title: title.trim(),
        description: description || null,
        price: price ? parseFloat(price) : null,
        url: url || null,
        },
    })

    // Marquer la liste comme remplie
    await prisma.secretSantaAssign.update({
        where: { id: myAssign.id },
        data: { wishedFilledAt: new Date() },
    })

    return NextResponse.json(wish, { status: 201 })    
}