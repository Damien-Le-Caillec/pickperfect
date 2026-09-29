import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { z } from 'zod'
import { FREE_PRIVATE_LIST_LIMIT, hasReward } from '@/lib/points/rewards'

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const list = await prisma.list.findUnique({
    where:   { id },
    include: {
      user:    { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      items: {
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          reservedBy:     { select: { id: true, name: true } },
          createdBy_item: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  }

  const session = await getSession()

  if (list.privacy === 'PRIVATE') {
    if (!session) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const isOwner  = session.userId === list.userId
    const isMember = list.members.some(m => m.userId === session.userId)
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
  }

  // Vues uniques
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0] ??
             headerStore.get('x-real-ip') ??
             'unknown'

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.listView.findUnique({
        where: {
          listId_userId: {
            listId: id,
            userId: session?.userId ?? 'anonymous',
          },
        },
      })
      if (!existing) {
        await tx.listView.create({
          data: { listId: id, userId: session?.userId ?? null, ipAddress: ip },
        })
        await tx.list.update({
          where: { id },
          data:  { viewCount: { increment: 1 } },
        })
      }
    })
  } catch {
    // race condition ignorée
  }

  // Mode surprise : masquer les réservations au propriétaire avant l'événement
  if (list.surpriseMode && list.userId === session?.userId) {
    const eventPassed = list.eventDate && new Date(list.eventDate) < new Date()
    if (!eventPassed) {
      list.items = list.items.map(item => ({
        ...item,
        reservedById: null,
        reservedBy:   null,
      }))
    }
  }

  return NextResponse.json(list)
}

const UpdateSchema = z.object({
    title:        z.string().trim().min(1, 'Titre requis').max(100).optional(),
    description:  z.string().max(500).nullable().optional(),
    privacy:      z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
    budget:       z.number().positive().nullable().optional(),
    surpriseMode: z.boolean().optional(),
    eventDate:    z.string().nullable().optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    const { id }  = await params
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id } })
    if (!list) {
        return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }
    if (list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const parsed = UpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }
    const body = parsed.data

    if (body.privacy === 'PRIVATE' && list.privacy !== 'PRIVATE') {
        const privateCount = await prisma.list.count({ where: { userId: session.userId, privacy: 'PRIVATE' } })
        if (privateCount >= FREE_PRIVATE_LIST_LIMIT && !(await hasReward(session.userId, 'r4'))) {
            return NextResponse.json({ error: `Limite de ${FREE_PRIVATE_LIST_LIMIT} listes privées atteinte. Débloquez « Listes illimitées » dans la page Points.` }, { status: 403 })
        }
    }

    const updated = await prisma.list.update({
        where: { id },
        data:  {
            title:        body.title,
            description:  body.description,
            privacy:      body.privacy,
            budget:       body.budget,
            surpriseMode: body.surpriseMode,
            eventDate:    body.eventDate ? new Date(body.eventDate) : undefined,
        },
    })

    return NextResponse.json(updated)
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id }   = await params
    const session  = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id } })
    if (!list) {
        return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }
    if (list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.list.delete({ where: { id } })
    return NextResponse.json({ success: true })
}