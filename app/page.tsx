import Link from 'next/link'
import Header from '@/components/layout/Header'
import styles from './page.module.css'

/* ---- Données statiques ---- */
const FEATURES = [
  {
    icon:  'fa-magic',
    color: 'linear-gradient(135deg, #FF9A8B 0%, #E8826F 100%)',
    title: 'Ajout en un clic',
    desc:  'Collez l\'URL d\'un produit depuis Amazon, FNAC ou Darty. PickPerfect récupère le nom, le prix et la photo automatiquement.',
  },
  {
    icon:  'fa-lock',
    color: 'linear-gradient(135deg, #A2E4B8 0%, #72C98A 100%)',
    title: 'Zéro doublon',
    desc:  'Vos invités voient en temps réel ce qui est déjà réservé. Fini les cadeaux identiques à déposer.',
  },
  {
    icon:  'fa-star',
    color: 'linear-gradient(135deg, #C5B3E6 0%, #A090CC 100%)',
    title: 'Gagnez des points',
    desc:  'Chaque action vous rapporte des points : créer une liste, réserver, partager. Échangez-les contre des récompenses.',
  },
  {
    icon:  'fa-percent',
    color: 'linear-gradient(135deg, #FFD166 0%, #F0B429 100%)',
    title: 'Cashback affilié',
    desc:  'Vos achats via PickPerfect génèrent des commissions. Une partie vous revient directement en points.',
  },
]

const STEPS = [
  {
    n:    '1',
    title:'Créez votre liste',
    desc: 'Donnez-lui un nom, une date et ajoutez les cadeaux que vous souhaitez recevoir.',
  },
  {
    n:    '2',
    title:'Partagez le lien',
    desc: 'Un lien unique est généré. Envoyez-le par message, email ou réseaux sociaux.',
  },
  {
    n:    '3',
    title:'Recevez vos cadeaux',
    desc: 'Vos proches réservent en toute discrétion. Vous recevez exactement ce que vous désirez.',
  },
]

export default function HomePage() {
  return (
    <div className={styles.page}>
      <Header />

      {/* ===== HERO ===== */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <i className="fas fa-gift" />
            Social Gifting · Gratuit · Sans publicité
          </div>

          <h1 className={styles.heroTitle}>
            Les cadeaux de groupe,<br />
            <span className={styles.highlight}>enfin sans prise de tête</span>
          </h1>

          <p className={styles.heroDesc}>
            Créez votre liste de souhaits, partagez-la en un clic et laissez
            vos proches réserver. Plus de doublons, plus d'embarras.
          </p>

          <div className={styles.heroCta}>
            <Link href="/register" className="btn btn-primary btn-lg">
              <i className="fas fa-arrow-right" />
              Créer ma liste gratuitement
            </Link>
            <Link href="/explore" className="btn btn-secondary btn-lg">
              Explorer les listes
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>0 €</span>
              <span className={styles.heroStatLabel}>Toujours gratuit</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>∞</span>
              <span className={styles.heroStatLabel}>Listes illimitées</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>Noel 2026</span>
              <span className={styles.heroStatLabel}>Objectif déploiement</span>
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div className={styles.heroVisual}>
          <div className={styles.visualCard}>
            <div className={styles.visualMain}>
              <i className="fas fa-gift" />
            </div>

            <div className={`${styles.floatPill} ${styles.floatPill1}`}>
              <div
                className={styles.floatDot}
                style={{ background: 'var(--mint)' }}
              />
              Réservé par Marie
            </div>

            <div className={`${styles.floatPill} ${styles.floatPill2}`}>
              <div
                className={styles.floatDot}
                style={{ background: 'var(--gold)' }}
              />
              +5 points gagnés
            </div>

            <div className={`${styles.floatPill} ${styles.floatPill3}`}>
              <div
                className={styles.floatDot}
                style={{ background: 'var(--lavender)' }}
              />
              12 invités connectés
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <p className={styles.sectionLabel}>Pourquoi PickPerfect ?</p>
          <h2 className={styles.sectionTitle}>
            Tout ce dont vous avez besoin
          </h2>
          <p className={styles.sectionDesc}>
            Une expérience pensée pour que chaque événement soit mémorable,
            du premier clic jusqu'au papier cadeau.
          </p>

          <div className={styles.featuresGrid}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div
                  className={styles.featureIcon}
                  style={{ background: f.color }}
                >
                  <i className={`fas ${f.icon}`} />
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STEPS ===== */}
      <section className={styles.steps}>
        <p className={styles.sectionLabel}>Simple comme bonjour</p>
        <h2 className={styles.sectionTitle}>En 3 étapes</h2>

        <div className={styles.stepsGrid}>
          {STEPS.map(s => (
            <div key={s.n} className={styles.step}>
              <div className={styles.stepNum}>{s.n}</div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Prêt pour Noël 2026 ?</h2>
          <p className={styles.ctaDesc}>
            Rejoignez PickPerfect maintenant et préparez vos listes
            avant que tout le monde ne se précipite en décembre.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/register" className="btn btn-primary btn-xl">
              <i className="fas fa-gift" />
              Commencer — c'est gratuit
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}