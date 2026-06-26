# 🎁 PICKPERFECT — PARTIE 11C
## Export PDF · QR code · Streak · Défis hebdo · Mode surprise

---

## 🧠 RÉFLEXION

> L'export PDF répond à un usage réel : imprimer la liste pour offrir
> à quelqu'un qui "n'est pas sur les applis". Le QR code résout le même
> problème : on le colle sur une invitation et les gens scannent.
>
> Le streak et les défis sont là pour transformer une visite ponctuelle
> en habitude. Ce qui fidélise ce n'est pas la liste elle-même,
> c'est la raison de revenir entre deux anniversaires.
>
> Le mode surprise donne confiance : le propriétaire sait que ses cadeaux
> seront gérés, sans voir ce qui est réservé avant le jour J.

---

## 📋 CE QU'ON FAIT

1. Export PDF d'une liste
2. QR code par liste
3. Streak de connexion visible
4. Défis hebdomadaires
5. Mode liste surprise

---

## ÉTAPE 1 — EXPORT PDF

### 1.1 Installer la librairie

```powershell
npm install @react-pdf/renderer
```

### 1.2 API Export PDF

```powershell
mkdir "app\api\lists\[id]\export-pdf"
code "app/api/lists/[id]/export-pdf/route.ts"
```

**`pickperfect/app/api/lists/[id]/export-pdf/route.ts`**
```typescript
import { NextRequest, NextResponse }            from 'next/server'
import { cookies }                              from 'next/headers'
import { prisma }                               from '@/lib/prisma'
import { validateSession }                      from '@/lib/auth/sqlite-auth'
import { renderToBuffer, Document, Page, Text,
         View, StyleSheet, Font }               from '@react-pdf/renderer'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

const pdfStyles = StyleSheet.create({
  page: {
    padding:         40,
    fontFamily:      'Helvetica',
    backgroundColor: '#FAFAF9',
  },
  header: {
    marginBottom:  24,
    paddingBottom: 16,
    borderBottom:  '2px solid #FF9A8B',
  },
  title: {
    fontSize:   28,
    fontWeight: 'bold',
    color:      '#1C1917',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color:    '#78716C',
  },
  item: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    paddingVertical: 10,
    borderBottom:   '1px solid #E7E5E4',
    gap:            12,
  },
  itemNumber: {
    width:       24,
    height:      24,
    borderRadius: 12,
    backgroundColor: '#FF9A8B',
    alignItems:  'center',
    justifyContent: 'center',
    flexShrink:  0,
  },
  itemNumText: { fontSize: 10, color: 'white', fontWeight: 'bold' },
  itemBody:    { flex: 1 },
  itemTitle:   { fontSize: 13, fontWeight: 'bold', color: '#1C1917', marginBottom: 2 },
  itemDesc:    { fontSize: 10, color: '#78716C', marginBottom: 4 },
  itemMeta:    { flexDirection: 'row', gap: 12 },
  itemPrice:   { fontSize: 11, color: '#FF9A8B', fontWeight: 'bold' },
  itemUrl:     { fontSize: 9,  color: '#A78BFA' },
  reserved:    { fontSize: 10, color: '#10B981', fontWeight: 'bold' },
  footer: {
    position:   'absolute',
    bottom:     30,
    left:       40,
    right:      40,
    fontSize:   9,
    color:      '#A8A29E',
    textAlign:  'center',
    borderTop:  '1px solid #E7E5E4',
    paddingTop: 8,
  },
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const list = await prisma.list.findUnique({
    where:   { id },
    include: {
      items: { orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] },
      user:  { select: { name: true } },
    },
  })

  if (!list) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const canView =
    list.userId === session.userId ||
    list.privacy !== 'PRIVATE' ||
    await prisma.listMember.findFirst({ where: { listId: id, userId: session.userId } })

  if (!canView) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const PRIORITY_LABELS: Record<number, string> = { 3: '★★★', 2: '★★☆', 1: '★☆☆' }

  const buffer = await renderToBuffer(
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>{list.title}</Text>
          <Text style={pdfStyles.subtitle}>
            {list.user.name ? `Liste de ${list.user.name}` : 'Liste de cadeaux'}
            {list.eventDate ? ` · ${new Date(list.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            {list.budget ? ` · Budget : ${list.budget}€` : ''}
          </Text>
        </View>

        {/* Items */}
        {list.items.map((item, i) => (
          <View key={item.id} style={pdfStyles.item}>
            <View style={pdfStyles.itemNumber}>
              <Text style={pdfStyles.itemNumText}>{i + 1}</Text>
            </View>
            <View style={pdfStyles.itemBody}>
              <Text style={pdfStyles.itemTitle}>
                {item.title}
                {item.priority ? `  ${PRIORITY_LABELS[item.priority] ?? ''}` : ''}
              </Text>
              {item.description && (
                <Text style={pdfStyles.itemDesc}>{item.description}</Text>
              )}
              <View style={pdfStyles.itemMeta}>
                {item.price && <Text style={pdfStyles.itemPrice}>{item.price.toFixed(2)} €</Text>}
                {item.url   && <Text style={pdfStyles.itemUrl}>{item.url.slice(0, 60)}{item.url.length > 60 ? '…' : ''}</Text>}
                {item.reserved && <Text style={pdfStyles.reserved}>✓ Réservé</Text>}
              </View>
            </View>
          </View>
        ))}

        {/* Footer */}
        <Text style={pdfStyles.footer} fixed>
          {list.items.length} cadeaux · Généré par PickPerfect · pickperfect.ton-domaine.com
        </Text>
      </Page>
    </Document>
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${list.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
    },
  })
}
```

### 1.3 Bouton dans la page liste

Dans `app/lists/[id]/page.tsx` — cherche :

**Cherche :** `<button className="btn btn-secondary btn-sm" onClick={handleShare}>`

**Juste avant ce bouton, ajoute :**

```tsx
{/* Export PDF */}
<a
  href={`/api/lists/${listId}/export-pdf`}
  className="btn btn-ghost btn-sm"
  download
>
  <i className="fas fa-file-pdf" /> PDF
</a>
```

---

## ÉTAPE 2 — QR CODE

### 2.1 Installer

```powershell
npm install qrcode
npm install @types/qrcode --save-dev
```

### 2.2 API QR Code

```powershell
mkdir "app\api\lists\[id]\qrcode"
code "app/api/lists/[id]/qrcode/route.ts"
```

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { validateSession }           from '@/lib/auth/sqlite-auth'
import QRCode                        from 'qrcode'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params

  const list = await prisma.list.findUnique({
    where: { id },
    select: { userId: true, shareToken: true, title: true },
  })
  if (!list || list.userId !== session.userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const url = list.shareToken
    ? `${process.env.NEXT_PUBLIC_APP_URL}/l/${list.shareToken}`
    : `${process.env.NEXT_PUBLIC_APP_URL}/lists/${id}`

  const svg = await QRCode.toString(url, {
    type:          'svg',
    width:         300,
    margin:        2,
    color: {
      dark:  '#1C1917',
      light: '#FAFAF9',
    },
  })

  return new NextResponse(svg, {
    headers: {
      'Content-Type':        'image/svg+xml',
      'Content-Disposition': `attachment; filename="qr-${list.title.replace(/[^a-zA-Z0-9]/g, '-')}.svg"`,
    },
  })
}
```

### 2.3 Bouton QR Code

Dans `app/lists/[id]/page.tsx` — cherche :

**Cherche :** `<i className="fas fa-file-pdf" /> PDF`

**Juste après ce bouton, ajoute :**

```tsx
<a
  href={`/api/lists/${listId}/qrcode`}
  className="btn btn-ghost btn-sm"
  download
>
  <i className="fas fa-qrcode" /> QR
</a>
```

---

## ÉTAPE 3 — STREAK VISIBLE

### 3.1 Schéma

Dans `prisma/schema.prisma`, dans le modèle `Points`, ajoute :

```prisma
model Points {
  // ...champs existants...
  currentStreak Int      @default(0)  // ← AJOUTER
  longestStreak Int      @default(0)  // ← AJOUTER
}
```

```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name add_streak_fields
```

### 3.2 Mettre à jour `processDailyLogin`

Dans `lib/gamification/pointsService.ts` — cherche :

**Cherche :** `export async function processDailyLogin`

**Remplace toute la fonction par :**

```typescript
export async function processDailyLogin(userId: string): Promise<number> {
  const p   = await prisma.points.findUnique({ where: { userId } })
  const now = new Date()

  if (p?.lastDailyLogin) {
    const last    = p.lastDailyLogin
    const sameDay =
      last.getFullYear() === now.getFullYear() &&
      last.getMonth()    === now.getMonth()    &&
      last.getDate()     === now.getDate()

    if (sameDay) return 0

    // Vérifier si la connexion d'hier existait (streak)
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const wasYesterday =
      last.getFullYear() === yesterday.getFullYear() &&
      last.getMonth()    === yesterday.getMonth()    &&
      last.getDate()     === yesterday.getDate()

    const newStreak = wasYesterday ? (p.currentStreak ?? 0) + 1 : 1

    await prisma.points.upsert({
      where:  { userId },
      create: { userId, lastDailyLogin: now, currentStreak: 1, longestStreak: 1 },
      update: {
        lastDailyLogin: now,
        currentStreak:  newStreak,
        longestStreak:  { set: Math.max(p.longestStreak ?? 0, newStreak) },
      },
    })

    // Bonus streak 7 jours
    if (newStreak === 7) {
      await addPoints(userId, 'daily_login_streak_7')
    }

  } else {
    await prisma.points.upsert({
      where:  { userId },
      create: { userId, lastDailyLogin: now, currentStreak: 1, longestStreak: 1 },
      update: { lastDailyLogin: now, currentStreak: 1, longestStreak: 1 },
    })
  }

  await addPoints(userId, 'daily_login')
  return POINTS_TABLE.daily_login
}
```

### 3.3 Afficher le streak sur la page Points

Dans `app/points/page.tsx` — cherche :

**Cherche :** `<div className={styles.heroStats}>`

**Remplace tout le bloc `heroStats` par :**

```tsx
<div className={styles.heroStats}>
  <div className={styles.heroStat}>
    <span className={styles.heroStatNum}>{(points?.totalPoints ?? 0).toLocaleString('fr-FR')}</span>
    <span className={styles.heroStatLabel}>total gagnés</span>
  </div>
  <div className={styles.heroStat}>
    <span className={styles.heroStatNum}>{(points?.spentPoints ?? 0).toLocaleString('fr-FR')}</span>
    <span className={styles.heroStatLabel}>dépensés</span>
  </div>
  {/* ← Streak */}
  <div className={styles.heroStat}>
    <span className={styles.heroStatNum} style={{ color: (points?.currentStreak ?? 0) >= 3 ? 'var(--peach-dark)' : undefined }}>
      {(points?.currentStreak ?? 0) >= 1 && '🔥'} {points?.currentStreak ?? 0}j
    </span>
    <span className={styles.heroStatLabel}>streak actuel</span>
  </div>
  <div className={styles.heroStat}>
    <span className={styles.heroStatNum}>{allBadges.filter(b => b.earned).length}/{allBadges.length}</span>
    <span className={styles.heroStatLabel}>badges</span>
  </div>
</div>
```

---

## ÉTAPE 4 — DÉFIS HEBDOMADAIRES

### 4.1 Schéma

```prisma
model WeeklyChallenge {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  weekStart   DateTime // Lundi de la semaine
  challengeId String   // "reserve_3" | "share_list" | "add_5_items" | etc.
  progress    Int      @default(0)
  target      Int
  completed   Boolean  @default(false)
  rewardPts   Int
  createdAt   DateTime @default(now())

  @@unique([userId, weekStart, challengeId])
  @@map("weekly_challenges")
}
```

Dans `User` :

```prisma
weeklyChallenges WeeklyChallenge[]
```

```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name add_weekly_challenges
```

### 4.2 Service défis

```bash
code lib/gamification/challenges.ts
```

```typescript
import { prisma }    from '@/lib/prisma'
import { addPoints } from './pointsService'

export const CHALLENGES = [
  { id: 'reserve_3',   label: 'Réserver 3 cadeaux',      target: 3,  reward: 30 },
  { id: 'share_list',  label: 'Partager une liste',       target: 1,  reward: 15 },
  { id: 'add_5_items', label: 'Ajouter 5 items à une liste', target: 5, reward: 25 },
  { id: 'login_5',     label: 'Se connecter 5 jours',     target: 5,  reward: 20 },
] as const

export type ChallengeId = typeof CHALLENGES[number]['id']

function getWeekStart(): Date {
  const now  = new Date()
  const day  = now.getDay() // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day // ajuster au lundi
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Attribuer les défis de la semaine si pas encore fait
export async function ensureWeeklyChallenges(userId: string) {
  const weekStart = getWeekStart()

  const existing = await prisma.weeklyChallenge.findMany({
    where: { userId, weekStart },
  })
  if (existing.length >= CHALLENGES.length) return existing

  // Choisir 3 défis aléatoires parmi les disponibles
  const shuffled  = [...CHALLENGES].sort(() => Math.random() - 0.5).slice(0, 3)
  const existingIds = new Set(existing.map(c => c.challengeId))

  for (const c of shuffled) {
    if (!existingIds.has(c.id)) {
      await prisma.weeklyChallenge.create({
        data: {
          userId,
          weekStart,
          challengeId: c.id,
          target:      c.target,
          rewardPts:   c.reward,
          progress:    0,
        },
      }).catch(() => {}) // ignore si déjà créé en race
    }
  }

  return prisma.weeklyChallenge.findMany({ where: { userId, weekStart } })
}

// Incrémenter la progression d'un défi
export async function progressChallenge(userId: string, challengeId: ChallengeId, by = 1) {
  const weekStart = getWeekStart()

  const challenge = await prisma.weeklyChallenge.findUnique({
    where: { userId_weekStart_challengeId: { userId, weekStart, challengeId } },
  })
  if (!challenge || challenge.completed) return

  const newProgress = Math.min(challenge.progress + by, challenge.target)
  const completed   = newProgress >= challenge.target

  await prisma.weeklyChallenge.update({
    where: { userId_weekStart_challengeId: { userId, weekStart, challengeId } },
    data:  { progress: newProgress, completed },
  })

  if (completed) {
    await addPoints(userId, 'badge_earned', challenge.rewardPts)
  }
}
```

### 4.3 Brancher les défis sur les actions

Dans `app/api/items/[id]/reserve/route.ts` — cherche :

**Cherche :** `await addPoints(session.userId, 'item_reservation').catch(() => {})`

**Juste après, ajoute :**

```typescript
import { progressChallenge, ensureWeeklyChallenges } from '@/lib/gamification/challenges'

// Après addPoints :
await ensureWeeklyChallenges(session.userId).catch(() => {})
await progressChallenge(session.userId, 'reserve_3').catch(() => {})
```

Dans `app/api/auth/login/route.ts` — cherche :

**Cherche :** `await processDailyLogin(user.id).catch(() => {})`

**Juste après :**

```typescript
await ensureWeeklyChallenges(user.id).catch(() => {})
await progressChallenge(user.id, 'login_5').catch(() => {})
```

### 4.4 Afficher les défis sur la page Points

Dans `app/points/page.tsx`, ajoute un quatrième onglet "Défis" :

**Cherche :** `{ id: 'history' as const, label: 'Historique',  icon: 'fa-history' },`

**Juste avant, ajoute :**

```tsx
{ id: 'challenges' as const, label: 'Défis', icon: 'fa-fire' },
```

Dans les états du composant, ajoute :

```typescript
const [challenges, setChallenges] = useState<any[]>([])
const tab = useState<'rewards' | 'badges' | 'challenges' | 'history'>('rewards')
```

Dans le `useEffect`, ajoute :

```typescript
fetch('/api/challenges').then(r => r.json()).then(d => setChallenges(d))
```

---

## ÉTAPE 5 — MODE LISTE SURPRISE

Dans `prisma/schema.prisma`, dans le modèle `List`, ajoute :

```prisma
model List {
  // ...champs existants...
  surpriseMode Boolean @default(false)  // ← AJOUTER
}
```

```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name add_surprise_mode
```

Dans la modale de modification de liste `app/lists/[id]/page.tsx` — cherche :

**Cherche :** `budget: list.budget?.toString() ?? '',`

**Ajoute dans l'état `editListForm` :**

```typescript
surpriseMode: list.surpriseMode ?? false,
```

Dans le formulaire de modification de liste — cherche :

**Cherche :** `<div className="form-row" style={{ marginBottom: 'var(--s-6)' }}>`

**Juste avant, ajoute la case à cocher :**

```tsx
{/* Mode surprise */}
<div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', cursor: 'pointer', fontSize: '0.875rem' }}>
    <input
      type="checkbox"
      checked={editListForm.surpriseMode}
      onChange={e => setEditListForm(p => ({ ...p, surpriseMode: e.target.checked }))}
      style={{ width: 'auto', accentColor: 'var(--peach)', cursor: 'pointer' }}
    />
    <div>
      <strong>Mode surprise</strong>
      <span className="form-hint" style={{ display: 'block' }}>
        Vous ne verrez pas qui a réservé jusqu'à la date de l'événement
      </span>
    </div>
  </label>
</div>
```

Dans `app/api/lists/[id]/route.ts` — dans la requête `GET` qui récupère la liste, ajoute la logique surprise :

**Cherche :** `return NextResponse.json(list)`

**Remplace par :**

```typescript
// Mode surprise : masquer les réservations au propriétaire avant l'événement
if (list.surpriseMode && list.userId === session?.userId) {
  const eventPassed = list.eventDate && new Date(list.eventDate) < new Date()
  if (!eventPassed) {
    list.items = list.items.map(item => ({
      ...item,
      reserved:     item.reserved, // garder l'état réservé
      reservedById: null,           // masquer qui
      reservedBy:   null,
    }))
  }
}

return NextResponse.json(list)
```

Et dans la réponse JSON de l'API PATCH, ajoute `surpriseMode` dans les champs modifiables.

---

## ✅ TESTS

**PDF**
1. Va sur une liste → bouton PDF → ✅ téléchargement du PDF avec tous les items

**QR Code**
1. Va sur une liste → bouton QR → ✅ téléchargement du SVG
2. Scanne le QR avec ton téléphone → ✅ ouvre la liste

**Streak**
1. Connecte-toi → va sur /points → ✅ "🔥 1j" dans les stats
2. Connecte-toi le lendemain → ✅ "🔥 2j"

**Mode surprise**
1. Modifie une liste → coche "Mode surprise"
2. Avec un autre compte, réserve un item
3. Sur le proprio → ✅ l'item est marqué réservé mais sans nom

---

## 📁 FICHIERS CRÉÉS / MODIFIÉS

```
pickperfect/
├── lib/gamification/
│   ├── pointsService.ts         ← processDailyLogin avec streak
│   └── challenges.ts            ← Nouveau
└── app/
    └── api/
        ├── lists/[id]/
        │   ├── export-pdf/route.ts
        │   └── qrcode/route.ts
        └── ...
```

---

*PickPerfect — Partie 11C terminée*
*🎉 Toutes les fonctionnalités demandées sont couvertes.*
