# 🎁 PICKPERFECT — PARTIE 11B
## Calendrier anniversaires · Secret Santa · Participation partielle

---

## 🧠 RÉFLEXION

> Le calendrier d'anniversaires répond à la vraie douleur : on oublie.
> Pas parce qu'on s'en fiche, mais parce qu'on n'a pas de système.
> Un endroit centralisé avec les dates, les rappels, et un lien direct
> vers la liste de cadeaux — c'est tout ce qu'il faut.
>
> Secret Santa automatise une organisation qui se fait habituellement
> par SMS ou en personne avec des papiers dans un chapeau.
>
> La participation partielle débloue les cadeaux chers.
> Sans elle, un cadeau à 200€ reste à 0% de financement parce que
> personne ne veut payer seul. Avec elle, 5 personnes mettent 40€ chacune.

---

## 📋 CE QU'ON FAIT

1. Schéma : `Birthday` + `SecretSanta` + `Contribution`
2. API + page Calendrier anniversaires
3. Rappels email anniversaire
4. Mode Secret Santa dans un groupe
5. Participation partielle à un item

---

## ÉTAPE 1 — SCHÉMA

```bash
code prisma/schema.prisma
```

Ajoute après `ItemActivity` :

```prisma
model Birthday {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String    // Prénom de la personne
  date         DateTime  // Mois + jour (l'année est ignorée pour le calcul)
  relatedListId String?  // Lien optionnel vers une liste
  remindDays   Int       @default(7) // Rappel X jours avant
  createdAt    DateTime  @default(now())

  @@index([userId])
  @@map("birthdays")
}

model SecretSanta {
  id          String              @id @default(cuid())
  groupId     String              @unique
  group       Group               @relation(fields: [groupId], references: [id], onDelete: Cascade)
  year        Int
  budget      Float?
  status      SecretSantaStatus   @default(PENDING)
  assignments SecretSantaAssign[]
  createdAt   DateTime            @default(now())

  @@map("secret_santas")
}

model SecretSantaAssign {
  id            String      @id @default(cuid())
  secretSantaId String
  secretSanta   SecretSanta @relation(fields: [secretSantaId], references: [id], onDelete: Cascade)
  giverId       String
  giver         User        @relation("SecretSantaGiver",    fields: [giverId],    references: [id])
  receiverId    String
  receiver      User        @relation("SecretSantaReceiver", fields: [receiverId], references: [id])

  @@unique([secretSantaId, giverId])
  @@map("secret_santa_assignments")
}

enum SecretSantaStatus {
  PENDING
  ACTIVE
  DONE
}

model Contribution {
  id          String   @id @default(cuid())
  itemId      String
  item        Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount      Float
  message     String?
  createdAt   DateTime @default(now())

  @@unique([itemId, userId])
  @@map("contributions")
}
```

Dans les modèles existants, ajoute les relations inverses :

```prisma
model User {
  // ...
  birthdays            Birthday[]
  secretSantasGiving   SecretSantaAssign[] @relation("SecretSantaGiver")
  secretSantasReceiving SecretSantaAssign[] @relation("SecretSantaReceiver")
  contributions        Contribution[]
}

model Group {
  // ...
  secretSanta SecretSanta?
}

model Item {
  // ...
  contributions Contribution[]
}
```

```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name add_birthdays_secretsanta_contributions
```

---

## ÉTAPE 2 — API ANNIVERSAIRES

```powershell
mkdir app\api\birthdays
code app/api/birthdays/route.ts
```

**`pickperfect/app/api/birthdays/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { z }                         from 'zod'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

const Schema = z.object({
  name:          z.string().min(1).max(60),
  date:          z.string(), // format "MM-DD"
  relatedListId: z.string().optional(),
  remindDays:    z.number().int().min(0).max(30).default(7),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const birthdays = await prisma.birthday.findMany({
    where:   { userId: session.userId },
    orderBy: { date: 'asc' },
  })

  // Calculer combien de jours restants pour chacun
  const now = new Date()
  const enriched = birthdays.map(b => {
    const date     = new Date(b.date)
    const next     = new Date(now.getFullYear(), date.getMonth(), date.getDate())
    if (next < now) next.setFullYear(now.getFullYear() + 1)
    const daysLeft = Math.ceil((next.getTime() - now.getTime()) / 86400000)
    return { ...b, daysLeft, nextDate: next.toISOString() }
  })

  // Trier par prochain anniversaire
  enriched.sort((a, b) => a.daysLeft - b.daysLeft)

  return NextResponse.json(enriched)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body   = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Stocker la date comme le 1er janvier de l'an 2000 + mois/jour
  const [month, day] = parsed.data.date.split('-').map(Number)
  const dateObj      = new Date(2000, month - 1, day)

  const birthday = await prisma.birthday.create({
    data: {
      userId:        session.userId,
      name:          parsed.data.name,
      date:          dateObj,
      relatedListId: parsed.data.relatedListId,
      remindDays:    parsed.data.remindDays,
    },
  })

  return NextResponse.json(birthday, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await request.json()
  const b      = await prisma.birthday.findUnique({ where: { id } })
  if (!b || b.userId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await prisma.birthday.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

---

## ÉTAPE 3 — PAGE CALENDRIER ANNIVERSAIRES

```powershell
mkdir app\birthdays
code app/birthdays/page.tsx
```

**`pickperfect/app/birthdays/page.tsx`**
```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface Birthday {
  id: string; name: string; date: string
  daysLeft: number; nextDate: string
  remindDays: number; relatedListId: string | null
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loading,   setLoading]   = useState(true)
  const [form, setForm] = useState({ name: '', month: '01', day: '01', remindDays: 7 })
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    fetch('/api/birthdays').then(r => r.json()).then(d => { setBirthdays(d); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/birthdays', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ name: form.name, date: `${form.month}-${form.day}`, remindDays: form.remindDays }),
    })
    setAdding(false); setShowForm(false); setForm({ name: '', month: '01', day: '01', remindDays: 7 }); load()
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'anniversaire de ${name} ?`)) return
    await fetch('/api/birthdays', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const urgencyColor = (days: number) =>
    days <= 3  ? 'var(--error)'      :
    days <= 7  ? 'var(--peach-dark)' :
    days <= 30 ? 'var(--gold-dark)'  : 'var(--text-3)'

  const urgencyBg = (days: number) =>
    days <= 3  ? 'rgba(248,113,113,0.08)' :
    days <= 7  ? 'rgba(255,154,139,0.08)' :
    days <= 30 ? 'rgba(255,209,102,0.08)' : 'var(--surface)'

  return (
    <PageLayout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="page-title">Anniversaires</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(o => !o)}>
            <i className="fas fa-plus" /> Ajouter
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <form onSubmit={add} className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="label" htmlFor="bName">Prénom / nom *</label>
              <input id="bName" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Mamie, Lucas, Chloé…" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Mois</label>
                <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Jour</label>
                <select value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))}>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Rappel (jours avant)</label>
                <select value={form.remindDays} onChange={e => setForm(p => ({ ...p, remindDays: parseInt(e.target.value) }))}>
                  {[0, 1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d === 0 ? 'Désactivé' : `${d} jours`}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? <span className="spinner" /> : <><i className="fas fa-check" /> Enregistrer</>}
              </button>
            </div>
          </form>
        )}

        {/* Liste */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}><span className="spinner" /></div>
        ) : birthdays.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-birthday-cake" /></div>
            <h3>Aucun anniversaire enregistré</h3>
            <p>Ajoutez les dates de vos proches pour ne plus jamais les oublier.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {birthdays.map(b => {
              const date = new Date(b.date)
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--r-xl)', background: urgencyBg(b.daysLeft), border: '1px solid var(--border-1)' }}>
                  {/* Date badge */}
                  <div style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>{MONTHS[date.getMonth()]}</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, color: 'var(--text-1)' }}>{date.getDate()}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{b.name}</div>
                    <div style={{ fontSize: '0.78rem', color: urgencyColor(b.daysLeft), fontWeight: b.daysLeft <= 7 ? 700 : 400 }}>
                      {b.daysLeft === 0 ? '🎉 C\'est aujourd\'hui !' :
                       b.daysLeft === 1 ? '⚡ Demain !' :
                       `Dans ${b.daysLeft} jour${b.daysLeft !== 1 ? 's' : ''}`}
                    </div>
                  </div>

                  {b.relatedListId && (
                    <Link href={`/lists/${b.relatedListId}`} className="btn btn-ghost btn-sm">
                      <i className="fas fa-gift" /> Voir la liste
                    </Link>
                  )}

                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(b.id, b.name)}>
                    <i className="fas fa-trash" style={{ color: 'var(--error)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
```

---

## ÉTAPE 4 — RAPPELS EMAIL ANNIVERSAIRES

Ce cron s'exécute chaque jour et envoie les rappels configurés.

```powershell
mkdir app\api\cron
code app/api/cron/birthdays/route.ts
mkdir app\api\cron\birthdays
```

**`pickperfect/app/api/cron/birthdays/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma }                    from '@/lib/prisma'
import { sendEmail }                 from '@/lib/email/mailer'

// Cette route est appelée par un cron job quotidien
// Protégée par un secret token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const today    = new Date()
  const month    = today.getMonth() + 1
  const day      = today.getDate()

  // Trouver tous les anniversaires qui correspondent à aujourd'hui + remindDays
  const birthdays = await prisma.birthday.findMany({
    include: { user: { select: { email: true, name: true } } },
  })

  let sent = 0

  for (const b of birthdays) {
    if (b.remindDays === 0) continue

    const bDate    = new Date(b.date)
    const bMonth   = bDate.getMonth() + 1
    const bDay     = bDate.getDate()

    // Calculer quand envoyer le rappel
    const triggerDate = new Date(today.getFullYear(), bMonth - 1, bDay)
    triggerDate.setDate(triggerDate.getDate() - b.remindDays)

    // Vérifier si c'est aujourd'hui qu'on doit envoyer
    if (triggerDate.getMonth() + 1 === month && triggerDate.getDate() === day) {
      await sendEmail({
        to:      b.user.email,
        subject: `🎂 Anniversaire de ${b.name} dans ${b.remindDays} jour${b.remindDays !== 1 ? 's' : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:40px auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
            <h1 style="font-size:24px;font-weight:800;margin-bottom:8px">
              🎂 Rappel d'anniversaire
            </h1>
            <p style="color:#57534E;line-height:1.65;margin-bottom:24px">
              L'anniversaire de <strong>${b.name}</strong> est dans 
              <strong>${b.remindDays} jour${b.remindDays !== 1 ? 's' : ''}</strong>
              (le ${bDay.toString().padStart(2,'0')}/${bMonth.toString().padStart(2,'0')}).
            </p>
            ${b.relatedListId ? `
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/lists/${b.relatedListId}" 
                 style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
                Voir la liste de ${b.name}
              </a>
            ` : `
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/explore"
                 style="display:inline-block;background:linear-gradient(135deg,#FF9A8B,#E8826F);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700">
                Trouver un cadeau
              </a>
            `}
            <p style="color:#A8A29E;font-size:13px;margin-top:32px;padding-top:24px;border-top:1px solid #E7E5E4">
              Vous recevez cet email car vous avez configuré un rappel d'anniversaire sur PickPerfect.<br>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/birthdays">Gérer mes rappels</a>
            </p>
          </div>
        `,
      }).catch(() => {})
      sent++
    }
  }

  return NextResponse.json({ success: true, sent })
}
```

Ajoute dans `.env.local` :

```bash
CRON_SECRET=une-chaine-aleatoire-longue
```

Sur le mini PC, configure un cron job pour appeler cette route chaque matin :

```bash
# Sur le Mac Mini, dans le terminal
crontab -e
```

```
0 8 * * * curl -s "https://pickperfect.ton-domaine.com/api/cron/birthdays?token=une-chaine-aleatoire-longue" > /dev/null
```

---

## ÉTAPE 5 — MODE SECRET SANTA

### 5.1 API Secret Santa

```powershell
mkdir "app\api\groups\[id]\secret-santa"
code "app/api/groups/[id]/secret-santa/route.ts"
```

**`pickperfect/app/api/groups/[id]/secret-santa/route.ts`**
```typescript
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
```

---

## ÉTAPE 6 — PARTICIPATION PARTIELLE

```powershell
mkdir "app\api\items\[id]\contribute"
code "app/api/items/[id]/contribute/route.ts"
```

**`pickperfect/app/api/items/[id]/contribute/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'
import { addPoints }                 from '@/lib/gamification/pointsService'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

// GET — Voir les contributions
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [contributions, item] = await Promise.all([
    prisma.contribution.findMany({
      where:   { itemId: id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.item.findUnique({
      where:  { id },
      select: { price: true, title: true },
    }),
  ])

  const total = contributions.reduce((sum, c) => sum + c.amount, 0)
  const pct   = item?.price ? Math.min(100, Math.round((total / item.price) * 100)) : 0

  return NextResponse.json({ contributions, total, pct, price: item?.price })
}

// POST — Ajouter une contribution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id }               = await params
  const { amount, message }  = await request.json()

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }

  const item = await prisma.item.findUnique({
    where:   { id },
    include: { list: true },
  })
  if (!item) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 })
  if (item.list.userId === session.userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas contribuer à votre propre liste' }, { status: 403 })
  }

  // Vérifier si déjà contribué
  const existing = await prisma.contribution.findUnique({
    where: { itemId_userId: { itemId: id, userId: session.userId } },
  })

  const contribution = existing
    ? await prisma.contribution.update({
        where: { itemId_userId: { itemId: id, userId: session.userId } },
        data:  { amount, message },
      })
    : await prisma.contribution.create({
        data: { itemId: id, userId: session.userId, amount, message },
      })

  // Si 100% financé, marquer comme réservé
  const all   = await prisma.contribution.findMany({ where: { itemId: id } })
  const total = all.reduce((sum, c) => sum + c.amount, 0)

  if (item.price && total >= item.price && !item.reserved) {
    await prisma.item.update({
      where: { id },
      data:  { reserved: true, reservedById: session.userId },
    })
  }

  await addPoints(session.userId, 'item_reservation').catch(() => {})

  return NextResponse.json(contribution)
}
```

### Ajouter le bouton "Participer" dans la page liste

Dans `app/lists/[id]/page.tsx` — cherche :

**Cherche :** `{!isOwner && (`

Dans les `itemActions`, juste après le bloc réservation existant, ajoute un bouton "Participer" pour les items avec un prix :

```tsx
{/* Participation partielle — visible si item a un prix et n'est pas déjà entièrement réservé */}
{!isOwner && item.price && !item.reserved && (
  <button
    className="btn btn-ghost btn-sm"
    style={{ fontSize: '0.78rem' }}
    onClick={() => {
      const amount = prompt(`Montant de votre participation (max ${item.price}€) :`)
      if (!amount || isNaN(parseFloat(amount))) return
      fetch(`/api/items/${item.id}/contribute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ amount: parseFloat(amount) }),
      }).then(() => loadList())
    }}
  >
    <i className="fas fa-hand-holding-usd" /> Participer
  </button>
)}
```

---

## ÉTAPE 7 — LIENS DANS LE HEADER

Dans `components/layout/Header.tsx` —

**Cherche :** `{ href: '/friends',      label: 'Amis',      icon: 'fa-user-friends' },`

**Ajoute juste après :**

```typescript
{ href: '/birthdays', label: 'Anniversaires', icon: 'fa-birthday-cake' },
```

---

## ✅ TESTS

**Anniversaires**
1. Va sur `/birthdays` → ajoute un anniversaire pour demain
2. ✅ S'affiche en rouge avec "Demain !"
3. Le cron enverrait un email la veille (teste en appelant `/api/cron/birthdays?token=...`)

**Secret Santa**
1. Crée un groupe avec au moins 2 membres
2. Depuis la page du groupe, lance le Secret Santa
3. ✅ Chaque membre reçoit un email avec son tirage
4. ✅ L'algorithme garantit que personne n'a soi-même

**Participation partielle**
1. Sur un item avec un prix, clique "Participer"
2. Entre un montant
3. ✅ La contribution est enregistrée

---

## 📁 FICHIERS CRÉÉS

```
pickperfect/
└── app/
    ├── birthdays/page.tsx
    └── api/
        ├── birthdays/route.ts
        ├── cron/birthdays/route.ts
        ├── groups/[id]/secret-santa/route.ts
        └── items/[id]/contribute/route.ts
```

---

*PickPerfect — Partie 11B terminée*
