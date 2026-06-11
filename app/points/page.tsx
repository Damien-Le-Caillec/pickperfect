'use client'

import { useState, useEffect } from 'react'
import PageLayout               from '@/components/layout/PageLayout'
import { REWARDS, BADGES_CONFIG, ACTION_LABELS } from '@/lib/points/catalog'
import styles                   from './page.module.css'

// ---- Types ----
interface Points {
  totalPoints:     number
  availablePoints: number
  spentPoints:     number
  level:           number
  experience:      number
  nextLevelExp:    number
}

interface Badge {
  id:          string
  badgeId:     string
  badgeName:   string
  description: string | null
  earnedAt:    string
}

interface Transaction {
  id:        string
  type:      string
  points:    number
  reason:    string
  createdAt: string
}

// ---- Couleurs par catégorie de récompense ----
const REWARD_COLORS: Record<string, string> = {
  digital:   'linear-gradient(135deg, #C5B3E6, #A090CC)',
  privilege: 'linear-gradient(135deg, #FF9A8B, #E8826F)',
  cashback:  'linear-gradient(135deg, #A2E4B8, #72C98A)',
  physical:  'linear-gradient(135deg, #FFD166, #F0B429)',
}

// ---- Icône + couleur par type de transaction ----
function txStyle(type: string, reason: string) {
  if (type === 'SPENT') {
    return { icon: 'fa-minus-circle', bg: 'rgba(248,113,113,0.1)', color: 'var(--error)' }
  }
  if (reason.includes('reservation')) {
    return { icon: 'fa-hand-holding-heart', bg: 'rgba(162,228,184,0.12)', color: 'var(--mint-dark)' }
  }
  if (reason.includes('share')) {
    return { icon: 'fa-share-alt', bg: 'rgba(197,179,230,0.12)', color: 'var(--lavender-dark)' }
  }
  if (reason.includes('login')) {
    return { icon: 'fa-sun', bg: 'rgba(255,209,102,0.12)', color: 'var(--gold-dark)' }
  }
  if (reason.includes('affiliate')) {
    return { icon: 'fa-shopping-cart', bg: 'rgba(255,154,139,0.12)', color: 'var(--peach-dark)' }
  }
  return { icon: 'fa-plus-circle', bg: 'rgba(162,228,184,0.12)', color: 'var(--mint-dark)' }
}

export default function PointsPage() {
  const [tab,          setTab]          = useState<'rewards' | 'badges' | 'history'>('rewards')
  const [points,       setPoints]       = useState<Points | null>(null)
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    fetch('/api/points')
      .then(r => r.json())
      .then(data => {
        setPoints(data.points)
        setEarnedBadges(data.badges)
        setTransactions(data.transactions)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <PageLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 12, color: 'var(--text-3)' }}>
          <span className="spinner" /> Chargement…
        </div>
      </PageLayout>
    )
  }

  const available = points?.availablePoints ?? 0
  const xpPct     = points
    ? Math.min(100, Math.round((points.experience / points.nextLevelExp) * 100))
    : 0

  // IDs des badges déjà gagnés
  const earnedIds = new Set(earnedBadges.map(b => b.badgeId))

  // Enrichir les badges config avec l'état earned/locked
  const allBadges = BADGES_CONFIG.map(bc => ({
    ...bc,
    earned:   earnedIds.has(bc.id),
    earnedAt: earnedBadges.find(b => b.badgeId === bc.id)?.earnedAt ?? null,
  }))

  return (
    <PageLayout>
      <div className={styles.wrapper}>

        {/* ==================================================
            HERO
        ================================================== */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroPoints}>{available.toLocaleString('fr-FR')}</div>
            <div className={styles.heroPointsLabel}>points disponibles</div>
          </div>

          <div className={styles.heroRight}>
            {/* Niveau + barre XP */}
            <div className={styles.levelRow}>
              <div className={styles.levelBadge}>{points?.level ?? 1}</div>
              <div className={styles.levelInfo}>
                <div className={styles.levelTitle}>Niveau {points?.level ?? 1}</div>
                <div className={styles.levelSub}>
                  {points?.level === 50
                    ? 'Niveau maximum atteint !'
                    : `${(points?.nextLevelExp ?? 100) - (points?.experience ?? 0)} XP pour le niveau ${(points?.level ?? 1) + 1}`
                  }
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{(points?.totalPoints ?? 0).toLocaleString('fr-FR')}</span>
                <span className={styles.heroStatLabel}>total gagnés</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{(points?.spentPoints ?? 0).toLocaleString('fr-FR')}</span>
                <span className={styles.heroStatLabel}>dépensés</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>{allBadges.filter(b => b.earned).length}/{allBadges.length}</span>
                <span className={styles.heroStatLabel}>badges</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            TABS
        ================================================== */}
        <div className={styles.tabs}>
          {[
            { id: 'rewards' as const, label: 'Récompenses', icon: 'fa-gift'    },
            { id: 'badges'  as const, label: 'Badges',      icon: 'fa-medal'   },
            { id: 'history' as const, label: 'Historique',  icon: 'fa-history' },
          ].map(t => (
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

        {/* ==================================================
            RÉCOMPENSES
        ================================================== */}
        {tab === 'rewards' && (
          <div className={styles.rewardsGrid}>
            {REWARDS.map(reward => {
              const locked  = available < reward.cost
              const missing = reward.cost - available

              return (
                <div
                  key={reward.id}
                  className={`${styles.rewardCard} ${locked ? styles.locked : ''}`}
                >
                  <div
                    className={styles.rewardIconWrap}
                    style={{ background: REWARD_COLORS[reward.category] }}
                  >
                    <i className={`fas ${reward.icon}`} />
                  </div>

                  <div className={styles.rewardName}>{reward.name}</div>
                  <div className={styles.rewardDesc}>{reward.desc}</div>

                  <div className={styles.rewardCost}>
                    {reward.cost.toLocaleString('fr-FR')} pts
                  </div>

                  {locked ? (
                    <div className={styles.rewardMissing}>
                      <i className="fas fa-lock" style={{ marginRight: 4 }} />
                      {missing.toLocaleString('fr-FR')} pts manquants
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      <i className="fas fa-exchange-alt" /> Échanger
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ==================================================
            BADGES
        ================================================== */}
        {tab === 'badges' && (
          <div className={styles.badgesGrid}>
            {allBadges.map(badge => (
              <div
                key={badge.id}
                className={`${styles.badgeCard} ${!badge.earned ? styles.locked : ''}`}
              >
                <div
                  className={styles.badgeIconWrap}
                  style={{
                    background: badge.earned
                      ? `linear-gradient(135deg, ${badge.color}, ${badge.color}99)`
                      : 'var(--surface-3)',
                  }}
                >
                  <i className={`fas ${badge.icon}`} />
                </div>

                <div className={styles.badgeName}>{badge.name}</div>
                <div className={styles.badgeDesc}>{badge.desc}</div>

                {badge.earned ? (
                  <div className={styles.badgeDate}>
                    <i className="fas fa-check" style={{ marginRight: 4, color: 'var(--success)' }} />
                    {new Date(badge.earnedAt!).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>
                ) : (
                  <div className={styles.badgeLockLabel}>
                    <i className="fas fa-lock" style={{ marginRight: 4 }} />
                    Non débloqué
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ==================================================
            HISTORIQUE
        ================================================== */}
        {tab === 'history' && (
          transactions.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><i className="fas fa-history" /></div>
              <h3>Aucune transaction pour l'instant</h3>
              <p>Vos points gagnés et dépensés apparaîtront ici.</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {transactions.map(tx => {
                const s = txStyle(tx.type, tx.reason)
                return (
                  <div key={tx.id} className={styles.historyItem}>
                    <div
                      className={styles.historyIcon}
                      style={{ background: s.bg, color: s.color }}
                    >
                      <i className={`fas ${s.icon}`} />
                    </div>

                    <div className={styles.historyInfo}>
                      <div className={styles.historyLabel}>
                        {ACTION_LABELS[tx.reason] ?? tx.reason}
                      </div>
                      <div className={styles.historyDate}>
                        {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>

                    <div className={`${styles.historyPoints} ${tx.type === 'EARNED' ? styles.earned : styles.spent}`}>
                      {tx.type === 'EARNED' ? '+' : '-'}{tx.points} pts
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

      </div>
    </PageLayout>
  )
}