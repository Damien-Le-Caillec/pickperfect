'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import PageLayout from "@/components/layout/PageLayout"

interface AdminUser {
    id: string
    email: string
    name: string | null
    role: string
    banned: boolean
    createdAt: string
    lastLoginAt: string | null
    loginCount: number
    _count: { lists: number; reservations: number }
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState<string | null>(null)

    const load = () => {
        setLoading(true)
        fetch(`/api/admin/users?search=${encodeURIComponent(search)}`)
            .then(r => r.json())
            .then(d => { setUsers(d); setLoading(false) })
    }

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0)
        return () => clearTimeout(t)
    }, [search])

    const toggleBan = async (id: string, currentlyBanned: boolean) => {
        const action = currentlyBanned ? 'débannir' : 'bannir'
        if (!confirm(`voulez-vous ${action} cet utilisateur ?`)) return

        setActing(id)
        await fetch(`/api/admin/users/${id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        })
        setActing(null)
        load()
    }

    return (
        <PageLayout>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
                <i className="fas fa-arrow-left" /> Dashboard admin
                </Link>

                <h1 className="page-title">Utilisateurs</h1>
                <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>{users.length} résultat{users.length !== 1 ? 's' : ''}</p>

                <div style={{ position: 'relative', maxWidth: 360, marginBottom: '1.5rem' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.8rem' }} />
                <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher par email ou nom…" style={{ paddingLeft: 36 }}
                />
                </div>

                {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}>
                    <span className="spinner" />
                </div>
                ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)' }}>
                        {['Utilisateur', 'Listes', 'Réservations', 'Inscrit', 'Dernière connexion', 'Statut', ''].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-2)' }}>{h}</th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="avatar avatar-xs">{u.name?.[0]?.toUpperCase() ?? u.email[0].toUpperCase()}</div>
                                <div>
                                <div style={{ fontWeight: 600 }}>{u.name ?? 'Sans nom'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{u.email}</div>
                                </div>
                                {u.role === 'ADMIN' && <span className="badge badge-peach">Admin</span>}
                            </div>
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>{u._count.lists}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{u._count.reservations}</td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-3)' }}>
                            {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-3)' }}>
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                            {u.banned
                                ? <span className="badge badge-error">Banni</span>
                                : <span className="badge badge-success">Actif</span>
                            }
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                            {u.role !== 'ADMIN' && (
                                <button
                                className={`btn btn-sm ${u.banned ? 'btn-secondary' : 'btn-danger'}`}
                                onClick={() => toggleBan(u.id, u.banned)}
                                disabled={acting === u.id}
                                >
                                {acting === u.id ? <span className="spinner" /> : u.banned ? 'Débannir' : 'Bannir'}
                                </button>
                            )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </div>
        </PageLayout>
    )
}