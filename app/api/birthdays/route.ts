import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { z }                         from 'zod'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

const Schema = z.object({
  name:          z.string().min(1).max(60),
  date:          z.string(),
  relatedListId: z.string().optional(),
  remindDays:    z.number().int().min(0).max(30).default(7),
})

function enrichBirthday(date: Date, name: string, id: string, source: 'manual' | 'friend', relatedListId?: string | null, remindDays?: number) {
  const now  = new Date()
  const next = new Date(now.getFullYear(), date.getMonth(), date.getDate())
  if (next < now) next.setFullYear(now.getFullYear() + 1)
  const daysLeft = Math.ceil((next.getTime() - now.getTime()) / 86400000)
  return {
    id,
    name,
    date:          date.toISOString(),
    nextDate:      next.toISOString(),
    daysLeft,
    month:         date.getMonth(),
    day:           date.getDate(),
    source,
    relatedListId: relatedListId ?? null,
    remindDays:    remindDays ?? 7,
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Anniversaires manuels
  const manual = await prisma.birthday.findMany({
    where:   { userId: session.userId },
    orderBy: { date: 'asc' },
  })

  // Anniversaires des amis (depuis leur birthDate sur leur profil)
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { senderId:   session.userId, status: 'ACCEPTED' },
        { receiverId: session.userId, status: 'ACCEPTED' },
      ],
    },
    include: {
      sender:   { select: { id: true, name: true, birthDate: true } },
      receiver: { select: { id: true, name: true, birthDate: true } },
    },
  })

  const friendBirthdays = friendships
    .map(f => f.senderId === session.userId ? f.receiver : f.sender)
    .filter(u => u.birthDate)
    .map(u => enrichBirthday(
      new Date(u.birthDate!),
      u.name ?? 'Ami',
      `friend-${u.id}`,
      'friend',
    ))

  // Enrichir les anniversaires manuels
  const manualEnriched = manual.map(b => enrichBirthday(
    new Date(b.date),
    b.name,
    b.id,
    'manual',
    b.relatedListId,
    b.remindDays,
  ))

  // Fusionner et trier par prochain anniversaire
  const all = [...manualEnriched, ...friendBirthdays]
    .sort((a, b) => a.daysLeft - b.daysLeft)

  return NextResponse.json(all)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body   = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const [month, day] = parsed.data.date.split('-').map(Number)
  const dateObj      = new Date(2000, month - 1, day)

  const birthday = await prisma.birthday.create({
    data: {
      userId:        session.userId,
      name:          parsed.data.name,
      date:          dateObj,
      relatedListId: parsed.data.relatedListId,
      remindDays:    parsed.data.remindDays,
    },
  })

  return NextResponse.json(birthday, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await request.json()
  const b      = await prisma.birthday.findUnique({ where: { id } })
  if (!b || b.userId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await prisma.birthday.delete({ where: { id } })
  return NextResponse.json({ success: true })
}