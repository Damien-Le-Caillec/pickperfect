'use client'

import { useState, useEffect } from 'react'
import PageLayout from '@/components/layout/PageLayout'
import Link from 'next/link'

interface Friend { id: string; friend: { id: string; name: string | null; email: string }; since: string }
interface Request { id: string; sender: { id: string; name: string | null; email: string } }

export default function FriendsPage() {
  const [friends,  setFriends]  = useState<Friend[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [email,    setEmail]    = useState('')
  const [adding,   setAdding]   = useState(false)
  const [addMsg,   setAddMsg]   = useState('')
  const [addErr,   setAddErr]   = useState('')

  const load = () => {
    fetch('/api/friends').then(r => r.json()).then(d => {
      setFriends(d.friends ?? [])
      setRequests(d.requests ?? [])
      console.log('friends data:', d)
    })
  }

  useEffect(() => { load() }, [])

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true); setAddMsg(''); setAddErr('')
    const res  = await fetch('/api/friends', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ email }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setAddErr(data.error); return }
    setAddMsg('Demande envoyée !'); setEmail(''); load()
  }

  const respond = async (id: string, action: 'accept' | 'reject') => {
    await fetch(`/api/friends/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ action }),
    })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Supprimer cet ami ?')) return
    await fetch(`/api/friends/${id}`, { method: 'DELETE' })
    load()
  }

  const initials = (u: { name: string | null; email?: string }) =>
    u.name?.[0]?.toUpperCase() ?? u.email?.[0].toUpperCase() ?? '?'

  return (
    <PageLayout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1 className="page-title">Mes amis</h1>

        {/* ---- Ajouter un ami ---- */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            <i className="fas fa-user-plus" style={{ marginRight: 8, color: 'var(--peach)' }} />
            Ajouter un ami
          </h2>
          <form onSubmit={sendRequest} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email de votre ami…" required style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding ? <span className="spinner" /> : <><i className="fas fa-paper-plane" /> Inviter</>}
            </button>
          </form>
          {addMsg && <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem' }}><i className="fas fa-check" /> {addMsg}</p>}
          {addErr && <p style={{ color: 'var(--error)',   fontSize: '0.85rem', marginTop: '0.5rem' }}><i className="fas fa-times" /> {addErr}</p>}
        </div>

        {/* ---- Demandes reçues ---- */}
        {requests.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
              <i className="fas fa-bell" style={{ marginRight: 8, color: 'var(--peach)' }} />
              Demandes reçues ({requests.length})
            </h2>
            {requests.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-1)' }}>
                <div className="avatar avatar-sm">{initials(r.sender)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{r.sender.name ?? r.sender.email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{r.sender.email}</div>
                </div>
                <button className="btn btn-primary btn-sm"   onClick={() => respond(r.id, 'accept')}>Accepter</button>
                <button className="btn btn-secondary btn-sm" onClick={() => respond(r.id, 'reject')}>Refuser</button>
              </div>
            ))}
          </div>
        )}

        {/* ---- Liste d'amis ---- */}
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
            <i className="fas fa-users" style={{ marginRight: 8, color: 'var(--peach)' }} />
            Amis ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
              Aucun ami pour l'instant. Invitez vos proches avec leur email.
            </p>
          ) : (
            friends.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-1)' }}>
                <div className="avatar avatar-sm">{initials(f.friend)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{f.friend.name ?? f.friend.email ?? 'Utilisateur'}</div>
                  {f.friend.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{f.friend.email}</div>}
                </div>
                <Link href={`/profile/${f.friend.id}`} className="btn btn-ghost btn-sm">
                  <i className="fas fa-eye" /> Voir
                </Link>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(f.id)} title="Supprimer">
                  <i className="fas fa-user-minus" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  )
}