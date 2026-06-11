import Link   from 'next/link'
import styles from './error.module.css'

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <div className={styles.code}>404</div>

        <h1 className={styles.title}>Page introuvable</h1>
        <p className={styles.desc}>
          Cette page n'existe pas ou a été déplacée.
          Vérifiez l'URL ou retournez à l'accueil.
        </p>

        <div className={styles.actions}>
          <Link href="/" className="btn btn-primary">
            <i className="fas fa-home" /> Accueil
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            <i className="fas fa-th-large" /> Dashboard
          </Link>
        </div>

      </div>
    </div>
  )
}