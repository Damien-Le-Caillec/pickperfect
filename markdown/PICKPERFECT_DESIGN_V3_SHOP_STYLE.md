# 🎁 PICKPERFECT — DESIGN V3
## Style "Shop" · Cartes flottantes · Dark premium

---

## 🧠 RÉFLEXION

> Ce qui rend Shop efficace : des cartes qui semblent flotter au-dessus du
> fond grâce à des coins très arrondis et des ombres douces, beaucoup
> d'espace blanc, une hiérarchie de texte nette (gros titre + petit prix
> en gras), et des badges discrets en coin plutôt que des bandeaux
> intrusifs. On reprend exactement ces principes mais sur fond sombre :
> le glassmorphism remplace le blanc plein, les ombres deviennent plus
> profondes pour créer le même effet de flottaison.

---

## 📋 CE QU'ON FAIT

1. Tokens visuels mis à jour (rayons plus généreux, ombres plus douces)
2. Cartes "flottantes" — nouveau style de `.card`
3. Badges en coin (au lieu de bandeaux)
4. Barre de recherche en pilule
5. Grille d'items façon Shop (asymétrique, espacée)
6. Application aux pages clés

---

## ÉTAPE 1 — TOKENS MIS À JOUR

Dans `app/globals.css`, remplace les variables de rayons et d'ombres :

**Cherche :**
```css
  /* ---- Rayons ---- */
  --r-sm:   6px;
  --r-md:   10px;
  --r-lg:   14px;
  --r-xl:   18px;
  --r-2xl:  24px;
  --r-3xl:  32px;
  --r-full: 9999px;
```

**Remplace par :**
```css
  /* ---- Rayons (plus généreux, style "Shop") ---- */
  --r-sm:   8px;
  --r-md:   12px;
  --r-lg:   16px;
  --r-xl:   22px;
  --r-2xl:  28px;
  --r-3xl:  36px;
  --r-full: 9999px;
```

**Cherche :**
```css
  /* ---- Ombres ---- */
  --shadow-xs:     0 1px 2px rgba(0,0,0,0.4);
  --shadow-sm:     0 2px 8px rgba(0,0,0,0.5);
  --shadow-md:     0 4px 16px rgba(0,0,0,0.6);
  --shadow-lg:     0 8px 32px rgba(0,0,0,0.7);
  --shadow-xl:     0 16px 48px rgba(0,0,0,0.8);
```

**Remplace par :**
```css
  /* ---- Ombres (douces, "flottantes" comme Shop) ---- */
  --shadow-xs:     0 2px 6px rgba(0,0,0,0.3);
  --shadow-sm:     0 4px 14px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25);
  --shadow-md:     0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3);
  --shadow-lg:     0 16px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.35);
  --shadow-xl:     0 24px 64px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4);
  --shadow-float:  0 12px 32px rgba(0,0,0,0.45);
```

---

## ÉTAPE 2 — CARTES FLOTTANTES

**Cherche :**
```css
.card {
  background:    var(--surface);
  border:        1px solid var(--border-1);
  border-radius: var(--r-2xl);
  padding:       var(--s-6);
  box-shadow:    var(--shadow-sm);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition:    all 0.2s var(--ease);
}

.card:hover {
  border-color: var(--border-2);
  box-shadow:   var(--shadow-md);
  transform:    translateY(-2px);
}
```

**Remplace par :**
```css
.card {
  background:    var(--surface);
  border:        1px solid var(--border-1);
  border-radius: var(--r-2xl);
  padding:       var(--s-6);
  box-shadow:    var(--shadow-float);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition:    transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out), border-color 0.25s var(--ease);
}

.card:hover {
  border-color: var(--border-2);
  box-shadow:   var(--shadow-lg);
  transform:    translateY(-4px) scale(1.005);
}
```

---

## ÉTAPE 3 — BADGE EN COIN (style "favoris" de Shop)

Ajoute ce nouvel utilitaire à la fin de `app/globals.css` :

```css
/* ============================================================
   BADGE EN COIN — style Shop (réservé, favoris, promo)
   ============================================================ */
.corner-badge {
  position:        absolute;
  top:              var(--s-3);
  right:            var(--s-3);
  width:            32px;
  height:           32px;
  border-radius:    50%;
  display:          flex;
  align-items:      center;
  justify-content:  center;
  background:       rgba(13,13,18,0.65);
  backdrop-filter:  blur(8px);
  border:           1px solid rgba(255,255,255,0.12);
  box-shadow:       0 2px 8px rgba(0,0,0,0.3);
  font-size:        0.85rem;
  color:            white;
  z-index:          2;
}

.corner-badge-success {
  background: var(--mint);
  border-color: transparent;
}

.corner-badge-text {
  position:         absolute;
  top:               var(--s-3);
  left:              var(--s-3);
  padding:           4px 12px;
  border-radius:     var(--r-full);
  background:        rgba(13,13,18,0.7);
  backdrop-filter:   blur(8px);
  border:            1px solid rgba(255,255,255,0.12);
  font-size:         0.7rem;
  font-weight:       700;
  color:             white;
  z-index:           2;
}
```

---

## ÉTAPE 4 — BARRE DE RECHERCHE EN PILULE

Ajoute aussi à la fin de `app/globals.css` :

```css
/* ============================================================
   BARRE DE RECHERCHE — pilule style Shop
   ============================================================ */
.search-pill {
  display:           flex;
  align-items:       center;
  gap:               var(--s-3);
  background:        var(--surface-2);
  border:            1.5px solid var(--border-1);
  border-radius:     var(--r-full);
  padding:           var(--s-2) var(--s-3) var(--s-2) var(--s-5);
  transition:        all 0.2s var(--ease);
  backdrop-filter:   blur(12px);
}

.search-pill:focus-within {
  border-color: var(--lavender);
  box-shadow:   0 0 0 4px var(--lavender-light);
  background:   var(--surface-3);
}

.search-pill input {
  flex:          1;
  background:    none;
  border:        none;
  padding:       6px 0;
  font-size:     0.9rem;
}
.search-pill input:focus {
  box-shadow: none;
  background: none;
}

.search-pill-btn {
  width:           36px;
  height:          36px;
  border-radius:   50%;
  background:      linear-gradient(135deg, var(--peach), var(--lavender));
  border:          none;
  color:           white;
  display:         flex;
  align-items:     center;
  justify-content: center;
  cursor:          pointer;
  flex-shrink:     0;
  transition:      transform 0.15s var(--ease);
}
.search-pill-btn:hover { transform: scale(1.08); }
```

---

## ÉTAPE 5 — GRILLE D'ITEMS FAÇON SHOP

Dans `app/lists/[id]/page.module.css` — cherche `.itemsGrid` et remplace :

**Cherche :**
```css
.itemsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--s-5);
}
```

**Remplace par :**
```css
.itemsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--s-6);
}
```

**Cherche** la classe `.item` et ajoute `position: relative` si elle n'y est pas déjà :

```css
.item {
  position:      relative;
  background:    var(--surface);
  border:        1px solid var(--border-1);
  border-radius: var(--r-2xl);
  overflow:      hidden;
  box-shadow:    var(--shadow-float);
  transition:    transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out);
}

.item:hover {
  transform:  translateY(-6px);
  box-shadow: var(--shadow-lg);
}
```

---

## ÉTAPE 6 — APPLIQUER LE BADGE "RÉSERVÉ" EN COIN

Dans `app/lists/[id]/page.tsx` — cherche le bloc `reservedOverlay` actuel :

**Cherche :**
```tsx
{item.reserved && (
  <div className={styles.reservedOverlay}>
    <i className="fas fa-check-circle" />
    {myReservation ? 'Réservé par vous' : `Réservé${item.reservedBy?.name ? ` par ${item.reservedBy.name}` : ''}`}
  </div>
)}
```

**Remplace par :**
```tsx
{item.reserved && (
  <div className="corner-badge corner-badge-success" title={myReservation ? 'Réservé par vous' : `Réservé${item.reservedBy?.name ? ` par ${item.reservedBy.name}` : ''}`}>
    <i className="fas fa-check" />
  </div>
)}
{item.priority === 3 && !item.reserved && (
  <div className="corner-badge-text">
    <i className="fas fa-fire" style={{ marginRight: 4 }} />
    Indispensable
  </div>
)}
```

> Assure-toi que le conteneur parent `.itemImg` a `position: relative` dans le CSS pour que les badges se positionnent correctement par-dessus l'image.

---

## ÉTAPE 7 — BARRE DE RECHERCHE DE LA PAGE LISTE

Dans `app/lists/[id]/page.tsx` — cherche le bloc de recherche dans les filtres :

**Cherche :**
```tsx
<div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
  <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.8rem', pointerEvents: 'none' }} />
  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cadeau…" style={{ paddingLeft: 36, height: 38 }} />
</div>
```

**Remplace par :**
```tsx
<div className="search-pill" style={{ flex: 1, minWidth: 200 }}>
  <i className="fas fa-search" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }} />
  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cadeau…" />
</div>
```

---

## ÉTAPE 8 — PAGE EXPLORE (asymétrie façon Shop)

Dans `app/explore/page.module.css` — cherche la grille principale et remplace par une grille à tailles variables :

**Cherche :**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--s-5);
}
```

**Remplace par :**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--s-6);
  grid-auto-flow: dense;
}

/* Une carte sur 5 légèrement plus grande pour casser la grille uniforme */
.grid > *:nth-child(5n+1) {
  grid-column: span 2;
}

@media (max-width: 900px) {
  .grid > *:nth-child(5n+1) {
    grid-column: span 1;
  }
}
```

---

## ÉTAPE 9 — DASHBOARD : CARTES STATS FLOTTANTES

Dans `app/dashboard/page.module.css`, si tu as des cartes de stats, assure-toi qu'elles utilisent le même style flottant. Cherche les classes de type `.statCard` et ajoute :

```css
.statCard {
  background:      var(--surface);
  border:          1px solid var(--border-1);
  border-radius:   var(--r-2xl);
  padding:         var(--s-6);
  box-shadow:      var(--shadow-float);
  backdrop-filter: blur(16px);
  transition:      transform 0.25s var(--ease-out), box-shadow 0.25s var(--ease-out);
}

.statCard:hover {
  transform:  translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

---

## ✅ TEST

```powershell
npm run dev
```

1. Page liste → ✅ les cartes d'items "flottent" davantage au survol
2. Badge réservé → ✅ petit rond vert en haut à droite de l'image au lieu d'un bandeau
3. Badge "Indispensable" → ✅ pilule discrète en haut à gauche
4. Barre de recherche → ✅ forme pilule arrondie avec bouton circulaire
5. Page Explore → ✅ quelques cartes plus grandes cassent la monotonie de la grille

---

## 📁 FICHIERS MODIFIÉS

```
pickperfect/
├── app/
│   ├── globals.css                   ← Rayons, ombres, .corner-badge, .search-pill
│   ├── lists/[id]/
│   │   ├── page.tsx                  ← Badges en coin, recherche en pilule
│   │   └── page.module.css           ← Grille + cartes flottantes
│   ├── explore/page.module.css       ← Grille asymétrique
│   └── dashboard/page.module.css     ← Cartes stats flottantes
```

---

*PickPerfect — Design V3 "Shop style" terminé*
*Le reste du site profite automatiquement des nouveaux tokens (rayons, ombres) car ils sont globaux.*
