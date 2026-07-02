import { NextRequest, NextResponse }  from 'next/server'
import { cookies }                    from 'next/headers'
import { prisma }                     from '@/lib/prisma'
import { validateSession }            from '@/lib/auth/sqlite-auth'
import { sendEmail }                  from '@/lib/email/mailer'
import { CreateNotification }         from '@/lib/notifications'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function createAssignments(memberIds: string[]) {
  if (memberIds.length < 2) throw new Error('Il faut au moins 2 participants')
  let attempts = 0
  while (attempts < 100) {
    const shuffled = shuffle(memberIds)
    if (shuffled.every((id, i) => id !== memberIds[i])) {
      return memberIds.map((giverId, i) => ({ giverId, receiverId: shuffled[i] }))
    }
    attempts++
  }
  return memberIds.map((giverId, i) => ({
    giverId,
    receiverId: memberIds[(i + 1) % memberIds.length],
  }))
}

async function sendSantaEmail(
  giverEmail: string,
  giverName: string | null,
  receiverName: string | null,
  budget: number | null,
  year: number,
  groupName: string,
  groupId: string
) {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await sendEmail({
    to:      giverEmail,
    subject: `🎅 Secret Santa ${year} — Votre tirage !`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
        <h1 style="font-size:24px;font-weight:800;margin-bottom:8px">🎅 Votre tirage Secret Santa</h1>
        <p style="color:#57534E;margin-bottom:8px">Bonjour ${giverName ?? 'vous'} !</p>
        <p style="color:#57534E;margin-bottom:24px">Dans le cadre du Secret Santa <strong>${groupName}</strong>, vous offrez à :</p>
        <div style="background:#FFF7F6;border:2px solid #FF9A8B;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <p style="font-size:2rem;font-weight:900;color:#FF6B5B;margin:0">${receiverName ?? 'votre cible'}</p>
        </div>
        ${budget ? `<p style="color:#78716C;font-size:14px;margin-bottom:24px">Budget suggéré : <strong>${budget}€</strong></p>` : ''}
        <a href="${BASE_URL}/groups/${groupId}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;margin-bottom:24px">
          Remplir ma liste de souhaits
        </a>
        <p style="color:#A8A29E;font-size:13px">Gardez ce tirage secret jusqu'au jour J ! 🤫</p>
      </div>
    `,
  }).catch(() => {})
}

// POST — Lancer le tirage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id }                    = await params
  const { budget, year, eventDate } = await request.json()

  const group = await prisma.group.findUnique({
    where:   { id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  })

  if (!group || group.ownerId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (group.members.length < 2) {
    return NextResponse.json({ error: 'Il faut au moins 2 membres' }, { status: 400 })
  }

  const memberIds   = group.members.map(m => m.userId)
  const assignments = createAssignments(memberIds)
  const santaYear   = year ?? new Date().getFullYear()

  const santa = await prisma.secretSanta.upsert({
    where:  { groupId: id },
    create: {
      groupId:    id,
      year:       santaYear,
      budget,
      status:     'ACTIVE',
      launchedAt: new Date(),
      eventDate:  eventDate ? new Date(eventDate) : null,
    },
    update: {
      year:       santaYear,
      budget,
      status:     'ACTIVE',
      launchedAt: new Date(),
      eventDate:  eventDate ? new Date(eventDate) : null,
    },
  })

  await prisma.secretSantaAssign.deleteMany({ where: { secretSantaId: santa.id } })
  await prisma.secretSantaAssign.createMany({
    data: assignments.map(a => ({ ...a, secretSantaId: santa.id })),
  })

  const memberMap = Object.fromEntries(group.members.map(m => [m.userId, m.user]))

  // Emails + notifications
  for (const a of assignments) {
    const giver    = memberMap[a.giverId]
    const receiver = memberMap[a.receiverId]
    if (!giver || !receiver) continue

    await sendSantaEmail(giver.email, giver.name, receiver.name, budget, santaYear, group.name, id)

    await CreateNotification({
      userId:  giver.id,
      type:    'GROUP_INVITE',
      title:   '🎅 Votre tirage Secret Santa est prêt !',
      message: `Vous offrez à ${receiver.name ?? 'quelqu\'un'} dans ${group.name}`,
      link:    `/groups/${id}`,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, participants: assignments.length })
}

// GET — Voir son tirage + stats (proprio)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const santa = await prisma.secretSanta.findUnique({
    where:   { groupId: id },
    include: { assignments: { include: { wishes: true } } },
  })

  if (!santa) return NextResponse.json({ error: 'Pas de Secret Santa' }, { status: 404 })

  // Mon tirage
  const myAssignment = santa.assignments.find(a => a.giverId === session.userId)

  // Infos sur ma cible (sans révéler qui offre à qui pour les autres)
  let receiver = null
  if (myAssignment) {
    receiver = await prisma.user.findUnique({
      where:  { id: myAssignment.receiverId },
      select: { id: true, name: true },
    })
  }

  // Stats (pour le proprio)
  const group = await prisma.group.findUnique({ where: { id }, select: { ownerId: true } })
  const isOwner = group?.ownerId === session.userId

  const stats = isOwner ? {
    total:      santa.assignments.length,
    filledWishes: santa.assignments.filter(a => a.wishedFilledAt).length,
  } : null

  return NextResponse.json({
    year:        santa.year,
    budget:      santa.budget,
    status:      santa.status,
    eventDate:   santa.eventDate,
    myAssignId:  myAssignment?.id ?? null,
    receiver:    receiver ? { name: receiver.name } : null,
    hasWishes:   (myAssignment?.wishes?.length ?? 0) > 0,
    stats,
    isOwner,
  })
}

// PATCH — Envoyer des rappels manuels
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const group = await prisma.group.findUnique({
    where:   { id },
    include: {
      members:     { include: { user: { select: { id: true, name: true, email: true } } } },
      secretSanta: { include: { assignments: { include: { wishes: true } } } },
    },
  })

  if (!group || group.ownerId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  if (!group.secretSanta) {
    return NextResponse.json({ error: 'Pas de Secret Santa actif' }, { status: 404 })
  }

  const BASE_URL   = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const memberMap  = Object.fromEntries(group.members.map(m => [m.userId, m.user]))
  let   sent       = 0

  for (const assign of group.secretSanta.assignments) {
    const giver    = memberMap[assign.giverId]
    const receiver = memberMap[assign.receiverId]
    if (!giver) continue

    const hasWishes = assign.wishes.length > 0

    await sendEmail({
      to:      giver.email,
      subject: `🎅 Rappel Secret Santa — ${group.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <h1 style="font-size:24px;font-weight:800;margin-bottom:16px">🎅 Rappel Secret Santa !</h1>
          <p style="color:#57534E;margin-bottom:16px">
            N'oubliez pas le Secret Santa <strong>${group.name}</strong> !
            ${group.secretSanta.eventDate
              ? `Il reste <strong>${Math.ceil((new Date(group.secretSanta.eventDate).getTime() - Date.now()) / 86400000)} jours</strong>.`
              : ''
            }
          </p>
          ${!hasWishes ? `
          <p style="color:#FF6B5B;font-weight:600;margin-bottom:16px">
            ⚠️ Vous n'avez pas encore rempli votre liste de souhaits !
            ${receiver ? `${receiver.name} ne sait pas quoi vous offrir.` : ''}
          </p>` : ''}
          <a href="${BASE_URL}/groups/${id}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
            Voir mon Secret Santa
          </a>
        </div>
      `,
    }).catch(() => {})

    await CreateNotification({
      userId:  assign.giverId,
      type:    'GROUP_INVITE',
      title:   '🎅 Rappel Secret Santa !',
      message: `N'oubliez pas le Secret Santa de ${group.name}`,
      link:    `/groups/${id}`,
    }).catch(() => {})

    sent++
  }

  await prisma.secretSanta.update({
    where: { groupId: id },
    data:  { lastReminderAt: new Date() },
  })

  return NextResponse.json({ success: true, sent })
}