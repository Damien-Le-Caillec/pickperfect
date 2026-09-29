'use client'

import { useState, useEffect } from 'react'
import PageLayout from '@/components/layout/PageLayout'
import { ACCENT_COLORS, BANNER_COLORS, getAccentColor, getBannerValue } from '@/lib/profile/theme'

interface ProfileStats {
  lists:        number
  reservations: number
  friends:      number
  badges:       number
  streak:       number
  points:       number
}

interface ProfileUser {
  id:                  string
  name:                string | null
  email:               string
  bio:                 string | null
  city:                string | null
  avatarUrl:           string | null
  accentColor:         string | null
  bannerColor:         string | null
  birthDate:           string | null
  emailNotifications:  boolean
  unlockedRewards?:    string[]
  stats?:              ProfileStats
}

function calcCompletion(user: ProfileUser, stats?: ProfileStats): { pct: number; missing: string[] } {
  const steps = [
    { done: !!user.avatarUrl,                    label: 'Ajouter une photo de profil' },
    { done: !!user.name,                         label: 'Définir un nom d\'affichage' },
    { done: !!user.bio,                          label: 'Écrire une bio' },
    { done: !!user.city,                         label: 'Ajouter votre ville' },
    { done: (stats?.lists ?? 0) > 0,             label: 'Créer votre première liste' },
    { done: (stats?.friends ?? 0) > 0,           label: 'Ajouter votre premier ami' },
  ]
  const done    = steps.filter(s => s.done).length
  const missing = steps.filter(s => !s.done).map(s => s.label)
  return { pct: Math.round((done / steps.length) * 100), missing }
}

export default function ProfilePage() {
  const [user,   setUser]   = useState<ProfileUser | null>(null)
  const [form,   setForm]   = useState({ name: '', bio: '', city: '', accentColor: 'peach', bannerColor: 'gradient-peach-lavender', birthDate: '' })
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)

  // Onglets
  const [tab, setTab] = useState<'profile' | 'account' | 'notifications' | 'danger'>('profile')

  // Changement mot de passe
  const [pwForm,     setPwForm]     = useState({ current: '', next: '', confirm: '' })
  const [pwSaving,   setPwSaving]   = useState(false)
  const [pwMsg,      setPwMsg]      = useState('')
  const [pwError,    setPwError]    = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(d => {
      setUser(d)
      setForm({
        name:        d.name        ?? '',
        bio:         d.bio         ?? '',
        city:        d.city        ?? '',
        accentColor: d.accentColor ?? 'peach',
        bannerColor: d.bannerColor ?? 'gradient-peach-lavender',
        birthDate:   d.birthDate   ? new Date(d.birthDate).toISOString().split('T')[0] : '',
      })
      setEmailNotifications(d.emailNotifications ?? true)
    })
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setMsg('')
    await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify(form),
    })
    setSaving(false); setMsg('Profil mis à jour !')
    // Recharger
    const d = await fetch('/api/profile').then(r => r.json())
    setUser(d)
    setTimeout(() => setMsg(''), 3000)
  }

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fd = new FormData()
    fd.append('file', file)
    const res  = await fetch('/api/profile/avatar', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingAvatar(false)
    if (res.ok) {
      setUser(u => (u ? { ...u, avatarUrl: data.avatarUrl } : u))
    }
  }

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(''); setPwMsg('')
    if (pwForm.next !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas'); return }
    setPwSaving(true)
    const res  = await fetch('/api/profile/password', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ current: pwForm.current, password: pwForm.next }),
    })
    const data = await res.json()
    setPwSaving(false)
    if (!res.ok) { setPwError(data.error); return }
    setPwMsg('Mot de passe mis à jour !'); setPwForm({ current: '', next: '', confirm: '' })
  }

  const deleteAccount = async () => {
    if (!confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
    await fetch('/api/profile/delete', { method: 'DELETE' })
    window.location.href = '/'
  }

  if (!user) return <PageLayout><div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><span className="spinner" /></div></PageLayout>

  const { pct, missing } = calcCompletion(user, user.stats)
  const accent           = getAccentColor(form.accentColor)
  const initials         = user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'
  const rewards: string[] = user.unlockedRewards ?? []
  const premiumTheme     = rewards.includes('r1')

  return (
    <PageLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ---- Bannière + Avatar ---- */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          {/* Bannière */}
          <div style={{ height: 140, background: getBannerValue(form.bannerColor), borderRadius: 'var(--r-2xl)' }} />

          {/* Avatar */}
          <div style={{ position: 'absolute', bottom: -40, left: 24 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg)' }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}, var(--lavender))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: 'white', border: '3px solid var(--bg)' }}>
                  {initials}
                </div>
              )}
              <label style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.7rem' }}>
                <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
                {uploadingAvatar ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <i className="fas fa-camera" />}
              </label>
            </div>
          </div>
        </div>

        {/* ---- Nom + Stats ---- */}
        <div style={{ paddingTop: '2.5rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {user.name ?? 'Utilisateur'}
            {rewards.includes('r3') && <i className="fas fa-star" title="Étoile premium" style={{ color: '#FBBF24', marginLeft: 8, fontSize: '1rem' }} />}
          </h1>
          {user.bio  && <p style={{ color: 'var(--text-2)', marginTop: 4 }}>{user.bio}</p>}
          {user.city && <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 2 }}><i className="fas fa-map-marker-alt" style={{ marginRight: 4 }} />{user.city}</p>}

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Listes',       value: user.stats?.lists        ?? 0, icon: 'fa-list'              },
              { label: 'Réservations', value: user.stats?.reservations ?? 0, icon: 'fa-hand-holding-heart'},
              { label: 'Amis',         value: user.stats?.friends      ?? 0, icon: 'fa-user-friends'      },
              { label: 'Badges',       value: user.stats?.badges       ?? 0, icon: 'fa-medal'             },
              { label: 'Streak',       value: `🔥 ${user.stats?.streak ?? 0}j`, icon: null                },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: accent }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Barre de complétion ---- */}
        {pct < 100 && (
          <div className="card" style={{ marginBottom: '1.5rem', border: `1px solid ${accent}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Profil complété à {pct}%
              </span>
              <span className="badge" style={{ background: `${accent}20`, color: accent }}>{pct}%</span>
            </div>
            <div className="progress" style={{ height: 8, marginBottom: '0.75rem' }}>
              <div className="progress-bar" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, var(--lavender))` }} />
            </div>
            {missing.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {missing.slice(0, 3).map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    <i className="fas fa-circle" style={{ fontSize: '0.4rem', color: accent }} />
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- Onglets ---- */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 4, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'profile',       label: 'Mon profil',       icon: 'fa-user'    },
            { id: 'account',       label: 'Compte',           icon: 'fa-cog'     },
            { id: 'notifications', label: 'Notifications',    icon: 'fa-bell'    },
            { id: 'danger',        label: 'Zone de danger',   icon: 'fa-exclamation-triangle' },
          ].map(t => (
            <button
              key={t.id}
              className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t.id as typeof tab)}
            >
              <i className={`fas ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {/* ---- Onglet Profil ---- */}
        {tab === 'profile' && (
          <form onSubmit={save} className="card">
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Modifier mon profil</h2>

            {msg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}><i className="fas fa-check" /> {msg}</div>}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Nom d'affichage</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Votre prénom ou pseudo" maxLength={50} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Bio <span className="form-hint">(max 160 caractères)</span></label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Quelques mots sur vous…" maxLength={160} rows={2} style={{ resize: 'none' }} />
              <span className="form-hint" style={{ textAlign: 'right', display: 'block' }}>{form.bio.length}/160</span>
            </div>

            <div className="form-row" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="label">Ville</label>
                <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Paris, Lyon…" maxLength={50} />
              </div>
              <div className="form-group">
                <label className="label">Date d'anniversaire <span className="form-hint">(visible par vos amis)</span></label>
                <input type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} />
              </div>
            </div>

            {/* Couleur d'accent */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="label">Couleur d'accent</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ACCENT_COLORS.filter(c => !c.premium || premiumTheme).map(c => (
                  <button
                    key={c.id} type="button"
                    onClick={() => setForm(p => ({ ...p, accentColor: c.id }))}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: c.color,
                      border: `3px solid ${form.accentColor === c.id ? 'white' : 'transparent'}`,
                      boxShadow: form.accentColor === c.id ? `0 0 0 2px ${c.color}` : 'none',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {!premiumTheme && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                <i className="fas fa-palette" style={{ marginRight: 4 }} />
                Plus de couleurs avec la récompense « Thème coloré » (page Points).
              </p>
            )}

            {/* Couleur de bannière */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label">Bannière de profil</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {BANNER_COLORS.filter(b => !b.premium || premiumTheme).map(b => (
                  <button
                    key={b.id} type="button"
                    onClick={() => setForm(p => ({ ...p, bannerColor: b.id }))}
                    style={{
                      width: 56, height: 32, borderRadius: 'var(--r-md)',
                      background: b.value,
                      border: `2px solid ${form.bannerColor === b.id ? 'white' : 'transparent'}`,
                      boxShadow: form.bannerColor === b.id ? '0 0 0 2px var(--peach)' : 'none',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    title={b.label}
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Sauvegarde…</> : <><i className="fas fa-check" /> Sauvegarder</>}
            </button>
          </form>
        )}

        {/* ---- Onglet Compte ---- */}
        {tab === 'account' && (
          <div className="card">
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Changer le mot de passe</h2>

            {pwMsg   && <div className="alert alert-success" style={{ marginBottom: '1rem' }}><i className="fas fa-check" /> {pwMsg}</div>}
            {pwError && <div className="alert alert-error"   style={{ marginBottom: '1rem' }}><i className="fas fa-times" /> {pwError}</div>}

            <form onSubmit={savePw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Mot de passe actuel</label>
                <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="label">Nouveau mot de passe</label>
                <input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} required minLength={8} />
              </div>
              <div className="form-group">
                <label className="label">Confirmer le nouveau mot de passe</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwSaving} style={{ alignSelf: 'flex-start' }}>
                {pwSaving ? <><span className="spinner" /> Mise à jour…</> : 'Mettre à jour'}
              </button>
            </form>
          </div>
        )}

        {/* ---- Onglet Notifications ---- */}
        {tab === 'notifications' && (
          <div className="card">
            <h2 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Préférences emails</h2>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.75rem 0', borderBottom: '1px solid var(--border-1)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Rappels anniversaires</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Emails de rappel avant les anniversaires configurés</div>
              </div>
              <input
                type="checkbox" checked={emailNotifications}
                onChange={async e => {
                  const val = e.target.checked
                  setEmailNotifications(val)
                  await fetch('/api/profile/email-preferences', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body:   JSON.stringify({ emailNotifications: val }),
                  })
                }}
                style={{ width: 'auto', accentColor: accent, cursor: 'pointer', transform: 'scale(1.4)' }}
              />
            </label>
          </div>
        )}

        {/* ---- Onglet Danger ---- */}
        {tab === 'danger' && (
          <div className="card" style={{ border: '1px solid rgba(248,113,113,0.3)' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--error)' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
              Zone de danger
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              La suppression de votre compte est permanente et irréversible.
              Toutes vos listes, items et données seront définitivement effacés.
            </p>
            <button className="btn btn-danger" onClick={deleteAccount}>
              <i className="fas fa-trash" /> Supprimer mon compte
            </button>
          </div>
        )}

      </div>
    </PageLayout>
  )
}