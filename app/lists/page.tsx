import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { validateSession } from "@/lib/auth/sqlite-auth";
import { prisma } from "@/lib/prisma";
import PageLayout from "@/components/layout/PageLayout";
import styles from './page.module.css'

const BAND: Record<string, string> = {
    PUBLIC: 'linear-gradient(90deg, var(--mint), var(--mint-dark))',
    UNLISTED: 'linear-gradient(90deg, var(--lavender), var(--lavender-dark))',
    PRIVATE: 'linear-gradient(90deg, var(--peach), var(--peach-dark))',
}

const PRIVACY_LABEL: Record<string, { icon: string; label: string }> = {
    PUBLIC: { icon: 'fa-globe', label: 'Public' },
    UNLISTED: { icon: 'fa-link', label: 'Par lien' },
    PRIVATE: { icon: 'fa-lock', label: 'Privé' },
}

export default async function ListsPage() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('auth_session')?.value
    if (!sessionId) redirect('/login')

    const session = await validateSession(sessionId)
    if (!session) redirect('/login')

    const lists = await prisma.list.findMany({
        where: { userId: session.userId },
        include: {
            _count: { select: { items: true } },
            items: { select: { reserved: true } },
        },
        orderBy: { updatedAt: 'desc' },
    })

    return (
        <PageLayout>
        <div className={styles.wrapper}>
            {/* Header */}
            <div className={styles.header}>
            <div>
                <h1 className={styles.title}>Mes listes</h1>
                <p className={styles.count}>
                {lists.length} liste{lists.length !== 1 ? 's' : ''}
                </p>
            </div>
            <Link href="/lists/new" className="btn btn-primary">
                <i className="fas fa-plus" /> Nouvelle liste
            </Link>
            </div>

            {/* Vide */}
            {lists.length === 0 ? (
            <div className="empty">
                <div className="empty-icon">
                <i className="fas fa-list-ul" />
                </div>
                <h3>Aucune liste pour l'instant</h3>
                <p>
                Créez votre première liste et partagez-la
                avec vos proches.
                </p>
                <Link href="/lists/new" className="btn btn-primary">
                <i className="fas fa-plus" /> Créer ma première liste
                </Link>
            </div>
            ) : (
            <div className={styles.grid}>
                {lists.map(list => {
                const total    = list._count.items
                const reserved = list.items.filter(i => i.reserved).length
                const pct      = total > 0 ? Math.round((reserved / total) * 100) : 0
                const pl       = PRIVACY_LABEL[list.privacy] ?? PRIVACY_LABEL.UNLISTED

                return (
                    <Link
                    key={list.id}
                    href={`/lists/${list.id}`}
                    className={styles.card}
                    >
                    {/* Bande couleur */}
                    <div
                        className={styles.cardBand}
                        style={{ background: BAND[list.privacy] ?? BAND.UNLISTED }}
                    />

                    <div className={styles.cardBody}>
                        <div className={styles.cardTop}>
                        <h2 className={styles.cardTitle}>{list.title}</h2>
                        <span className="badge badge-neutral">
                            <i className={`fas ${pl.icon}`} />
                            {pl.label}
                        </span>
                        </div>

                        {list.description && (
                        <p className={styles.cardDesc}>{list.description}</p>
                        )}

                        <div className={styles.cardMeta}>
                        <span>
                            <i className="fas fa-gift" />
                            {total} cadeau{total !== 1 ? 'x' : ''}
                        </span>
                        <span>
                            <i className="fas fa-check-circle" />
                            {reserved} réservé{reserved !== 1 ? 's' : ''}
                        </span>
                        {list.eventDate && (
                            <span>
                            <i className="fas fa-calendar-alt" />
                            {new Date(list.eventDate).toLocaleDateString('fr-FR', {
                                day:   'numeric',
                                month: 'short',
                                year:  'numeric',
                            })}
                            </span>
                        )}
                        </div>
                    </div>

                    {/* Barre de progression */}
                    {total > 0 && (
                        <div className={styles.cardFooter}>
                        <div className={styles.progRow}>
                            <span>Progression</span>
                            <span>{pct}%</span>
                        </div>
                        <div className="progress">
                            <div
                            className="progress-bar"
                            style={{ width: `${pct}%` }}
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