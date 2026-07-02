import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id || id === 'undefined') {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where:  { id },
      select: {
        id:          true,
        name:        true,
        bio:         true,
        city:        true,
        avatarUrl:   true,
        accentColor: true,
        bannerColor: true,
        birthDate:   true,
        createdAt:   true,
        lists: {
          where:   { privacy: 'PUBLIC' },
          select:  { id: true, title: true, eventDate: true, _count: { select: { items: true } } },
          orderBy: { updatedAt: 'desc' },
        },
      },
    }),
    Promise.all([
      prisma.list.count({ where: { userId: id } }),
      prisma.reservation.count({ where: { userId: id } }),
      prisma.userBadge.count({ where: { userId: id } }),
      prisma.points.findUnique({ where: { userId: id }, select: { currentStreak: true } }),
    ]),
  ])

  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json({
    ...user,
    stats: {
      lists:        stats[0],
      reservations: stats[1],
      badges:       stats[2],
      streak:       stats[3]?.currentStreak ?? 0,
    },
  })
}