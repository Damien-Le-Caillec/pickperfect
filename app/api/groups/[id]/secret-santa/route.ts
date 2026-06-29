import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'
import { sendEmail }                 from '@/lib/email/mailer'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

// Algorithme de tirage aléatoire
// Chaque personne offre à quelqu'un d'autre, personne n'offre à soi-même
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function createAssignments(memberIds: string[]): { giverId: string; receiverId: string }[] {
  if (memberIds.length < 2) throw new Error('Il faut au moins 2 participants')

  let attempts = 0
  while (attempts < 100) {
    const shuffled = shuffle(memberIds)
    const valid    = shuffled.every((id, i) => id !== memberIds[i])
    if (valid) {
      return memberIds.map((giverId, i) => ({ giverId, receiverId: shuffled[i] }))
    }
    attempts++
  }
  // Fallback garanti : décalage circulaire
  return memberIds.map((giverId, i) => ({
    giverId,
    receiverId: memberIds[(i + 1) % memberIds.length],
  }))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session  = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id }    = await params
  const { budget, year } = await request.json()

  const group = await prisma.group.findUnique({
    where:   { id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  })

  if (!group || group.ownerId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (group.members.length < 2) {
    return NextResponse.json({ error: 'Il faut au moins 2 membres pour un Secret Santa' }, { status: 400 })
  }

  const memberIds = group.members.map(m => m.userId)
  const assignments = createAssignments(memberIds)

  const santaYear = year ?? new Date().getFullYear()

  const santa = await prisma.secretSanta.upsert({
    where:  { groupId: id },
    create: { groupId: id, year: santaYear, budget, status: 'ACTIVE' },
    update: { year: santaYear, budget, status: 'ACTIVE' },
  })

  // Supprimer les anciens tirages
  await prisma.secretSantaAssign.deleteMany({ where: { secretSantaId: santa.id } })

  // Créer les nouveaux tirages
  await prisma.secretSantaAssign.createMany({
    data: assignments.map(a => ({ ...a, secretSantaId: santa.id })),
  })

  // Envoyer les emails (chacun voit seulement son attribution)
  const memberMap = Object.fromEntries(group.members.map(m => [m.userId, m.user]))

  for (const a of assignments) {
    const giver    = memberMap[a.giverId]
    const receiver = memberMap[a.receiverId]
    if (!giver || !receiver) continue

    await sendEmail({
      to:      giver.email,
      subject: `🎅 Secret Santa ${santaYear} — Votre tirage`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <h1 style="font-size:24px;font-weight:800;margin-bottom:8px">🎅 Votre tirage Secret Santa</h1>
          <p style="color:#57534E;line-height:1.65;font-size:16px;margin-bottom:8px">
            Vous offrez à :
          </p>
          <p style="font-size:2rem;font-weight:900;color:#FF9A8B;margin:16px 0">
            ${receiver.name ?? receiver.email}
          </p>
          ${budget ? `<p style="color:#78716C;font-size:14px">Budget suggéré : <strong>${budget}€</strong></p>` : ''}
          <p style="color:#57534E;line-height:1.65;margin-top:16px">
            Gardez ce tirage secret jusqu'au jour J !
          </p>
          <p style="color:#A8A29E;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #E7E5E4">
            PickPerfect · Secret Santa ${santaYear} · ${group.name}
          </p>
        </div>
      `,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, totalParticipants: assignments.length })
}

// GET — Voir son propre tirage
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const santa = await prisma.secretSanta.findUnique({
    where: { groupId: id },
  })
  if (!santa) return NextResponse.json({ error: 'Pas de Secret Santa pour ce groupe' }, { status: 404 })

  const myAssignment = await prisma.secretSantaAssign.findFirst({
    where:   { secretSantaId: santa.id, giverId: session.userId },
    include: { receiver: { select: { name: true, email: true } } },
  })

  return NextResponse.json({
    year:     santa.year,
    budget:   santa.budget,
    status:   santa.status,
    receiver: myAssignment?.receiver ?? null,
  })
}