'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface LogEntry {
  id: string
  action: string
  createdAt: string
  user: { name: string | null; email: string }
  list: { title: string } | null
}

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  LIST_CREATED:     { label: 'Liste créée',         icon: 'fa-list-ul',          color: 'var(--peach-dark)' },
  REWARD_REDEEMED:  { label: 'Récompense échangée', icon: 'fa-exchange-alt',     color: 'var(--lavender-dark)' },
}

export default function AdminLogsPage() {
  const [logs, setLogs]       = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/logs').then(r => r.json()).then(d => { setLogs(d); setLoading(false) })
  }, [])

  return (
    <PageLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem', textDecoration: 'none' }}>
          <i className="fas fa-arrow-left" /> Dashboard admin
        </Link>

        <h1 className="page-title">Logs d'activité</h1>
        <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>100 derniers événements</p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}>
            <span className="spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-history" /></div>
            <h3>Aucun log pour l'instant</h3>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {logs.map(log => {
              const cfg = ACTION_LABELS[log.action] ?? { label: log.action, icon: 'fa-bolt', color: 'var(--text-3)' }
              return (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-1)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0 }}>
                    <i className={`fas ${cfg.icon}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cfg.label}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>
                      {' '}par {log.user.name ?? log.user.email}
                      {log.list && ` · ${log.list.title}`}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>
                    {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}