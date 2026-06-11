'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

const PANEL_ITEMS = [
  {
    icon:  'fa-list-ul',
    title: 'Vos listes vous attendent',
    desc:  'Retrouvez tous vos cadeaux et suivez les réservations de vos proches.',
  },
  {
    icon:  'fa-star',
    title: 'Vos points accumulés',
    desc:  'Consultez votre solde et échangez-le contre des récompenses.',
  },
  {
    icon:  'fa-users',
    title: 'Votre communauté',
    desc:  'Retrouvez vos groupes d\'amis et les événements à venir.',
  },
]

export default function LoginPage() {
  const router = useRouter()

  const [showPwd, setShowPwd] = useState(false)
  const [pending, setPending] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setPending(true)

    const fd = new FormData(e.currentTarget)

    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:    fd.get('email'),
        password: fd.get('password'),
      }),
    })

    const data = await res.json()
    setPending(false)

    if (!res.ok) {
      setError(data.error || 'Email ou mot de passe incorrect')
      return
    }

    // Vérifier si un lien d'invitation est en attente
    const pendingJoin = sessionStorage.getItem('pendingJoin')
    if (pendingJoin) {
      sessionStorage.removeItem('pendingJoin')
      router.push(`/join/${pendingJoin}`)
      return
    }

    // Vérifier si une redirection est demandée (?redirect=/lists/xxx)
    const redirectTo = new URLSearchParams(window.location.search).get('redirect')
    router.push(redirectTo || '/dashboard')
    router.refresh()
  }

  return (
    <div className={styles.page}>

      {/* ---- Colonne formulaire ---- */}
      <div className={styles.formSide}>
        <Link href="/" className={styles.backLink}>
          <i className="fas fa-arrow-left" />
          Retour à l'accueil
        </Link>

        <div className={styles.formContent}>

          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <i className="fas fa-gift" />
            </div>
            <span className={styles.logoText}>PickPerfect</span>
          </Link>

          <h1 className={styles.title}>Bon retour !</h1>
          <p className={styles.subtitle}>
            Pas encore de compte ?{' '}
            <Link href="/register">S'inscrire gratuitement</Link>
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>

            {/* Erreur */}
            {error && (
              <div className="alert alert-error">
                <i className="fas fa-exclamation-circle" />
                {error}
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label className="label" htmlFor="email">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
                disabled={pending}
              />
            </div>

            {/* Mot de passe */}
            <div className="form-group">
              <div className={styles.fieldLabel}>
                <label className="label" htmlFor="password">
                  Mot de passe
                </label>
                <Link href="/forgot-password" className={styles.forgotLink}>
                  Oublié ?
                </Link>
              </div>
              <div className="input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={pending}
                />
                <button
                  type="button"
                  className="input-icon"
                  onClick={() => setShowPwd(p => !p)}
                  tabIndex={-1}
                >
                  <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={pending}
            >
              {pending ? (
                <><span className="spinner" /> Connexion en cours...</>
              ) : (
                <>Se connecter <i className="fas fa-arrow-right" /></>
              )}
            </button>

          </form>

          <div className={styles.footer}>
            Pas encore de compte ?{' '}
            <Link href="/register">Créer un compte</Link>
          </div>

        </div>
      </div>

      {/* ---- Colonne panel ---- */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>
          Tout ce qui vous attend
        </h2>

        <div className={styles.panelItems}>
          {PANEL_ITEMS.map(item => (
            <div key={item.title} className={styles.panelItem}>
              <div className={styles.panelItemIcon}>
                <i className={`fas ${item.icon}`} />
              </div>
              <div>
                <p className={styles.panelItemTitle}>{item.title}</p>
                <p className={styles.panelItemDesc}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.panelDeco1} />
        <div className={styles.panelDeco2} />
      </div>

    </div>
  )
}