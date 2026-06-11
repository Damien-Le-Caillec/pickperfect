'use client'

import { useEffect } from 'react'
import Link          from 'next/link'
import styles        from './error.module.css'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    // Log l'erreur (à brancher sur un service de monitoring plus tard)
    console.error('[PickPerfect Error]', error)
  }, [error])

  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <div className={styles.icon}>
          <i className="fas fa-exclamation-circle" />
        </div>

        <h1 className={styles.title}>Une erreur est survenue</h1>
        <p className={styles.desc}>
          {isDev
            ? error.message
            : 'Quelque chose s\'est mal passé. Réessayez ou revenez à l\'accueil.'
          }
        </p>

        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={reset}>
            <i className="fas fa-redo" /> Réessayer
          </button>
          <Link href="/" className="btn btn-secondary">
            <i className="fas fa-home" /> Accueil
          </Link>
        </div>

        {/* Détails techniques en dev uniquement */}
        {isDev && error.stack && (
          <details className={styles.details}>
            <summary>Stack trace (dev)</summary>
            <pre>{error.stack}</pre>
          </details>
        )}

      </div>
    </div>
  )
}