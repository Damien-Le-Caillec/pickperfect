const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Style commun
const styles = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #FAFAF9;
    margin: 0; padding: 0;
`

const cardStyle = `
    background: white;
    border-radius: 16px;
    padding: 40px;
    max-width: 520px;
    margin: 40px auto;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
`

const btnStyle = `
    display: inline-block;
    background: linear-gradient(135deg, #FF9A8B, #E8826F);
    color: white !important;
    padding: 14px 32px;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 700;
    font-size: 16px;
    margin: 24px 0;
`

const footerStyle = `
    color: #A8A29E;
    font-size: 13px;
    text-align: center;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #E7E5E4;
`

// Email de bienvenue
export function welcomeEmail(name: string) {
    const firstName = name?.split(' ')[0] || 'vous'

    return {
        subject: '🎁 Bienvenue sur PickPerfect !',
        html: `
        <div style="${styles}">
            <div style="${cardStyle}">
            <h1 style="font-size: 24px; font-weight: 800; color: #1C1917; margin: 0 0 8px;">
                Bienvenue, ${firstName} ! 🎁
            </h1>
            <p style="color: #57534E; line-height: 1.65; margin: 0 0 24px;">
                Votre compte PickPerfect est prêt. Vous pouvez dès maintenant
                créer vos premières listes de cadeaux et les partager avec vos proches.
            </p>

            <a href="${BASE_URL}/lists/new" style="${btnStyle}">
                Créer ma première liste
            </a>

            <p style="color: #57534E; font-size: 14px; line-height: 1.6;">
                <strong>Ce que vous pouvez faire :</strong><br>
                • Ajouter des cadeaux depuis Amazon, FNAC, Darty en un clic<br>
                • Inviter vos proches à voir et réserver vos cadeaux<br>
                • Gagner des points à chaque action
            </p>

            <div style="${footerStyle}">
                <p>PickPerfect · <a href="${BASE_URL}/legal/cgu" style="color: #A8A29E;">CGU</a> · <a href="${BASE_URL}/legal/privacy" style="color: #A8A29E;">Confidentialité</a></p>
            </div>
            </div>
        </div>
        `,
    }
}

// ---- Email de réservation (pour le propriétaire de la liste) ----
export function reservationEmail(
  ownerName: string,
  reserverName: string,
  itemTitle: string,
  listTitle: string,
  listId: string,
  anonymous: boolean
) {
  const who = anonymous ? 'Quelqu\'un' : reserverName

  return {
    subject: `🎁 ${who} a réservé un cadeau sur votre liste`,
    html: `
      <div style="${styles}">
        <div style="${cardStyle}">
          <h1 style="font-size: 24px; font-weight: 800; color: #1C1917; margin: 0 0 8px;">
            Un cadeau a été réservé ! 🎉
          </h1>
          <p style="color: #57534E; line-height: 1.65; margin: 0 0 24px;">
            <strong>${who}</strong> a réservé <strong>${itemTitle}</strong>
            sur votre liste <strong>${listTitle}</strong>.
          </p>

          <a href="${BASE_URL}/lists/${listId}" style="${btnStyle}">
            Voir ma liste
          </a>

          <div style="${footerStyle}">
            <p>Vous recevez cet email car vous êtes propriétaire d'une liste PickPerfect.</p>
            <p>PickPerfect · <a href="${BASE_URL}/legal/privacy" style="color: #A8A29E;">Confidentialité</a></p>
          </div>
        </div>
      </div>
    `,
  }
}

// ---- Email de reset de mot de passe ----
export function resetPasswordEmail(token: string) {
  const resetUrl = `${BASE_URL}/reset-password/${token}`

  return {
    subject: '🔐 Réinitialisation de votre mot de passe PickPerfect',
    html: `
      <div style="${styles}">
        <div style="${cardStyle}">
          <h1 style="font-size: 24px; font-weight: 800; color: #1C1917; margin: 0 0 8px;">
            Réinitialisation du mot de passe
          </h1>
          <p style="color: #57534E; line-height: 1.65; margin: 0 0 8px;">
            Vous avez demandé à réinitialiser votre mot de passe.
            Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <p style="color: #A8A29E; font-size: 14px; margin: 0 0 24px;">
            Ce lien expire dans <strong>1 heure</strong>.
          </p>

          <a href="${resetUrl}" style="${btnStyle}">
            Réinitialiser mon mot de passe
          </a>

          <p style="color: #A8A29E; font-size: 13px; line-height: 1.6;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            Votre mot de passe reste inchangé.
          </p>

          <div style="background: #F5F4F1; border-radius: 8px; padding: 12px 16px; margin-top: 16px;">
            <p style="color: #78716C; font-size: 12px; margin: 0; word-break: break-all;">
              ${resetUrl}
            </p>
          </div>

          <div style="${footerStyle}">
            <p>PickPerfect · <a href="${BASE_URL}/legal/privacy" style="color: #A8A29E;">Confidentialité</a></p>
          </div>
        </div>
      </div>
    `,
  }
}