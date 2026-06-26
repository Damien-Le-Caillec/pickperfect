import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { validateSession } from "@/lib/auth/sqlite-auth";
import { prisma } from "@/lib/prisma";
import PageLayout from "@/components/layout/PageLayout";
import styles from './page.module.css'

export default async function GroupsPage() {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('auth_session')?.value
    if (!sessionId) redirect('/login')
    const session = await validateSession(sessionId)
    if (!session) redirect('/login')

    const groups = await prisma.group.findMany({
        where: {
            OR: [
                { ownerId: session.userId },
                { members: { some: { userId: session.userId } } },
            ],
        },
        include: { _count: { select: { members: true, lists: true } } },
        orderBy: { createdAt: 'desc' },
    })

    return (
        <PageLayout>
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Mes groupes</h1>
                    <Link href="/groups/new" className="btn btn-primary">
                        <i className="fas fa-plus" /> Nouveau groupe
                    </Link>
                </div>

                {groups.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon"><i className="fas fa-users" /></div>
                        <h3>Aucun groupe pour l'instant</h3>
                        <p>Créez un groupe pour partager vos listes avec plusieurs proches d'un coup.</p>
                        <Link href="/groups/new" className="btn btn-primary">
                            <i className="fas fa-plus" /> Créer un groupe
                        </Link>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {groups.map(g => (
                            <Link key={g.id} href={`/groups/${g.id}`} className={styles.card}>
                                <div className={styles.cardIcon}><i className="fas fa-users" /></div>
                                <div className={styles.cardName}>{g.name}</div>
                                {g.description && <div className={styles.cardDesc}>{g.description}</div>}
                                <div className={styles.cardMeta}>
                                    <span><i className="fas fa-user" /> {g._count.members} membre{g._count.members !== 1 ? 's' : ''}</span>
                                    <span><i className="fas fa-list" /> {g._count.lists} liste{g._count.lists !== 1 ? 's' : ''}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </PageLayout>
    )
}