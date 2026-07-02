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
  const params  = useParams()
  const router  = useRouter()
  const groupId = params.id as string

  const [group,   setGroup]   = useState<GroupData | null>(null)
  const [me,      setMe]      = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied,    setCopied]    = useState(false)

  // ---- Secret Santa ----
  const [santa,        setSanta]        = useState<any>(null)
  const [santaLoading, setSantaLoading] = useState(false)
  const [santaForm,    setSantaForm]    = useState({ budget: '', eventDate: '' })
  const [myWishes,     setMyWishes]     = useState<any[]>([])
  const [targetWishes, setTargetWishes] = useState<any[]>([])
  const [wishForm,     setWishForm]     = useState({ title: '', description: '', price: '', url: '' })
  const [showWishes,   setShowWishes]   = useState(false)
  const [addingWish,   setAddingWish]   = useState(false)
  const [reminding,    setReminding]    = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`)
    if (!res.ok) { router.push('/groups'); return }
    setGroup(await res.json())
    setLoading(false)
  }, [groupId, router])

  useEffect(() => {
    load()
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setMe({ id: d.user.id }) })
    // Charger le Secret Santa
    fetch(`/api/groups/${groupId}/secret-santa`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSanta(d))
  }, [load, groupId])

  // ---- Handlers groupe ----
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

  // ---- Handlers Secret Santa ----
  const launchSanta = async () => {
    if (!group) return
    if (!confirm(`Lancer le Secret Santa pour ${group.members.length} membres ?`)) return
    setSantaLoading(true)
    const res = await fetch(`/api/groups/${groupId}/secret-santa`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({
        budget:    santaForm.budget ? parseFloat(santaForm.budget) : null,
        eventDate: santaForm.eventDate || null,
        year:      new Date().getFullYear(),
      }),
    })
    setSantaLoading(false)
    if (res.ok) {
      const data = await res.json()
      alert(`🎅 Tirage effectué ! ${data.participants} participants ont reçu leur email.`)
      const updated = await fetch(`/api/groups/${groupId}/secret-santa`).then(r => r.json())
      setSanta(updated)
    }
  }

  const sendReminder = async () => {
    if (!confirm('Envoyer un rappel à tout le monde ? 🎅')) return
    setReminding(true)
    const res  = await fetch(`/api/groups/${groupId}/secret-santa`, { method: 'PATCH' })
    const data = await res.json()
    setReminding(false)
    alert(`✅ ${data.sent} rappels envoyés !`)
  }

  const loadWishes = async () => {
    setShowWishes(true)
    const res = await fetch(`/api/groups/${groupId}/secret-santa/wishes`)
    if (res.ok) setTargetWishes(await res.json())
  }

  const addWish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wishForm.title.trim()) return
    setAddingWish(true)
    const res = await fetch(`/api/groups/${groupId}/secret-santa/wishes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(wishForm),
    })
    setAddingWish(false)
    if (res.ok) {
      const wish = await res.json()
      setMyWishes(prev => [...prev, wish])
      setWishForm({ title: '', description: '', price: '', url: '' })
      const updated = await fetch(`/api/groups/${groupId}/secret-santa`).then(r => r.json())
      setSanta(updated)
    }
  }

  const deleteWish = async (wishId: string) => {
    await fetch(`/api/groups/${groupId}/secret-santa/wishes/${wishId}`, { method: 'DELETE' })
    setMyWishes(prev => prev.filter(w => w.id !== wishId))
  }

  if (loading || !group) {
    return (
      <PageLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}>
          <span className="spinner" />
        </div>
      </PageLayout>
    )
  }

  const isOwner = me?.id === group.ownerId

  return (
    <PageLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <Link href="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" /> Mes groupes
        </Link>

        {/* En-tête groupe */}
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

        {/* Lien d'invitation */}
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
        <div className="card" style={{ marginBottom: '1.5rem' }}>
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
                const total    = lg.list._count.items
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

        {/* ================================================
            SECTION SECRET SANTA
        ================================================ */}
        <div className="card" style={{ marginTop: 'var(--s-6)' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 'var(--s-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎅 Secret Santa
          </h2>

          {!santa ? (
            isOwner ? (
              <div>
                <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: 'var(--s-4)' }}>
                  Lance le tirage pour que chaque membre reçoive son attribution par email.
                </p>
                <div className="form-row" style={{ marginBottom: 'var(--s-4)' }}>
                  <div className="form-group">
                    <label className="label">Budget suggéré (€) <span className="form-hint">(optionnel)</span></label>
                    <input type="number" value={santaForm.budget} onChange={e => setSantaForm(p => ({ ...p, budget: e.target.value }))} placeholder="Ex : 20" min="0" />
                  </div>
                  <div className="form-group">
                    <label className="label">Date de l'événement <span className="form-hint">(optionnel)</span></label>
                    <input type="date" value={santaForm.eventDate} onChange={e => setSantaForm(p => ({ ...p, eventDate: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={launchSanta} disabled={santaLoading || group.members.length < 2}>
                  {santaLoading ? <><span className="spinner" /> Tirage en cours…</> : <><i className="fas fa-hat-santa" /> Lancer le Secret Santa</>}
                </button>
                {group.members.length < 2 && (
                  <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: 'var(--s-2)' }}>
                    Il faut au moins 2 membres pour lancer un Secret Santa.
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
                Le propriétaire du groupe n'a pas encore lancé le Secret Santa.
              </p>
            )
          ) : (
            <div>
              {/* Stats (proprio uniquement) */}
              {santa.isOwner && santa.stats && (
                <div style={{ display: 'flex', gap: 'var(--s-4)', marginBottom: 'var(--s-5)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--s-4)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--peach)' }}>
                      {santa.stats.filledWishes}/{santa.stats.total}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>listes remplies</div>
                  </div>
                  {santa.eventDate && (
                    <div className="card" style={{ flex: 1, textAlign: 'center', padding: 'var(--s-4)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--lavender)' }}>
                        {Math.max(0, Math.ceil((new Date(santa.eventDate).getTime() - Date.now()) / 86400000))}j
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>avant l'événement</div>
                    </div>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={sendReminder}
                    disabled={reminding}
                    style={{ alignSelf: 'center' }}
                    title="Envoyer un rappel à tout le monde"
                  >
                    {reminding ? <><span className="spinner" /> Envoi…</> : <><i className="fas fa-bell" /> Relancer tout le monde 🎅</>}
                  </button>
                </div>
              )}

              {/* Mon tirage */}
              {santa.receiver && (
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-xl)', padding: 'var(--s-5)', marginBottom: 'var(--s-5)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 'var(--s-2)' }}>🎅 Vous offrez à :</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--peach)', marginBottom: 'var(--s-3)' }}>
                    {santa.receiver.name ?? 'Votre cible'}
                  </p>
                  {santa.budget && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 'var(--s-3)' }}>
                      Budget suggéré : <strong>{santa.budget}€</strong>
                    </p>
                  )}
                  <button className="btn btn-accent btn-sm" onClick={loadWishes}>
                    <i className="fas fa-list" /> Voir ses souhaits
                  </button>
                </div>
              )}

              {/* Souhaits de ma cible */}
              {showWishes && (
                <div style={{ marginBottom: 'var(--s-5)' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 'var(--s-3)', fontSize: '0.95rem' }}>
                    🎁 Liste de souhaits de {santa.receiver?.name ?? 'votre cible'}
                  </h3>
                  {targetWishes.length === 0 ? (
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
                      {santa.receiver?.name ?? 'Votre cible'} n'a pas encore rempli sa liste de souhaits.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                      {targetWishes.map((w: any) => (
                        <div key={w.id} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 'var(--s-4)' }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{w.title}</div>
                          {w.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 4 }}>{w.description}</div>}
                          <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center' }}>
                            {w.price && <span className="badge badge-mint">{w.price}€</span>}
                            {w.url && <a href={w.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><i className="fas fa-external-link-alt" /> Voir</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ma liste de souhaits */}
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 'var(--s-3)', fontSize: '0.95rem' }}>
                  📝 Ma liste de souhaits
                  <span className="form-hint" style={{ marginLeft: 8 }}>visible uniquement par la personne qui m'a tiré</span>
                </h3>

                {myWishes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
                    {myWishes.map((w: any) => (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 'var(--s-3) var(--s-4)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{w.title}</div>
                          {w.price && <span style={{ fontSize: '0.75rem', color: 'var(--mint)' }}>{w.price}€</span>}
                        </div>
                        {w.url && <a href={w.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm"><i className="fas fa-external-link-alt" /></a>}
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteWish(w.id)}><i className="fas fa-trash" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={addWish} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                  <div className="form-row">
                    <div className="form-group">
                      <input
                        type="text" value={wishForm.title}
                        onChange={e => setWishForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Idée de cadeau *" required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="number" value={wishForm.price}
                        onChange={e => setWishForm(p => ({ ...p, price: e.target.value }))}
                        placeholder="Prix (€)" min="0" step="0.01"
                      />
                    </div>
                  </div>
                  <input
                    type="url" value={wishForm.url}
                    onChange={e => setWishForm(p => ({ ...p, url: e.target.value }))}
                    placeholder="Lien produit (optionnel)"
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={addingWish} style={{ alignSelf: 'flex-start' }}>
                    {addingWish ? <><span className="spinner" /> Ajout…</> : <><i className="fas fa-plus" /> Ajouter un souhait</>}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  )
}