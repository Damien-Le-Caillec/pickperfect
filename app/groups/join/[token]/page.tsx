'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const token  = params.token as string

  const [status, setStatus]   = useState<'loading' | 'success' | 'error' | 'needsAuth'>('loading')
  const [message, setMessage] = useState('')
  const [groupId, setGroupId] = useState('')

  useEffect(() => {
    fetch(`/api/groups/join/${token}`, { method: 'POST' })
      .then(async res => {
        const data = await res.json()
        if (data.needsAuth) {
          sessionStorage.setItem('pendingGroupJoin', token)
          setStatus('needsAuth')
          return
        }
        if (!res.ok) { setStatus('error'); setMessage(data.error); return }
        setGroupId(data.groupId)
        setStatus('success')
        setTimeout(() => router.push(`/groups/${data.groupId}`), 1800)
      })
  }, [token, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '3rem 2.5rem' }}>
        {status === 'loading' && <><span className="spinner" style={{ width: 32, height: 32 }} /><p style={{ marginTop: '1.5rem', color: 'var(--text-2)' }}>Vérification…</p></>}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '1rem' }}><i className="fas fa-check-circle" /></div>
            <h1 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Bienvenue dans le groupe !</h1>
            <p style={{ color: 'var(--text-2)' }}>Redirection en cours…</p>
          </>
        )}
        {status === 'needsAuth' && (
          <>
            <div style={{ fontSize: '3rem', color: 'var(--lavender)', marginBottom: '1rem' }}><i className="fas fa-lock" /></div>
            <h1 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Connexion requise</h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Connectez-vous pour rejoindre ce groupe.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href={`/login?redirect=/groups/join/${token}`} className="btn btn-primary">Se connecter</Link>
              <Link href={`/register?redirect=/groups/join/${token}`} className="btn btn-secondary">S'inscrire</Link>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', color: 'var(--error)', marginBottom: '1rem' }}><i className="fas fa-times-circle" /></div>
            <h1 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Lien invalide</h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>{message}</p>
            <Link href="/dashboard" className="btn btn-secondary">Retour</Link>
          </>
        )}
      </div>
    </div>
  )
}