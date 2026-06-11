'use client'

import { useState, useEffect } from 'react'
import { useRouter }           from 'next/navigation'
import Link                    from 'next/link'
import PageLayout              from '@/components/layout/PageLayout'
import styles                  from './page.module.css'

interface UserData {
  id:          string
  name:        string | null
  email:       string
  role:        string
  createdAt:   string
  loginCount:  number
  lastLoginAt: string | null
}

interface ProfileData {
  user:   UserData
  points: { level: number; totalPoints: number; availablePoints: number } | null
  badges: { id: string; badgeName: string }[]
  stats:  { listCount: number; reservationCount: number }
}

export default function ProfilePage() {
  const router = useRouter()

  const [data,    setData]    = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Formulaire infos
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoMsg,    setInfoMsg]    = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Formulaire mot de passe
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [pwdSaving,  setPwdSaving]  = useState(false)
  const [pwdMsg,     setPwdMsg]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Danger zone
  const [dangerOpen,    setDangerOpen]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError,   setDeleteError]   = useState('')

  // ---- Chargement ----
  useEffect(() => {
    fetch('/api/profile')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        setData(d)
        setName(d.user.name  ?? '')
        setEmail(d.user.email ?? '')
        setLoading(false)
      })
      .catch(err => {
        console.error('Erreur profil:', err)
        setLoading(false)
      })
  }, [])

  // ---- Sauvegarder les infos ----
  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setInfoSaving(true)
    setInfoMsg(null)

    const res  = await fetch('/api/profile', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email }),
    })
    const d    = await res.json()
    setInfoSaving(false)

    if (!res.ok) {
      setInfoMsg({ type: 'error', text: d.error })
    } else {
      setInfoMsg({ type: 'success', text: 'Profil mis à jour !' })
      // Mettre à jour les données locales
      setData(prev => prev ? { ...prev, user: { ...prev.user, name, email } } : prev)
      setTimeout(() => setInfoMsg(null), 3000)
    }
  }

  // ---- Changer le mot de passe ----
  const savePwd = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdSaving(true)
    setPwdMsg(null)

    const res  = await fetch('/api/profile/password', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    })
    const d    = await res.json()
    setPwdSaving(false)

    if (!res.ok) {
      setPwdMsg({ type: 'error', text: d.error })
    } else {
      setPwdMsg({ type: 'success', text: 'Mot de passe modifié !' })
      setCurrentPwd('')
      setNewPwd('')
      setTimeout(() => setPwdMsg(null), 3000)
    }
  }

  // ---- Supprimer le compte ----
  const deleteAccount = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    setDeleteError('')

    const res  = await fetch('/api/profile/delete', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: deleteConfirm }),
    })
    const d    = await res.json()
    setDeleteLoading(false)

    if (!res.ok) {
      setDeleteError(d.error)
    } else {
      router.push('/')
    }
  }

  // ---- Loading ----
  if (loading || !data) {
    return (
      <PageLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 12, color: 'var(--text-3)' }}>
          <span className="spinner" /> Chargement…
        </div>
      </PageLayout>
    )
  }

  const { user, points, badges, stats } = data

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <PageLayout>
      <div className={styles.wrapper}>

        {/* ==================================================
            HEADER
        ================================================== */}
        <div className={styles.header}>
          <div className={styles.avatarWrap}>
            <div className="avatar avatar-xl">{initials}</div>
          </div>

          <div className={styles.headerInfo}>
            <h1 className={styles.headerName}>{user.name ?? 'Utilisateur'}</h1>
            <p className={styles.headerEmail}>{user.email}</p>

            <div className={styles.headerMeta}>
              <span className={styles.headerMetaItem}>
                <i className="fas fa-calendar-alt" />
                Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                  month: 'long', year: 'numeric',
                })}
              </span>
              <span className={styles.headerMetaItem}>
                <i className="fas fa-sign-in-alt" />
                {user.loginCount} connexion{user.loginCount !== 1 ? 's' : ''}
              </span>
              {user.role === 'ADMIN' && (
                <span className="badge badge-peach">
                  <i className="fas fa-shield-alt" /> Admin
                </span>
              )}
            </div>

            {/* Badges aperçu */}
            {badges.length > 0 && (
              <div className={styles.badgesRow}>
                {badges.map(b => (
                  <span key={b.id} className="badge badge-lavender">
                    <i className="fas fa-medal" /> {b.badgeName}
                  </span>
                ))}
                <Link href="/points" className="badge badge-neutral" style={{ cursor: 'pointer' }}>
                  Voir tous →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================
            STATS
        ================================================== */}
        <div className={styles.stats}>
          {[
            { num: stats.listCount,          label: 'Listes créées'    },
            { num: stats.reservationCount,   label: 'Réservations'     },
            { num: points?.availablePoints ?? 0, label: 'Points dispo' },
            { num: `Niv. ${points?.level ?? 1}`, label: 'Niveau'       },
          ].map(s => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ==================================================
            FORMULAIRE — INFORMATIONS
        ================================================== */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-user" /> Informations personnelles
            </h2>
          </div>

          <form className={styles.sectionBody} onSubmit={saveInfo}>
            {infoMsg && (
              <div className={`alert alert-${infoMsg.type}`}>
                <i className={`fas fa-${infoMsg.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
                {infoMsg.text}
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="name">Prénom / Nom</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Votre prénom et nom"
                maxLength={60}
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="email">Adresse email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={infoSaving}
              >
                {infoSaving
                  ? <><span className="spinner" /> Sauvegarde…</>
                  : <><i className="fas fa-check" /> Sauvegarder</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* ==================================================
            FORMULAIRE — MOT DE PASSE
        ================================================== */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-lock" /> Mot de passe
            </h2>
          </div>

          <form className={styles.sectionBody} onSubmit={savePwd}>
            {pwdMsg && (
              <div className={`alert alert-${pwdMsg.type}`}>
                <i className={`fas fa-${pwdMsg.type === 'success' ? 'check-circle' : 'exclamation-circle'}`} />
                {pwdMsg.text}
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="currentPwd">Mot de passe actuel</label>
              <input
                id="currentPwd"
                type="password"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="newPwd">
                Nouveau mot de passe
                <span className="form-hint"> (min. 8 caractères)</span>
              </label>
              <input
                id="newPwd"
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={pwdSaving || !currentPwd || !newPwd}
              >
                {pwdSaving
                  ? <><span className="spinner" /> Modification…</>
                  : <><i className="fas fa-lock" /> Modifier le mot de passe</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* ==================================================
            DANGER ZONE
        ================================================== */}
        <div className={styles.danger}>
          <div
            className={styles.dangerHead}
            onClick={() => setDangerOpen(o => !o)}
          >
            <span className={styles.dangerTitle}>
              <i className="fas fa-exclamation-triangle" />
              Zone dangereuse
            </span>
            <i className={`fas fa-chevron-${dangerOpen ? 'up' : 'down'}`}
               style={{ color: 'var(--error)', fontSize: '0.75rem' }} />
          </div>

          {dangerOpen && (
            <div className={styles.dangerBody}>
              <p className={styles.dangerDesc}>
                La suppression de votre compte est <strong>irréversible</strong>.
                Toutes vos listes, items, réservations et points seront définitivement supprimés.
                Pour confirmer, saisissez votre mot de passe.
              </p>

              {deleteError && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--s-4)' }}>
                  <i className="fas fa-exclamation-circle" />
                  {deleteError}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
                <label className="label" htmlFor="deleteConfirm">
                  Confirmez avec votre mot de passe
                </label>
                <input
                  id="deleteConfirm"
                  type="password"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                className="btn btn-danger"
                onClick={deleteAccount}
                disabled={deleteLoading || !deleteConfirm}
              >
                {deleteLoading
                  ? <><span className="spinner" /> Suppression…</>
                  : <><i className="fas fa-trash" /> Supprimer définitivement mon compte</>
                }
              </button>
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  )
}