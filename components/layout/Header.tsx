'use client'

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import styles from './Header.module.css'

interface CurrentUser {
    id: string
    name: string | null
    email: string
    role: string
}

export default function Header() {
    const router = useRouter()
    const pathname = usePathname()

    const [user, setUser] = useState<CurrentUser | null>(null)
    const [theme, setTheme] = useState<'light' | 'dark'>('light')
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    const menuRef = useRef<HTMLDListElement>(null)

    useEffect(() => {
        const saved = localStorage.getItem('pp_theme') as 'light' | 'dark' | null
        if (saved) setTheme(saved)
        
        fetch('/api/auth/me')
            .then(r => (r.ok ? r.json() : null))
            .then(data => {
                if (data?.success) setUser(data.user)
            })
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
        const next: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light'
        setTheme(next)
        localStorage.setItem('pp_theme', next)
        document.documentElement.setAttribute('data-theme', next)
    }

    const logout = async () => {
        setMenuOpen(false)
        await fetch('/api/auth/logout', { method: 'POST' })
        setUser(null)
        router.push('/')
        router.refresh()
    }

    const navLinks = [
        { href: '/explore', label: 'Explorer',   icon: 'fa-compass'  },
        { href: '/lists',   label: 'Mes listes', icon: 'fa-list-ul'  },
        { href: '/points',  label: 'Points',     icon: 'fa-star'     },
    ]

    const initials = user?.name
        ? user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : (user?.email?.[0] ?? '?').toUpperCase()

    return (
        <header
        className={[
            styles.header,
            scrolled ? styles.scrolled : '',
        ].join(' ')}
        >
        <div className={styles.inner}>
            {/* ---- Logo ---- */}
            <Link
            href={user ? '/dashboard' : '/'}
            className={styles.logo}
            >
            <span className={styles.logoIcon}>
                    <i className="fas fa-gift" />
            </span>
            <span className={styles.logoText}>PickPerfect</span>
            </Link>

            {/* ---- Navigation (utilisateur connecté) ---- */}
            {user && (
            <nav className={styles.nav} aria-label="Navigation principale">
                {navLinks.map(link => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={[
                    styles.navLink,
                    pathname.startsWith(link.href) ? styles.navLinkActive : '',
                    ].join(' ')}
                >
                    <i className={`fas ${link.icon} ${styles.navIcon}`} />
                    <span>{link.label}</span>
                </Link>
                ))}
            </nav>
            )}

            {/* ---- Actions droite ---- */}
            <div className={styles.actions}>
            {/* Toggle thème */}
            <button
                className="btn btn-ghost btn-icon"
                onClick={toggleTheme}
                title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
                aria-label="Changer le thème"
            >
                <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`} />
            </button>

            {/* Utilisateur connecté → menu déroulant */}
            {user ? (
                <div className={styles.userMenu} ref={menuRef}>
                <button
                    className={styles.userTrigger}
                    onClick={() => setMenuOpen(prev => !prev)}
                    aria-expanded={menuOpen}
                >
                    <div className={`avatar avatar-sm ${styles.userAvatar}`}>
                    {initials}
                    </div>
                    <span className={styles.userName}>
                    {user.name?.split(' ')[0] ?? 'Moi'}
                    </span>
                    <i
                    className={[
                        'fas fa-chevron-down',
                        styles.chevron,
                        menuOpen ? styles.chevronOpen : '',
                    ].join(' ')}
                    />
                </button>

                {/* Dropdown */}
                {menuOpen && (
                    <div className={styles.dropdown}>
                    {/* Info utilisateur */}
                    <div className={styles.dropdownUser}>
                        <div className={`avatar avatar-md ${styles.userAvatar}`}>
                        {initials}
                        </div>
                        <div className={styles.dropdownUserInfo}>
                        <span className={styles.dropdownUserName}>
                            {user.name ?? 'Utilisateur'}
                        </span>
                        <span className={styles.dropdownUserEmail}>
                            {user.email}
                        </span>
                        </div>
                    </div>

                    <div className={styles.dropdownDivider} />

                    {/* Liens */}
                    {[
                        { href: '/dashboard', icon: 'fa-home',  label: 'Tableau de bord' },
                        { href: '/profile',   icon: 'fa-user',  label: 'Mon profil'      },
                        { href: '/points',    icon: 'fa-star',  label: 'Mes points'      },
                    ].map(item => (
                        <Link
                        key={item.href}
                        href={item.href}
                        className={styles.dropdownItem}
                        onClick={() => setMenuOpen(false)}
                        >
                        <i className={`fas ${item.icon}`} />
                        {item.label}
                        </Link>
                    ))}

                    {user.role === 'ADMIN' && (
                        <Link
                        href="/admin"
                        className={styles.dropdownItem}
                        onClick={() => setMenuOpen(false)}
                        >
                        <i className="fas fa-shield-alt" />
                        Administration
                        </Link>
                    )}

                    <div className={styles.dropdownDivider} />

                    <button
                        className={[styles.dropdownItem, styles.dropdownDanger].join(' ')}
                        onClick={logout}
                    >
                        <i className="fas fa-sign-out-alt" />
                        Se déconnecter
                    </button>
                    </div>
                )}
                </div>
            ) : (
                /* Non connecté → boutons auth */
                <div className={styles.authButtons}>
                <Link href="/login" className="btn btn-ghost btn-sm">
                    Connexion
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                    S'inscrire
                </Link>
                </div>
            )}
            </div>
        </div>
        </header>
    )
}