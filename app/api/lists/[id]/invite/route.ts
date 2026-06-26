import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { validateSession } from '@/lib/auth/sqlite-auth';
import crypto from 'crypto'

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

//POST - Créer un lien d'invitation
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est propriétaire ou éditeur
    const list = await prisma.list.findUnique({ where: { id: id } })
    if (!list) {
        return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    const isOwner = list.userId === session.userId
    if (!isOwner) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    // role : VIEWER (voir seulement) ou EDITOR (voir + modifier)
    const role = body.role === 'EDITOR' ? 'EDITOR' : 'VIEWER'

    const token = crypto.randomBytes(20).toString('hex')

    const invite = await prisma.inviteToken.create({
        data: {
        listId:    id,
        token,
        role,
        createdBy: session.userId,
        // Expire dans 7 jours
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invite.token}`

    return NextResponse.json({ inviteUrl, token: invite.token, role })
}


// GET — Voir les membres actuels
export async function GET(
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

  const members = await prisma.listMember.findMany({
    where:   { listId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { invitedAt: 'asc' },
  })

  return NextResponse.json(members)
}

// DELETE — Retirer un membre
export async function DELETE(
  request: NextRequest,
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

  const { memberId } = await request.json()

  await prisma.listMember.delete({
    where: { id: memberId },
  })

  return NextResponse.json({ success: true })
}