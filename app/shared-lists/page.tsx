'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface SharedList {
  id: string; title: string; eventDate: string | null
  user: { name: string | null; email: string }
  _count: { items: number }
  items: { reserved: boolean; price: number | null }[]
  role?: string
}

export default function SharedListsPage() {
  const [asMember,    setAsMember]    = useState<SharedList[]>([])
  const [fromFriends, setFromFriends] = useState<SharedList[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/shared-lists').then(r => r.json()).then(d => {
      setAsMember(d.asmember ?? d.asMember ?? [])
      setFromFriends(d.fromFriends ?? [])
      setLoading(false)
    })
  }, [])

  const Card = ({ list, badge }: { list: SharedList; badge?: string }) => {
    const reserved = list.items.filter(i => i.reserved).length
    const pct      = list._count.items > 0 ? Math.round((reserved / list._count.items) * 100) : 0
    const prices   = list.items.filter(i => i.price).map(i => i.price as number)
    const avg      = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null
    const daysLeft = list.eventDate
      ? Math.ceil((new Date(list.eventDate).getTime() - Date.now()) / 86400000)
      : null

    return (
      <Link href={`/lists/${list.id}`} style={{ textDecoration: 'none', color: 'var(--text-1)' }}>
        <div className="card" style={{ transition: 'all var(--ease-out)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{list.title}</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                <i className="fas fa-user" style={{ marginRight: 4 }} />
                {list.user.name ?? list.user.email}
              </div>
            </div>
            {badge && <span className="badge badge-lavender">{badge}</span>}
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span><i className="fas fa-gift" style={{ marginRight: 4 }} />{list._count.items} cadeaux</span>
            {avg && <span><i className="fas fa-euro-sign" style={{ marginRight: 4 }} />Moy. {avg.toFixed(0)}€</span>}
            {daysLeft !== null && daysLeft > 0 && (
              <span style={{ color: daysLeft <= 7 ? 'var(--error)' : daysLeft <= 30 ? 'var(--peach-dark)' : 'var(--text-3)' }}>
                <i className="fas fa-clock" style={{ marginRight: 4 }} />
                dans {daysLeft} jour{daysLeft !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="progress" style={{ height: 6 }}>
            <div className="progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
            {reserved}/{list._count.items} réservés
          </div>
        </div>
      </Link>
    )
  }

  if (loading) return <PageLayout><div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}><span className="spinner" /></div></PageLayout>

  return (
    <PageLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 className="page-title">Listes partagées avec moi</h1>

        {asMember.length > 0 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '1rem', marginTop: '1.5rem' }}>
              <i className="fas fa-user-check" style={{ marginRight: 8, color: 'var(--peach)' }} />
              Où j'ai un rôle ({asMember.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {asMembers.map(l => <Card key={l.id} list={l} badge={l.role === 'EDITOR' ? 'Éditeur' : 'Spectateur'} />)}
            </div>
          </>
        )}

        {fromFriends.length > 0 && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: '1rem' }}>
              <i className="fas fa-users" style={{ marginRight: 8, color: 'var(--lavender-dark)' }} />
              Listes de mes amis ({fromFriends.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
              {fromFriends.map(l => <Card key={l.id} list={l} />)}
            </div>
          </>
        )}

        {asMembers.length === 0 && fromFriends.length === 0 && (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-share-alt" /></div>
            <h3>Aucune liste partagée</h3>
            <p>Les listes de vos amis et celles où vous êtes invité apparaîtront ici.</p>
            <Link href="/friends" className="btn btn-primary">
              <i className="fas fa-user-plus" /> Ajouter des amis
            </Link>
          </div>
        )}
      </div>
    </PageLayout>
  )
}