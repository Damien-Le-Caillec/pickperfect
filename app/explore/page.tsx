'use client'

import { useState, useEffect, useCallback } from "react"
import Link from 'next/link'
import PageLayout from "@/components/layout/PageLayout"
import styles from './page.module.css'

// TYPES

interface ExploreList {
    id: string
    title: string
    description?: string
    eventDate?: string
    viewCount: number
    shareCount: number
    createdAt: string
    totalItems: number
    reservedCount: number
    reservationPct: number
    avgPrice: number
    occasion: string
    score: number
    owner: {
        name?: string | null
        email: string
        initials: string
    }
}

interface Stats {
    totalPublicLists: number
    totalReservations: number
}

// CONFIG

const TABS = [
    { id: 'trending', label: 'Tendances', icon: 'fa-fire' },
    { id: 'recent', label: 'Récentes', icon: 'fa-clock' },
    { id: 'soon', label: 'Bientôt', icon: 'fa-calendar-alt' },
] as const

type TabId = typeof TABS[number]['id']

const OCCASIONS = [
    'Tous', 'Anniversaire', 'Mariage', 'Naissance',
    'Noël', 'Diplôme', 'Fête', 'Saint-Valentin', 'Crémaillère', 'Autre',
]

const BUDGETS = [
    { value: '', label: 'Tous les budgets' },
    { value: 'low', label: 'Moins de 50 €' },
    { value: 'mid', label: '50 € - 150 €' },
    { value: 'high', label: 'Plus de 150 €' },
]

// Couleur de bande selon l'occasion
const BAND_COLORS: Record<string, string> = {
    Anniversaire:  'linear-gradient(90deg, #FFD166, #FFC145)',
    Mariage:       'linear-gradient(90deg, #C5B3E6, #B19CD9)',
    Naissance:     'linear-gradient(90deg, #A2E4B8, #72C98A)',
    Noël:          'linear-gradient(90deg, #48BB78, #276749)',
    Diplôme:       'linear-gradient(90deg, #60A5FA, #2563EB)',
    Fête:          'linear-gradient(90deg, #FF9A8B, #E8826F)',
    'Saint-Valentin': 'linear-gradient(90deg, #F87171, #DC2626)',
    Crémaillère:   'linear-gradient(90deg, #FBBF24, #D97706)',
    Autre:         'linear-gradient(90deg, var(--peach), var(--lavender))',
}

// Jours restants avant l'événement
function daysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Formater la date d'événement
function FormatEventDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    })
}

export default function ExplorePage() {
  const [tab,      setTab]      = useState<TabId>('trending')
  const [search,   setSearch]   = useState('')
  const [occasion, setOccasion] = useState('Tous')
  const [budget,   setBudget]   = useState('')
  const [lists,    setLists]    = useState<ExploreList[]>([])
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)

  // ---- Chargement ----
  const load = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams({
      tab,
      ...(search   ? { search }   : {}),
      ...(occasion !== 'Tous' ? { occasion } : {}),
      ...(budget   ? { budget }   : {}),
    })

    const res  = await fetch(`/api/explore?${params}`)
    const data = await res.json()

    setLists(data.lists)
    setTotal(data.total)
    setStats(data.stats)
    setLoading(false)
  }, [tab, search, occasion, budget])

  useEffect(() => {
    // Debounce pour la recherche
    const timer = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const hasFilters = search !== '' || occasion !== 'Tous' || budget !== ''

  const resetFilters = () => {
    setSearch('')
    setOccasion('Tous')
    setBudget('')
  }

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <PageLayout>
      <div className={styles.wrapper}>

        {/* ==================================================
            HERO
        ================================================== */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Explorer la{' '}
            <span className={styles.heroGradient}>communauté</span>
          </h1>
          <p className={styles.heroDesc}>
            Découvrez les listes publiques, réservez des cadeaux
            pour vos proches et inspirez-vous.
          </p>

          {stats && (
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>
                  {stats.totalPublicLists.toLocaleString('fr-FR')}
                </span>
                <span className={styles.heroStatLabel}>listes publiques</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>
                  {stats.totalReservations.toLocaleString('fr-FR')}
                </span>
                <span className={styles.heroStatLabel}>cadeaux réservés</span>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================
            CONTRÔLES
        ================================================== */}
        <div className={styles.controls}>

          {/* Tabs */}
          <div className={styles.tabs}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                <i className={`fas ${t.icon}`} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Recherche */}
          <div className={styles.searchWrap}>
            <i className="fas fa-search" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une liste…"
            />
          </div>

          {/* Occasion */}
          <select
            className={styles.filterSelect}
            value={occasion}
            onChange={e => setOccasion(e.target.value)}
          >
            {OCCASIONS.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          {/* Budget */}
          <select
            className={styles.filterSelect}
            value={budget}
            onChange={e => setBudget(e.target.value)}
          >
            {BUDGETS.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>

          {/* Reset */}
          {hasFilters && (
            <button
              className={`btn btn-ghost btn-sm ${styles.resetBtn}`}
              onClick={resetFilters}
            >
              <i className="fas fa-times" /> Réinitialiser
            </button>
          )}
        </div>

        {/* Compteur résultats */}
        {!loading && (
          <p className={styles.resultsCount}>
            <strong>{total}</strong> liste{total !== 1 ? 's' : ''} trouvée{total !== 1 ? 's' : ''}
            {tab === 'trending' && ' · triées par popularité'}
            {tab === 'recent'   && ' · les plus récentes en premier'}
            {tab === 'soon'     && ' · événements dans les 30 prochains jours'}
          </p>
        )}

        {/* ==================================================
            CONTENU
        ================================================== */}
        {loading ? (
          <div className={styles.loading}>
            <span className="spinner" />
            Chargement…
          </div>
        ) : lists.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">
              <i className={`fas ${
                tab === 'soon' ? 'fa-calendar-alt' : 'fa-compass'
              }`} />
            </div>
            <h3>
              {tab === 'soon'
                ? 'Aucun événement à venir dans les 30 prochains jours'
                : 'Aucune liste trouvée'
              }
            </h3>
            <p>
              {hasFilters
                ? 'Essayez avec d\'autres filtres.'
                : tab === 'soon'
                  ? 'Revenez bientôt !'
                  : 'Soyez le premier à créer une liste publique.'
              }
            </p>
            {hasFilters ? (
              <button className="btn btn-secondary" onClick={resetFilters}>
                Effacer les filtres
              </button>
            ) : (
              <Link href="/lists/new" className="btn btn-primary">
                <i className="fas fa-plus" /> Créer une liste publique
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {lists.map((list, index) => {
              const bandColor = BAND_COLORS[list.occasion] ?? BAND_COLORS.Autre
              const isTop3    = tab === 'trending' && index < 3

              return (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className={styles.card}
                >
                  {/* Bande couleur */}
                  <div
                    className={styles.cardBand}
                    style={{ background: bandColor }}
                  />

                  <div className={styles.cardBody}>

                    {/* Titre + badge tendance */}
                    <div className={styles.cardTop}>
                      <h2 className={styles.cardTitle}>{list.title}</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                        {/* Badge occasion */}
                        <span className="badge badge-neutral">
                          {list.occasion}
                        </span>
                        {/* Badge top tendance */}
                        {isTop3 && (
                          <span className={styles.trendBadge}>
                            <i className="fas fa-fire" />
                            {index === 0 ? 'Top 1' : index === 1 ? 'Top 2' : 'Top 3'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {list.description && (
                      <p className={styles.cardDesc}>{list.description}</p>
                    )}

                    {/* Propriétaire */}
                    <div className={styles.cardOwner}>
                      <div className="avatar avatar-xs">
                        {list.owner.initials}
                      </div>
                      <span className={styles.cardOwnerName}>
                        {list.owner.name ?? 'Anonyme'}
                      </span>
                    </div>

                    {/* Date événement (si bientôt) */}
                    {list.eventDate && (
                      <div className={styles.cardEvent}>
                        <i className="fas fa-calendar-alt" />
                        {formatEventDate(list.eventDate)}
                        {daysUntil(list.eventDate) <= 30 && (
                          <> · dans {daysUntil(list.eventDate)} jour{daysUntil(list.eventDate) > 1 ? 's' : ''}</>
                        )}
                      </div>
                    )}

                    {/* Méta */}
                    <div className={styles.cardMeta}>
                      <span>
                        <i className="fas fa-gift" />
                        {list.totalItems} cadeau{list.totalItems !== 1 ? 'x' : ''}
                      </span>
                      <span>
                        <i className="fas fa-eye" />
                        {list.viewCount} vue{list.viewCount !== 1 ? 's' : ''}
                      </span>
                      {list.avgPrice > 0 && (
                        <span>
                          <i className="fas fa-euro-sign" />
                          ~{list.avgPrice} € moy.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barre de progression */}
                  {list.totalItems > 0 && (
                    <div className={styles.cardFooter}>
                      <div className={styles.progRow}>
                        <span>
                          {list.reservedCount} réservé{list.reservedCount !== 1 ? 's' : ''}
                        </span>
                        <span>{list.reservationPct}%</span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${list.reservationPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}

      </div>
    </PageLayout>
  )
}