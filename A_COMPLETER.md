# ✅ À compléter avant la mise en ligne

Tout ce que le code ne peut pas deviner : tes informations personnelles, tes comptes,
tes mots de passe et quelques décisions produit.
Pour chaque point : **quoi**, **où le trouver**, **où le mettre**.

Coche au fur et à mesure.

---

## 1. Tout de suite, sur ton PC (sinon l'app ne démarre plus)

Le projet est passé de SQLite à PostgreSQL.

- [x] `DATABASE_URL` mis à jour dans `.env` et `.env.local`
- [x] `.env` réenregistré en UTF-8. ⚠️ Ne pas le recréer avec PowerShell (`>` ou `Out-File`) : ça le remet en UTF-16 et Docker / Prisma ne savent plus le lire.
- [x] Base Postgres de dev lancée et tables créées
- [ ] **Tes identifiants SMTP de `.env.local` sont refusés** par le serveur mail
      (`535 Authentication failed`, vu pendant les tests) : aucun email ne part en local.
      Vérifie `SMTP_USER` / `SMTP_PASS`. Avec Gmail, il faut un « mot de passe d'application »
      (Compte Google → Sécurité → Validation en 2 étapes → Mots de passe des applications),
      pas ton mot de passe habituel. Pour tester sans SMTP, laisse `SMTP_USER` vide : les emails s'affichent alors dans la console de `npm run dev`.
- [ ] À chaque redémarrage du PC : ouvrir Docker Desktop, puis
      ```
      docker compose -f docker-compose.dev.yml up -d
      npm run dev
      ```
- [ ] **Recréer ton compte**, puis te passer admin :
      `npm run db:studio` → table `users` → colonne `role` = `ADMIN`.
      Les données de l'ancienne base SQLite (`prisma/dev.db`) ne sont pas reprises.
      Le fichier reste sur ton disque si tu en as besoin ; il n'est plus suivi par git.
- [ ] **Commiter** : rien n'a été commité, toutes les modifications sont en attente dans git.

---

## 1 bis. Bêta sur Vercel — https://pickperfect-taupe.vercel.app

- [x] Projet Vercel relié à GitHub : chaque `git push` sur `master` redéploie le site.
- [x] Base Neon et migrations automatiques à chaque déploiement
- [ ] **Te passer admin en ligne** : Vercel → onglet *Storage* → ta base Neon → *Open in Neon* → *SQL Editor* :
      `UPDATE users SET role = 'ADMIN' WHERE email = 'ton@email.fr';`
- [ ] **Emails pour les testeurs** : ajouter `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` et `SMTP_FROM`
      dans *Settings → Environment Variables*, puis *Redeploy* (voir 3.3 pour Brevo).
- [ ] **Ne pas renseigner les variables d'affiliation** tant que le projet est sur l'offre Hobby gratuite :
      Vercel classe un site d'affiliation comme usage commercial, réservé à l'offre Pro.
- Les limites anti-abus sont gardées en mémoire par instance : sur Vercel, elles sont moins strictes qu'en Docker.
  Suffisant pour une bêta.
- Tâches quotidiennes : un seul cron Vercel (`vercel.json`), vers 7h UTC à une heure près.

---

## 2. Mentions légales (obligatoire en France — loi LCEN)

📄 Fichier : `app/legal/mentions-legales/page.tsx` — remplacer chaque `[À compléter]`.

| Champ | Où trouver l'info |
|---|---|
| **SIRET** | Ton avis de situation INSEE, ou [annuaire-entreprises.data.gouv.fr](https://annuaire-entreprises.data.gouv.fr) (recherche par ton nom). Si tu n'as pas encore de micro-entreprise : [autoentrepreneur.urssaf.fr](https://autoentrepreneur.urssaf.fr). |
| **Adresse** | L'adresse du siège de ta micro-entreprise (souvent ton domicile). Si tu ne veux pas l'afficher, il existe des services de domiciliation. |
| **Directeur de la publication** | Ton nom et prénom. |
| **Hébergeur (nom, adresse, téléphone)** | L'entreprise qui loue ton serveur. Les coordonnées sont sur son site, page « Mentions légales ». Exemples : OVH SAS (2 rue Kellermann, 59100 Roubaix, 1007), Hetzner, Scaleway… |
| **Responsable du traitement** (section 5) | Ton nom et prénom. |

Les adresses **`contact@pickperfect.com`** et **`privacy@pickperfect.com`** apparaissent aussi dans :
- `app/legal/mentions-legales/page.tsx`
- `app/legal/privacy/page.tsx`
- `app/legal/cgu/page.tsx`

- [ ] Remplace-les par des adresses qui existent vraiment, sur **ton** nom de domaine.
      Sinon personne ne peut te joindre, alors que le RGPD l'exige.

Relis aussi `app/legal/cgu/page.tsx` et `app/legal/privacy/page.tsx` en entier : ce sont tes engagements légaux.
Par exemple, la politique annonce la suppression des comptes après 3 ans d'inactivité ; voir le point 9.

---

## 3. Serveur de production

### 3.1 Nom de domaine et HTTPS

- [ ] **Acheter un nom de domaine** chez OVH, Gandi, Namecheap… Vérifie d'abord que `pickperfect.fr` ou `.com` est libre.
- [ ] **Faire pointer le domaine vers ton serveur** : chez ton registrar, un enregistrement DNS de type **A** vers l'IP du serveur.
- [ ] **Mettre en place le HTTPS.** L'app écoute sur le port 3000 ; il faut un reverse proxy devant.
      Le plus simple est **Caddy**, qui gère le certificat HTTPS tout seul :
      ```
      sudo apt install caddy
      # /etc/caddy/Caddyfile :
      votre-domaine.fr {
          reverse_proxy localhost:3000
      }
      sudo systemctl reload caddy
      ```
      Ensuite, ferme le port 3000 au public, par exemple avec `ufw` : seuls les ports 80 et 443 doivent être ouverts.

### 3.2 Fichier `.env.production` (sur le serveur, jamais dans git)

```
cp .env.production.example .env.production
nano .env.production
```

| Variable | Quoi mettre / où la trouver |
|---|---|
| `POSTGRES_PASSWORD` | Un mot de passe long et aléatoire : `openssl rand -hex 24` |
| `SESSION_SECRET` | `openssl rand -hex 32`. Sert à signer les liens de confirmation d'email. |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `https://votre-domaine.fr` (sans `/` final). ⚠️ Il est intégré au build : si tu le changes, relance `./deploy.sh`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Chez ton fournisseur d'emails (voir 3.3). |
| `SMTP_FROM` | Ex. `"PickPerfect <contact@votre-domaine.fr>"`. L'adresse doit appartenir au domaine vérifié chez le fournisseur SMTP. |

Si tu changes `POSTGRES_USER` ou `POSTGRES_DB`, adapte aussi la ligne `pg_dump -U pickperfect pickperfect` dans `backup.sh`.

### 3.3 Envoi d'emails (SMTP)

Sans SMTP, aucun email n'est envoyé en production : bienvenue, confirmation d'adresse,
mot de passe oublié, rappels d'anniversaire, Secret Santa.

- [ ] **Créer un compte** chez un fournisseur. Options gratuites pour démarrer :
      **Brevo** (ex-Sendinblue, 300 emails/jour), **Mailjet**, **Resend**.
- [ ] **Vérifier ton domaine chez lui** : il te donnera des enregistrements DNS SPF/DKIM à ajouter chez ton registrar. Sans ça, tes emails arrivent en spam.
- [ ] **Récupérer les identifiants SMTP**. Chez Brevo : *SMTP & API* → *SMTP*.
      Le port est en général `587` ; le code gère aussi `465`.

### 3.4 Sauvegardes

- [ ] Sur le serveur, `crontab -e` puis ajouter :
      ```
      0 3 * * * /home/TON_USER/pickperfect/backup.sh >> /home/TON_USER/backups/backup.log 2>&1
      ```
- [ ] **Copier régulièrement `~/backups` ailleurs** que sur le serveur (autre machine, stockage S3…).
      Une sauvegarde sur le même disque ne protège pas d'une panne du serveur.
- [ ] La politique de confidentialité parle de sauvegardes sur 30 jours. `backup.sh` a été aligné (30 jours).

### 3.5 Premier déploiement

```
git clone https://github.com/Damien-Le-Caillec/pickperfect.git ~/pickperfect
cd ~/pickperfect && chmod +x deploy.sh backup.sh
./deploy.sh
docker compose --env-file .env.production logs -f app     # vérifier que tout démarre
```

- [ ] Créer ton compte sur le site, puis te passer admin :
      ```
      docker compose --env-file .env.production exec postgres psql -U pickperfect pickperfect \
        -c "UPDATE users SET role='ADMIN' WHERE email='ton@email.fr';"
      ```

---

## 4. Affiliation (ta source de revenus)

Tant que rien n'est configuré, les liens produits restent des liens normaux, sans commission.
⚠️ Les liens affiliés sont calculés **quand un article est ajouté** : les articles ajoutés avant la configuration ne seront pas affiliés.

| Marchand | Où s'inscrire | Variable dans `.env.production` |
|---|---|---|
| **Amazon** | [partenaires.amazon.fr](https://partenaires.amazon.fr). Ton identifiant ressemble à `pickperfect-21`. | `AMAZON_AFFILIATE_TAG=pickperfect-21` |
| **Fnac, Darty, Cdiscount, Etsy, ManoMano** | Ces marchands passent par des plateformes d'affiliation : **Awin** ([awin.com/fr](https://www.awin.com/fr)), **Effiliation**, **Kwanko**. Inscris-toi, postule au programme du marchand, puis récupère le lien « deeplink ». | `XXX_AFFILIATE_TEMPLATE=` (voir ci-dessous) |

Format des variables `*_AFFILIATE_TEMPLATE` : le lien de tracking fourni par la plateforme, avec `{url}`
à la place de l'adresse du produit. Exemple Awin :
```
CDISCOUNT_AFFILIATE_TEMPLATE="https://www.awin1.com/cread.php?awinmid=6948&awinaffid=TON_ID&ued={url}"
```
Les variables disponibles sont `AMAZON_`, `FNAC_`, `DARTY_`, `CDISCOUNT_`, `ETSY_` et `MANOMANO_AFFILIATE_TEMPLATE`.
Un template est prioritaire sur les anciennes variables `FNAC_AFFILIATE_ID` et `DARTY_PARTNER_ID` :
je n'ai pas pu vérifier le format exact attendu par ces deux programmes, donc le template est plus sûr.

- [ ] **Programme Amazon** : il exige d'afficher la mention « En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises ».
      C'est à ajouter dans la section 4 de `app/legal/mentions-legales/page.tsx` ; le texte actuel est proche mais pas identique.
- [ ] **Taux de commission** : ceux affichés dans les statistiques sont indicatifs.
      Mets les vrais taux de tes contrats dans `lib/affiliate/index.ts` → `COMMISSION_RATES`.

---

## 5. Récompenses (page Points) — décisions produit

📄 `lib/points/catalog.ts` : chaque récompense a un `status`.

| Récompense | État actuel | Ce qui se passe |
|---|---|---|
| Thème coloré, Badge exclusif, Étoile premium, Listes illimitées, QR code personnalisé, Profil premium | `auto` ✅ | Débloquée immédiatement, une seule fois par compte. |
| Cadeau physique | `manual` | L'échange crée un ticket « Récompense » dans **Admin → Feedbacks**. C'est **à toi** d'envoyer le cadeau (l'email de l'utilisateur est dans le ticket). |
| Analytics avancées, Accès bêta, 5 % cashback, Abonnement 1 an | `soon` | Affichées « Bientôt disponible », non échangeables : ces fonctionnalités n'existent pas encore. Il n'y a ni abonnement premium, ni paiement, ni cashback. |

- [ ] **Limite gratuite de listes privées** : 5 par défaut.
      À changer dans `lib/points/rewards.ts` → `FREE_PRIVATE_LIST_LIMIT`.
- [ ] **Décider pour le « Cadeau physique »** (10 000 pts) : garder cette récompense (donc prévoir un stock et des frais d'envoi), ou passer son `status` à `'soon'`.
- [ ] **Récompenses `soon`** : quand une fonctionnalité existe, passer son `status` à `'auto'` et brancher l'effet
      dans `app/api/points/redeem/route.ts`, sur le modèle des autres.

---

## 6. Récupération automatique des produits par lien

L'ajout d'un produit par URL passe d'abord par le service gratuit **allorigins.win**, qui contourne une partie
des protections anti-robots des sites marchands, puis tente un accès direct si ce service échoue.

- [ ] C'est un service tiers gratuit, sans garantie de disponibilité. S'il ferme, l'accès direct prend le relais,
      mais certains sites (Amazon notamment) bloquent les robots.
      Solution pérenne si besoin : une API payante (ScrapingBee, ScraperAPI…) ou les API officielles des programmes d'affiliation.
- [ ] Ce service est mentionné dans la politique de confidentialité (section « Partage avec des tiers »). Garde-le à jour si tu le changes.

---

## 7. Réglages optionnels

| Quoi | Où |
|---|---|
| Horaires des rappels (7h UTC par défaut) | `cron/entrypoint.sh` |
| Nombre de défis par semaine (3) | `lib/gamification/challenges.ts` → `WEEKLY_COUNT` |
| Points gagnés par action | `lib/gamification/pointsService.ts` → `POINTS_TABLE` |
| Couleurs de profil (gratuites / premium) | `lib/profile/theme.ts` |
| Limites anti-abus (connexions, commentaires…) | Les appels à `rateLimitResponse` / `checkRateLimit` dans `app/api/**`. Elles sont gardées en mémoire, donc remises à zéro à chaque redémarrage. |
| Pages protégées par connexion | `proxy.ts` → `PROTECTED` |

---

## 8. Ce qui n'existe pas encore (à faire plus tard si besoin)

- **Tests automatiques** : aucun test dans le projet. Avant d'ajouter de grosses fonctionnalités, envisager Vitest pour `lib/` et Playwright pour les parcours (inscription → liste → réservation).
- **Blocage des comptes non confirmés** : la confirmation d'email est incitative (bandeau + lien), pas obligatoire. Pour l'imposer, bloquer certaines actions quand `emailVerified` est `false`.
- **Emails de notification** : les rappels (anniversaires, Secret Santa) et l'alerte de réservation respectent la préférence « emails de notification » du profil et contiennent un lien de désinscription. L'email du tirage Secret Santa, la confirmation d'adresse et le mot de passe oublié sont toujours envoyés.

---

## 9. RGPD — engagements de la politique de confidentialité

La politique (`app/legal/privacy/page.tsx`) annonce des durées de conservation. Voici ce qui est automatisé
par le conteneur `cron` (route `/api/cron/cleanup`, tous les jours à 3h30 UTC) :

| Engagement | Automatisé ? |
|---|---|
| Sessions expirées et jetons de mot de passe supprimés | ✅ |
| Logs d'activité supprimés après 1 an | ✅ |
| IP des vues de listes anonymisées après 1 an | ✅ |
| Sauvegardes gardées 30 jours | ✅ (`backup.sh`) |
| **Comptes supprimés après 3 ans d'inactivité** | ❌ **À faire.** Soit tu le fais à la main une fois par an (Admin → Utilisateurs, colonne « dernière connexion »), soit tu modifies le texte de la politique. Supprimer automatiquement sans prévenir l'utilisateur par email avant est déconseillé. |
| « Données de transaction : 10 ans » | Rien n'est supprimé, donc c'est respecté. |
| « Connexion chiffrée HTTPS / TLS 1.3 » | Dépend de ton reverse proxy (point 3.1). Caddy le fait par défaut. |

- [ ] **Déclarer tes sous-traitants** si tu veux être complet : hébergeur et fournisseur SMTP, dans la section « Partage avec des tiers ».
