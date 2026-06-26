'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface GroupData {
  id: string
  name: string
  description?: string
  ownerId: string
  members: { userId: string; role: string; user: { id: string; name: string | null; email: string } }[]
  lists: { list: { id: string; title: string; _count: { items: number }; items: { reserved: boolean }[] } }[]
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<GroupData | null>(null)
  const [me, setMe] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`)
    if (!res.ok) { router.push('/groups'); return }
    setGroup(await res.json())
    setLoading(false)
  }, [groupId, router])

  useEffect(() => {
    load()
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setMe({ id: d.user.id }) })
  }, [load])

  const handleInvite = async () => {
    const res  = await fetch(`/api/groups/${groupId}/invite`, { method: 'POST' })
    const data = await res.json()
    if (data.inviteUrl) setInviteUrl(data.inviteUrl)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Retirer ce membre du groupe ?')) return
    await fetch(`/api/groups/${groupId}/invite`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    await load()
  }

  const handleDeleteGroup = async () => {
    if (!confirm('Supprimer définitivement ce groupe ?')) return
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
    router.push('/groups')
  }

  if (loading || !group) {
    return <PageLayout><div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}><span className="spinner" /></div></PageLayout>
  }

  const isOwner = me?.id === group.ownerId

  return (
    <PageLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Link href="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" /> Mes groupes
        </Link>

        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              <i className="fas fa-users" style={{ marginRight: 10, color: 'var(--peach)' }} />
              {group.name}
            </h1>
            {group.description && <p style={{ color: 'var(--text-2)' }}>{group.description}</p>}
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-accent btn-sm" onClick={handleInvite}>
                <i className="fas fa-user-plus" /> Inviter
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteGroup}>
                <i className="fas fa-trash" /> Supprimer
              </button>
            </div>
          )}
        </div>

        {inviteUrl && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Lien d'invitation</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="text" value={inviteUrl} readOnly style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--surface-2)' }} />
              <button className="btn btn-accent btn-sm" onClick={handleCopy}>
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} /> {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>Valable 7 jours · 50 utilisations max</p>
          </div>
        )}

        {/* Membres */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>
            <i className="fas fa-user-friends" style={{ marginRight: 8, color: 'var(--peach)' }} />
            Membres ({group.members.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {group.members.map(m => (
              <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                <div className="avatar avatar-sm">{m.user.name?.[0]?.toUpperCase() ?? m.user.email[0].toUpperCase()}</div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{m.user.name ?? m.user.email}</span>
                {m.userId === group.ownerId && <span className="badge badge-peach">Propriétaire</span>}
                {isOwner && m.userId !== group.ownerId && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveMember(m.userId)} title="Retirer">
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Listes partagées */}
        <div className="card">
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>
            <i className="fas fa-list" style={{ marginRight: 8, color: 'var(--peach)' }} />
            Listes partagées ({group.lists.length})
          </h2>
          {group.lists.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
              Aucune liste partagée avec ce groupe. Depuis une de vos listes, utilisez "Partager avec un groupe".
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {group.lists.map(lg => {
                const total = lg.list._count.items
                const reserved = lg.list.items.filter(i => i.reserved).length
                return (
                  <Link key={lg.list.id} href={`/lists/${lg.list.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--r-md)', textDecoration: 'none', color: 'var(--text-1)', background: 'var(--surface-2)' }}>
                    <i className="fas fa-gift" style={{ color: 'var(--peach)' }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{lg.list.title}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{reserved}/{total} réservés</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}