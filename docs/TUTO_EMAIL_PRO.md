# 📧 Tuto — Email PickPerfect 100 % gratuit

**Objectif** : une adresse dédiée à PickPerfect (ex. `pickperfect.app@gmail.com`) qui sert à la fois :
- d'adresse de contact (pages légales, réponses aux testeurs) ;
- d'expéditeur des emails du site (confirmation d'inscription, mot de passe oublié, rappels).

Coût : **0 €**. Durée : environ 20 minutes.

> Pourquoi pas `contact@pickperfect.fr` ? Il faut acheter un nom de domaine (≈ 10 €/an),
> aucune solution sérieuse ne l'offre. Voir « Plus tard » en bas de page.

---

## Étape 1 — Créer l'adresse Gmail PickPerfect

1. Déconnecte-toi de ton Gmail perso, ou ouvre une fenêtre de navigation privée.
2. Va sur [accounts.google.com/signup](https://accounts.google.com/signup).
3. Prénom : `PickPerfect`, nom : laisse vide ou mets `App`.
   → C'est ce nom qui s'affichera comme expéditeur.
4. Choisis une adresse, par exemple : `pickperfect.app`, `contact.pickperfect`, `pickperfect.cadeaux`
   (Google te dit si elle est prise).
5. Termine l'inscription (Google peut demander un numéro de téléphone : le tien convient).
6. Optionnel : mets le logo 🎁 en photo de profil (en haut à droite → ton avatar → appareil photo).
   Il apparaîtra à côté des emails dans Gmail.

---

## Étape 2 — Activer la validation en 2 étapes (obligatoire pour l'étape 3)

1. Connecté avec le **nouveau** compte : [myaccount.google.com/security](https://myaccount.google.com/security).
2. **Validation en deux étapes** → **Activer** → suis les instructions (SMS ou application).

---

## Étape 3 — Créer un « mot de passe d'application » pour le site

C'est un mot de passe spécial, réservé au site, qui n'est **pas** le mot de passe du compte.

1. Va sur [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   (si la page dit « non disponible » : l'étape 2 n'est pas terminée).
2. Nom de l'application : `PickPerfect Vercel` → **Créer**.
3. Google affiche un code de 16 lettres (ex. `abcd efgh ijkl mnop`).
   ⚠️ Il ne s'affiche **qu'une fois** : garde l'onglet ouvert et fais l'étape 4 tout de suite.

---

## Étape 4 — Brancher le site (Vercel)

Vercel → ton projet → **Settings → Environment Variables**.
Pour chaque ligne : *Add*, en cochant **Production, Preview, Development**.

| Nom | Valeur |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | ta nouvelle adresse, ex. `pickperfect.app@gmail.com` |
| `SMTP_PASS` | le code de 16 lettres, **sans les espaces** |
| `SMTP_FROM` | `PickPerfect <pickperfect.app@gmail.com>` |

Puis **Deployments → ⋯ sur le dernier déploiement → Redeploy**.

✅ **Test** : sur le site, « Mot de passe oublié ? » avec ton adresse **perso** → tu dois recevoir
l'email de *PickPerfect*. S'il est dans les spams, clique sur « Non spam » : Gmail apprend vite.

> Limite : environ 500 emails par jour avec un compte Gmail gratuit. Largement assez pour une bêta.

---

## Étape 5 — Pour ne rien rater

- Sur ton téléphone, ajoute le nouveau compte dans l'appli Gmail (avatar en haut à droite → « Ajouter un compte »).
  Tu verras les messages des testeurs.
- Ou transfère tout vers ta boîte perso : dans le nouveau Gmail, ⚙️ **Voir tous les paramètres →
  Transfert et POP/IMAP → Ajouter une adresse de transfert**.

---

## Et Brevo alors ?

Pas nécessaire avec cette méthode. Si tu as déjà créé ton compte Brevo, tu peux le garder pour plus tard.
Avec une adresse Gmail, Brevo remplace l'adresse d'expéditeur par une adresse technique
(`…@brevosend.com`) : c'est moins joli que l'envoi direct par Gmail.

Si tu préfères quand même Brevo (300 emails/jour gratuits) :
1. Brevo → ton nom → **Senders, Domains & Dedicated IPs → Senders → Add a sender** : ta nouvelle adresse Gmail.
2. Ton nom → **SMTP & API → SMTP** → **Generate a new SMTP key**.
3. Dans Vercel : `SMTP_HOST` = `smtp-relay.brevo.com`, `SMTP_PORT` = `587`,
   `SMTP_USER` = l'identifiant affiché par Brevo (`xxxx@smtp-brevo.com`), `SMTP_PASS` = la clé,
   `SMTP_FROM` = `PickPerfect <ta-nouvelle-adresse@gmail.com>` → **Redeploy**.

Les réponses des utilisateurs reviennent quand même sur ton adresse Gmail : le site l'indique en « répondre à ».

---

## Plus tard (payant) : contact@pickperfect.xxx

Quand tu lanceras officiellement (≈ 10–15 €/an) :
- `pickperfect.fr` et `pickperfect.com` sont pris ; `pickperfect.app` et `pick-perfect.fr` étaient libres au 29/09/2026.
- Achat du domaine chez Cloudflare (ou OVH pour un `.fr`), redirection gratuite de `contact@` vers ton Gmail
  avec Cloudflare Email Routing, authentification du domaine dans Brevo, et site branché sur le domaine dans Vercel.
- Demande-moi le tuto détaillé à ce moment-là.

## En cas de problème

| Symptôme | Cause probable |
|---|---|
| Page « mots de passe des applications » introuvable | Validation en 2 étapes pas activée sur le **nouveau** compte |
| Email jamais reçu | Pas de *Redeploy* après l'ajout des variables, ou code de 16 lettres mal copié (avec espaces). Regarde Vercel → **Logs** : cherche `email error`. |
| Vercel Logs affiche `535 Authentication failed` | `SMTP_USER` / `SMTP_PASS` incorrects. Utilise le mot de passe d'application, pas celui du compte. |
| Email reçu dans les spams | Normal au début : marque-le « Non spam » |
