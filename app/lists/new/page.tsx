'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'
import styles from './page.module.css'
import { OCCASIONS } from '@/lib/occasions'

const PRIVACY_OPTIONS = [
  {
    value: 'UNLISTED',
    icon:  'fa-link',
    label: 'Par lien',
    desc:  'Seuls ceux qui ont le lien peuvent voir',
  },
  {
    value: 'PUBLIC',
    icon:  'fa-globe',
    label: 'Public',
    desc:  'Visible par tout le monde',
  },
  {
    value: 'PRIVATE',
    icon:  'fa-lock',
    label: 'Privé',
    desc:  'Visible uniquement par toi',
  },
]

export default function NewListPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    title:       '',
    description: '',
    privacy:     'UNLISTED',
    eventDate:   '',
    budget:      '',
  })
  const [loading, setLoading] = useState(false)
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [customOccasion, setCustomOccasion] = useState('')
  const [error,   setError]   = useState('')

  const set = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Le titre est requis'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/lists', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title:       form.title,
        description: form.description || undefined,
        privacy:     form.privacy,
        eventDate:   form.eventDate
          ? new Date(form.eventDate).toISOString()
          : undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error); return }

    router.push(`/lists/${data.id}`)
  }

  return (
    <PageLayout>
      <div className={styles.wrapper}>
        <Link href="/lists" className={styles.back}>
          <i className="fas fa-arrow-left" /> Mes listes
        </Link>

        <h1 className={styles.title}>Nouvelle liste</h1>
        <p className={styles.subtitle}>
          Configurez votre liste en quelques secondes.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle" />
              {error}
            </div>
          )}

          {/* Titre */}
          <div className="form-group">
            <label className="label" htmlFor="title">
              Titre de la liste *
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex : Mon anniversaire, Mariage de Sophie…"
              required
              maxLength={100}
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="label" htmlFor="desc">
              Description{' '}
              <span className="form-hint">(optionnel)</span>
            </label>
            <textarea
              id="desc"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Un petit mot pour vos invités…"
              rows={3}
              maxLength={500}
              disabled={loading}
            />
          </div>

          {/* Confidentialité */}
          <div className="form-group">
            <label className="label">Confidentialité</label>
            <div className={styles.privacyGrid}>
              {PRIVACY_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  className={[
                    styles.privacyOption,
                    form.privacy === opt.value ? styles.selected : '',
                  ].join(' ')}
                  onClick={() => set('privacy', opt.value)}
                >
                  <div className={styles.privacyIcon}>
                    <i className={`fas ${opt.icon}`} />
                  </div>
                  <div className={styles.privacyLabel}>{opt.label}</div>
                  <div className={styles.privacyDesc}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Occasion */}
          <div className="form-group" style={{ marginBottom: 'var(--s-4)' }}>
            <label className="label">
              Occasion <span className="form-hint">(optionnel — pré-remplit le budget)</span>
            </label>
            <div style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', marginBottom: 'var(--s-3)' }}>
              {Object.entries(OCCASIONS).map(([key, occ]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (selectedOccasion === key) {
                      setSelectedOccasion('')
                      set('budget', '')
                    } else {
                      setSelectedOccasion(key)
                      setCustomOccasion('')
                      set('budget', occ.avgPrice.toString())
                    }
                  }}
                  className="btn btn-sm"
                  style={{
                    background:   selectedOccasion === key ? 'var(--peach)' : 'var(--surface-2)',
                    color:        selectedOccasion === key ? 'white' : 'var(--text-1)',
                    border:       `1px solid ${selectedOccasion === key ? 'var(--peach)' : 'var(--border-1)'}`,
                    borderRadius: 'var(--r-full)',
                    fontWeight:   selectedOccasion === key ? 700 : 400,
                  }}
                  disabled={loading}
                >
                  {occ.label} · {occ.avgPrice}€
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customOccasion}
              onChange={e => {
                setCustomOccasion(e.target.value)
                if (e.target.value) setSelectedOccasion('') // désélectionne le bouton
              }}
              placeholder="Ou saisir une occasion personnalisée…"
              disabled={loading}
            />
          </div>
          {/* Date + Budget */}
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="eventDate">
                <i className="fas fa-calendar-alt" style={{ marginRight: 6 }} />
                Date de l'événement
                <span className="form-hint"> (optionnel)</span>
              </label>
              <input
                id="eventDate"
                type="date"
                value={form.eventDate}
                onChange={e => set('eventDate', e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="budget">
                <i className="fas fa-euro-sign" style={{ marginRight: 6 }} />
                Budget indicatif (€)
                <span className="form-hint"> (optionnel)</span>
              </label>
              <input
                id="budget"
                type="number"
                value={form.budget}
                onChange={e => set('budget', e.target.value)}
                placeholder="Ex : 150"
                min="0"
                step="0.01"
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Link href="/lists" className="btn btn-secondary">
              Annuler
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" /> Création…</>
              ) : (
                <>Créer la liste <i className="fas fa-arrow-right" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}