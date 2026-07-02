# 🎅 PICKPERFECT — SECRET SANTA COMPLET
## Tirage · Listes de souhaits · Rappels automatiques

---

## 🧠 RÉFLEXION

> Le Secret Santa c'est magique quand ça marche.
> Ça rate quand les gens oublient de remplir leur liste,
> oublient d'acheter, ou reçoivent quelque chose de complètement raté.
> On résout les trois : liste de souhaits privée pour guider l'acheteur,
> rappels automatiques pour ne pas oublier, et une interface claire
> qui centralise tout dans le groupe.

---

## 📋 CE QU'ON FAIT

1. Schéma — modèles SecretSanta + SecretSantaWish
2. API tirage + gestion
3. API listes de souhaits
4. API rappels
5. Interface groupe — section Secret Santa
6. Page liste de souhaits

---

## ÉTAPE 1 — SCHÉMA

Dans `prisma/schema.prisma`, ajoute après `SecretSantaAssign` :

```prisma
model SecretSantaWish {
  id            String   @id @default(cuid())
  assignId      String
  assign        SecretSantaAssign @relation(fields: [assignId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  price         Float?
  url           String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("secret_santa_wishes")
}
```

Dans `SecretSantaAssign`, ajoute la relation :
```prisma
model SecretSantaAssign {
  // ...champs existants...
  wishes        SecretSantaWish[]
  wishesFilledAt DateTime?   // date à laquelle le receveur a rempli sa liste
}
```

Dans `SecretSanta`, ajoute :
```prisma
model SecretSanta {
  // ...champs existants...
  eventDate     DateTime?
  launchedAt    DateTime?
  lastReminderAt DateTime?
}
```

```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name add_secret_santa_wishes
```

---

## ÉTAPE 2 — API SECRET SANTA AMÉLIORÉE

Remplace tout `app/api/groups/[id]/secret-santa/route.ts` :

```typescript
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
    filledWishes: santa.assignments.filter(a => a.wishesFilledAt).length,
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
```

---

## ÉTAPE 3 — API LISTES DE SOUHAITS

```powershell
mkdir "app\api\groups\[id]\secret-santa\wishes"
code "app/api/groups/[id]/secret-santa/wishes/route.ts"
```

```typescript
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

// GET — Voir les souhaits de ma cible
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const santa = await prisma.secretSanta.findUnique({ where: { groupId: id } })
  if (!santa) return NextResponse.json({ error: 'Pas de Secret Santa' }, { status: 404 })

  // Trouver mon assignment (je suis le giver)
  const myAssign = await prisma.secretSantaAssign.findFirst({
    where:   { secretSantaId: santa.id, giverId: session.userId },
    include: { wishes: { orderBy: { createdAt: 'asc' } } },
  })

  if (!myAssign) return NextResponse.json({ error: 'Vous ne participez pas' }, { status: 404 })

  return NextResponse.json(myAssign.wishes)
}

// POST — Ajouter un souhait à MA liste (je suis le receiver)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id }                            = await params
  const { title, description, price, url } = await request.json()

  if (!title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const santa = await prisma.secretSanta.findUnique({ where: { groupId: id } })
  if (!santa) return NextResponse.json({ error: 'Pas de Secret Santa' }, { status: 404 })

  // Je suis le receiver — trouver l'assign où je suis la cible
  const myAssign = await prisma.secretSantaAssign.findFirst({
    where: { secretSantaId: santa.id, receiverId: session.userId },
  })

  if (!myAssign) return NextResponse.json({ error: 'Vous ne participez pas' }, { status: 404 })

  const wish = await prisma.secretSantaWish.create({
    data: {
      assignId:    myAssign.id,
      title:       title.trim(),
      description: description || null,
      price:       price ? parseFloat(price) : null,
      url:         url || null,
    },
  })

  // Marquer la liste comme remplie
  await prisma.secretSantaAssign.update({
    where: { id: myAssign.id },
    data:  { wishesFilledAt: new Date() },
  })

  return NextResponse.json(wish, { status: 201 })
}
```

```powershell
mkdir "app\api\groups\[id]\secret-santa\wishes\[wishId]"
code "app/api/groups/[id]/secret-santa/wishes/[wishId]/route.ts"
```

```typescript
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; wishId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { wishId } = await params

  const wish = await prisma.secretSantaWish.findUnique({
    where:   { id: wishId },
    include: { assign: true },
  })

  if (!wish) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  if (wish.assign.receiverId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await prisma.secretSantaWish.delete({ where: { id: wishId } })
  return NextResponse.json({ success: true })
}
```

---

## ÉTAPE 4 — CRON RAPPELS AUTOMATIQUES

```powershell
mkdir "app\api\cron\secret-santa"
code "app/api/cron/secret-santa/route.ts"
```

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { sendEmail }                 from '@/lib/email/mailer'
import { CreateNotification }        from '@/lib/notifications'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now      = new Date()
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  let   sent     = 0

  const santas = await prisma.secretSanta.findMany({
    where:   { status: 'ACTIVE' },
    include: {
      group:       { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
      assignments: { include: { wishes: true } },
    },
  })

  for (const santa of santas) {
    const memberMap   = Object.fromEntries(santa.group.members.map(m => [m.userId, m.user]))
    const launchedAt  = santa.launchedAt ? new Date(santa.launchedAt) : null
    const eventDate   = santa.eventDate  ? new Date(santa.eventDate)  : null
    const daysSinceLaunch = launchedAt ? Math.floor((now.getTime() - launchedAt.getTime()) / 86400000) : null
    const daysUntilEvent  = eventDate  ? Math.ceil((eventDate.getTime() - now.getTime()) / 86400000)  : null

    for (const assign of santa.assignments) {
      const giver    = memberMap[assign.giverId]
      const receiver = memberMap[assign.receiverId]
      if (!giver) continue

      const hasWishes = assign.wishes.length > 0

      // Rappel J+3 si liste pas remplie
      if (daysSinceLaunch === 3 && !hasWishes) {
        await sendEmail({
          to:      giver.email,
          subject: `🎅 N'oublie pas ta liste de souhaits Secret Santa !`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px">
            <h1>🎁 Ta liste de souhaits Secret Santa</h1>
            <p>Tu n'as pas encore rempli ta liste de souhaits pour le Secret Santa <strong>${santa.group.name}</strong>.</p>
            <p>La personne qui t'a tiré au sort ne sait pas quoi t'offrir !</p>
            <a href="${BASE_URL}/groups/${santa.groupId}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
              Remplir ma liste
            </a>
          </div>`,
        }).catch(() => {})

        await CreateNotification({
          userId:  assign.receiverId,
          type:    'GROUP_INVITE',
          title:   '🎅 Remplis ta liste de souhaits !',
          message: `La personne qui t'a tiré attend tes idées pour ${santa.group.name}`,
          link:    `/groups/${santa.groupId}`,
        }).catch(() => {})

        sent++
      }

      // Rappel J-7 avant l'événement
      if (daysUntilEvent === 7) {
        await sendEmail({
          to:      giver.email,
          subject: `🎅 Plus que 7 jours pour le Secret Santa !`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px">
            <h1>⏰ Plus que 7 jours !</h1>
            <p>Le Secret Santa <strong>${santa.group.name}</strong> approche !</p>
            <p>N'oublie pas de penser à ton cadeau pour <strong>${receiver?.name ?? 'ta cible'}</strong>.</p>
            <a href="${BASE_URL}/groups/${santa.groupId}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
              Voir les souhaits de ma cible
            </a>
          </div>`,
        }).catch(() => {})

        await CreateNotification({
          userId:  assign.giverId,
          type:    'GROUP_INVITE',
          title:   '⏰ Plus que 7 jours pour le Secret Santa !',
          message: `Pense à acheter ton cadeau pour ${santa.group.name}`,
          link:    `/groups/${santa.groupId}`,
        }).catch(() => {})

        sent++
      }

      // Rappel J-3 avant l'événement
      if (daysUntilEvent === 3) {
        await sendEmail({
          to:      giver.email,
          subject: `🚨 Secret Santa dans 3 jours — tu as ton cadeau ?`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px">
            <h1>🚨 Plus que 3 jours !</h1>
            <p>Le Secret Santa <strong>${santa.group.name}</strong> est dans 3 jours.</p>
            <p>Tu as bien acheté ton cadeau pour <strong>${receiver?.name ?? 'ta cible'}</strong> ? 😅</p>
            <a href="${BASE_URL}/groups/${santa.groupId}" style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
              Voir les souhaits
            </a>
          </div>`,
        }).catch(() => {})

        await CreateNotification({
          userId:  assign.giverId,
          type:    'GROUP_INVITE',
          title:   '🚨 Secret Santa dans 3 jours !',
          message: `Tu as ton cadeau pour ${santa.group.name} ?`,
          link:    `/groups/${santa.groupId}`,
        }).catch(() => {})

        sent++
      }
    }
  }

  return NextResponse.json({ success: true, sent })
}
```

Ajoute dans `crontab -e` sur le Mac Mini :
```
0 9 * * * curl -s "https://ton-domaine.com/api/cron/secret-santa?token=TON_CRON_SECRET" > /dev/null
```

---

## ÉTAPE 5 — SECTION SECRET SANTA DANS LA PAGE GROUPE

Dans `app/groups/[id]/page.tsx`, ajoute les états :

```typescript
const [santa,        setSanta]        = useState<any>(null)
const [santaLoading, setSantaLoading] = useState(false)
const [santaForm,    setSantaForm]    = useState({ budget: '', eventDate: '' })
const [myWishes,     setMyWishes]     = useState<any[]>([])
const [targetWishes, setTargetWishes] = useState<any[]>([])
const [wishForm,     setWishForm]     = useState({ title: '', description: '', price: '', url: '' })
const [showWishes,   setShowWishes]   = useState(false)
const [addingWish,   setAddingWish]   = useState(false)
const [reminding,    setReminding]    = useState(false)
```

Ajoute le chargement du Secret Santa dans le `useEffect` :

```typescript
// Après le chargement du groupe
fetch(`/api/groups/${groupId}/secret-santa`)
  .then(r => r.ok ? r.json() : null)
  .then(d => setSanta(d))
```

Ajoute les fonctions :

```typescript
const launchSanta = async () => {
  if (!confirm(`Lancer le Secret Santa pour ${group.members.length} membres ?`)) return
  setSantaLoading(true)
  const res = await fetch(`/api/groups/${groupId}/secret-santa`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body:   JSON.stringify({
      budget:    santaForm.budget ? parseFloat(santaForm.budget) : null,
      eventDate: santaForm.eventDate || null,
      year:      new Date().getFullYear(),
    }),
  })
  setSantaLoading(false)
  if (res.ok) {
    const data = await res.json()
    alert(`🎅 Tirage effectué ! ${data.participants} participants ont reçu leur email.`)
    const updated = await fetch(`/api/groups/${groupId}/secret-santa`).then(r => r.json())
    setSanta(updated)
  }
}

const sendReminder = async () => {
  if (!confirm('Envoyer un rappel à tout le monde ? 🎅')) return
  setReminding(true)
  const res  = await fetch(`/api/groups/${groupId}/secret-santa`, { method: 'PATCH' })
  const data = await res.json()
  setReminding(false)
  alert(`✅ ${data.sent} rappels envoyés !`)
}

const loadWishes = async () => {
  setShowWishes(true)
  const res = await fetch(`/api/groups/${groupId}/secret-santa/wishes`)
  if (res.ok) setTargetWishes(await res.json())
}

const addWish = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!wishForm.title.trim()) return
  setAddingWish(true)
  const res = await fetch(`/api/groups/${groupId}/secret-santa/wishes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body:   JSON.stringify(wishForm),
  })
  setAddingWish(false)
  if (res.ok) {
    const wish = await res.json()
    setMyWishes(prev => [...prev, wish])
    setWishForm({ title: '', description: '', price: '', url: '' })
    const updated = await fetch(`/api/groups/${groupId}/secret-santa`).then(r => r.json())
    setSanta(updated)
  }
}

const deleteWish = async (wishId: string) => {
  await fetch(`/api/groups/${groupId}/secret-santa/wishes/${wishId}`, { method: 'DELETE' })
  setMyWishes(prev => prev.filter(w => w.id !== wishId))
}
```

Ajoute la section Secret Santa dans le JSX, avant la fermeture de la page :

```tsx
{/* ================================================
    SECTION SECRET SANTA
================================================ */}
<div className="card" style={{ marginTop: 'var(--s-6)' }}>
  <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 'var(--s-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
    🎅 Secret Santa
  </h2>

  {!santa ? (
    /* Pas encore lancé */
    isOwner ? (
      <div>
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 'var(--s-4)' }}>
          Lance le tirage pour que chaque membre reçoive son attribution par email.
        </p>
        <div className="form-row" style={{ marginBottom: 'var(--s-4)' }}>
          <div className="form-group">
            <label className="label">Budget suggéré (€) <span className="form-hint">(optionnel)</span></label>
            <input type="number" value={santaForm.budget} onChange={e => setSantaForm(p => ({ ...p, budget: e.target.value }))} placeholder="Ex : 20" min="0" />
          </div>
          <div className="form-group">
            <label className="label">Date de l'événement <span className="form-hint">(optionnel)</span></label>
            <input type="date" value={santaForm.eventDate} onChange={e => setSantaForm(p => ({ ...p, eventDate: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={launchSanta} disabled={santaLoading || group.members.length < 2}>
          {santaLoading ? <><span className="spinner" /> Tirage en cours…</> : <><i className="fas fa-hat-santa" /> Lancer le Secret Santa</>}
        </button>
        {group.members.length < 2 && (
          <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: 'var(--s-2)' }}>
            Il faut au moins 2 membres pour lancer un Secret Santa.
          </p>
        )}
      </div>
    ) : (
      <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
        Le propriétaire du groupe n'a pas encore lancé le Secret Santa.
      </p>
    )
  ) : (
    <div>
      {/* Stats (proprio uniquement) */}
      {santa.isOwner && santa.stats && (
        <div style={{ display: 'flex', gap: 'var(--s-4)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--s-4)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--peach)' }}>
              {santa.stats.filledWishes}/{santa.stats.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>listes remplies</div>
          </div>
          {santa.eventDate && (
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--s-4)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--lavender)' }}>
                {Math.max(0, Math.ceil((new Date(santa.eventDate).getTime() - Date.now()) / 86400000))}j
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>avant l'événement</div>
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={sendReminder}
            disabled={reminding}
            style={{ alignSelf: 'center' }}
            title="Envoyer un rappel à tout le monde"
          >
            {reminding ? <><span className="spinner" /> Envoi…</> : <><i className="fas fa-bell" /> Relancer tout le monde 🎅</>}
          </button>
        </div>
      )}

      {/* Mon tirage */}
      {santa.receiver && (
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-xl)', padding: 'var(--s-5)', marginBottom: 'var(--s-5)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 'var(--s-2)' }}>🎅 Vous offrez à :</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--peach)', marginBottom: 'var(--s-3)' }}>
            {santa.receiver.name ?? 'Votre cible'}
          </p>
          {santa.budget && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 'var(--s-3)' }}>
              Budget suggéré : <strong>{santa.budget}€</strong>
            </p>
          )}
          <button className="btn btn-accent btn-sm" onClick={loadWishes}>
            <i className="fas fa-list" /> Voir ses souhaits
          </button>
        </div>
      )}

      {/* Souhaits de ma cible */}
      {showWishes && (
        <div style={{ marginBottom: 'var(--s-5)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--s-3)', fontSize: '0.95rem' }}>
            🎁 Liste de souhaits de {santa.receiver?.name ?? 'votre cible'}
          </h3>
          {targetWishes.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
              {santa.receiver?.name ?? 'Votre cible'} n'a pas encore rempli sa liste de souhaits.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {targetWishes.map(w => (
                <div key={w.id} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 'var(--s-4)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{w.title}</div>
                  {w.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 4 }}>{w.description}</div>}
                  <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
                    {w.price && <span className="badge badge-mint">{w.price}€</span>}
                    {w.url && <a href={w.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><i className="fas fa-external-link-alt" /> Voir</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ma liste de souhaits */}
      <div>
        <h3 style={{ fontWeight: 700, marginBottom: 'var(--s-3)', fontSize: '0.95rem' }}>
          📝 Ma liste de souhaits
          <span className="form-hint" style={{ marginLeft: 8 }}>visible uniquement par la personne qui m'a tiré</span>
        </h3>

        {myWishes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
            {myWishes.map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 'var(--s-3) var(--s-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.title}</div>
                  {w.price && <span style={{ fontSize: '0.75rem', color: 'var(--mint)' }}>{w.price}€</span>}
                </div>
                {w.url && <a href={w.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm"><i className="fas fa-external-link-alt" /></a>}
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteWish(w.id)}><i className="fas fa-trash" /></button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addWish} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <div className="form-row">
            <div className="form-group">
              <input
                type="text" value={wishForm.title}
                onChange={e => setWishForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Idée de cadeau *" required
              />
            </div>
            <div className="form-group">
              <input
                type="number" value={wishForm.price}
                onChange={e => setWishForm(p => ({ ...p, price: e.target.value }))}
                placeholder="Prix (€)" min="0" step="0.01"
              />
            </div>
          </div>
          <input
            type="url" value={wishForm.url}
            onChange={e => setWishForm(p => ({ ...p, url: e.target.value }))}
            placeholder="Lien produit (optionnel)"
          />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={addingWish} style={{ alignSelf: 'flex-start' }}>
            {addingWish ? <><span className="spinner" /> Ajout…</> : <><i className="fas fa-plus" /> Ajouter un souhait</>}
          </button>
        </form>
      </div>
    </div>
  )}
</div>
```

---

## ÉTAPE 6 — CRONTAB SUR LE MAC MINI

```bash
crontab -e
```

Ajoute :
```
0 9 * * * curl -s "https://ton-domaine.com/api/cron/secret-santa?token=TON_CRON_SECRET" > /dev/null
```

---

## ✅ TESTS

1. Crée un groupe avec 2+ membres
2. Lance le Secret Santa → ✅ emails envoyés
3. Va sur la page groupe → ✅ "Vous offrez à X"
4. Clique "Voir ses souhaits" → ✅ liste vide ou remplie
5. Remplis ta liste de souhaits → ✅ stats mises à jour pour le proprio
6. Clique "Relancer tout le monde" → ✅ confirmation rigolote + rappels

---

## 📁 FICHIERS CRÉÉS / MODIFIÉS

```
pickperfect/
├── prisma/schema.prisma
└── app/
    ├── groups/[id]/page.tsx                          ← + section Secret Santa
    └── api/
        ├── groups/[id]/secret-santa/route.ts        ← Réécrit complet
        ├── groups/[id]/secret-santa/wishes/route.ts ← Nouveau
        ├── groups/[id]/secret-santa/wishes/[wishId]/route.ts ← Nouveau
        └── cron/secret-santa/route.ts               ← Nouveau
```

---

*PickPerfect — Secret Santa complet terminé* 🎅
