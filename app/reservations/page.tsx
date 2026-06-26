'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import PageLayout from "@/components/layout/PageLayout"

interface Reservation {
    id: string
    message: string | null
    createdAt: string
    item: {
        id: string
        title: string
        price: number | null
        imageUrl: string | null
        list: {
            id: string
            title: string
            eventDate: string | null
            user: { name: string | null }
        }
    }
}

export default function ReservationPage() {
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [loading, setLoading] = useState(true)
    const [canceling, setCanceling] = useState<string | null>(null)

    const load = () => {
        fetch('/api/reservations')
            .then(r => r.json())
            .then(d => { setReservations(d); setLoading(false) })
    }

    useEffect(() => { load() }, [])

    const handleCancel = async (itemId: string) => {
        if (!confirm('Annuler cette réservation ?')) return
        setCanceling(itemId)
        await fetch(`/api/items/${itemId}/reserve`, { method: 'DELETE' })
        setCanceling(null)
        load()
    }

    const totalValue = reservations.reduce((sum, r) => sum + (r.item.price ?? 0), 0)

    return (
        <PageLayout>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
            <h1 className="page-title">Mes réservations</h1>
            <p className="page-subtitle">
            {reservations.length} cadeau{reservations.length !== 1 ? 'x' : ''} réservé{reservations.length !== 1 ? 's' : ''} pour vos proches
            {totalValue > 0 && ` · ${totalValue.toFixed(2)} € au total`}
            </p>

            {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}>
                <span className="spinner" />
            </div>
            ) : reservations.length === 0 ? (
            <div className="empty">
                <div className="empty-icon"><i className="fas fa-hand-holding-heart" /></div>
                <h3>Aucune réservation pour l'instant</h3>
                <p>Quand vous réservez un cadeau sur la liste de quelqu'un, il apparaît ici.</p>
                <Link href="/explore" className="btn btn-primary">
                <i className="fas fa-compass" /> Explorer les listes
                </Link>
            </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reservations.map(r => (
                <div key={r.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                    width: 64, height: 64, borderRadius: 'var(--r-md)',
                    background: 'var(--surface-2)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    }}>
                    {r.item.imageUrl
                        ? <img src={r.item.imageUrl} alt={r.item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <i className="fas fa-gift" style={{ color: 'var(--border-2)', fontSize: '1.3rem' }} />
                    }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{r.item.title}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                        Pour <Link href={`/lists/${r.item.list.id}`} style={{ fontWeight: 600 }}>{r.item.list.title}</Link>
                        {r.item.list.user.name && ` · ${r.item.list.user.name}`}
                    </div>
                    {r.item.price && (
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--peach-dark)', marginTop: 4 }}>
                        {r.item.price.toFixed(2)} €
                        </div>
                    )}
                    {r.message && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontStyle: 'italic', marginTop: 4 }}>
                        "{r.message}"
                        </div>
                    )}
                    </div>

                    <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCancel(r.item.id)}
                    disabled={canceling === r.item.id}
                    >
                    {canceling === r.item.id ? <span className="spinner" /> : <><i className="fas fa-times" /> Annuler</>}
                    </button>
                </div>
                ))}
            </div>
            )}
        </div>
        </PageLayout>
    )
}