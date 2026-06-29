import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'
import { addPoints }                 from '@/lib/gamification/pointsService'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

// GET — Voir les contributions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [contributions, item] = await Promise.all([
    prisma.contribution.findMany({
      where:   { itemId: id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.item.findUnique({
      where:  { id },
      select: { price: true, title: true },
    }),
  ])

  const total = contributions.reduce((sum, c) => sum + c.amount, 0)
  const pct   = item?.price ? Math.min(100, Math.round((total / item.price) * 100)) : 0

  return NextResponse.json({ contributions, total, pct, price: item?.price })
}

// POST — Ajouter une contribution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id }               = await params
  const { amount, message }  = await request.json()

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }

  const item = await prisma.item.findUnique({
    where:   { id },
    include: { list: true },
  })
  if (!item) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
  if (item.list.userId === session.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas contribuer à votre propre liste' }, { status: 403 })
  }

  // Vérifier si déjà contribué
  const existing = await prisma.contribution.findUnique({
    where: { itemId_userId: { itemId: id, userId: session.userId } },
  })

  const contribution = existing
    ? await prisma.contribution.update({
        where: { itemId_userId: { itemId: id, userId: session.userId } },
        data:  { amount, message },
      })
    : await prisma.contribution.create({
        data: { itemId: id, userId: session.userId, amount, message },
      })

  // Si 100% financé, marquer comme réservé
  const all   = await prisma.contribution.findMany({ where: { itemId: id } })
  const total = all.reduce((sum, c) => sum + c.amount, 0)

  if (item.price && total >= item.price && !item.reserved) {
    await prisma.item.update({
      where: { id },
      data:  { reserved: true, reservedById: session.userId },
    })
  }

  await addPoints(session.userId, 'item_reservation').catch(() => {})

  return NextResponse.json(contribution)
}