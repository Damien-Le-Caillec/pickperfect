import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

// PATCH — Accepter ou refuser une demande
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id }    = await params
  const { action } = await request.json() // 'accept' | 'reject'

  const friendship = await prisma.friendship.findUnique({ where: { id } })
  if (!friendship || friendship.receiverId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data:  { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' },
  })

  return NextResponse.json(updated)
}

// DELETE — Supprimer un ami ou annuler une demande
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const friendship = await prisma.friendship.findUnique({ where: { id } })
  if (!friendship) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const isParty = friendship.senderId === session.userId || friendship.receiverId === session.userId
  if (!isParty) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  await prisma.friendship.delete({ where: { id } })
  return NextResponse.json({ success: true })
}