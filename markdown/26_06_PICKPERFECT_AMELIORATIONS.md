# 🎁 PICKPERFECT — AMÉLIORATIONS
## Vues uniques · Scraping amélioré · Choix et mise en forme des images

---

## AMÉLIORATION 1 — UNE VUE PAR UTILISATEUR

### 1.1 Schéma

Ajoute ce modèle dans `prisma/schema.prisma` :

```prisma
model ListView {
  id        String   @id @default(cuid())
  listId    String
  list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  userId    String?  // null si non connecté (on compte quand même)
  ipAddress String?
  createdAt DateTime @default(now())

  @@unique([listId, userId])   // un seul enregistrement par user+liste
  @@index([listId])
  @@map("list_views")
}
```

Dans le modèle `List`, ajoute la relation inverse :

```prisma
model List {
  // ... champs existants ...
  views ListView[]  // ← AJOUTER
}
```

```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name add_list_views
```

### 1.2 Mettre à jour l'API de détail de liste

Dans `app/api/lists/[id]/route.ts`, remplace le bloc qui incrémente `viewCount` par :

```typescript
import { headers } from 'next/headers'

// Dans la fonction GET, après avoir récupéré la session :
// Enregistrer la vue (une seule par utilisateur)
const headerStore = await headers()
const ip = headerStore.get('x-forwarded-for')?.split(',')[0] ??
           headerStore.get('x-real-ip') ??
           'unknown'

try {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.listView.findUnique({
      where: {
        listId_userId: {
          listId: id,
          userId: session?.userId ?? 'anonymous',
        },
      },
    })

    if (!existing) {
      await tx.listView.create({
        data: {
          listId:    id,
          userId:    session?.userId ?? null,
          ipAddress: ip,
        },
      })
      await tx.list.update({
        where: { id },
        data:  { viewCount: { increment: 1 } },
      })
    }
  })
} catch {
  // Si contrainte unique violée en race condition, on ignore
}
```

---

## AMÉLIORATION 2 — SCRAPING AMÉLIORÉ AVEC CHOIX D'IMAGE

### 2.1 Mettre à jour l'API de scraping

Remplace tout `app/api/products/from-url/route.ts` :

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { validateSession }           from '@/lib/auth/sqlite-auth'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

// Extraire toutes les images pertinentes d'une page
function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = []
  const seen  = new Set<string>()

  const add = (src: string) => {
    if (!src) return
    // Ignorer les data-uri, SVG, pixels trackers
    if (src.startsWith('data:')) return
    if (src.includes('.svg')) return
    if (src.includes('pixel') || src.includes('tracker') || src.includes('1x1')) return

    // Résoudre les URLs relatives
    try {
      const absolute = src.startsWith('http') ? src : new URL(src, baseUrl).href
      if (!seen.has(absolute)) {
        seen.add(absolute)
        images.push(absolute)
      }
    } catch {}
  }

  // 1. Open Graph image (priorité maximale)
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (ogMatch?.[1]) add(ogMatch[1])

  // 2. Twitter card image
  const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
  if (twMatch?.[1]) add(twMatch[1])

  // 3. Images JSON-LD (Amazon, FNAC...)
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1])
      const imgs = data.image ?? data.images ?? data['@graph']?.[0]?.image ?? []
      const arr  = Array.isArray(imgs) ? imgs : [imgs]
      for (const img of arr) {
        if (typeof img === 'string') add(img)
        else if (img?.url) add(img.url)
      }
    } catch {}
  }

  // 4. Images <img> grandes (filtre les petites icônes)
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
  for (const match of imgMatches) {
    const src = match[1]
    // Garder seulement les images probablement grandes
    if (
      src.includes('product') || src.includes('large') || src.includes('main') ||
      src.includes('primary') || src.includes('full') || src.includes('zoom')
    ) {
      add(src)
    }
  }

  return images.slice(0, 8) // max 8 images proposées
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url) {
    return NextResponse.json({ error: 'URL requise' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Impossible de lire cette page' }, { status: 400 })
    }

    const html = await res.text()

    // ---- Titre ----
    const title =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1] ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
      ''

    // ---- Prix ----
    let price: number | null = null

    // Méthode 1 : JSON-LD
    const jsonLd = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd[1])
        const p = data.offers?.price ?? data.price ?? data['@graph']?.[0]?.offers?.price
        if (p) price = parseFloat(String(p).replace(',', '.'))
      } catch {}
    }

    // Méthode 2 : meta price
    if (!price) {
      const priceMatch =
        html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ??
        html.match(/<meta[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["']/i)
      if (priceMatch?.[1]) price = parseFloat(priceMatch[1].replace(',', '.'))
    }

    // Méthode 3 : regex sur le texte (dernier recours)
    if (!price) {
      const priceText = html.match(/(\d+[,\.]\d{2})\s*€/)?.[1]
      if (priceText) price = parseFloat(priceText.replace(',', '.'))
    }

    // ---- Description ----
    const description =
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      null

    // ---- Images ----
    const images = extractImages(html, url)

    return NextResponse.json({
      title:       title.slice(0, 200),
      price:       price && !isNaN(price) ? Math.round(price * 100) / 100 : null,
      description: description?.slice(0, 500) ?? null,
      imageUrl:    images[0] ?? null, // première image par défaut
      images,                         // toutes les images pour le sélecteur
    })
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'La page met trop de temps à répondre' }, { status: 408 })
    }
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
```

### 2.2 Sélecteur d'images dans le formulaire

Dans `app/lists/[id]/page.tsx`, ajoute l'état pour les images multiples :

```typescript
const [scrapedImages, setScrapedImages] = useState<string[]>([])
```

Mets à jour `fetchFromUrl` pour récupérer le tableau d'images :

```typescript
const fetchFromUrl = async () => {
  if (!urlInput.trim()) return
  setFetchingUrl(true)
  const res  = await fetch('/api/products/from-url', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body:   JSON.stringify({ url: urlInput }),
  })
  const data = await res.json()
  setFetchingUrl(false)
  if (res.ok) {
    setNewItem(p => ({
      ...p,
      title:       data.title       || '',
      price:       data.price?.toString() || '',
      imageUrl:    data.imageUrl    || '',
      description: data.description || '',
    }))
    setScrapedImages(data.images ?? [])
  }
}
```

Ajoute le sélecteur d'images dans le formulaire d'ajout, juste après l'aperçu de l'image actuelle :

```tsx
{/* Sélecteur si plusieurs images disponibles */}
{scrapedImages.length > 1 && (
  <div style={{ marginTop: 'var(--s-3)' }}>
    <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 'var(--s-2)' }}>
      <i className="fas fa-images" style={{ marginRight: 6 }} />
      {scrapedImages.length} photos trouvées — choisissez la meilleure :
    </p>
    <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap' }}>
      {scrapedImages.map((img, i) => (
        <div
          key={i}
          onClick={() => setNewItem(p => ({ ...p, imageUrl: img }))}
          style={{
            width:        70,
            height:       70,
            borderRadius: 'var(--r-md)',
            overflow:     'hidden',
            cursor:       'pointer',
            border:       `2px solid ${newItem.imageUrl === img ? 'var(--peach)' : 'var(--border-1)'}`,
            flexShrink:   0,
            transition:   'border-color var(--ease)',
          }}
        >
          <img
            src={img}
            alt={`Option ${i + 1}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
          />
        </div>
      ))}
    </div>
  </div>
)}
```

---

## AMÉLIORATION 3 — MISE EN FORME DES IMAGES

Les images uploadées sont déjà traitées par `sharp` (Partie 7). Pour les images venant d'URLs externes, on peut les retraiter au moment de la sauvegarde.

### 3.1 API de proxy/retraitement d'image externe

```powershell
mkdir app\api\upload\from-url
code app/api/upload/from-url/route.ts
```

**`pickperfect/app/api/upload/from-url/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { validateSession }           from '@/lib/auth/sqlite-auth'
import { writeFile, mkdir }          from 'fs/promises'
import { join }                      from 'path'
import sharp                         from 'sharp'
import crypto                        from 'crypto'

async function getSession() {
  const cookieStore = await cookies()
  const id          = cookieStore.get('auth_session')?.value
  if (!id) return null
  return validateSession(id)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { imageUrl } = await request.json()
  if (!imageUrl) {
    return NextResponse.json({ error: 'URL requise' }, { status: 400 })
  }

  try {
    // Télécharger l'image
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal:  AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Image inaccessible' }, { status: 400 })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL ne pointe pas vers une image' }, { status: 400 })
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    // Limiter à 10 Mo
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop lourde' }, { status: 400 })
    }

    const hash     = crypto.randomBytes(12).toString('hex')
    const filename = `${hash}.webp`

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'items')
    await mkdir(uploadDir, { recursive: true })

    // Optimiser avec sharp : carré 800×800, cover pour remplir proprement
    await sharp(buffer)
      .resize(800, 800, {
        fit:               'cover',      // remplir le carré en coupant si besoin
        position:          'centre',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(join(uploadDir, filename))

    return NextResponse.json({ imageUrl: `/uploads/items/${filename}` })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erreur lors du traitement' }, { status: 500 })
  }
}
```

### 3.2 Bouton "Optimiser" dans le formulaire

Dans le formulaire d'ajout, quand une imageUrl est présente (venant du scraping), ajoute un bouton pour la télécharger et l'optimiser localement :

```typescript
// État supplémentaire
const [optimizing, setOptimizing] = useState(false)

// Fonction
const optimizeImage = async (imageUrl: string) => {
  setOptimizing(true)
  const res  = await fetch('/api/upload/from-url', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ imageUrl }),
  })
  const data = await res.json()
  setOptimizing(false)
  if (res.ok) {
    setNewItem(p => ({ ...p, imageUrl: data.imageUrl }))
    setScrapedImages([]) // plus besoin du sélecteur
  }
}
```

Dans le JSX, juste après l'aperçu de l'image, si l'URL vient du scraping (pas d'un upload) :

```tsx
{newItem.imageUrl && !newItem.imageUrl.startsWith('/uploads/') && (
  <button
    type="button"
    className="btn btn-secondary btn-sm"
    onClick={() => optimizeImage(newItem.imageUrl)}
    disabled={optimizing}
    style={{ marginTop: 'var(--s-2)' }}
  >
    {optimizing
      ? <><span className="spinner" /> Optimisation…</>
      : <><i className="fas fa-magic" /> Optimiser et sauvegarder localement</>
    }
  </button>
)}
```

---

## ✅ TESTS

### Test vues uniques
1. Recharge la page d'une liste 10 fois → le compteur de vues reste à 1
2. Ouvre la liste avec un autre compte → le compteur passe à 2

### Test scraping amélioré
1. Colle un lien Amazon → ✅ titre, prix et image récupérés automatiquement
2. Si plusieurs images détectées → ✅ le sélecteur de vignettes apparaît
3. Clique sur une vignette → ✅ l'aperçu change

### Test optimisation d'image
1. Après scraping, clique "Optimiser et sauvegarder localement"
2. ✅ L'image est téléchargée, recadrée en carré 800×800 et convertie en WebP
3. ✅ L'URL passe de `https://...amazon.fr/...` à `/uploads/items/...webp`

---

## 📁 FICHIERS CRÉÉS / MODIFIÉS

```
pickperfect/
├── prisma/schema.prisma                    ← + ListViews
└── app/
    ├── lists/[id]/page.tsx                 ← + sélecteur images + optimisation
    └── api/
        ├── products/from-url/route.ts      ← Réécrit — retourne plusieurs images
        ├── lists/[id]/route.ts             ← Vues uniques par utilisateur
        └── upload/
            └── from-url/route.ts           ← Nouveau — proxy + optimisation sharp
```
