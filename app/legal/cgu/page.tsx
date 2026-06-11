import type { Metadata } from 'next'
import Link              from 'next/link'
import PageLayout        from '@/components/layout/PageLayout'
import styles            from '../legal.module.css'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation',
}

const LAST_UPDATED = '1er juin 2026'

const ARTICLES = [
  {
    id:    'objet',
    title: 'Objet',
    body: (
      <>
        <p>
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation
          de la plateforme <strong>PickPerfect</strong>, accessible à l'adresse{' '}
          <strong>pickperfect.com</strong>, qui permet la création, le partage et la gestion
          collaborative de listes de cadeaux.
        </p>
        <p>
          En créant un compte, vous acceptez sans réserve les présentes CGU.
          Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser le service.
        </p>
      </>
    ),
  },
  {
    id:    'inscription',
    title: 'Inscription et compte',
    body: (
      <>
        <p>
          L'inscription est gratuite et ouverte à toute personne physique majeure.
          Vous devez fournir une adresse email valide et choisir un mot de passe sécurisé.
        </p>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants et de toute activité
          effectuée depuis votre compte. En cas de compromission, contactez-nous immédiatement.
        </p>
        <p>
          PickPerfect se réserve le droit de suspendre ou supprimer tout compte ne respectant
          pas les présentes CGU, sans préavis.
        </p>
      </>
    ),
  },
  {
    id:    'fonctionnalites',
    title: 'Fonctionnalités',
    body: (
      <>
        <p>PickPerfect propose les fonctionnalités suivantes :</p>
        <ul>
          <li>Création et gestion de listes de cadeaux</li>
          <li>Partage de listes par lien unique</li>
          <li>Invitation de membres avec rôle Spectateur ou Éditeur</li>
          <li>Réservation d'items pour éviter les doublons</li>
          <li>Ajout automatique de produits depuis une URL</li>
          <li>Système de points et récompenses</li>
        </ul>
        <p>
          PickPerfect se réserve le droit de modifier, suspendre ou supprimer
          toute fonctionnalité à tout moment.
        </p>
      </>
    ),
  },
  {
    id:    'affiliation',
    title: 'Programme d\'affiliation',
    body: (
      <>
        <p>
          PickPerfect participe à des programmes d'affiliation (Amazon Associates,
          FNAC Affiliation, Darty Partenaires, et autres). Certains liens présents
          sur la plateforme sont des <strong>liens affiliés</strong>.
        </p>
        <p>
          Si vous effectuez un achat via ces liens, PickPerfect peut percevoir une
          commission de la part du marchand, <strong>sans surcoût pour vous</strong>.
          Le prix que vous payez est identique à celui affiché sur le site marchand.
        </p>
        <p>
          Cette information est mentionnée conformément aux obligations légales
          de transparence sur les liens affiliés.
        </p>
      </>
    ),
  },
  {
    id:    'points',
    title: 'Système de points',
    body: (
      <>
        <p>
          PickPerfect propose un système de points récompensant les actions des utilisateurs.
          Ces points peuvent être échangés contre des avantages dans le catalogue de récompenses.
        </p>
        <ul>
          <li>Les points n'ont pas de valeur monétaire directe</li>
          <li>Les points expirent après <strong>24 mois d'inactivité</strong></li>
          <li>Le seuil minimum d'échange est de <strong>50 points</strong></li>
          <li>PickPerfect se réserve le droit de modifier le catalogue à tout moment</li>
          <li>Les points ne sont pas remboursables ni transférables</li>
        </ul>
      </>
    ),
  },
  {
    id:    'contenu',
    title: 'Contenu et comportement',
    body: (
      <>
        <p>
          Vous êtes responsable du contenu que vous publiez sur PickPerfect
          (titres de listes, descriptions, images). Il est interdit de publier
          du contenu illégal, offensant, trompeur ou portant atteinte aux droits de tiers.
        </p>
        <p>
          PickPerfect se réserve le droit de supprimer tout contenu ne respectant
          pas ces règles et de suspendre le compte associé.
        </p>
      </>
    ),
  },
  {
    id:    'donnees',
    title: 'Données personnelles',
    body: (
      <>
        <p>
          Le traitement de vos données personnelles est décrit dans notre{' '}
          <Link href="/legal/privacy">Politique de confidentialité</Link>.
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification,
          d'effacement et de portabilité de vos données.
        </p>
        <p>
          Contact RGPD : <strong>privacy@pickperfect.com</strong>
        </p>
      </>
    ),
  },
  {
    id:    'responsabilite',
    title: 'Responsabilité',
    body: (
      <>
        <p>
          PickPerfect est fourni "tel quel", sans garantie de disponibilité continue.
          Nous ne pouvons être tenus responsables des interruptions de service,
          pertes de données ou dommages indirects liés à l'utilisation de la plateforme.
        </p>
        <p>
          PickPerfect n'est pas responsable des transactions effectuées entre utilisateurs
          ou via les liens affiliés vers des sites tiers.
        </p>
      </>
    ),
  },
  {
    id:    'resiliation',
    title: 'Résiliation',
    body: (
      <>
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis votre page profil.
          La suppression entraîne la suppression définitive de toutes vos données
          dans un délai de <strong>30 jours</strong>.
        </p>
        <p>
          Les données de transaction liées aux obligations légales (comptabilité)
          peuvent être conservées jusqu'à 10 ans conformément à la loi.
        </p>
      </>
    ),
  },
  {
    id:    'droit',
    title: 'Droit applicable',
    body: (
      <>
        <p>
          Les présentes CGU sont soumises au <strong>droit français</strong>.
          En cas de litige, et à défaut de résolution amiable, les tribunaux
          français seront compétents.
        </p>
        <p>
          Pour tout litige de consommation, vous pouvez également recourir à la
          plateforme européenne de règlement en ligne des litiges :{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
        </p>
      </>
    ),
  },
]

export default function CGUPage() {
  return (
    <PageLayout>
      <div className={styles.page}>
        <div className={styles.wrapper}>

          {/* En-tête */}
          <div className={styles.header}>
            <Link href="/" className={styles.backLink}>
              <i className="fas fa-arrow-left" /> Retour à l'accueil
            </Link>
            <h1 className={styles.title}>Conditions Générales d'Utilisation</h1>
            <div className={styles.meta}>
              <span><i className="fas fa-calendar-alt" /> Mise à jour : {LAST_UPDATED}</span>
              <span><i className="fas fa-file-alt" /> {ARTICLES.length} articles</span>
            </div>
          </div>

          {/* Sommaire */}
          <nav className={styles.toc} aria-label="Sommaire">
            <p className={styles.tocTitle}>Sommaire</p>
            <ol className={styles.tocList}>
              {ARTICLES.map((a, i) => (
                <li key={a.id}>
                  <a href={`#${a.id}`}>
                    Article {i + 1} — {a.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Articles */}
          <div className={styles.content}>
            {ARTICLES.map((a, i) => (
              <section key={a.id} id={a.id} className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionNum}>{i + 1}</span>
                  {a.title}
                </h2>
                <div className={styles.sectionBody}>{a.body}</div>
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className={styles.legalFooter}>
            <p>© 2026 PickPerfect · Tous droits réservés</p>
            <p style={{ marginTop: 4 }}>
              <Link href="/legal/privacy">Confidentialité</Link>
              {' · '}
              <Link href="/legal/mentions-legales">Mentions légales</Link>
            </p>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}