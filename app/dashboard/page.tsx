import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { prisma } from "@/lib/prisma";
import PageLayout from "@/components/layout/PageLayout";
import styles from './page.module.css'

const STAT_CONFIG = [
  {
    key:   'lists',
    label: 'Listes créées',
    icon:  'fa-list-ul',
    bg:    'linear-gradient(135deg, #FF9A8B, #E8826F)',
  },
  {
    key:   'reservations',
    label: 'Réservations',
    icon:  'fa-check-circle',
    bg:    'linear-gradient(135deg, #A2E4B8, #72C98A)',
  },
  {
    key:   'points',
    label: 'Points dispo.',
    icon:  'fa-star',
    bg:    'linear-gradient(135deg, #FFD166, #F0B429)',
  },
  {
    key:   'level',
    label: 'Niveau actuel',
    icon:  'fa-trophy',
    bg:    'linear-gradient(135deg, #C5B3E6, #A090CC)',
  },
]

export default async function DashboardPage() {
  /* ---- Auth ---- */
  const cookieStore = await cookies()
  const sessionId   = cookieStore.get('auth_session')?.value
  if (!sessionId) redirect('/login')

  const session = await validateSession(sessionId)
  if (!session) redirect('/login')

  const userId = session.userId

  /* ---- Données ---- */
  const [lists, points, reservationCount] = await Promise.all([
    prisma.list.findMany({
      where:   { userId },
      include: {
        _count: { select: { items: true } },
        items:  { select: { reserved: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take:    5,
    }),
    prisma.points.findUnique({ where: { userId } }),
    prisma.reservation.count({ where: { userId } }),
  ])

  const totalLists = await prisma.list.count({ where: { userId } })
  const firstName  = session.user.name?.split(' ')[0] ?? 'vous'

  const xpPct = points
    ? Math.min(100, Math.round((points.experience / points.nextLevelExp) * 100))
    : 0

  const statValues: Record<string, string | number> = {
    lists:        totalLists,
    reservations: reservationCount,
    points:       points?.availablePoints ?? 0,
    level:        `Niv. ${points?.level ?? 1}`,
  }

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })

  return (
    <PageLayout>
      <div className={styles.page}>
        <div className={styles.wrapper}>

          {/* ---- En-tête ---- */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.greetingLine}>
                Bonjour, {firstName}
              </h1>
              <p className={styles.dateLine}>{dateStr}</p>
            </div>
            <Link href="/lists/new" className="btn btn-primary">
              <i className="fas fa-plus" /> Nouvelle liste
            </Link>
          </div>

          {/* ---- Stats ---- */}
          <div className={styles.stats}>
            {STAT_CONFIG.map(s => (
              <div key={s.key} className={styles.statCard}>
                <div
                  className={styles.statIconWrap}
                  style={{ background: s.bg }}
                >
                  <i className={`fas ${s.icon}`} />
                </div>
                <div>
                  <div className={styles.statValue}>{statValues[s.key]}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ---- Barre XP ---- */}
          <div className={styles.xpCard}>
            <div className={styles.xpBadge}>
              {points?.level ?? 1}
            </div>
            <div className={styles.xpInfo}>
              <div className={styles.xpRow}>
                <span className={styles.xpTitle}>
                  Niveau {points?.level ?? 1}
                </span>
                <span className={styles.xpCount}>
                  {points?.experience ?? 0} / {points?.nextLevelExp ?? 100} XP
                </span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <Link href="/points" className="btn btn-secondary btn-sm">
              <i className="fas fa-star" />
              {points?.availablePoints ?? 0} pts
            </Link>
          </div>

          {/* ---- Contenu principal ---- */}
          <div className={styles.grid}>

            {/* Mes listes */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>
                  <i className="fas fa-list-ul" />
                  Mes listes récentes
                </h2>
                <Link href="/lists" className="btn btn-ghost btn-sm">
                  Tout voir <i className="fas fa-arrow-right" />
                </Link>
              </div>

              {lists.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">
                    <i className="fas fa-list-ul" />
                  </div>
                  <h3>Aucune liste pour l'instant</h3>
                  <p>Créez votre première liste en quelques secondes.</p>
                  <Link href="/lists/new" className="btn btn-primary">
                    <i className="fas fa-plus" /> Créer une liste
                  </Link>
                </div>
              ) : (
                <>
                  {lists.map(list => {
                    const total    = list._count.items
                    const reserved = list.items.filter(i => i.reserved).length
                    const pct      = total > 0
                      ? Math.round((reserved / total) * 100)
                      : 0

                    return (
                      <Link
                        key={list.id}
                        href={`/lists/${list.id}`}
                        className={styles.listItem}
                      >
                        <div className={styles.listItemIcon}>
                          <i className="fas fa-gift" />
                        </div>
                        <div className={styles.listItemInfo}>
                          <div className={styles.listItemTitle}>
                            {list.title}
                          </div>
                          <div className={styles.listItemMeta}>
                            {total} cadeau{total !== 1 ? 'x' : ''}
                            {list.eventDate && (
                              <> ·{' '}
                                {new Date(list.eventDate).toLocaleDateString(
                                  'fr-FR',
                                  { day: 'numeric', month: 'short' }
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className={styles.listItemProg}>
                          <div className={styles.listItemPct}>{pct}%</div>
                          <div className="progress">
                            <div
                              className="progress-bar"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className={styles.sidebar}>
              {/* Points */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    <i className="fas fa-star" /> Mes points
                  </h2>
                </div>
                <div className={styles.pointsWidget}>
                  <div className={styles.pointsNum}>
                    {points?.availablePoints ?? 0}
                  </div>
                  <div className={styles.pointsLabel}>points disponibles</div>
                  <Link
                    href="/points"
                    className={`btn btn-accent ${styles.pointsBtn}`}
                  >
                    Voir les récompenses
                  </Link>
                </div>
              </div>

              {/* Navigation rapide */}
              <div className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    <i className="fas fa-bolt" /> Actions rapides
                  </h2>
                </div>
                {[
                  { href: '/lists/new', icon: 'fa-plus',    label: 'Nouvelle liste' },
                  { href: '/explore',   icon: 'fa-compass', label: 'Explorer' },
                  { href: '/profile',   icon: 'fa-user',    label: 'Mon profil' },
                  { href: '/legal/cgu', icon: 'fa-file-alt',label: 'CGU' },
                ].map(l => (
                  <Link key={l.href} href={l.href} className={styles.quickLink}>
                    <i className={`fas ${l.icon}`} />
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}