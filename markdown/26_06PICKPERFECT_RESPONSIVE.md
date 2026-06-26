# 🎁 PICKPERFECT — RESPONSIVE
## Mobile-first pour les betatesteurs

---

## 🧠 RÉFLEXION

> Le parcours typique d'un betatesteur : quelqu'un lui envoie un lien WhatsApp,
> il clique sur son téléphone, il arrive sur le site. Si c'est illisible, il repart.
>
> On ne refait pas tout le design — on cible les 5 points qui cassent sur mobile :
> le Header, les modales, les grilles, les formulaires côte à côte, et les pages
> dont le layout est en `flex` horizontal. Le reste fonctionne déjà correctement.

---

## 📋 CE QU'ON FAIT

1. Breakpoints globaux dans `globals.css`
2. Header avec menu hamburger sur mobile
3. Modales plein écran sur mobile
4. Grille d'items responsive
5. Formulaires — champs côte à côte → empilés
6. Pages : Profil, Points, Groupes

---

## ÉTAPE 1 — BREAKPOINTS GLOBAUX

Dans `app/globals.css`, ajoute ces variables et utilitaires en bas du fichier :

```css
/* ==============================
   RESPONSIVE — BREAKPOINTS
   ============================== */

/* Mobile : < 640px */
/* Tablet : 640px – 1024px */
/* Desktop : > 1024px */

/* Utilitaires responsive */
@media (max-width: 640px) {
  .hide-mobile { display: none !important; }

  /* Modales plein écran sur mobile */
  .modal-mobile {
    position: fixed !important;
    top:       0 !important;
    left:      0 !important;
    right:     0 !important;
    bottom:    0 !important;
    transform: none !important;
    width:     100% !important;
    maxWidth:  100% !important;
    maxHeight: 100% !important;
    borderRadius: 0 !important;
    overflowY: auto !important;
  }

  /* Form rows empilés */
  .form-row {
    flex-direction: column !important;
  }

  /* Réduire les paddings sur mobile */
  .wrapper-mobile {
    padding-left:  var(--s-4) !important;
    padding-right: var(--s-4) !important;
  }
}
```

---

## ÉTAPE 2 — HEADER AVEC MENU HAMBURGER

C'est le changement le plus visible. Sur mobile, la nav horizontale disparaît
et un bouton hamburger prend sa place.

```bash
code components/layout/Header.module.css
```

Ajoute ces règles **à la fin** du fichier CSS :

```css
/* ---- Hamburger (visible seulement mobile) ---- */
.hamburger {
  display:     none;
  background:  none;
  border:      none;
  cursor:      pointer;
  padding:     var(--s-2);
  color:       var(--text-1);
  font-size:   1.2rem;
  border-radius: var(--r-md);
  transition:  background var(--ease);
}
.hamburger:hover { background: var(--surface-2); }

/* ---- Menu mobile (drawer) ---- */
.mobileMenu {
  display:     none;
  position:    fixed;
  top:         0;
  left:        0;
  right:       0;
  bottom:      0;
  z-index:     300;
}

.mobileOverlay {
  position:   absolute;
  inset:      0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
}

.mobileDrawer {
  position:   absolute;
  top:        0;
  left:       0;
  bottom:     0;
  width:      280px;
  background: var(--surface);
  border-right: 1px solid var(--border-1);
  display:    flex;
  flex-direction: column;
  padding:    var(--s-6);
  animation:  slideIn 0.2s var(--ease-out);
  overflow-y: auto;
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}

.mobileDrawerHeader {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  margin-bottom:   var(--s-6);
  padding-bottom:  var(--s-4);
  border-bottom:   1px solid var(--border-1);
}

.mobileNav {
  display:        flex;
  flex-direction: column;
  gap:            var(--s-1);
  margin-bottom:  var(--s-6);
}

.mobileNavLink {
  display:       flex;
  align-items:   center;
  gap:           var(--s-3);
  padding:       var(--s-3) var(--s-4);
  border-radius: var(--r-md);
  text-decoration: none !important;
  color:         var(--text-1) !important;
  font-size:     0.95rem;
  font-weight:   600;
  transition:    background var(--ease);
}
.mobileNavLink:hover,
.mobileNavLinkActive { background: var(--surface-2); }
.mobileNavLink i { width: 18px; text-align: center; color: var(--text-3); }

.mobileDivider {
  height:     1px;
  background: var(--border-1);
  margin:     var(--s-4) 0;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .nav        { display: none; }
  .hamburger  { display: flex; align-items: center; justify-content: center; }
  .mobileMenu { display: block; }
  .userName   { display: none; }
}
```

Maintenant mets à jour le composant `Header.tsx` :

```bash
code components/layout/Header.tsx
```

Ajoute l'état du menu mobile et le JSX :

```tsx
// Ajoute cet état avec les autres
const [mobileOpen, setMobileOpen] = useState(false)
```

Dans le JSX, ajoute le bouton hamburger dans `<div className={styles.actions}>`,
**avant** la cloche de notifications :

```tsx
{/* Hamburger (mobile) */}
{user && (
  <button
    className={styles.hamburger}
    onClick={() => setMobileOpen(true)}
    aria-label="Menu"
  >
    <i className="fas fa-bars" />
  </button>
)}
```

Ajoute le drawer mobile **avant** la balise fermante `</header>` :

```tsx
{/* ================================================
    MENU MOBILE
================================================ */}
{mobileOpen && user && (
  <div className={styles.mobileMenu}>
    <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
    <div className={styles.mobileDrawer}>

      {/* Header du drawer */}
      <div className={styles.mobileDrawerHeader}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg,var(--peach),var(--lavender))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          PickPerfect
        </span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setMobileOpen(false)}>
          <i className="fas fa-times" />
        </button>
      </div>

      {/* Infos utilisateur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-5)' }}>
        <div className="avatar avatar-sm">{initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name ?? 'Utilisateur'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{user.email}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.mobileNav}>
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.mobileNavLink} ${pathname.startsWith(link.href) ? styles.mobileNavLinkActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <i className={`fas ${link.icon}`} />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className={styles.mobileDivider} />

      {/* Liens profil */}
      {[
        { href: '/dashboard',    icon: 'fa-home',               label: 'Tableau de bord'  },
        { href: '/profile',      icon: 'fa-user',               label: 'Mon profil'       },
        { href: '/reservations', icon: 'fa-hand-holding-heart', label: 'Mes réservations' },
        { href: '/points',       icon: 'fa-star',               label: 'Mes points'       },
      ].map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={styles.mobileNavLink}
          onClick={() => setMobileOpen(false)}
        >
          <i className={`fas ${item.icon}`} />
          {item.label}
        </Link>
      ))}

      {user.role === 'ADMIN' && (
        <Link href="/admin" className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
          <i className="fas fa-shield-alt" />
          Administration
        </Link>
      )}

      <div className={styles.mobileDivider} />

      {/* Déconnexion */}
      <button
        onClick={() => { logout(); setMobileOpen(false) }}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', padding: 'var(--s-3) var(--s-4)', borderRadius: 'var(--r-md)', border: 'none', background: 'none', color: 'var(--error)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', width: '100%' }}
      >
        <i className="fas fa-sign-out-alt" />
        Se déconnecter
      </button>

    </div>
  </div>
)}
```

---

## ÉTAPE 3 — MODALES RESPONSIVE

Les modales utilisent des styles inline avec `maxWidth` fixe — elles débordent sur mobile.
La solution la plus propre : ajouter une classe CSS qui écrase les styles inline sur mobile.

Dans `app/globals.css`, ajoute :

```css
@media (max-width: 640px) {
  /* Toutes les modales passent en plein écran */
  [data-modal] {
    position:     fixed !important;
    top:          0 !important;
    left:         0 !important;
    right:        0 !important;
    bottom:       0 !important;
    transform:    none !important;
    width:        100% !important;
    max-width:    100% !important;
    max-height:   100% !important;
    border-radius: 0 !important;
    overflow-y:   auto !important;
  }
}
```

Dans `app/lists/[id]/page.tsx`, ajoute `data-modal=""` sur **chaque div de modale** :

```tsx
{/* Exemple pour la modale réservation */}
<div
  data-modal=""
  style={{ position: 'fixed', top: '50%', left: '50%', ... }}
>
```

Fais la même chose pour les modales : modifier item, modifier liste, commentaires.

---

## ÉTAPE 4 — GRILLE D'ITEMS RESPONSIVE

Dans `app/lists/[id]/page.module.css`, trouve `.itemsGrid` et assure-toi qu'il ressemble à ça :

```css
.itemsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--s-5);
}

@media (max-width: 640px) {
  .itemsGrid {
    grid-template-columns: 1fr; /* une seule colonne sur mobile */
    gap: var(--s-4);
  }

  .item {
    display: flex;
    flex-direction: row;  /* image à gauche, contenu à droite */
    align-items: flex-start;
    gap: var(--s-4);
  }

  .itemImg {
    width:        90px !important;
    height:       90px !important;
    flex-shrink:  0;
    border-radius: var(--r-lg) !important;
  }

  .itemBody {
    flex: 1;
    min-width: 0;
  }

  .itemActions {
    flex-wrap: wrap;
    gap: var(--s-2);
  }
}
```

---

## ÉTAPE 5 — FORMULAIRES CÔTE À CÔTE → EMPILÉS

Dans `app/globals.css`, assure-toi que `.form-row` se comporte bien :

```css
.form-row {
  display: flex;
  gap: var(--s-4);
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
    gap: var(--s-3);
  }
}
```

---

## ÉTAPE 6 — PAGE PROFIL

Dans `app/profile/page.module.css`, ajoute :

```css
@media (max-width: 640px) {
  .wrapper { padding: var(--s-4); }

  .header {
    flex-direction: column;
    text-align: center;
  }

  .headerMeta   { justify-content: center; flex-wrap: wrap; }
  .badgesRow    { justify-content: center; }

  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## ÉTAPE 7 — PAGE POINTS

Dans `app/points/page.module.css`, ajoute :

```css
@media (max-width: 640px) {
  .wrapper { padding: var(--s-4); }

  .hero {
    flex-direction: column;
    text-align: center;
    padding: var(--s-6);
  }

  .heroStats { justify-content: center; }

  .tabs {
    width: 100%;
    overflow-x: auto;
  }

  .tab {
    flex: 1;
    justify-content: center;
    font-size: 0.8rem;
    padding: 8px var(--s-3);
  }

  .rewardsGrid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--s-3);
  }

  .badgesGrid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--s-3);
  }
}
```

---

## ÉTAPE 8 — PAGE GROUPES ET LISTES

Dans `app/groups/page.module.css` :

```css
@media (max-width: 640px) {
  .wrapper { padding: var(--s-4); }
  .header  { flex-direction: column; align-items: flex-start; }
  .grid    { grid-template-columns: 1fr; }
}
```

Dans `app/lists/page.module.css` (si tu as une grille de listes) :

```css
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

---

## ÉTAPE 9 — TOUCH-FRIENDLY

Sur mobile, les boutons doivent être assez grands pour être tapotés avec un doigt.
La règle Apple/Google : minimum 44×44px.

Dans `app/globals.css` :

```css
@media (max-width: 640px) {
  /* Boutons plus grands sur mobile */
  .btn {
    min-height: 44px;
    min-width:  44px;
  }

  .btn-sm {
    min-height: 36px;
  }

  /* Inputs plus grands */
  input, textarea, select {
    min-height: 44px;
    font-size: 16px !important; /* évite le zoom auto d'iOS */
  }
}
```

Le `font-size: 16px` sur les inputs est important — iOS zoome automatiquement sur les inputs de moins de 16px, ce qui casse le layout.

---

## ✅ TEST

```powershell
npm run dev
```

**Sur ton téléphone** — le moyen le plus fiable de tester :
1. Assure-toi que ton PC et ton téléphone sont sur le même réseau Wi-Fi
2. Note l'IP locale de ton PC (depuis PowerShell : `ipconfig`, cherche "Adresse IPv4")
3. Sur ton téléphone, ouvre `http://192.168.1.XX:3000`

**Ou dans Chrome DevTools** :
1. Ouvre DevTools (`F12`)
2. Clique l'icône téléphone/tablette en haut à gauche
3. Choisis "iPhone SE" ou "Pixel 7" dans la liste

**Points à vérifier :**
- ✅ Header → bouton hamburger visible, nav masquée
- ✅ Drawer → s'ouvre et se ferme correctement
- ✅ Modales → plein écran sur mobile
- ✅ Grille d'items → une colonne, image à gauche
- ✅ Formulaires → champs empilés
- ✅ Inputs → pas de zoom iOS au clic

---

## 📁 FICHIERS MODIFIÉS

```
pickperfect/
├── app/
│   ├── globals.css                      ← Breakpoints, form-row, btn, inputs
│   ├── lists/[id]/page.module.css       ← Grille items, layout mobile
│   ├── points/page.module.css           ← Hero, tabs, grilles
│   ├── profile/page.module.css          ← Header, stats
│   └── groups/page.module.css           ← Grille groupes
└── components/
    └── layout/
        ├── Header.tsx                   ← + state mobileOpen + drawer JSX
        └── Header.module.css            ← + hamburger + drawer styles
```

---

*PickPerfect — Responsive terminé*
*Tu es prêt pour déployer et envoyer le lien à tes betatesteurs.*
