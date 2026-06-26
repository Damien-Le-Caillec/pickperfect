'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter }              from 'next/navigation'
import Link                                  from 'next/link'
import PageLayout                            from '@/components/layout/PageLayout'
import styles                                from './page.module.css'

// ============================================================
// TYPES
// ============================================================

interface Item {
  id:             string
  title:          string
  description?:   string
  price?:         number
  url?:           string
  imageUrl?:      string
  affiliateLink?: string
  reserved:       boolean
  reservedById?:  string
  reservedBy?:    { id: string; name: string | null } | null
  createdById?:   string
  createdBy_item?:{ id: string; name: string | null } | null
  priority:       number
}

interface Member {
  id:        string
  userId:    string
  role:      string
  invitedAt: string
  user:      { id: string; name: string | null; email: string }
}

interface ListData {
  id:            string
  title:         string
  description?:  string
  privacy:       string
  budget?:       number
  eventDate?:    string
  viewCount:     number
  shareToken?:   string
  collaborative: boolean
  userId:        string
  user:          { id: string; name: string | null; email: string }
  items:         Item[]
  members:       Member[]
}

interface CommentData {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null }
}

// ============================================================
// COMPOSANT
// ============================================================

export default function ListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const listId = params.id as string

  // ---- État principal ----
  const [list,    setList]    = useState<ListData | null>(null)
  const [me,      setMe]      = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // ---- Réservation ----
  const [reserving,    setReserving]    = useState<string | null>(null)
  const [reserveModal, setReserveModal] = useState<string | null>(null)
  const [reserveMsg,   setReserveMsg]   = useState('')
  const [reserveAnon,  setReserveAnon]  = useState(false)

  // ---- Partage ----
  const [shareUrl, setShareUrl] = useState('')
  const [copied,   setCopied]   = useState(false)

  // ---- Ajout d'item ----
  const [addOpen,     setAddOpen]     = useState(false)
  const [urlInput,    setUrlInput]    = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [newItem,     setNewItem]     = useState({
    title: '', price: '', imageUrl: '', description: '', priority: 2,
  })
  const [addLoading, setAddLoading] = useState(false)

  // ---- Filtres ----
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState<'priority' | 'name' | 'price_asc' | 'price_desc'>('priority')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'reserved'>('all')

  // ---- Invitations ----
  const [inviteOpen,   setInviteOpen]   = useState(false)
  const [inviteRole,   setInviteRole]   = useState<'VIEWER' | 'EDITOR'>('VIEWER')
  const [inviteUrl,    setInviteUrl]    = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)

  // ---- Modification item ----
  const [editItem,    setEditItem]    = useState<Item | null>(null)
  const [editForm,    setEditForm]    = useState({
    title: '', description: '', price: '', imageUrl: '', url: '', priority: 2,
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError,   setEditError]   = useState('')

  // ---- Modification liste ----
  const [editListOpen,    setEditListOpen]    = useState(false)
  const [editListForm,    setEditListForm]    = useState({
    title: '', description: '', privacy: '', eventDate: '', budget: '',
  })
  const [editListLoading, setEditListLoading] = useState(false)
  const [editListError,   setEditListError]   = useState('')

  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingEditImg, setUploadingEditImg] = useState(false)

  const [commentsOpen, setCommentsOpen] = useState<string | null> (null)
  const [comments, setComments] = useState<CommentData[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoad, setCommentsLoad] = useState(false)
  const [commentSend, setCommentSend] = useState(false)
  // ============================================================
  // CHARGEMENT
  // ============================================================

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/lists/${listId}`)
    if (!res.ok) { router.push('/lists'); return }
    const data = await res.json()
    setList(data)
    setLoading(false)
  }, [listId, router])

  useEffect(() => {
    loadList()
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) setMe({ id: d.user.id }) })
  }, [loadList])

  // upload image

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImg(true)

    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()

    setUploadingImg(false)

    if (res.ok) {
      setNewItem(p => ({ ...p, imageUrl: data.imageUrl }))
    }
  }

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingEditImg(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingEditImg(false)
    if (res.ok) setEditForm(p => ({ ...p, imageUrl: data.imageUrl }))
  }

  // ============================================================
  // FILTRAGE & TRI
  // ============================================================

  const filteredItems = (list?.items ?? [])
    .filter(item => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus === 'available' && item.reserved)  return false
      if (filterStatus === 'reserved'  && !item.reserved) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'priority')   return (b.priority ?? 0) - (a.priority ?? 0)
      if (sortBy === 'name')       return a.title.localeCompare(b.title)
      if (sortBy === 'price_asc')  return (a.price ?? 0) - (b.price ?? 0)
      if (sortBy === 'price_desc') return (b.price ?? 0) - (a.price ?? 0)
      return 0
    })

  const hasActiveFilters = search !== '' || sortBy !== 'priority' || filterStatus !== 'all'

  // ============================================================
  // ACTIONS — ITEM
  // ============================================================

  const fetchFromUrl = async () => {
    if (!urlInput.trim()) return
    setFetchingUrl(true)
    const res  = await fetch('/api/products/from-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ url: urlInput }),
    })
    const data = await res.json()
    setFetchingUrl(false)
    if (res.ok) {
      setNewItem(p => ({
        ...p,
        title:       data.title             || '',
        price:       data.price?.toString() || '',
        imageUrl:    data.imageUrl          || '',
        description: data.description       || '',
      }))
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.title.trim()) return
    setAddLoading(true)

    await fetch('/api/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({
        listId,
        title:       newItem.title,
        description: newItem.description || undefined,
        price:       newItem.price ? parseFloat(newItem.price) : undefined,
        url:         urlInput         || undefined,
        imageUrl:    newItem.imageUrl || undefined,
        priority:    newItem.priority,
      }),
    })

    setNewItem({ title: '', price: '', imageUrl: '', description: '', priority: 2 })
    setUrlInput('')
    setAddOpen(false)
    setAddLoading(false)
    await loadList()
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Supprimer ce cadeau ?')) return
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
    await loadList()
  }

  // Modifier un item
  const openEdit = (item: Item) => {
    setEditItem(item)
    setEditForm({
      title:       item.title,
      description: item.description ?? '',
      price:       item.price?.toString() ?? '',
      imageUrl:    item.imageUrl ?? '',
      url:         item.url ?? '',
      priority:    item.priority ?? 2,
    })
    setEditError('')
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editItem) return
    setEditLoading(true)
    setEditError('')

    const res  = await fetch(`/api/items/${editItem.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({
        title:       editForm.title,
        description: editForm.description || undefined,
        price:       editForm.price ? parseFloat(editForm.price) : null,
        imageUrl:    editForm.imageUrl || '',
        url:         editForm.url      || '',
        priority:    editForm.priority,
      }),
    })

    const data = await res.json()
    setEditLoading(false)

    if (!res.ok) { setEditError(data.error); return }
    setEditItem(null)
    await loadList()
  }

  // ============================================================
  // ACTIONS — RÉSERVATION
  // ============================================================

  const handleReserve = async () => {
    if (!reserveModal) return
    setReserving(reserveModal)

    await fetch(`/api/items/${reserveModal}/reserve`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({
        message:   reserveMsg.trim() || undefined,
        anonymous: reserveAnon,
      }),
    })

    setReserveModal(null)
    setReserveMsg('')
    setReserveAnon(false)
    await loadList()
    setReserving(null)
  }

  const handleUnreserve = async (itemId: string) => {
    setReserving(itemId)
    await fetch(`/api/items/${itemId}/reserve`, { method: 'DELETE' })
    await loadList()
    setReserving(null)
  }

  // ============================================================
  // ACTIONS — PARTAGE
  // ============================================================

  const handleShare = async () => {
    const res  = await fetch(`/api/lists/${listId}/share`, { method: 'POST' })
    const data = await res.json()
    if (data.shareUrl) setShareUrl(data.shareUrl)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ============================================================
  // ACTIONS — INVITATION
  // ============================================================

  const handleInvite = async (role: 'VIEWER' | 'EDITOR') => {
    const res  = await fetch(`/api/lists/${listId}/invite`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ role }),
    })
    const data = await res.json()
    if (data.inviteUrl) setInviteUrl(data.inviteUrl)
  }

  const copyInviteUrl = () => {
    navigator.clipboard.writeText(inviteUrl)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  // ============================================================
  // ACTIONS — MODIFIER LISTE
  // ============================================================

  const openEditList = () => {
    if (!list) return
    setEditListForm({
      title:       list.title,
      description: list.description ?? '',
      privacy:     list.privacy,
      eventDate:   list.eventDate
        ? new Date(list.eventDate).toISOString().split('T')[0]
        : '',
      budget: list.budget?.toString() ?? '',
    })
    setEditListError('')
    setEditListOpen(true)
  }

  const handleEditListSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditListLoading(true)
    setEditListError('')

    const res  = await fetch(`/api/lists/${listId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({
        title:       editListForm.title,
        description: editListForm.description || undefined,
        privacy:     editListForm.privacy,
        eventDate:   editListForm.eventDate
          ? new Date(editListForm.eventDate).toISOString()
          : undefined,
        budget: editListForm.budget ? parseFloat(editListForm.budget) : undefined,
      }),
    })


    const data = await res.json()
    setEditListLoading(false)

    if (!res.ok) { setEditListError(data.error); return }
    setEditListOpen(false)
    await loadList()
  }

  const openComments = async (itemId: string) => {
      setCommentsOpen(itemId)
      setCommentsLoad(true)
      const res = await fetch(`/api/items/${itemId}/comments`)
      const data = await res.json()
      setComments(data)
      setCommentsLoad(false)
    }

    const sendComment = async () => {
      if (!commentText.trim() || !commentsOpen) return
      setCommentSend(true)

      const res = await fetch(`/api/items/${commentsOpen}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      })

      setCommentSend(false)

      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        setCommentText('')
      }
    }

    const deleteComment = async (commentId: string) => {
      await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      setComments(prev => prev.filter(c => c.id !== commentId))
    }

  // ============================================================
  // HELPERS
  // ============================================================

  const PRIORITY_CONFIG = {
    3: { label: 'Indispensable', icon: 'fa-fire',      badge: 'badge-peach'    },
    2: { label: 'J\'adorerais',  icon: 'fa-heart',     badge: 'badge-lavender' },
    1: { label: 'Sympa',         icon: 'fa-thumbs-up', badge: 'badge-mint'     },
  } as Record<number, { label: string; icon: string; badge: string }>

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <PageLayout>
        <div className={styles.loading}>
          <span className="spinner" /> Chargement…
        </div>
      </PageLayout>
    )
  }

  if (!list) return null

  // ============================================================
  // DROITS D'ACCÈS
  // ============================================================

  const isOwner        = me?.id === list.userId
  const isMemberEditor = list.members.some(m => m.userId === me?.id && m.role === 'EDITOR')
  const canEdit        = isOwner || isMemberEditor

  // ============================================================
  // STATS
  // ============================================================

  const total    = list.items.length
  const reserved = list.items.filter(i => i.reserved).length
  const pct      = total > 0 ? Math.round((reserved / total) * 100) : 0

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <PageLayout>
      <div className={styles.wrapper}>

        <Link href="/lists" className={styles.back}>
          <i className="fas fa-arrow-left" /> Mes listes
        </Link>

        {/* ================================================
            HEADER DE LA LISTE
        ================================================ */}
        <div className={styles.listHeader}>
          <div className={styles.listHeaderBand} />

          <div className={styles.listHeaderTop}>
            <div>
              <h1 className={styles.listTitle}>{list.title}</h1>
              {list.description && (
                <p className={styles.listDesc}>{list.description}</p>
              )}
              <div className={styles.listMeta}>
                <span><i className="fas fa-eye" /> {list.viewCount} vue{list.viewCount !== 1 ? 's' : ''}</span>
                <span><i className="fas fa-gift" /> {total} cadeau{total !== 1 ? 'x' : ''}</span>
                {list.members.length > 0 && (
                  <span><i className="fas fa-users" /> {list.members.length} membre{list.members.length !== 1 ? 's' : ''}</span>
                )}
                {list.budget && (
                  <span><i className="fas fa-euro-sign" /> Budget : {list.budget} €</span>
                )}
                {list.eventDate && (
                  <span>
                    <i className="fas fa-calendar-alt" />
                    {new Date(list.eventDate).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.listActions}>
              {canEdit && (
                <button className="btn btn-secondary btn-sm" onClick={() => setAddOpen(o => !o)}>
                  <i className="fas fa-plus" /> Ajouter
                </button>
              )}
              {isOwner && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={openEditList}>
                    <i className="fas fa-pen" /> Modifier
                  </button>
                  <button className="btn btn-accent btn-sm" onClick={() => setInviteOpen(o => !o)}>
                    <i className="fas fa-user-plus" /> Inviter
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleShare}>
                    <i className="fas fa-share-alt" /> Partager
                  </button>
                </>
              )}
            </div>
          </div>

          {total > 0 && (
            <div className={styles.progSection}>
              <div className={styles.progRow}>
                <span>{reserved} réservé{reserved !== 1 ? 's' : ''} sur {total}</span>
                <span className={styles.progPct}>{pct}%</span>
              </div>
              <div className="progress" style={{ height: 10 }}>
                <div className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ================================================
            FORMULAIRE AJOUT D'ITEM
        ================================================ */}
        {addOpen && canEdit && (
          <div className={styles.addForm}>
            <h3 className={styles.addFormTitle}>
              <i className="fas fa-plus-circle" /> Ajouter un cadeau
            </h3>
            <form onSubmit={handleAddItem}>
              <div className="form-group" style={{ marginBottom: 'var(--s-5)' }}>
                <label className="label">
                  Lien du produit <span className="form-hint">(Amazon, FNAC, Darty…)</span>
                </label>
                <div className={styles.urlRow}>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://www.amazon.fr/dp/..."
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={fetchFromUrl}
                    disabled={fetchingUrl || !urlInput.trim()}
                  >
                    {fetchingUrl ? <span className="spinner" /> : <><i className="fas fa-magic" /> Auto</>}
                  </button>
                </div>
              </div>

              <div className={styles.addFields}>
                <div className="form-group">
                  <label className="label" htmlFor="iTitle">Nom du cadeau *</label>
                  <input
                    id="iTitle" type="text" value={newItem.title}
                    onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))}
                    placeholder="iPhone 16, Livre de cuisine…" required
                  />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="iPrice">Prix (€)</label>
                  <input
                    id="iPrice" type="number" value={newItem.price}
                    onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                    placeholder="99.90" step="0.01" min="0"
                  />
                </div>
              </div>
              {/* Upload ou URL d'image */}
              <div className='form-group' style={{ marginBottom: 'var(--s-5)' }}>
                <label className='label'>
                  Image <span className='form-hint'>(optionnel)</span>
                </label>

                {/* Tabs : Upload / URL */}
                <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-3)' }}>
                  <label style={{
                    flex: 1,
                    padding: 'var(--s-3)',
                    border: '1.5px dashed var(--border-2)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--text-2)',
                    transition: 'all var(--ease)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--s-2)',
                  }}>
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                      disabled={uploadingImg}
                    />
                    {uploadingImg
                      ? <><span className='spinner' /> Envoi...</>
                      : <><i className='fas fa-upload' /> Uploader une photo</>
                    }
                  </label>
                </div>

                {/* URL manuelle */}
                <input
                  type='url'
                  value={newItem.imageUrl}
                  onChange={e => setNewItem(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="Ou coller une URL d'image..."
                />

                {/* Aperçu */}
                {newItem.imageUrl && (
                  <div style={{ marginTop: 'var(--s-3)', position: 'relative', display: 'inline-block' }}>
                    <img
                      src={newItem.imageUrl}
                      alt='Aperçu'
                      style={{ height: 80, borderRadius: 'var(--r-md)', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <button
                      type='button'
                      onClick={() => setNewItem(p => ({ ...p, imageUrl: '' }))}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--error)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className='fas fa-times' />
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--s-5)' }}>
                <label className="label">Priorité</label>
                <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
                  {[
                    { value: 3, label: 'Indispensable', color: 'var(--peach-dark)'    },
                    { value: 2, label: 'J\'adorerais',  color: 'var(--lavender-dark)' },
                    { value: 1, label: 'Sympa',         color: 'var(--mint-dark)'     },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => setNewItem(p => ({ ...p, priority: opt.value }))}
                      style={{
                        flex: 1, padding: 'var(--s-3)', cursor: 'pointer', textAlign: 'center',
                        border: `2px solid ${newItem.priority === opt.value ? opt.color : 'var(--border-1)'}`,
                        borderRadius: 'var(--r-lg)',
                        background: newItem.priority === opt.value ? `${opt.color}18` : 'var(--surface)',
                        transition: 'all var(--ease)',
                        fontSize: '0.75rem', fontWeight: 700, color: opt.color,
                      }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.addFormActions}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAddOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={addLoading}>
                  {addLoading ? <span className="spinner" /> : <><i className="fas fa-plus" /> Ajouter</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================
            PANNEAU INVITATION
        ================================================ */}
        {inviteOpen && isOwner && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--lavender-light)',
            borderRadius: 'var(--r-xl)', padding: 'var(--s-6)', marginBottom: 'var(--s-6)',
            boxShadow: '0 0 0 3px rgba(197,179,230,0.1)', animation: 'fadeUp 0.2s var(--ease-out)',
          }}>
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--s-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-user-plus" style={{ color: 'var(--lavender-dark)' }} />
              Inviter des personnes
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)', marginBottom: 'var(--s-5)' }}>
              {[
                { role: 'VIEWER' as const, icon: 'fa-eye', label: 'Spectateur', desc: 'Peut voir et réserver' },
                { role: 'EDITOR' as const, icon: 'fa-pen', label: 'Éditeur',    desc: 'Peut aussi ajouter des items' },
              ].map(opt => (
                <div
                  key={opt.role}
                  onClick={() => setInviteRole(opt.role)}
                  style={{
                    border: `2px solid ${inviteRole === opt.role ? 'var(--lavender)' : 'var(--border-1)'}`,
                    borderRadius: 'var(--r-lg)', padding: 'var(--s-4)', cursor: 'pointer',
                    background: inviteRole === opt.role ? 'rgba(197,179,230,0.06)' : 'var(--surface)',
                    transition: 'all var(--ease)',
                  }}
                >
                  <div style={{ fontSize: '1.1rem', color: 'var(--lavender-dark)', marginBottom: 'var(--s-2)' }}>
                    <i className={`fas ${opt.icon}`} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{opt.label}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-3)' }}>{opt.desc}</div>
                </div>
              ))}
            </div>

            {!inviteUrl ? (
              <button className="btn btn-accent" onClick={() => handleInvite(inviteRole)} style={{ width: '100%', justifyContent: 'center' }}>
                <i className="fas fa-link" /> Générer le lien d'invitation
              </button>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-3)' }}>
                  <input type="text" value={inviteUrl} readOnly style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-3)', background: 'var(--surface-2)', flex: 1 }} />
                  <button className="btn btn-accent btn-sm" onClick={copyInviteUrl}>
                    <i className={`fas ${inviteCopied ? 'fa-check' : 'fa-copy'}`} />
                    {inviteCopied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 4 }} />
                  Valable 7 jours · 50 utilisations maximum
                </p>
                <button className="btn btn-ghost btn-sm" onClick={() => { setInviteUrl(''); setInviteRole('VIEWER') }} style={{ marginTop: 'var(--s-3)' }}>
                  Générer un autre lien
                </button>
              </>
            )}

            {list.members.length > 0 && (
              <div style={{ marginTop: 'var(--s-5)', borderTop: '1px solid var(--border-1)', paddingTop: 'var(--s-4)' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 'var(--s-3)' }}>
                  Membres ({list.members.length})
                </p>
                {list.members.map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', padding: '6px 0' }}>
                    <div className="avatar avatar-xs">
                      {member.user.name?.[0]?.toUpperCase() ?? member.user.email[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1 }}>
                      {member.user.name ?? member.user.email}
                    </span>
                    <span className={`badge ${member.role === 'EDITOR' ? 'badge-lavender' : 'badge-neutral'}`}>
                      {member.role === 'EDITOR' ? 'Éditeur' : 'Spectateur'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================
            FILTRES
        ================================================ */}
        {total > 0 && (
          <div style={{ display: 'flex', gap: 'var(--s-3)', marginBottom: 'var(--s-5)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.8rem', pointerEvents: 'none' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un cadeau…" style={{ paddingLeft: 36, height: 38 }} />
            </div>

            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ height: 38, width: 'auto', cursor: 'pointer' }}>
              <option value="priority">Priorité</option>
              <option value="name">Nom A→Z</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>

            <div style={{ display: 'flex', gap: 'var(--s-1)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 3 }}>
              {[
                { value: 'all',       label: 'Tous'        },
                { value: 'available', label: 'Disponibles' },
                { value: 'reserved',  label: 'Réservés'    },
              ].map(f => (
                <button
                  key={f.value}
                  className={`btn btn-sm ${filterStatus === f.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilterStatus(f.value as typeof filterStatus)}
                  style={{ height: 32 }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setSortBy('priority'); setFilterStatus('all') }}>
                <i className="fas fa-times" /> Réinitialiser
              </button>
            )}
          </div>
        )}

        {/* ================================================
            GRILLE D'ITEMS
        ================================================ */}
        <div>
          <div className={styles.itemsHeader}>
            <h2 className={styles.itemsTitle}>
              <i className="fas fa-gift" />
              Cadeaux ({total})
              {hasActiveFilters && filteredItems.length !== total && (
                <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-3)' }}>
                  {' '}— {filteredItems.length} affiché{filteredItems.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>
          </div>

          {total === 0 ? (
            <div className="empty">
              <div className="empty-icon"><i className="fas fa-gift" /></div>
              <h3>Aucun cadeau pour l'instant</h3>
              {canEdit ? (
                <>
                  <p>Ajoutez vos premiers cadeaux.</p>
                  <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                    <i className="fas fa-plus" /> Ajouter un cadeau
                  </button>
                </>
              ) : (
                <p>Le propriétaire n'a pas encore ajouté de cadeaux.</p>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty" style={{ padding: 'var(--s-10)' }}>
              <div className="empty-icon"><i className="fas fa-search" /></div>
              <h3>Aucun résultat</h3>
              <p>Aucun cadeau ne correspond à vos filtres.</p>
              <button className="btn btn-secondary" onClick={() => { setSearch(''); setFilterStatus('all') }}>
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className={styles.itemsGrid}>
              {filteredItems.map(item => {
                const myReservation = item.reservedById === me?.id
                const pc            = PRIORITY_CONFIG[item.priority]
                const addedByOther  = item.createdBy_item && item.createdBy_item.id !== list.userId

                return (
                  <div key={item.id} className={styles.item}>
                    <div className={styles.itemImg}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.title} />
                        : <div className={styles.itemImgPlaceholder}><i className="fas fa-image" /></div>
                      }
                      {item.reserved && (
                        <div className={styles.reservedOverlay}>
                          <i className="fas fa-check-circle" />
                          {myReservation ? 'Réservé par vous' : `Réservé${item.reservedBy?.name ? ` par ${item.reservedBy.name}` : ''}`}
                        </div>
                      )}
                    </div>

                    <div className={styles.itemBody}>
                      {pc && (
                        <span className={`badge ${pc.badge}`} style={{ marginBottom: 'var(--s-2)' }}>
                          <i className={`fas ${pc.icon}`} /> {pc.label}
                        </span>
                      )}

                      <div className={styles.itemTitle}>{item.title}</div>

                      {addedByOther && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 'var(--s-1)' }}>
                          <i className="fas fa-user" style={{ marginRight: 3 }} />
                          Ajouté par {item.createdBy_item!.name ?? 'un membre'}
                        </div>
                      )}

                      {item.description && <div className={styles.itemDesc}>{item.description}</div>}
                      {item.price && <div className={styles.itemPrice}>{item.price.toFixed(2)} €</div>}

                      <div className={styles.itemActions}>
                        {!isOwner && (
                          item.reserved && myReservation ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => handleUnreserve(item.id)}
                              disabled={reserving === item.id}
                            >
                              {reserving === item.id ? <span className="spinner" /> : <><i className="fas fa-times" /> Annuler</>}
                            </button>
                          ) : !item.reserved ? (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={() => { setReserveModal(item.id); setReserveMsg(''); setReserveAnon(false) }}
                              disabled={reserving === item.id}
                            >
                              {reserving === item.id ? <span className="spinner" /> : <><i className="fas fa-hand-pointer" /> Réserver</>}
                            </button>
                          ) : (
                            <span className="badge badge-mint" style={{ padding: '6px 12px' }}>
                              <i className="fas fa-check" /> Réservé
                            </span>
                          )
                        )}

                        {(item.affiliateLink || item.url) && (
                          <a href={item.affiliateLink || item.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Voir le produit">
                            <i className="fas fa-external-link-alt" />
                          </a>
                        )}

                        {(isOwner || item.createdById === me?.id) && (
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)} title="Modifier">
                            <i className="fas fa-pen" />
                          </button>
                        )}

                        <button
                          className='btn btn-ghost btn-icon btn-sm'
                          onClick={() => openComments(item.id)}
                          title='Commentaires'
                        >
                          <i className='fas fa-comment' />
                        </button>

                        {(isOwner || item.createdById === me?.id) && (
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(item.id)} title="Supprimer">
                            <i className="fas fa-trash" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ================================================
            LIEN DE PARTAGE
        ================================================ */}
        {shareUrl && (
          <div className={styles.shareSection}>
            <h3 className={styles.shareTitle}>
              <i className="fas fa-share-alt" /> Lien de partage
            </h3>
            <div className={styles.shareRow}>
              <input className={styles.shareInput} type="text" value={shareUrl} readOnly />
              <button className="btn btn-accent btn-sm" onClick={handleCopy}>
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`} />
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ================================================
          MODALE — RÉSERVATION AVEC MESSAGE
      ================================================ */}
      {reserveModal && (
        <>
          <div onClick={() => setReserveModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-2xl)', padding: 'var(--s-8)', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-xl)', animation: 'fadeUp 0.2s var(--ease-out)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-5)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                <i className="fas fa-hand-pointer" style={{ marginRight: 8, color: 'var(--peach)' }} />
                Réserver ce cadeau
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setReserveModal(null)}>
                <i className="fas fa-times" />
              </button>
            </div>

            {(() => {
              const item = list.items.find(i => i.id === reserveModal)
              return item ? (
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 'var(--s-4)', marginBottom: 'var(--s-5)', fontSize: '0.9rem', fontWeight: 600 }}>
                  <i className="fas fa-gift" style={{ marginRight: 8, color: 'var(--peach)' }} />
                  {item.title}
                  {item.price && <span style={{ marginLeft: 8, color: 'var(--text-3)', fontWeight: 400 }}>— {item.price.toFixed(2)} €</span>}
                </div>
              ) : null
            })()}

            <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
              <label className="label" htmlFor="reserveMsg">
                Laisser un message <span className="form-hint">(optionnel)</span>
              </label>
              <textarea id="reserveMsg" value={reserveMsg} onChange={e => setReserveMsg(e.target.value)} placeholder="Je pense à toi ! 🎁" rows={3} maxLength={300} style={{ resize: 'none' }} />
              <span className="form-hint" style={{ textAlign: 'right', display: 'block', marginTop: 4 }}>{reserveMsg.length}/300</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', fontSize: '0.875rem', color: 'var(--text-2)', cursor: 'pointer', marginBottom: 'var(--s-6)' }}>
              <input type="checkbox" checked={reserveAnon} onChange={e => setReserveAnon(e.target.checked)} style={{ width: 'auto', accentColor: 'var(--peach)', cursor: 'pointer' }} />
              Réserver anonymement
              <span className="form-hint">(ton nom ne sera pas visible)</span>
            </label>

            <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReserveModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleReserve} disabled={reserving === reserveModal}>
                {reserving === reserveModal ? <><span className="spinner" /> Réservation…</> : <><i className="fas fa-check" /> Confirmer</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ================================================
          MODALE — MODIFIER ITEM
      ================================================ */}
      {editItem && (
        <>
          <div onClick={() => setEditItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-2xl)', padding: 'var(--s-8)', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', animation: 'fadeUp 0.2s var(--ease-out)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-6)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                <i className="fas fa-pen" style={{ marginRight: 8, color: 'var(--peach)' }} /> Modifier le cadeau
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditItem(null)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleEditSave}>
              {editError && <div className="alert alert-error" style={{ marginBottom: 'var(--s-4)' }}><i className="fas fa-exclamation-circle" /> {editError}</div>}

              <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
                <label className="label" htmlFor="editTitle">Nom du cadeau *</label>
                <input id="editTitle" type="text" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} required />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
                <label className="label" htmlFor="editDesc">Description <span className="form-hint">(optionnel)</span></label>
                <textarea id="editDesc" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} maxLength={500} />
              </div>

              <div className="form-row" style={{ marginBottom: 'var(--s-4)' }}>
                <div className="form-group">
                  <label className="label" htmlFor="editPrice">Prix (€)</label>
                  <input id="editPrice" type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} step="0.01" min="0" placeholder="99.90" />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="editUrl">Lien produit</label>
                  <input id="editUrl" type="url" value={editForm.url} onChange={e => setEditForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
                <label className="label" htmlFor="editImg">Image</label>
                
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s-2)', padding: 'var(--s-3)', border: '1.5px dashed var(--border-2)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 'var(--s-2)' }}>
                  <input type='file' accept='image/*' onChange={handleEditImageUpload} style={{ display: 'none' }} disabled={uploadingEditImg} />
                    {uploadingEditImg ? <><span className='spinner' /> Envoi...</> :
                    <><i className='fas fa-upload' /> Uploader une photo</>}
                </label>
                <input
                  id='editImg'
                  type='url'
                  value={editForm.imageUrl}
                  onChange={e => setEditForm(p => ({ ...p, imageUrl: e.target.value }))}
                  placeholder='Ou coller une URL...'
                />

                {editForm.imageUrl && (
                  <img src={editForm.imageUrl} alt='Aperçu' style={{ marginTop: 'var(--s-2)', height: 60, borderRadius: 'var(--r-md)', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--s-6)' }}>
                <label className="label">Priorité</label>
                <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
                  {[
                    { value: 3, label: 'Indispensable', color: 'var(--peach-dark)'    },
                    { value: 2, label: 'J\'adorerais',  color: 'var(--lavender-dark)' },
                    { value: 1, label: 'Sympa',         color: 'var(--mint-dark)'     },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setEditForm(p => ({ ...p, priority: opt.value }))} style={{ flex: 1, padding: 'var(--s-3)', cursor: 'pointer', textAlign: 'center', border: `2px solid ${editForm.priority === opt.value ? opt.color : 'var(--border-1)'}`, borderRadius: 'var(--r-lg)', background: editForm.priority === opt.value ? `${opt.color}18` : 'var(--surface)', transition: 'all var(--ease)', fontSize: '0.78rem', fontWeight: 700, color: editForm.priority === opt.value ? opt.color : 'var(--text-2)' }}>
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? <><span className="spinner" /> Sauvegarde…</> : <><i className="fas fa-check" /> Sauvegarder</>}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ================================================
          MODALE — MODIFIER LISTE
      ================================================ */}
      {editListOpen && (
        <>
          <div onClick={() => setEditListOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-2xl)', padding: 'var(--s-8)', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', animation: 'fadeUp 0.2s var(--ease-out)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-6)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                <i className="fas fa-pen" style={{ marginRight: 8, color: 'var(--peach)' }} /> Modifier la liste
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditListOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleEditListSave}>
              {editListError && <div className="alert alert-error" style={{ marginBottom: 'var(--s-4)' }}><i className="fas fa-exclamation-circle" /> {editListError}</div>}

              <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
                <label className="label" htmlFor="lTitle">Titre *</label>
                <input id="lTitle" type="text" value={editListForm.title} onChange={e => setEditListForm(p => ({ ...p, title: e.target.value }))} required maxLength={100} />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
                <label className="label" htmlFor="lDesc">Description <span className="form-hint">(optionnel)</span></label>
                <textarea id="lDesc" value={editListForm.description} onChange={e => setEditListForm(p => ({ ...p, description: e.target.value }))} rows={2} maxLength={500} />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
                <label className="label">Confidentialité</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--s-2)' }}>
                  {[
                    { value: 'UNLISTED', icon: 'fa-link',  label: 'Par lien' },
                    { value: 'PUBLIC',   icon: 'fa-globe', label: 'Public'   },
                    { value: 'PRIVATE',  icon: 'fa-lock',  label: 'Privé'    },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setEditListForm(p => ({ ...p, privacy: opt.value }))} style={{ padding: 'var(--s-3)', border: `2px solid ${editListForm.privacy === opt.value ? 'var(--peach)' : 'var(--border-1)'}`, borderRadius: 'var(--r-lg)', cursor: 'pointer', textAlign: 'center', background: editListForm.privacy === opt.value ? 'rgba(255,154,139,0.06)' : 'var(--surface)', transition: 'all var(--ease)' }}>
                      <div style={{ fontSize: '1rem', marginBottom: 4, color: 'var(--text-2)' }}><i className={`fas ${opt.icon}`} /></div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{opt.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 'var(--s-6)' }}>
                <div className="form-group">
                  <label className="label" htmlFor="lDate"><i className="fas fa-calendar-alt" style={{ marginRight: 6 }} />Date de l'événement</label>
                  <input id="lDate" type="date" value={editListForm.eventDate} onChange={e => setEditListForm(p => ({ ...p, eventDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="label" htmlFor="lBudget"><i className="fas fa-euro-sign" style={{ marginRight: 6 }} />Budget (€)</label>
                  <input id="lBudget" type="number" value={editListForm.budget} onChange={e => setEditListForm(p => ({ ...p, budget: e.target.value }))} placeholder="150" min="0" step="0.01" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditListOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={editListLoading}>
                  {editListLoading ? <><span className="spinner" /> Sauvegarde…</> : <><i className="fas fa-check" /> Sauvegarder</>}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {commentsOpen && (
        <>
          <div onClick={() => setCommentsOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-2xl)', padding: 'var(--s-6)', width: '100%', maxWidth: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-4)' }}>
              <h2 style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                <i className='fas fa-comments' style={{ marginRight: 8, color: 'var(--peach)' }} /> Commentaires
              </h2>
              <button className='btn btn-ghost btn-icon btn-sm' onClick={() => setCommentsOpen(null)}>
                <i className='fas fa-times' />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 'var(--s-4)', minHeight: 120 }}>
              {commentsLoad ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding:'var(--s-6)' }}><span className='spinner' /></div>
              ) : comments.length === 0 ? (
                <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center', padding: 'var(--s-6) 0' }}>
                  Aucun commentaire pour l'instant.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 'var(--s-3)' }}>
                      <div className="avatar avatar-xs">{c.user.name?.[0]?.toUpperCase() ?? '?'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 'var(--s-3)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 2 }}>{c.user.name ?? 'Anonyme'}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{c.content}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                            {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {c.user.id === me?.id && (
                            <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.7rem', cursor: 'pointer' }}>
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
              <input 
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendComment() }}
                placeholder='Ecrire un commentaire...'
                maxLength={500} 
              />
              <button className='btn btn-primary btn-icon' onClick={sendComment} disabled={commentSend || !commentText.trim()}>
                {commentSend ? <span className='spinner' /> : <i className='fas fa-paper-plane' />}
              </button>
            </div>
          </div>
        </>
      )}

    </PageLayout>
  )
}