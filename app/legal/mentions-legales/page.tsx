import type { Metadata } from 'next'
import Link              from 'next/link'
import PageLayout        from '@/components/layout/PageLayout'
import styles            from '../legal.module.css'

export const metadata: Metadata = { title: 'Mentions légales' }

export default function MentionsLegalesPage() {
  return (
    <PageLayout>
      <div className={styles.page}>
        <div className={styles.wrapper}>

          <div className={styles.header}>
            <Link href="/" className={styles.backLink}>
              <i className="fas fa-arrow-left" /> Retour à l'accueil
            </Link>
            <h1 className={styles.title}>Mentions légales</h1>
            <div className={styles.meta}>
              <span><i className="fas fa-calendar-alt" /> Mise à jour : 1er juin 2026</span>
            </div>
          </div>

          <div className={styles.content}>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionNum}>1</span>
                Éditeur du site
              </h2>
              <div className={styles.sectionBody}>
                <p><strong>Raison sociale :</strong> PickPerfect</p>
                <p><strong>Statut :</strong> Micro-entreprise</p>
                <p><strong>SIRET :</strong> [À compléter]</p>
                <p><strong>Adresse :</strong> [À compléter]</p>
                <p><strong>Email :</strong> contact@pickperfect.com</p>
                <p><strong>Directeur de la publication :</strong> [À compléter]</p>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionNum}>2</span>
                Hébergement
              </h2>
              <div className={styles.sectionBody}>
                <p><strong>Hébergeur :</strong> [À compléter : nom de l'hébergeur]</p>
                <p><strong>Adresse de l'hébergeur :</strong> [À compléter]</p>
                <p><strong>Téléphone de l'hébergeur :</strong> [À compléter]</p>
                <p><strong>Localisation des serveurs :</strong> France</p>
                <p><strong>Contact :</strong> contact@pickperfect.com</p>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionNum}>3</span>
                Propriété intellectuelle
              </h2>
              <div className={styles.sectionBody}>
                <p>
                  L'ensemble du contenu de ce site (textes, images, code, design) est la
                  propriété de PickPerfect et est protégé par le droit d'auteur français
                  et les conventions internationales applicables.
                </p>
                <p>
                  Toute reproduction, représentation, modification ou exploitation,
                  totale ou partielle, sans autorisation expresse est interdite.
                </p>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionNum}>4</span>
                Programme d'affiliation
              </h2>
              <div className={styles.sectionBody}>
                <p>
                  PickPerfect participe à des programmes d'affiliation incluant notamment
                  Amazon Associates, FNAC Affiliation et Darty Partenaires.
                  Des liens présents sur ce site peuvent générer une commission
                  sans surcoût pour l'acheteur.
                </p>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionNum}>5</span>
                Données personnelles
              </h2>
              <div className={styles.sectionBody}>
                <p>
                  <strong>Responsable du traitement :</strong> [Votre nom]<br />
                  <strong>Contact RGPD :</strong> privacy@pickperfect.com
                </p>
                <p>
                  Pour plus d'informations, consultez notre{' '}
                  <Link href="/legal/privacy">Politique de confidentialité</Link>.
                </p>
              </div>
            </section>

          </div>

          <div className={styles.legalFooter}>
            <p>© 2026 PickPerfect · Tous droits réservés</p>
            <p style={{ marginTop: 4 }}>
              <Link href="/legal/cgu">CGU</Link>
              {' · '}
              <Link href="/legal/privacy">Confidentialité</Link>
            </p>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}