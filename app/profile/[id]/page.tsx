'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

const BANNER_COLORS: Record<string, string> = {
  'gradient-peach-lavender': 'linear-gradient(135deg,#FF7B6B,#A78BFA)',
  'gradient-mint-lavender':  'linear-gradient(135deg,#34D399,#A78BFA)',
  'gradient-gold-peach':     'linear-gradient(135deg,#FBBF24,#FF7B6B)',
  'gradient-dark':           'linear-gradient(135deg,#1C1917,#3B3240)',
  'gradient-ocean':          'linear-gradient(135deg,#0EA5E9,#34D399)',
}

const ACCENT_COLORS: Record<string, string> = {
  peach:    '#FF7B6B',
  lavender: '#A78BFA',
  mint:     '#34D399',
  gold:     '#FBBF24',
}

export default function PublicProfilePage() {
  const params  = useParams()
  const userId  = params.id as string
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/profile/public/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
  }, [userId])

  if (loading) return (
    <PageLayout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <span className="spinner" />
      </div>
    </PageLayout>
  )

  if (!data) return (
    <PageLayout>
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-3)' }}>
        Profil introuvable
      </div>
    </PageLayout>
  )

  const accent   = ACCENT_COLORS[data.accentColor]  ?? '#FF7B6B'
  const banner   = BANNER_COLORS[data.bannerColor]  ?? BANNER_COLORS['gradient-peach-lavender']
  const initials = data.name?.[0]?.toUpperCase() ?? data.email?.[0]?.toUpperCase() ?? '?'

  return (
    <PageLayout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Bannière + Avatar */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <div style={{ height: 120, background: banner, borderRadius: 'var(--r-2xl)' }} />
            <div style={{ position: 'absolute', bottom: -36, left: 20 }}>
            {data.avatarUrl ? (
              <img
                src={data.avatarUrl} alt="Avatar"
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg)' }}
              />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}, var(--lavender))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'white', border: '3px solid var(--bg)' }}>
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Infos */}
        <div style={{ paddingTop: '2rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{data.name ?? 'Utilisateur'}</h1>
          {data.bio  && <p style={{ color: 'var(--text-2)', marginTop: 4 }}>{data.bio}</p>}
          {data.city && (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 2 }}>
              <i className="fas fa-map-marker-alt" style={{ marginRight: 4 }} />{data.city}
            </p>
          )}
          {data.birthDate && (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 2 }}>
              <i className="fas fa-birthday-cake" style={{ marginRight: 4, color: 'var(--peach)' }} />
              {new Date(data.birthDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Listes',       value: data.stats?.lists        ?? 0 },
              { label: 'Réservations', value: data.stats?.reservations ?? 0 },
              { label: 'Badges',       value: data.stats?.badges       ?? 0 },
              { label: 'Streak',       value: `🔥 ${data.stats?.streak ?? 0}j` },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: accent }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Listes publiques */}
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>
          <i className="fas fa-gift" style={{ marginRight: 8, color: accent }} />
          Listes publiques ({data.lists?.length ?? 0})
        </h2>

        {data.lists?.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Aucune liste publique.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.lists?.map((list: any) => (
              <Link key={list.id} href={`/lists/${list.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{list.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    {list._count.items} cadeau{list._count.items !== 1 ? 'x' : ''}
                    {list.eventDate && ` · ${new Date(list.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </PageLayout>
  )
}