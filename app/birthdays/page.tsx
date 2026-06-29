'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface Birthday {
  id: string; name: string; date: string
  daysLeft: number; nextDate: string
  remindDays: number; relatedListId: string | null
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [loading,   setLoading]   = useState(true)
  const [form, setForm] = useState({ name: '', month: '01', day: '01', remindDays: 7 })
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    fetch('/api/birthdays').then(r => r.json()).then(d => { setBirthdays(d); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/birthdays', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ name: form.name, date: `${form.month}-${form.day}`, remindDays: form.remindDays }),
    })
    setAdding(false); setShowForm(false); setForm({ name: '', month: '01', day: '01', remindDays: 7 }); load()
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'anniversaire de ${name} ?`)) return
    await fetch('/api/birthdays', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const urgencyColor = (days: number) =>
    days <= 3  ? 'var(--error)'      :
    days <= 7  ? 'var(--peach-dark)' :
    days <= 30 ? 'var(--gold-dark)'  : 'var(--text-3)'

  const urgencyBg = (days: number) =>
    days <= 3  ? 'rgba(248,113,113,0.08)' :
    days <= 7  ? 'rgba(255,154,139,0.08)' :
    days <= 30 ? 'rgba(255,209,102,0.08)' : 'var(--surface)'

  return (
    <PageLayout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="page-title">Anniversaires</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(o => !o)}>
            <i className="fas fa-plus" /> Ajouter
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <form onSubmit={add} className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="label" htmlFor="bName">Prénom / nom *</label>
              <input id="bName" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Mamie, Lucas, Chloé…" required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Mois</label>
                <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Jour</label>
                <select value={form.day} onChange={e => setForm(p => ({ ...p, day: e.target.value }))}>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Rappel (jours avant)</label>
                <select value={form.remindDays} onChange={e => setForm(p => ({ ...p, remindDays: parseInt(e.target.value) }))}>
                  {[0, 1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d === 0 ? 'Désactivé' : `${d} jours`}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? <span className="spinner" /> : <><i className="fas fa-check" /> Enregistrer</>}
              </button>
            </div>
          </form>
        )}

        {/* Liste */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}><span className="spinner" /></div>
        ) : birthdays.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-birthday-cake" /></div>
            <h3>Aucun anniversaire enregistré</h3>
            <p>Ajoutez les dates de vos proches pour ne plus jamais les oublier.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {birthdays.map(b => {
              const date = new Date(b.date)
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--r-xl)', background: urgencyBg(b.daysLeft), border: '1px solid var(--border-1)' }}>
                  {/* Date badge */}
                  <div style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>{MONTHS[date.getMonth()]}</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, color: 'var(--text-1)' }}>{date.getDate()}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{b.name}</div>
                    <div style={{ fontSize: '0.78rem', color: urgencyColor(b.daysLeft), fontWeight: b.daysLeft <= 7 ? 700 : 400 }}>
                      {b.daysLeft === 0 ? '🎉 C\'est aujourd\'hui !' :
                       b.daysLeft === 1 ? '⚡ Demain !' :
                       `Dans ${b.daysLeft} jour${b.daysLeft !== 1 ? 's' : ''}`}
                    </div>
                  </div>

                  {b.relatedListId && (
                    <Link href={`/lists/${b.relatedListId}`} className="btn btn-ghost btn-sm">
                      <i className="fas fa-gift" /> Voir la liste
                    </Link>
                  )}

                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(b.id, b.name)}>
                    <i className="fas fa-trash" style={{ color: 'var(--error)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}