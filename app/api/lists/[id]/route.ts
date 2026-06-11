import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { error } from "console";

async function getSession() {
    const cookieStore = await cookies()
    const id = cookieStore.get('auth_session')?.value
    if (!id) return null
    return validateSession(id)
}

// GET /api/lists/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const list = await prisma.list.findUnique({
    where:   { id: params.id },
    include: {
      user:    { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      items: {
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          reservedBy:   { select: { id: true, name: true } },
          createdBy_item: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'Liste introuvable' }, { status: 404 })
  }

  // Vérifier les droits d'accès
  if (list.privacy === 'PRIVATE') {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const isOwner  = session.userId === list.userId
    const isMember = list.members.some(m => m.userId === session.userId)

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
  }

  prisma.list.update({
    where: { id: params.id },
    data:  { viewCount: { increment: 1 } },
  }).catch(() => {})

  return NextResponse.json(list)
}

// PATCH /api/lists/[id] - Modifier une liste
export async function PATCH(
    request: NextRequest,
    { params }: { params: {id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id: params.id } })
    if (!list) {
        return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }
    if (list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const updated = await prisma.list.update({
        where: { id: params.id },
        data: {
            title: body.title,
            description: body.description,
            privacy: body.privacy,
            budget: body.budget,
            eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
        },
    })

    return NextResponse.json(updated)
}

// DELETE /api/lists/[id]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const list = await prisma.list.findUnique({ where: { id: params.id } })
    if (!list) {
        return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }
    if (list.userId !== session.userId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.list.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
}