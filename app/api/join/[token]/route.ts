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

export async function POST(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Connectez-vous pour rejoindre cette liste', needsAuth: true },
      { status: 401 }
    )
  }

  // Trouver le token
  const invite = await prisma.inviteToken.findUnique({
    where: { token: params.token },
  })

  if (!invite) {
    return NextResponse.json(
      { error: 'Lien d\'invitation invalide' },
      { status: 404 }
    )
  }

  // Vérifier expiration
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Ce lien d\'invitation a expiré' },
      { status: 410 }
    )
  }

  // Vérifier max utilisations
  if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) {
    return NextResponse.json(
      { error: 'Ce lien d\'invitation a atteint sa limite d\'utilisations' },
      { status: 410 }
    )
  }

  // Vérifier que l'utilisateur n'est pas déjà membre
  const existing = await prisma.listMember.findUnique({
    where: {
      listId_userId: {
        listId: invite.listId,
        userId: session.userId,
      },
    },
  })

  // Vérifier que ce n'est pas le propriétaire
  const list = await prisma.list.findUnique({ where: { id: invite.listId } })
  if (list?.userId === session.userId) {
    return NextResponse.json(
      { listId: invite.listId, message: 'Vous êtes déjà propriétaire' },
    )
  }

  if (!existing) {
    // Ajouter comme membre
    await prisma.$transaction([
      prisma.listMember.create({
        data: {
          listId:    invite.listId,
          userId:    session.userId,
          role:      invite.role,
          invitedBy: invite.createdBy,
        },
      }),
      // Incrémenter le compteur d'utilisations
      prisma.inviteToken.update({
        where: { token: params.token },
        data:  { usedCount: { increment: 1 } },
      }),
    ])
  }

  return NextResponse.json({ listId: invite.listId, role: invite.role })
}