'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const token  = params.token as string

  const [status, setStatus] = useState<
    'loading' | 'success' | 'error' | 'needsAuth'
  >('loading')
  const [message, setMessage] = useState('')
  const [listId,  setListId]  = useState('')

  useEffect(() => {
    const join = async () => {
      const res  = await fetch(`/api/join/${token}`, { method: 'POST' })
      const data = await res.json()

      if (data.needsAuth) {
        // Sauvegarder le token pour rediriger après connexion
        sessionStorage.setItem('pendingJoin', token)
        setStatus('needsAuth')
        return
      }

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error)
        return
      }

      setListId(data.listId)
      setStatus('success')

      // Rediriger vers la liste dans 2 secondes
      setTimeout(() => router.push(`/lists/${data.listId}`), 2000)
    }

    join()
  }, [token, router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1.5rem',
    }}>
      <div className="card" style={{
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        padding: '3rem 2.5rem',
      }}>
        {status === 'loading' && (
          <>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p style={{ marginTop: '1.5rem', color: 'var(--text-2)' }}>
              Vérification de l'invitation…
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <i className="fas fa-check-circle" style={{ color: 'var(--success)' }} />
            </div>
            <h1 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>
              Vous avez rejoint la liste !
            </h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>
              Redirection en cours…
            </p>
            <Link href={`/lists/${listId}`} className="btn btn-primary">
              Voir la liste maintenant
            </Link>
          </>
        )}

        {status === 'needsAuth' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <i className="fas fa-lock" style={{ color: 'var(--lavender)' }} />
            </div>
            <h1 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>
              Connexion requise
            </h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>
              Connectez-vous pour rejoindre cette liste.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link
                href={`/login?redirect=/join/${token}`}
                className="btn btn-primary"
              >
                Se connecter
              </Link>
              <Link
                href={`/register?redirect=/join/${token}`}
                className="btn btn-secondary"
              >
                Créer un compte
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <i className="fas fa-times-circle" style={{ color: 'var(--error)' }} />
            </div>
            <h1 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Lien invalide</h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>{message}</p>
            <Link href="/dashboard" className="btn btn-secondary">
              Retour à l'accueil
            </Link>
          </>
        )}
      </div>
    </div>
  )
}