import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { z }                         from 'zod'
import bcrypt                        from 'bcrypt'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

const Schema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword:     z.string().min(8, 'Minimum 8 caractères'),
})

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const body   = await request.json()
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  // Récupérer le hash actuel
  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { hashedPassword: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  // Vérifier l'ancien mot de passe
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.hashedPassword)
  if (!valid) {
    return NextResponse.json(
      { error: 'Mot de passe actuel incorrect' },
      { status: 400 }
    )
  }

  // Hasher et sauvegarder le nouveau
  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12)

  await prisma.user.update({
    where: { id: session.userId },
    data:  { hashedPassword },
  })

  // Supprimer toutes les autres sessions (sécurité)
  await prisma.session.deleteMany({
    where: {
      userId: session.userId,
      NOT:    { id: session.id },
    },
  })

  return NextResponse.json({ success: true })
}