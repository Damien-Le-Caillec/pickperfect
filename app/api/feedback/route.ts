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

// POST — Envoyer un feedback
export async function POST(request: NextRequest) {
  const session = await getSession()

  const { type, message, page } = await request.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 })
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId:  session?.userId ?? null,
      type:    type ?? 'OTHER',
      message: message.trim(),
      page:    page ?? null,
    },
  })

  return NextResponse.json(feedback, { status: 201 })
}

// GET — Liste des feedbacks (admin uniquement)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { role: true },
  })

  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const feedbacks = await prisma.feedback.findMany({
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(feedbacks)
}