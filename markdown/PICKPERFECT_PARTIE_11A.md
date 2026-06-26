# 🎁 PICKPERFECT — PARTIE 11A
## Amis · Listes partagées · Gestion membres · Countdown · Prix moyen

---

## 🧠 RÉFLEXION

> Le système d'amis change la façon dont on découvre les listes.
> Plutôt que de partager un lien à chaque fois, on suit quelqu'un une fois
> et ses listes publiques apparaissent automatiquement.
>
> Le countdown et le prix moyen sont des informations que l'utilisateur
> calcule mentalement de toute façon — autant les lui afficher directement.
> "Dans 12 jours · Moyenne 47€" — deux chiffres qui changent tout.

---

## 📋 CE QU'ON FAIT

1. Schéma : `Friendship` + `ItemActivity`
2. API amis (demande, accepter, refuser, supprimer)
3. Page "Mes amis"
4. Page "Listes partagées avec moi"
5. Countdown + prix moyen dans la page liste
6. Vue membres améliorée avec gestion
7. Historique des modifications sur un item

---

## ÉTAPE 1 — SCHÉMA

```bash
code prisma/schema.prisma
```

Ajoute ces deux modèles après `Notification` :

```prisma
model Friendship {
  id         String           @id @default(cuid())
  senderId   String
  sender     User             @relation("FriendshipSender",   fields: [senderId],   references: [id], onDelete: Cascade)
  receiverId String
  receiver   User             @relation("FriendshipReceiver", fields: [receiverId], references: [id], onDelete: Cascade)
  status     FriendshipStatus @default(PENDING)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  @@unique([senderId, receiverId])
  @@index([receiverId])
  @@map("friendships")
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model ItemActivity {
  id        String   @id @default(cuid())
  itemId    String
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action    String   // "ADDED" | "EDITED" | "RESERVED" | "UNRESERVED"
  details   String?  // JSON des champs modifiés
  createdAt DateTime @default(now())

  @@index([itemId])
  @@map("item_activities")
}
```

Dans le modèle `User`, ajoute les relations :

```prisma
model User {
  // ...relations existantes...
  friendshipsSent     Friendship[]  @relation("FriendshipSender")
  friendshipsReceived Friendship[]  @relation("FriendshipReceiver")
  itemActivities      ItemActivity[]
}
```

Dans le modèle `Item`, ajoute :

```prisma
model Item {
  // ...champs existants...
  activities ItemActivity[]
}
```

```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name add_friendships_activities
```

---

## ÉTAPE 2 — API AMIS

```powershell
mkdir app\api\friends
code app/api/friends/route.ts
```

**`pickperfect/app/api/friends/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'
import { createNotification }        from '@/lib/notifications'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

// GET — Mes amis + demandes en attente
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [friends, pending, requests] = await Promise.all([
    // Amis acceptés
    prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: session.userId,   status: 'ACCEPTED' },
          { receiverId: session.userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        sender:   { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    }),
    // Demandes envoyées en attente
    prisma.friendship.findMany({
      where:   { senderId: session.userId, status: 'PENDING' },
      include: { receiver: { select: { id: true, name: true, email: true } } },
    }),
    // Demandes reçues en attente
    prisma.friendship.findMany({
      where:   { receiverId: session.userId, status: 'PENDING' },
      include: { sender: { select: { id: true, name: true, email: true } } },
    }),
  ])

  // Normaliser : retourner toujours "l'autre utilisateur"
  const friendList = friends.map(f => ({
    id:     f.id,
    friend: f.senderId === session.userId ? f.receiver : f.sender,
    since:  f.updatedAt,
  }))

  return NextResponse.json({ friends: friendList, pending, requests })
}

// POST — Envoyer une demande d'ami (par email)
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const target = await prisma.user.findUnique({
    where:  { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true },
  })

  if (!target) return NextResponse.json({ error: 'Aucun compte avec cet email' }, { status: 404 })
  if (target.id === session.userId) return NextResponse.json({ error: 'Vous ne pouvez pas vous ajouter vous-même' }, { status: 400 })

  // Vérifier si une relation existe déjà
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId: session.userId,   receiverId: target.id },
        { senderId: target.id, receiverId: session.userId   },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'ACCEPTED') return NextResponse.json({ error: 'Vous êtes déjà amis' }, { status: 409 })
    if (existing.status === 'PENDING')  return NextResponse.json({ error: 'Une demande est déjà en cours' }, { status: 409 })
  }

  const friendship = await prisma.friendship.create({
    data: { senderId: session.userId, receiverId: target.id },
  })

  // Notifier l'autre utilisateur
  await createNotification({
    userId:  target.id,
    type:    'FRIEND_REQUEST',
    title:   'Nouvelle demande d\'ami',
    message: `${session.user.name ?? 'Quelqu\'un'} veut vous ajouter comme ami`,
    link:    '/friends',
  }).catch(() => {})

  return NextResponse.json({ success: true, friendship })
}
```

```powershell
mkdir "app\api\friends\[id]"
code "app/api/friends/[id]/route.ts"
```

**`pickperfect/app/api/friends/[id]/route.ts`**
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

// PATCH — Accepter ou refuser une demande
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id }    = await params
  const { action } = await request.json() // 'accept' | 'reject'

  const friendship = await prisma.friendship.findUnique({ where: { id } })
  if (!friendship || friendship.receiverId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data:  { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' },
  })

  return NextResponse.json(updated)
}

// DELETE — Supprimer un ami ou annuler une demande
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const friendship = await prisma.friendship.findUnique({ where: { id } })
  if (!friendship) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const isParty = friendship.senderId === session.userId || friendship.receiverId === session.userId
  if (!isParty) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  await prisma.friendship.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

---

## ÉTAPE 3 — PAGE "MES AMIS"

```powershell
mkdir app\friends
code app/friends/page.tsx
```

**`pickperfect/app/friends/page.tsx`**
```tsx
'use client'

import { useState, useEffect } from 'react'
import PageLayout from '@/components/layout/PageLayout'

interface Friend { id: string; friend: { id: string; name: string | null; email: string }; since: string }
interface Request { id: string; sender: { id: string; name: string | null; email: string } }

export default function FriendsPage() {
  const [friends,  setFriends]  = useState<Friend[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [email,    setEmail]    = useState('')
  const [adding,   setAdding]   = useState(false)
  const [addMsg,   setAddMsg]   = useState('')
  const [addErr,   setAddErr]   = useState('')

  const load = () => {
    fetch('/api/friends').then(r => r.json()).then(d => {
      setFriends(d.friends ?? [])
      setRequests(d.requests ?? [])
    })
  }

  useEffect(() => { load() }, [])

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true); setAddMsg(''); setAddErr('')
    const res  = await fetch('/api/friends', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ email }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setAddErr(data.error); return }
    setAddMsg('Demande envoyée !'); setEmail(''); load()
  }

  const respond = async (id: string, action: 'accept' | 'reject') => {
    await fetch(`/api/friends/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ action }),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cet ami ?')) return
    await fetch(`/api/friends/${id}`, { method: 'DELETE' })
    load()
  }

  const initials = (u: { name: string | null; email: string }) =>
    u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()

  return (
    <PageLayout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 className="page-title">Mes amis</h1>

        {/* ---- Ajouter un ami ---- */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            <i className="fas fa-user-plus" style={{ marginRight: 8, color: 'var(--peach)' }} />
            Ajouter un ami
          </h2>
          <form onSubmit={sendRequest} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email de votre ami…" required style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? <span className="spinner" /> : <><i className="fas fa-paper-plane" /> Inviter</>}
            </button>
          </form>
          {addMsg && <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem' }}><i className="fas fa-check" /> {addMsg}</p>}
          {addErr && <p style={{ color: 'var(--error)',   fontSize: '0.85rem', marginTop: '0.5rem' }}><i className="fas fa-times" /> {addErr}</p>}
        </div>

        {/* ---- Demandes reçues ---- */}
        {requests.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
              <i className="fas fa-bell" style={{ marginRight: 8, color: 'var(--peach)' }} />
              Demandes reçues ({requests.length})
            </h2>
            {requests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-1)' }}>
                <div className="avatar avatar-sm">{initials(r.sender)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{r.sender.name ?? r.sender.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{r.sender.email}</div>
                </div>
                <button className="btn btn-primary btn-sm"   onClick={() => respond(r.id, 'accept')}>Accepter</button>
                <button className="btn btn-secondary btn-sm" onClick={() => respond(r.id, 'reject')}>Refuser</button>
              </div>
            ))}
          </div>
        )}

        {/* ---- Liste d'amis ---- */}
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            <i className="fas fa-users" style={{ marginRight: 8, color: 'var(--peach)' }} />
            Amis ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
              Aucun ami pour l'instant. Invitez vos proches avec leur email.
            </p>
          ) : (
            friends.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-1)' }}>
                <div className="avatar avatar-sm">{initials(f.friend)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{f.friend.name ?? f.friend.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{f.friend.email}</div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(f.id)} title="Supprimer">
                  <i className="fas fa-user-minus" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  )
}
```

---

## ÉTAPE 4 — PAGE "LISTES PARTAGÉES AVEC MOI"

```powershell
mkdir app\shared-lists
code app/api/shared-lists/route.ts
mkdir app\api\shared-lists
```

**`pickperfect/app/api/shared-lists/route.ts`**
```typescript
import { NextResponse }    from 'next/server'
import { cookies }         from 'next/headers'
import { prisma }          from '@/lib/prisma'
import { validateSession } from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Listes où je suis membre (invité via lien)
  const memberships = await prisma.listMember.findMany({
    where:   { userId: session.userId },
    include: {
      list: {
        include: {
          user:   { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
          items:  { select: { reserved: true, price: true } },
        },
      },
    },
    orderBy: { invitedAt: 'desc' },
  })

  // Listes publiques des amis
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { senderId:   session.userId, status: 'ACCEPTED' },
        { receiverId: session.userId, status: 'ACCEPTED' },
      ],
    },
    select: { senderId: true, receiverId: true },
  })

  const friendIds = friendships.map(f =>
    f.senderId === session.userId ? f.receiverId : f.senderId
  )

  const friendLists = friendIds.length > 0 ? await prisma.list.findMany({
    where: {
      userId:  { in: friendIds },
      privacy: { in: ['PUBLIC', 'UNLISTED'] },
      NOT: { members: { some: { userId: session.userId } } }, // pas déjà dans memberships
    },
    include: {
      user:   { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
      items:  { select: { reserved: true, price: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  }) : []

  return NextResponse.json({
    asMember:    memberships.map(m => ({ ...m.list, role: m.role })),
    fromFriends: friendLists,
  })
}
```

```bash
code app/shared-lists/page.tsx
```

**`pickperfect/app/shared-lists/page.tsx`**
```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface SharedList {
  id: string; title: string; eventDate: string | null
  user: { name: string | null; email: string }
  _count: { items: number }
  items: { reserved: boolean; price: number | null }[]
  role?: string
}

export default function SharedListsPage() {
  const [asMember,    setAsMember]    = useState<SharedList[]>([])
  const [fromFriends, setFromFriends] = useState<SharedList[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/shared-lists').then(r => r.json()).then(d => {
      setAsMember(d.asmember ?? d.asMember ?? [])
      setFromFriends(d.fromFriends ?? [])
      setLoading(false)
    })
  }, [])

  const Card = ({ list, badge }: { list: SharedList; badge?: string }) => {
    const reserved = list.items.filter(i => i.reserved).length
    const pct      = list._count.items > 0 ? Math.round((reserved / list._count.items) * 100) : 0
    const prices   = list.items.filter(i => i.price).map(i => i.price as number)
    const avg      = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null
    const daysLeft = list.eventDate
      ? Math.ceil((new Date(list.eventDate).getTime() - Date.now()) / 86400000)
      : null

    return (
      <Link href={`/lists/${list.id}`} style={{ textDecoration: 'none', color: 'var(--text-1)' }}>
        <div className="card" style={{ transition: 'all var(--ease-out)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{list.title}</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                <i className="fas fa-user" style={{ marginRight: 4 }} />
                {list.user.name ?? list.user.email}
              </div>
            </div>
            {badge && <span className="badge badge-lavender">{badge}</span>}
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span><i className="fas fa-gift" style={{ marginRight: 4 }} />{list._count.items} cadeaux</span>
            {avg && <span><i className="fas fa-euro-sign" style={{ marginRight: 4 }} />Moy. {avg.toFixed(0)}€</span>}
            {daysLeft !== null && daysLeft > 0 && (
              <span style={{ color: daysLeft <= 7 ? 'var(--error)' : daysLeft <= 30 ? 'var(--peach-dark)' : 'var(--text-3)' }}>
                <i className="fas fa-clock" style={{ marginRight: 4 }} />
                dans {daysLeft} jour{daysLeft !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="progress" style={{ height: 6 }}>
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
            {reserved}/{list._count.items} réservés
          </div>
        </div>
      </Link>
    )
  }

  if (loading) return <PageLayout><div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}><span className="spinner" /></div></PageLayout>

  return (
    <PageLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 className="page-title">Listes partagées avec moi</h1>

        {asMember.length > 0 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '1rem', marginTop: '1.5rem' }}>
              <i className="fas fa-user-check" style={{ marginRight: 8, color: 'var(--peach)' }} />
              Où j'ai un rôle ({asMember.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {asMembers.map(l => <Card key={l.id} list={l} badge={l.role === 'EDITOR' ? 'Éditeur' : 'Spectateur'} />)}
            </div>
          </>
        )}

        {fromFriends.length > 0 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '1rem' }}>
              <i className="fas fa-users" style={{ marginRight: 8, color: 'var(--lavender-dark)' }} />
              Listes de mes amis ({fromFriends.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
              {fromFriends.map(l => <Card key={l.id} list={l} />)}
            </div>
          </>
        )}

        {asMembers.length === 0 && fromFriends.length === 0 && (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-share-alt" /></div>
            <h3>Aucune liste partagée</h3>
            <p>Les listes de vos amis et celles où vous êtes invité apparaîtront ici.</p>
            <Link href="/friends" className="btn btn-primary">
              <i className="fas fa-user-plus" /> Ajouter des amis
            </Link>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
```

---

## ÉTAPE 5 — COUNTDOWN + PRIX MOYEN

Dans `app/lists/[id]/page.tsx` — cherche avec **Ctrl+F** :

**Cherche :** `{list.eventDate && (`

**Remplace le bloc eventDate dans `listMeta` par :**

```tsx
{list.eventDate && (() => {
  const daysLeft = Math.ceil(
    (new Date(list.eventDate!).getTime() - Date.now()) / 86400000
  )
  return (
    <span style={{ color: daysLeft <= 7 ? 'var(--error)' : daysLeft <= 30 ? 'var(--peach-dark)' : undefined, fontWeight: daysLeft <= 30 ? 700 : 400 }}>
      <i className="fas fa-calendar-alt" />
      {new Date(list.eventDate!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
      {daysLeft > 0
        ? <> · <i className="fas fa-clock" style={{ marginLeft: 4 }} /> dans {daysLeft} jour{daysLeft !== 1 ? 's' : ''}</>
        : daysLeft === 0
          ? <> · <strong>C'est aujourd'hui !</strong></>
          : <> · <span style={{ color: 'var(--text-3)' }}>passé</span></>
      }
    </span>
  )
})()}
```

**Cherche :** `{list.budget && (`

**Juste après** ce bloc budget, ajoute le prix moyen :

```tsx
{/* Prix moyen des items */}
{(() => {
  const prices = list.items
    .filter(i => i.price && i.price > 0)
    .map(i => i.price as number)
  if (prices.length === 0) return null
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  return (
    <span>
      <i className="fas fa-chart-bar" />
      Moyenne : {avg.toFixed(0)} €
    </span>
  )
})()}
```

---

## ÉTAPE 6 — VUE MEMBRES AMÉLIORÉE

**Cherche dans `app/lists/[id]/page.tsx` :** `Membres ({list.members.length})`

**Remplace le bloc membres dans le panneau invitation par :**

```tsx
{list.members.length > 0 && (
  <div style={{ marginTop: 'var(--s-5)', borderTop: '1px solid var(--border-1)', paddingTop: 'var(--s-4)' }}>
    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 'var(--s-3)' }}>
      Membres ({list.members.length})
    </p>
    {list.members.map(member => (
      <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', padding: '8px 0' }}>
        <div className="avatar avatar-xs" style={{ background: 'linear-gradient(135deg,var(--peach-light),var(--lavender-light))', color: 'white', fontWeight: 700 }}>
          {member.user.name?.[0]?.toUpperCase() ?? member.user.email[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{member.user.name ?? member.user.email}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{member.user.email}</div>
        </div>
        <span className={`badge ${member.role === 'EDITOR' ? 'badge-lavender' : 'badge-neutral'}`}>
          {member.role === 'EDITOR' ? 'Éditeur' : 'Spectateur'}
        </span>
        {isOwner && (
          <button
            className="btn btn-ghost btn-icon btn-sm"
            title="Retirer"
            onClick={async () => {
              if (!confirm(`Retirer ${member.user.name ?? member.user.email} ?`)) return
              await fetch(`/api/lists/${listId}/members/${member.userId}`, { method: 'DELETE' })
              await loadList()
            }}
          >
            <i className="fas fa-times" style={{ color: 'var(--error)' }} />
          </button>
        )}
      </div>
    ))}
  </div>
)}
```

### API pour retirer un membre

```powershell
mkdir "app\api\lists\[id]\members"
mkdir "app\api\lists\[id]\members\[userId]"
code "app/api/lists/[id]/members/[userId]/route.ts"
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
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id, userId } = await params

  const list = await prisma.list.findUnique({ where: { id } })
  if (!list || list.userId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  await prisma.listMember.delete({
    where: { userId_listId: { userId, listId: id } },
  })

  return NextResponse.json({ success: true })
}
```

---

## ÉTAPE 7 — AJOUTER LES LIENS DANS LE HEADER

Dans `components/layout/Header.tsx` — cherche :

**Cherche :** `{ href: '/groups',  label: 'Groupes',    icon: 'fa-users'    },`

**Ajoute juste après :**

```typescript
{ href: '/friends',      label: 'Amis',      icon: 'fa-user-friends' },
{ href: '/shared-lists', label: 'Partagées', icon: 'fa-share-alt'    },
```

Et dans le drawer mobile, ajoute dans les liens profil :

**Cherche :** `{ href: '/reservations', icon: 'fa-hand-holding-heart', label: 'Mes réservations' },`

**Ajoute juste après :**

```typescript
{ href: '/friends',      icon: 'fa-user-friends', label: 'Mes amis'         },
{ href: '/shared-lists', icon: 'fa-share-alt',     label: 'Listes partagées' },
```

---

## ✅ TEST

```powershell
npm run dev
```

**Amis**
1. Crée deux comptes, connecte-toi sur le premier
2. Va sur `/friends` → invite le second compte par email
3. Connecte-toi sur le second compte → va sur `/friends` → ✅ demande visible
4. Accepte → ✅ vous êtes amis

**Listes partagées**
1. Avec le second compte, crée une liste publique
2. Sur le premier compte → `/shared-lists` → ✅ la liste de l'ami apparaît

**Countdown**
1. Sur une liste avec date d'événement → ✅ "dans X jours" en orange/rouge si < 30j

**Prix moyen**
1. Sur une liste avec des items pricés → ✅ "Moyenne : 47 €" dans les métas

---

## 📁 FICHIERS CRÉÉS / MODIFIÉS

```
pickperfect/
├── app/
│   ├── friends/page.tsx
│   ├── shared-lists/page.tsx
│   └── api/
│       ├── friends/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── shared-lists/route.ts
│       └── lists/[id]/members/[userId]/route.ts
├── components/layout/Header.tsx        ← + liens amis/partagées
└── prisma/schema.prisma                ← + Friendship + ItemActivity
```

---

*PickPerfect — Partie 11A terminée*
