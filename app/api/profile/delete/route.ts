import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import bcrypt                        from 'bcrypt'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  // Demander confirmation par mot de passe
  const { password } = await request.json()

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { hashedPassword: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, user.hashedPassword)
  if (!valid) {
    return NextResponse.json(
      { error: 'Mot de passe incorrect' },
      { status: 400 }
    )
  }

  const userId = session.userId

  // Nettoyer ce que la cascade ne gère pas, puis supprimer l'utilisateur
  await prisma.$transaction([
    // Cadeaux réservés chez les autres : de nouveau disponibles
    prisma.item.updateMany({
      where: { reservedById: userId },
      data:  { reserved: false, reservedById: null, reservedAt: null },
    }),
    // Tirages Secret Santa où il est donneur ou receveur (bloquent la suppression)
    prisma.secretSantaAssign.deleteMany({
      where: { OR: [{ giverId: userId }, { receiverId: userId }] },
    }),
    // Listes qu'il a ajoutées à des groupes (bloquent la suppression)
    prisma.listGroup.deleteMany({ where: { addedById: userId } }),
    // Groupes dont il est propriétaire (sinon ils resteraient sans propriétaire)
    prisma.group.deleteMany({ where: { ownerId: userId } }),
    // Le reste (listes, sessions, points, commentaires…) part en cascade
    prisma.user.delete({ where: { id: userId } }),
  ])

  // Supprimer le cookie
  const cookieStore = await cookies()
  cookieStore.delete('auth_session')

  return NextResponse.json({ success: true })
}