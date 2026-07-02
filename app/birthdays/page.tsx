'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageLayout from '@/components/layout/PageLayout'

interface Birthday {
  id:            string
  name:          string
  date:          string
  daysLeft:      number
  nextDate:      string
  month:         number
  day:           number
  source:        'manual' | 'friend'
  relatedListId: string | null
  remindDays:    number
}

const MONTHS      = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS        = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

export default function BirthdaysPage() {
  const [birthdays,  setBirthdays]  = useState<Birthday[]>([])
  const [loading,    setLoading]    = useState(true)
  const [view,       setView]       = useState<'list' | 'calendar'>('list')
  const [showForm,   setShowForm]   = useState(false)
  const [adding,     setAdding]     = useState(false)
  const [form,       setForm]       = useState({ name: '', month: '01', day: '01', remindDays: 7 })
  const [calMonth,   setCalMonth]   = useState(new Date().getMonth())
  const [calYear,    setCalYear]    = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/birthdays').then(r => r.json()).then(d => {
      setBirthdays(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/birthdays', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ name: form.name, date: `${form.month}-${form.day}`, remindDays: form.remindDays }),
    })
    setAdding(false); setShowForm(false)
    setForm({ name: '', month: '01', day: '01', remindDays: 7 })
    load()
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Supprimer l'anniversaire de ${name} ?`)) return
    await fetch('/api/birthdays', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ id }),
    })
    load()
  }

  const urgencyColor = (days: number) =>
    days === 0  ? 'var(--peach)'      :
    days <= 3   ? 'var(--error)'      :
    days <= 7   ? 'var(--peach-dark)' :
    days <= 30  ? 'var(--gold-dark)'  : 'var(--text-3)'

  const urgencyBg = (days: number) =>
    days === 0  ? 'rgba(255,123,107,0.1)' :
    days <= 3   ? 'rgba(248,113,113,0.08)':
    days <= 7   ? 'rgba(255,154,139,0.08)':
    days <= 30  ? 'rgba(251,191,36,0.06)' : 'transparent'

  // ---- Calendrier ----
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // Lundi = 0
  }

  const birthdaysInCalMonth = birthdays.filter(b => b.month === calMonth)

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const today    = new Date()
  const daysInM  = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  return (
    <PageLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="page-title">Anniversaires</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* Toggle vue */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 3 }}>
              <button
                className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('list')}
              >
                <i className="fas fa-list" /> Liste
              </button>
              <button
                className={`btn btn-sm ${view === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setView('calendar')}
              >
                <i className="fas fa-calendar" /> Calendrier
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(o => !o)}>
              <i className="fas fa-plus" /> Ajouter
            </button>
          </div>
        </div>

        {/* Formulaire ajout */}
        {showForm && (
          <form onSubmit={add} className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">Prénom / nom *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Mamie, Lucas, Chloé…" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Mois</label>
                <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}>
                  {MONTHS_FULL.map((m, i) => (
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
                <label className="label">Rappel</label>
                <select value={form.remindDays} onChange={e => setForm(p => ({ ...p, remindDays: parseInt(e.target.value) }))}>
                  {[0, 1, 3, 7, 14, 30].map(d => (
                    <option key={d} value={d}>{d === 0 ? 'Désactivé' : `${d} jours avant`}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                {adding ? <><span className="spinner" /> Ajout…</> : <><i className="fas fa-check" /> Enregistrer</>}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-3)' }}>
            <span className="spinner" />
          </div>
        ) : birthdays.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-birthday-cake" /></div>
            <h3>Aucun anniversaire</h3>
            <p>Ajoutez des dates manuellement ou demandez à vos amis de renseigner leur anniversaire sur leur profil.</p>
          </div>
        ) : view === 'list' ? (

          /* ====================== VUE LISTE ====================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Aujourd'hui */}
            {birthdays.filter(b => b.daysLeft === 0).length > 0 && (
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--peach)', marginBottom: '-0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Aujourd'hui
              </div>
            )}

            {birthdays.map(b => (
              <div
                key={b.id}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: 'var(--r-xl)', background: urgencyBg(b.daysLeft), border: '1px solid var(--border-1)', transition: 'all 0.2s' }}
              >
                {/* Badge date */}
                <div style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', border: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>{MONTHS[b.month]}</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, color: 'var(--text-1)' }}>{b.day}</span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{b.name}</span>
                    {b.source === 'friend' && (
                      <span className="badge badge-lavender" style={{ fontSize: '0.65rem' }}>
                        <i className="fas fa-user-friends" /> Ami
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: urgencyColor(b.daysLeft), fontWeight: b.daysLeft <= 7 ? 700 : 400, marginTop: 2 }}>
                    {b.daysLeft === 0 ? '🎉 C\'est aujourd\'hui !' :
                     b.daysLeft === 1 ? '⚡ Demain !' :
                     `Dans ${b.daysLeft} jour${b.daysLeft !== 1 ? 's' : ''}`}
                  </div>
                </div>

                {b.relatedListId && (
                  <Link href={`/lists/${b.relatedListId}`} className="btn btn-ghost btn-sm">
                    <i className="fas fa-gift" /> Liste
                  </Link>
                )}

                {b.source === 'manual' && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(b.id, b.name)}>
                    <i className="fas fa-trash" style={{ color: 'var(--error)' }} />
                  </button>
                )}
              </div>
            ))}
          </div>

        ) : (

          /* ====================== VUE CALENDRIER ====================== */
          <div className="card">
            {/* Navigation mois */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={prevMonth}>
                <i className="fas fa-chevron-left" />
              </button>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                {MONTHS_FULL[calMonth]} {calYear}
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={nextMonth}>
                <i className="fas fa-chevron-right" />
              </button>
            </div>

            {/* Jours de la semaine */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: '0.5rem' }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', padding: '4px 0' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cases du calendrier */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {/* Cases vides avant le 1er */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ aspectRatio: '1', borderRadius: 'var(--r-md)' }} />
              ))}

              {/* Jours du mois */}
              {Array.from({ length: daysInM }, (_, i) => i + 1).map(day => {
                const birthdaysOnDay = birthdaysInCalMonth.filter(b => b.day === day)
                const isToday        = today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear
                const hasBirthday    = birthdaysOnDay.length > 0

                return (
                  <div
                    key={day}
                    onClick={() => hasBirthday && setSelectedDay(selectedDay === day ? null : day)}
                    style={{
                      aspectRatio:   '1',
                      borderRadius:  'var(--r-md)',
                      background:    isToday ? 'var(--peach)' : selectedDay === day ? 'var(--lavender-light)' : hasBirthday ? 'var(--surface-2)' : 'transparent',
                      border:        selectedDay === day ? '1.5px solid var(--lavender)' : hasBirthday && !isToday ? '1.5px solid var(--lavender)' : '1.5px solid transparent',
                      display:       'flex',
                      flexDirection: 'column',
                      alignItems:    'center',
                      justifyContent:'center',
                      gap:           2,
                      cursor:        hasBirthday ? 'pointer' : 'default',
                      position:      'relative',
                      transition:    'all 0.15s',
                    }}
                    title={hasBirthday ? birthdaysOnDay.map(b => b.name).join(', ') : undefined}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 900 : hasBirthday ? 700 : 400, color: isToday ? 'white' : hasBirthday ? 'var(--lavender)' : 'var(--text-2)' }}>
                      {day}
                    </span>
                    {hasBirthday && (
                      <span style={{ fontSize: '0.55rem', color: 'var(--lavender)', fontWeight: 700, lineHeight: 1, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>
                        {birthdaysOnDay[0].name.split(' ')[0]}
                        {birthdaysOnDay.length > 1 ? ` +${birthdaysOnDay.length - 1}` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Panneau jour sélectionné */}
            {selectedDay !== null && (
              <div style={{ marginTop: '1rem', padding: 'var(--s-4)', background: 'var(--surface-2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--lavender-light)', animation: 'fadeUp 0.15s var(--ease-out)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    <i className="fas fa-birthday-cake" style={{ marginRight: 6, color: 'var(--lavender)' }} />
                    {selectedDay} {MONTHS_FULL[calMonth]}
                  </span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedDay(null)}>
                    <i className="fas fa-times" />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
                  {birthdaysInCalMonth
                    .filter(b => b.day === selectedDay)
                    .map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', padding: 'var(--s-3)', background: 'var(--surface)', borderRadius: 'var(--r-lg)' }}>
                        <div className="avatar avatar-sm">
                          {b.name[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{b.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                            {b.daysLeft === 0 ? "C'est aujourd'hui !" : `Dans ${b.daysLeft} jour${b.daysLeft !== 1 ? 's' : ''}`}
                          </div>
                        </div>
                        {b.source === 'friend' && (
                          <Link href={`/profile/${b.id.replace('friend-', '')}`} className="btn btn-ghost btn-sm">
                            <i className="fas fa-user" /> Profil
                          </Link>
                        )}
                        {b.relatedListId && (
                          <Link href={`/lists/${b.relatedListId}`} className="btn btn-ghost btn-sm">
                            <i className="fas fa-gift" /> Liste
                          </Link>
                        )}
                        {b.source === 'manual' && (
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => { remove(b.id, b.name); setSelectedDay(null) }}>
                            <i className="fas fa-trash" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Liste des anniversaires du mois */}
            {birthdaysInCalMonth.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-1)' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ce mois-ci ({birthdaysInCalMonth.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {birthdaysInCalMonth
                    .sort((a, b) => a.day - b.day)
                    .map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                        <span style={{ width: 28, textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--lavender)' }}>{b.day}</span>
                        <span style={{ fontWeight: 600, flex: 1 }}>{b.name}</span>
                        {b.source === 'friend' && <span className="badge badge-lavender" style={{ fontSize: '0.65rem' }}>Ami</span>}
                        <span style={{ fontSize: '0.75rem', color: b.daysLeft <= 7 ? 'var(--peach)' : 'var(--text-3)' }}>
                          {b.daysLeft === 0 ? "Aujourd'hui !" : b.daysLeft === 1 ? 'Demain' : `Dans ${b.daysLeft}j`}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {birthdaysInCalMonth.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem', marginTop: '1rem' }}>
                Aucun anniversaire ce mois-ci
              </p>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}