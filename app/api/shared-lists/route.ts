import { NextResponse }    from 'next/server'
import { cookies }         from 'next/headers'
import { prisma }          from '@/lib/prisma'
import { validateSession } from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Listes où je suis membre (invité via lien)
  const memberships = await prisma.listMember.findMany({
    where:   { userId: session.userId },
    include: {
      list: {
        include: {
          user:   { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
          items:  { select: { reserved: true, price: true } },
        },
      },
    },
    orderBy: { invitedAt: 'desc' },
  })

  // Listes publiques des amis
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { senderId:   session.userId, status: 'ACCEPTED' },
        { receiverId: session.userId, status: 'ACCEPTED' },
      ],
    },
    select: { senderId: true, receiverId: true },
  })

  const friendIds = friendships.map(f =>
    f.senderId === session.userId ? f.receiverId : f.senderId
  )

  const friendLists = friendIds.length > 0 ? await prisma.list.findMany({
    where: {
      userId:  { in: friendIds },
      privacy: { in: ['PUBLIC', 'UNLISTED'] },
      NOT: { members: { some: { userId: session.userId } } }, // pas déjà dans memberships
    },
    include: {
      user:   { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
      items:  { select: { reserved: true, price: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  }) : []

  return NextResponse.json({
    asMember:    memberships.map(m => ({ ...m.list, role: m.role })),
    fromFriends: friendLists,
  })
}