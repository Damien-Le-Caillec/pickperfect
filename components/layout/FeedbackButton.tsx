'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

const TYPES = [
  { id: 'BUG',   label: 'Bug',          icon: 'fa-bug',        color: 'var(--error)'   },
  { id: 'IDEA',  label: 'Idée',         icon: 'fa-lightbulb',  color: 'var(--gold)'    },
  { id: 'OTHER', label: 'Autre',        icon: 'fa-comment',    color: 'var(--lavender)'},
]

export default function FeedbackButton() {
  const pathname        = usePathname()
  const [open,    setOpen]    = useState(false)
  const [type,    setType]    = useState('BUG')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)

  const send = async () => {
    if (!message.trim()) return
    setSending(true)
    await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ type, message, page: pathname }),
    })
    setSending(false); setSent(true)
    setTimeout(() => { setSent(false); setOpen(false); setMessage(''); setType('BUG') }, 2000)
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position:       'fixed',
          bottom:         72,
          right:          16,
          zIndex:         150,
          width:          48,
          height:         48,
          borderRadius:   '50%',
          background:     'linear-gradient(135deg, var(--peach), var(--lavender))',
          border:         'none',
          color:          'white',
          fontSize:       '1rem',
          cursor:         'pointer',
          boxShadow:      'var(--shadow-lg)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          transition:     'transform 0.2s var(--ease)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        title="Envoyer un feedback"
      >
        <i className="fas fa-comment-alt" />
      </button>

      {/* Modale */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position:     'fixed',
            bottom:       'auto',
            top: '50%',
            left:     '50%',
            right:        'auto',
            zIndex:       201,
            width:        'min(340px, calc(100vw - 32px))',
            transform:'translate(-50%, -50%)',
            background:   'var(--surface)',
            border:       '1px solid var(--border-1)',
            borderRadius: 'var(--r-2xl)',
            padding:      'var(--s-6)',
            boxShadow:    'var(--shadow-xl)',
            animation:    'fadeUp 0.2s var(--ease-out)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-4)' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1rem' }}>
                <i className="fas fa-comment-alt" style={{ marginRight: 8, color: 'var(--peach)' }} />
                Feedback
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: 'var(--s-6) 0' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: 'var(--mint)', marginBottom: 'var(--s-3)', display: 'block' }} />
                <p style={{ fontWeight: 700 }}>Merci pour votre retour !</p>
              </div>
            ) : (
              <>
                {/* Type */}
                <div style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
                  {TYPES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className="btn btn-sm"
                      style={{
                        flex:        1,
                        justifyContent: 'center',
                        background:  type === t.id ? `${t.color}20` : 'var(--surface-2)',
                        border:      `1.5px solid ${type === t.id ? t.color : 'var(--border-1)'}`,
                        color:       type === t.id ? t.color : 'var(--text-2)',
                        fontWeight:  type === t.id ? 700 : 400,
                      }}
                    >
                      <i className={`fas ${t.icon}`} /> {t.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={
                    type === 'BUG'  ? "Décrivez le bug — qu'est-ce qui ne fonctionne pas ?" :
                    type === 'IDEA' ? "Quelle fonctionnalité aimeriez-vous voir ?" :
                    "Votre message…"
                  }
                  rows={4}
                  maxLength={1000}
                  style={{ resize: 'none', marginBottom: 'var(--s-2)', width: '100%' }}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-4)' }}>
                  <span className="form-hint">{message.length}/1000</span>
                  <span className="form-hint" style={{ fontSize: '0.7rem' }}>
                    <i className="fas fa-map-marker-alt" style={{ marginRight: 3 }} />
                    {pathname}
                  </span>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={send}
                  disabled={sending || !message.trim()}
                >
                  {sending ? <><span className="spinner" /> Envoi…</> : <><i className="fas fa-paper-plane" /> Envoyer</>}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}