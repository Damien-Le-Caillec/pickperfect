'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface Feedback {
  id:        string
  type:      string
  message:   string
  page:      string | null
  status:    string
  createdAt: string
  user:      { id: string; name: string | null; email: string } | null
}

const TYPE_CONFIG: Record<string, { label: string; badge: string; icon: string }> = {
  BUG:   { label: 'Bug',   badge: 'badge-error',    icon: 'fa-bug'       },
  IDEA:  { label: 'Idée',  badge: 'badge-gold',     icon: 'fa-lightbulb' },
  OTHER: { label: 'Autre', badge: 'badge-neutral',  icon: 'fa-comment'   },
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  NEW:  { label: 'Nouveau', badge: 'badge-peach'    },
  READ: { label: 'Lu',      badge: 'badge-lavender' },
  DONE: { label: 'Traité',  badge: 'badge-mint'     },
}

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState<'ALL' | 'NEW' | 'BUG' | 'IDEA'>('ALL')

  const load = () => {
    fetch('/api/feedback').then(r => r.json()).then(d => {
      setFeedbacks(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/feedback/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ status }),
    })
    load()
  }

  const deleteFeedback = async (id: string) => {
    if (!confirm('Supprimer ce feedback ?')) return
    await fetch(`/api/feedback/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = feedbacks.filter(f => {
    if (filter === 'NEW')  return f.status === 'NEW'
    if (filter === 'BUG')  return f.type === 'BUG'
    if (filter === 'IDEA') return f.type === 'IDEA'
    return true
  })

  const newCount  = feedbacks.filter(f => f.status === 'NEW').length
  const bugCount  = feedbacks.filter(f => f.type === 'BUG').length
  const ideaCount = feedbacks.filter(f => f.type === 'IDEA').length

  return (
    <PageLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <Link href="/admin" style={{ fontSize: '0.875rem', color: 'var(--text-3)', textDecoration: 'none' }}>
              <i className="fas fa-arrow-left" style={{ marginRight: 6 }} />Admin
            </Link>
            <h1 className="page-title" style={{ marginTop: '0.5rem' }}>Feedbacks betatesteurs</h1>
          </div>

          {/* Stats rapides */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {[
              { label: 'Nouveaux', value: newCount,  color: 'var(--peach)'    },
              { label: 'Bugs',     value: bugCount,  color: 'var(--error)'    },
              { label: 'Idées',    value: ideaCount, color: 'var(--gold)'     },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 4, marginBottom: '1.5rem', width: 'fit-content' }}>
          {[
            { id: 'ALL',  label: `Tous (${feedbacks.length})`  },
            { id: 'NEW',  label: `Nouveaux (${newCount})`      },
            { id: 'BUG',  label: `Bugs (${bugCount})`          },
            { id: 'IDEA', label: `Idées (${ideaCount})`        },
          ].map(f => (
            <button
              key={f.id}
              className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f.id as typeof filter)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <span className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-comment-slash" /></div>
            <h3>Aucun feedback</h3>
            <p>Les retours de vos betatesteurs apparaîtront ici.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtered.map(f => {
              const tc = TYPE_CONFIG[f.type]   ?? TYPE_CONFIG.OTHER
              const sc = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.NEW
              return (
                <div key={f.id} className="card" style={{ opacity: f.status === 'DONE' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge ${tc.badge}`}>
                        <i className={`fas ${tc.icon}`} /> {tc.label}
                      </span>
                      <span className={`badge ${sc.badge}`}>{sc.label}</span>
                      {f.page && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem', fontFamily: 'monospace' }}>
                          {f.page}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {new Date(f.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-1)', lineHeight: 1.6, marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
                    {f.message}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                      <i className="fas fa-user" style={{ marginRight: 4 }} />
                      {f.user ? (f.user.name ?? f.user.email) : 'Anonyme'}
                    </span>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {f.status === 'NEW' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(f.id, 'READ')}>
                          <i className="fas fa-eye" /> Marquer lu
                        </button>
                      )}
                      {f.status !== 'DONE' && (
                        <button className="btn btn-accent btn-sm" onClick={() => updateStatus(f.id, 'DONE')}>
                          <i className="fas fa-check" /> Traité
                        </button>
                      )}
                      {f.status === 'DONE' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(f.id, 'NEW')}>
                          <i className="fas fa-undo" /> Rouvrir
                        </button>
                      )}
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteFeedback(f.id)}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}