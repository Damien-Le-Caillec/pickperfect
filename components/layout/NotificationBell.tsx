import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from './NotificationBell.module.css'

interface Notif {
    id: string
    type: string
    title: string
    message: string
    link: string
    read: boolean
    createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
    RESERVATION: 'fa-gift',
    COMMENT: 'fa-comment',
    GROUP_INVITE: 'fa-users',
    LIST_INVITE: 'fa-user-plus',
    BADGE_EARNED: 'fa-medal',
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false)
    const [notifs, setNotifs] = useState<Notif[]>([])
    const [unread, setUnread] = useState(0)
    const ref = useRef<HTMLDivElement>(null)

    const load = async () => {
        const res = await fetch('/api/notifications')
        if (!res.ok) return
        const data = await res.json()
        setNotifs(data.notifications)
        setUnread(data.unreadCount)
    }

    useEffect(() => {
        load()
        const interval = setInterval(load, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
            setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const markAllRead = async () => {
        await fetch('/api/notifications/read-all', { method: 'POST' })
        setNotifs(prev => prev.map(n => ({ ...n, read: true })))
        setUnread(0)
    }

    const markRead = async (id: string) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnread(prev => Math.max(0, prev -1))
    }

    return (
        <div className={styles.wrap} ref={ref}>
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(o => !o)}>
                <i className="fas fa-bell" />
                {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
            </button>

            {open && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <span>Notifications</span>
                        {unread > 0 && (
                            <button onClick={markAllRead} className={styles.markAll}>Tout marquer comme lu</button>
                        )}
                    </div>

                    {notifs.length === 0 ? (
                        <div className={styles.empty}>
                            <i className="fas fa-bell-slash" />
                            <p>Aucune notification</p>
                        </div>
                    ) : (
                        <div className={styles.list}>
                            {notifs.map(n => (
                                <Link
                                    key={n.id}
                                    href={n.link ?? '#'}
                                    className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                                    onClick={() => { markRead(n.id); setOpen(false) }}
                                >
                                    <div className={styles.itemIcon}>
                                        <i className={`fas ${TYPE_ICONS[n.type] ?? 'fa-bell'}`} />
                                    </div>
                                    <div className={styles.itemBody}>
                                        <div className={styles.itemTitle}>{n.title}</div>
                                        <div className={styles.itemMsg}>{n.message}</div>
                                        <div className={styles.itemDate}>
                                            {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    {!n.read && <div className={styles.dot} />}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}