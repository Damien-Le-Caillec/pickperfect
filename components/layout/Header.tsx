'use client'

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import styles from './Header.module.css'
import NotificationBell from "./NotificationBell"

interface CurrentUser {
    id: string
    name: string | null
    email: string
    role: string
}

export default function Header() {
    const router = useRouter()
    const pathname = usePathname()

    const [user,     setUser]     = useState<CurrentUser | null>(null)
    const [theme,    setTheme]    = useState<'dark' | 'light'>('dark')
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Dark par défaut
        const saved = localStorage.getItem('pickperfect-theme') as 'light' | 'dark' | null
        const initial = saved ?? 'dark'
        setTheme(initial)
        document.documentElement.setAttribute('data-theme', initial)

        fetch('/api/auth/me')
            .then(r => (r.ok ? r.json() : null))
            .then(data => { if (data?.success) setUser(data.user) })
            .catch(() => {})

        const onScroll = () => setScrolled(window.scrollY > 12)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        localStorage.setItem('pickperfect-theme', next)
        document.documentElement.setAttribute('data-theme', next)
    }

    const logout = async () => {
        setMenuOpen(false)
        setMobileOpen(false)
        await fetch('/api/auth/logout', { method: 'POST' })
        setUser(null)
        router.push('/')
        router.refresh()
    }

    const navLinks = [
        { href: '/explore',      label: 'Explorer',       icon: 'fa-compass'       },
        { href: '/lists',        label: 'Mes listes',     icon: 'fa-list-ul'       },
        { href: '/groups',       label: 'Groupes',        icon: 'fa-users'         },
        { href: '/friends',      label: 'Amis',           icon: 'fa-user-friends'  },
        { href: '/birthdays',    label: 'Anniversaires',  icon: 'fa-birthday-cake' },
        { href: '/shared-lists', label: 'Partagées',      icon: 'fa-share-alt'     },
        { href: '/points',       label: 'Points',         icon: 'fa-star'          },
    ]

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : (user?.email?.[0] ?? '?').toUpperCase()

    return (
        <>
        <header className={[styles.header, scrolled ? styles.scrolled : ''].join(' ')}>
            <div className={styles.inner}>

                {/* Logo */}
                <Link href={user ? '/dashboard' : '/'} className={styles.logo}>
                    <span className={styles.logoIcon}><i className="fas fa-gift" /></span>
                    <span className={styles.logoText}>PickPerfect</span>
                </Link>

                {/* Navigation desktop */}
                {user && (
                    <nav className={styles.nav} aria-label="Navigation principale">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={[styles.navLink, pathname.startsWith(link.href) ? styles.navLinkActive : ''].join(' ')}
                            >
                                <i className={`fas ${link.icon} ${styles.navIcon}`} />
                                <span>{link.label}</span>
                            </Link>
                        ))}
                    </nav>
                )}

                {/* Actions droite */}
                <div className={styles.actions}>

                    {/* Hamburger mobile */}
                    {user && (
                        <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Menu">
                            <i className="fas fa-bars" />
                        </button>
                    )}

                    {/* Cloche notifications */}
                    {user && <NotificationBell />}

                    {/* Toggle thème */}
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
                        aria-label="Changer le thème"
                    >
                        <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
                    </button>

                    {/* Menu utilisateur desktop */}
                    {user ? (
                        <div className={styles.userMenu} ref={menuRef}>
                            <button className={styles.userTrigger} onClick={() => setMenuOpen(prev => !prev)} aria-expanded={menuOpen}>
                                <div className={`avatar avatar-sm ${styles.userAvatar}`}>{initials}</div>
                                <span className={styles.userName}>{user.name?.split(' ')[0] ?? 'Moi'}</span>
                                <i className={['fas fa-chevron-down', styles.chevron, menuOpen ? styles.chevronOpen : ''].join(' ')} />
                            </button>

                            {menuOpen && (
                                <div className={styles.dropdown}>
                                    <div className={styles.dropdownUser}>
                                        <div className={`avatar avatar-md ${styles.userAvatar}`}>{initials}</div>
                                        <div className={styles.dropdownUserInfo}>
                                            <span className={styles.dropdownUserName}>{user.name ?? 'Utilisateur'}</span>
                                            <span className={styles.dropdownUserEmail}>{user.email}</span>
                                        </div>
                                    </div>

                                    <div className={styles.dropdownDivider} />

                                    {[
                                        { href: '/dashboard',    icon: 'fa-home',               label: 'Tableau de bord'   },
                                        { href: '/profile',      icon: 'fa-user',               label: 'Mon profil'        },
                                        { href: '/reservations', icon: 'fa-hand-holding-heart', label: 'Mes réservations'  },
                                        { href: '/friends',      icon: 'fa-user-friends',       label: 'Mes amis'          },
                                        { href: '/shared-lists', icon: 'fa-share-alt',          label: 'Listes partagées'  },
                                        { href: '/points',       icon: 'fa-star',               label: 'Mes points'        },
                                    ].map(item => (
                                        <Link key={item.href} href={item.href} className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                                            <i className={`fas ${item.icon}`} />
                                            {item.label}
                                        </Link>
                                    ))}

                                    {user.role === 'ADMIN' && (
                                        <Link href="/admin" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                                            <i className="fas fa-shield-alt" />
                                            Administration
                                        </Link>
                                    )}

                                    <div className={styles.dropdownDivider} />

                                    <button className={[styles.dropdownItem, styles.dropdownDanger].join(' ')} onClick={logout}>
                                        <i className="fas fa-sign-out-alt" />
                                        Se déconnecter
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.authButtons}>
                            <Link href="/login" className="btn btn-ghost btn-sm">Connexion</Link>
                            <Link href="/register" className="btn btn-primary btn-sm">S'inscrire</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* Menu mobile drawer */}
        {mobileOpen && user && (
            <div className={styles.mobileMenu}>
                <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
                <div className={styles.mobileDrawer}>

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

                    {[
                        { href: '/dashboard',    icon: 'fa-home',               label: 'Tableau de bord'  },
                        { href: '/profile',      icon: 'fa-user',               label: 'Mon profil'       },
                        { href: '/reservations', icon: 'fa-hand-holding-heart', label: 'Mes réservations' },
                    ].map(item => (
                        <Link key={item.href} href={item.href} className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
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

                    <button
                        onClick={logout}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', padding: 'var(--s-3) var(--s-4)', borderRadius: 'var(--r-md)', border: 'none', background: 'none', color: 'var(--error)', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', width: '100%' }}
                    >
                        <i className="fas fa-sign-out-alt" />
                        Se déconnecter
                    </button>

                </div>
            </div>
        )}
        </>
    )
}