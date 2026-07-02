import { NextRequest, NextResponse } from "next/server"
import { cookies }                   from "next/headers"
import { z }                         from "zod"
import { prisma }                    from "@/lib/prisma"
import { validateSession }           from "@/lib/auth/sqlite-auth"

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

// GET /api/profile
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const userId = session.userId

  const [user, points, badgeCount, listCount, reservationCount, friendCount] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:          true,
        name:        true,
        email:       true,
        role:        true,
        createdAt:   true,
        bio:         true,
        city:        true,
        avatarUrl:   true,
        accentColor: true,
        bannerColor: true,
        birthDate:   true,
        emailNotifications: true,
      },
    }),
    prisma.points.findUnique({
      where:  { userId },
      select: { currentStreak: true, availablePoints: true },
    }),
    prisma.userBadge.count({ where: { userId } }),
    prisma.list.count({ where: { userId } }),
    prisma.reservation.count({ where: { userId } }),
    prisma.friendship.count({
      where: {
        OR: [
          { senderId:   userId, status: 'ACCEPTED' },
          { receiverId: userId, status: 'ACCEPTED' },
        ],
      },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json({
    ...user,
    stats: {
      lists:        listCount,
      reservations: reservationCount,
      friends:      friendCount,
      badges:       badgeCount,
      streak:       points?.currentStreak  ?? 0,
      points:       points?.availablePoints ?? 0,
    },
  })
}

// PATCH /api/profile
const UpdateSchema = z.object({
  name:        z.string().min(1).max(60).optional(),
  email:       z.string().email().optional(),
  bio:         z.string().max(160).optional(),
  city:        z.string().max(50).optional(),
  accentColor: z.string().optional(),
  bannerColor: z.string().optional(),
  birthDate:   z.string().optional(),
})

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body   = await request.json()
  const parsed = UpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  if (parsed.data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: parsed.data.email.toLowerCase().trim(), NOT: { id: session.userId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data:  {
      name:        parsed.data.name        ? parsed.data.name.trim()               : undefined,
      email:       parsed.data.email       ? parsed.data.email.toLowerCase().trim() : undefined,
      bio:         parsed.data.bio         ?? undefined,
      city:        parsed.data.city        ?? undefined,
      accentColor: parsed.data.accentColor ?? undefined,
      bannerColor: parsed.data.bannerColor ?? undefined,
      birthDate:   parsed.data.birthDate   ? new Date(parsed.data.birthDate)       : undefined,
    },
    select: { id: true, name: true, email: true },
  })

  return NextResponse.json({ success: true, user: updated })
}