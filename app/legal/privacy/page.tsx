import type { Metadata } from 'next'
import Link              from 'next/link'
import PageLayout        from '@/components/layout/PageLayout'
import styles            from '../legal.module.css'

export const metadata: Metadata = { title: 'Politique de confidentialité' }

const SECTIONS = [
  {
    id: 'responsable',
    title: 'Responsable du traitement',
    body: `PickPerfect, micro-entreprise — contact : privacy@pickperfect.com`,
  },
  {
    id: 'collecte',
    title: 'Données collectées',
    items: [
      'Adresse email et nom (à l\'inscription)',
      'Mot de passe hashé avec bcrypt (jamais stocké en clair)',
      'Contenu créé : listes, items, réservations',
      'Données de navigation : adresse IP, date de connexion',
      'Historique des points et transactions',
    ],
  },
  {
    id: 'finalites',
    title: 'Finalités du traitement',
    items: [
      'Fourniture et amélioration du service',
      'Gestion du compte utilisateur',
      'Programme de gamification (points, badges)',
      'Affiliation et suivi des commissions',
      'Conformité légale et sécurité',
    ],
  },
  {
    id: 'conservation',
    title: 'Durée de conservation',
    rows: [
      ['Données de compte', '3 ans après la dernière activité'],
      ['Données de transaction', '10 ans (obligation légale)'],
      ['Logs d\'accès', '1 an'],
      ['Sauvegardes', '30 jours en rotation'],
    ],
  },
  {
    id: 'droits',
    title: 'Vos droits',
    body: `Conformément au RGPD, vous disposez des droits suivants : accès, rectification, effacement (droit à l\'oubli), portabilité, opposition et limitation du traitement. Pour les exercer, contactez-nous à privacy@pickperfect.com. Délai de réponse : 1 mois maximum. Vous pouvez également supprimer votre compte directement depuis votre page profil.`,
  },
  {
    id: 'securite',
    title: 'Sécurité',
    items: [
      'Connexion chiffrée HTTPS / TLS 1.3',
      'Mots de passe hashés avec bcrypt (12 rounds)',
      'Sessions stockées en base avec expiration automatique',
      'Accès à la base de données restreint',
      'Sauvegardes quotidiennes',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: `Nous utilisons uniquement un cookie technique de session (auth_session), nécessaire au fonctionnement du service. Ce cookie est httpOnly, sécurisé et expire après 30 jours d\'inactivité. Aucun cookie publicitaire ou de tracking tiers n\'est utilisé.`,
  },
  {
    id: 'tiers',
    title: 'Partage avec des tiers',
    body: `Nous ne vendons jamais vos données personnelles. Vos données peuvent être transmises aux marchands affiliés (Amazon, FNAC, Darty) uniquement dans le cadre du suivi des commissions, conformément à leurs propres politiques de confidentialité. Les emails sont envoyés via notre prestataire d'envoi d'emails (SMTP). Lorsque vous ajoutez un produit par son lien, l'adresse de la page produit (et elle seule) peut être transmise au service allorigins.win pour en récupérer le titre, le prix et l'image.`,
  },
]

export default function PrivacyPage() {
  return (
    <PageLayout>
      <div className={styles.page}>
        <div className={styles.wrapper}>

          <div className={styles.header}>
            <Link href="/" className={styles.backLink}>
              <i className="fas fa-arrow-left" /> Retour à l'accueil
            </Link>
            <h1 className={styles.title}>Politique de confidentialité</h1>
            <div className={styles.meta}>
              <span><i className="fas fa-calendar-alt" /> Mise à jour : 1er juin 2026</span>
              <span><i className="fas fa-shield-alt" /> Conforme RGPD</span>
            </div>
          </div>

          <div className={styles.content}>
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionNum}>{i + 1}</span>
                  {s.title}
                </h2>
                <div className={styles.sectionBody}>
                  {s.body && <p>{s.body}</p>}
                  {s.items && (
                    <ul>
                      {s.items.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                  {s.rows && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--text-1)', fontWeight: 600 }}>Type de données</th>
                          <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--text-1)', fontWeight: 600 }}>Durée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.rows.map(([type, duree]) => (
                          <tr key={type} style={{ borderBottom: '1px solid var(--border-1)' }}>
                            <td style={{ padding: '8px 0', color: 'var(--text-2)' }}>{type}</td>
                            <td style={{ padding: '8px 0', color: 'var(--text-2)' }}>{duree}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className={styles.legalFooter}>
            <p>© 2026 PickPerfect · Tous droits réservés</p>
            <p style={{ marginTop: 4 }}>
              <Link href="/legal/cgu">CGU</Link>
              {' · '}
              <Link href="/legal/mentions-legales">Mentions légales</Link>
            </p>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}