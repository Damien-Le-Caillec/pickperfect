'use client'

import { useState, useActionState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { registerAction } from "@/lib/auth/actions"
import styles from './page.module.css'

const PANEL_ITEMS = [
  {
    icon:  'fa-gift',
    title: '50 points offerts à l\'inscription',
    desc:  'Bienvenue dans la communauté — vos premiers points vous attendent.',
  },
  {
    icon:  'fa-link',
    title: 'Ajout de produits par URL',
    desc:  'Collez un lien Amazon ou FNAC. On récupère tout automatiquement.',
  },
  {
    icon:  'fa-share-alt',
    title: 'Partagez en un clic',
    desc:  'Un lien unique par liste, à envoyer par SMS, email ou réseaux.',
  },
]

function passwordStrength(pwd: string): number {
    if (!pwd) return 0
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
}

const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Bon', 'Fort']

// Transmet ?redirect= (ex. lien d'invitation) à l'action d'inscription
function RedirectField() {
  const redirect = useSearchParams().get('redirect') ?? ''
  return <input type="hidden" name="redirect" value={redirect} />
}

export default function RegisterPage() {
    const [showPwd, setShowPwd]     = useState(false)
  const [password, setPassword]   = useState('')
  const [terms, setTerms]         = useState(false)
  const [state, action, pending]  = useActionState(registerAction, null)

  const strength = passwordStrength(password)

  const segClass = (i: number) => {
    if (i > strength) return styles.strengthSeg
    if (strength <= 1) return `${styles.strengthSeg} ${styles.segWeak}`
    if (strength === 2) return `${styles.strengthSeg} ${styles.segFair}`
    return `${styles.strengthSeg} ${styles.segStrong}`
  }

  return (
    <div className={styles.page}>
      {/* ---- Formulaire ---- */}
      <div className={styles.formSide}>
        <Link href="/" className={styles.backLink}>
          <i className="fas fa-arrow-left" /> Retour
        </Link>

        <div className={styles.formContent}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <i className="fas fa-gift" />
            </div>
            <span className={styles.logoText}>PickPerfect</span>
          </Link>

          <h1 className={styles.title}>Créer un compte</h1>
          <p className={styles.subtitle}>
            Déjà inscrit ?{' '}
            <Link href="/login">Se connecter</Link>
          </p>

          <form className={styles.form} action={action}>
            <Suspense fallback={null}><RedirectField /></Suspense>
            {state?.error && (
              <div className="alert alert-error">
                <i className="fas fa-exclamation-circle" />
                {state.error}
              </div>
            )}

            {/* Prénom */}
            <div className="form-group">
              <label className="label" htmlFor="name">Prénom</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Marie"
                autoComplete="given-name"
                disabled={pending}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="label" htmlFor="email">Adresse email *</label>
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
              <label className="label" htmlFor="password">
                Mot de passe * <span className="form-hint">(min. 8 caractères)</span>
              </label>
              <div className="input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Minimum 8 caractères"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={pending}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
              {/* Indicateur de force */}
              {password && (
                <>
                  <div className={styles.strengthBar}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={segClass(i)} />
                    ))}
                  </div>
                  <span className={styles.strengthLabel}>
                    {STRENGTH_LABELS[strength]}
                  </span>
                </>
              )}
            </div>

            {/* CGU */}
            <label className={styles.termsRow}>
              <input
                type="checkbox"
                checked={terms}
                onChange={e => setTerms(e.target.checked)}
                required
              />
              J'accepte les{' '}
              <Link href="/legal/cgu" target="_blank">CGU</Link>
              {' '}et la{' '}
              <Link href="/legal/privacy" target="_blank">
                politique de confidentialité
              </Link>
            </label>

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={pending || !terms}
            >
              {pending ? (
                <><span className="spinner" /> Création en cours...</>
              ) : (
                <>Créer mon compte <i className="fas fa-arrow-right" /></>
              )}
            </button>
          </form>

          <div className={styles.footer}>
            Déjà un compte ?{' '}
            <Link href="/login">Se connecter</Link>
          </div>
        </div>
      </div>

      {/* ---- Panel droite ---- */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Ce qui vous attend</h2>
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