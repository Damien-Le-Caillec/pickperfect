'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import PageLayout from "@/components/layout/PageLayout"

interface Stats {
    totalUsers: number
    totalLists: number
    totalItems: number
    totalReservations: number
    totalPointsDistributed: number
    newUsersThisWeek: number
    bannedCount: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null)

    useEffect(() => {
        fetch('/api/admin/stats').then(r => r.json()).then(setStats)
    }, [])

    const cards = stats ? [
        { label: 'Utilisateurs', value: stats.totalUsers, icon: 'fa-users', color: 'linear-gradient(135deg,#FF9A8B,#E8826F)' },
        { label: 'Listes créées', value: stats.totalLists, icon: 'fa-list-ul', color: 'linear-gradient(135deg,#A2E4B8,#72C98A)' },
        { label: 'Cadeaux ajoutés', value: stats.totalItems, icon: 'fa-gift', color: 'linear-gradient(135deg,#C5B3E6,#A090CC)' },
        { label: 'Réservations', value: stats.totalReservations, icon: 'fa-hand-holding-heart', color: 'linear-gradient(135deg,#FFD166,#F0B429)' },
        { label: 'Points distribués', value: stats.totalPointsDistributed, icon: 'fa-star', color: 'linear-gradient(135deg,#60A5FA,#2563EB)' },
        { label: 'Nouveaux (7j)', value: stats.newUsersThisWeek, icon: 'fa-user-plus', color: 'linear-gradient(135deg,#34D399,#059669)' },
        { label: 'Comptes bannis', value: stats.bannedCount, icon: 'fa-user-slash', color: 'linear-gradient(135deg,#F87171,#DC2626)' },
    ] : []

    return (
        <PageLayout>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="page-title">
                            <i className="fas fa-shield-alt" style={{ marginRight: 10 }} />
                            Administration
                        </h1>
                        <p style={{ color: 'var(--text-2)' }}>Vue d'ensemble de la plateforme</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Link href="/admin/users" className="btn btn-secondary">
                            <i className="fas fa-users" /> Utilisateurs
                        </Link>
                        <Link href="/admin/logs" className="btn btn-secondary">
                            <i className="fas fa-history" /> Logs
                        </Link>
                    </div>
                </div>

                {!stats ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}>
                        <span className="spinner" />
                    </div>
                ): (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>
                        {cards.map(c => (
                            <div key={c.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 'var(--r-lg)',
                                    background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '1.1rem', flexShrink: 0,
                                }}>
                                    <i className={`fas ${c.icon}`} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{c.value.toLocaleString('fr-FR')}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{c.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PageLayout>
    )
}