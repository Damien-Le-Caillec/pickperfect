# 🎁 PICKPERFECT — PARTIE 10
## Déploiement complet — Du mini PC vide aux betatesteurs

---

## 🧠 RÉFLEXION

> Déployer un self-hosted à la maison a un piège classique : ouvrir des ports
> sur sa box internet. C'est risqué (exposition directe de ton réseau) et
> pénible (IP qui change, configuration routeur différente selon le FAI).
>
> On évite tout ça avec un **tunnel Cloudflare** : le mini PC se connecte
> *vers* Cloudflare au lieu d'attendre des connexions entrantes. Zéro port
> ouvert sur ta box, HTTPS automatique et gratuit, et ton IP perso reste invisible.
>
> Pour la base de données, on passe de SQLite à **PostgreSQL** — SQLite
> verrouille tout le fichier à chaque écriture, ce qui devient un problème
> dès que plusieurs betatesteurs réservent des cadeaux en même temps.
>
> Tout tourne dans **Docker** — ça isole l'app, la base de données reste
> propre, et mettre à jour l'app plus tard se résume à 3 commandes.

---

## 📋 CE QU'ON FAIT

1. Choisir et installer l'OS sur le mini PC
2. Sécuriser le serveur de base
3. Installer Docker
4. Adapter le projet pour la production (PostgreSQL + Docker)
5. Transférer le code sur le mini PC
6. Premier lancement
7. Nom de domaine + Cloudflare Tunnel (HTTPS sans ouvrir de port)
8. Sauvegardes automatiques
9. Workflow de mise à jour
10. Checklist finale avant betatesteurs

---

## ÉTAPE 1 — CHOISIR L'OS

**Réponse : Ubuntu Server 24.04 LTS**

Pourquoi celui-là et pas un autre :

| Option | Verdict |
|--------|---------|
| **Ubuntu Server 24.04 LTS** | ✅ Le bon choix — léger, stable 5 ans de support, documentation immense, Docker tourne nativement |
| Windows | ❌ Trop lourd pour un mini PC, licence inutile, pas fait pour du serveur |
| Debian | ⚠️ Très bien aussi, mais Ubuntu a une communauté plus large pour débuter |
| Raspberry Pi OS | ⚠️ Seulement si ton mini PC est un Raspberry Pi |

**LTS** = Long Term Support, mises à jour de sécurité garanties pendant 5 ans. Toujours prendre la version LTS pour un serveur.

---

## ÉTAPE 2 — INSTALLER L'OS

### 2.1 Télécharger l'image

Sur ton PC Windows, va sur :
**https://ubuntu.com/download/server**

Télécharge **Ubuntu Server 24.04 LTS** (fichier `.iso`).

### 2.2 Créer une clé USB bootable

Télécharge **Rufus** : https://rufus.ie

1. Branche une clé USB (8 Go minimum, elle sera effacée)
2. Ouvre Rufus
3. Sélectionne ta clé USB
4. Clique sur "SELECTION" → choisis le fichier `.iso` téléchargé
5. Laisse les autres options par défaut
6. Clique sur "DÉMARRER"

### 2.3 Installer sur le mini PC

1. Branche la clé USB sur le mini PC
2. Allume-le et entre dans le BIOS (en général `F2`, `F12`, `Suppr` ou `Echap` au démarrage — ça dépend de la marque)
3. Change l'ordre de boot pour démarrer sur la clé USB
4. Suis l'installateur Ubuntu Server :
   - Langue : Français ou English (peu importe)
   - Clavier : French
   - **Network** : laisse en DHCP, note l'adresse IP affichée (ex: `192.168.1.42`)
   - **Storage** : "Use entire disk" (utiliser tout le disque)
   - **Profile setup** : crée ton utilisateur (note bien le nom et le mot de passe)
   - **SSH Setup** : coche **"Install OpenSSH server"** — important, c'est comme ça que tu vas administrer le mini PC depuis ton PC Windows
   - Laisse l'installation se terminer, retire la clé USB, redémarre

### 2.4 Donner une IP fixe au mini PC

Sur ton routeur (box internet), réserve une IP fixe pour le mini PC à partir de son adresse MAC — sinon son IP locale peut changer et tu perds la connexion SSH. La procédure dépend de ton routeur (cherche "DHCP reservation" ou "bail statique" dans l'admin de ta box).

---

## ÉTAPE 3 — PREMIÈRE CONNEXION ET SÉCURISATION

Depuis ton PC Windows :

```powershell
ssh ton-nom-utilisateur@192.168.1.42
```

(Remplace par ton IP réelle, entre ton mot de passe quand demandé)

### 3.1 Mettre à jour le système

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Créer une clé SSH (plus sécurisé qu'un mot de passe)

**Sur ton PC Windows**, dans un nouveau terminal PowerShell :

```powershell
ssh-keygen -t ed25519 -C "pickperfect-deploy"
```

Appuie sur Entrée pour tout par défaut. Ça crée `C:\Users\damie\.ssh\id_ed25519` et `.pub`.

Copie la clé publique vers le mini PC :

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh ton-nom-utilisateur@192.168.1.42 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3.3 Désactiver la connexion par mot de passe

**Sur le mini PC** (toujours connecté en SSH) :

```bash
sudo nano /etc/ssh/sshd_config
```

Trouve et modifie ces lignes (`Ctrl+W` pour chercher dans nano) :

```
PasswordAuthentication no
PermitRootLogin no
```

Sauvegarde (`Ctrl+O`, Entrée) puis quitte (`Ctrl+X`).

```bash
sudo systemctl restart ssh
```

**Teste depuis un nouveau terminal Windows AVANT de fermer celui-ci** :

```powershell
ssh ton-nom-utilisateur@192.168.1.42
```

Si ça se connecte sans mot de passe → ✅ tu peux fermer l'ancien terminal.

### 3.4 Firewall

```bash
sudo apt install ufw -y
sudo ufw allow OpenSSH
sudo ufw enable
```

Tape `y` pour confirmer. Tu n'as **rien d'autre à ouvrir** — le tunnel Cloudflare (Étape 7) ne nécessite aucun port entrant supplémentaire.

---

## ÉTAPE 4 — INSTALLER DOCKER

```bash
# Installer Docker via le script officiel
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Autoriser ton utilisateur à utiliser Docker sans sudo
sudo usermod -aG docker $USER

# Recharger les groupes (ou déconnecte-toi et reconnecte-toi en SSH)
newgrp docker
```

Vérifie :

```bash
docker --version
docker compose version
```

✅ Les deux commandes doivent afficher un numéro de version.

---

## ÉTAPE 5 — ADAPTER LE PROJET POUR LA PRODUCTION

Ces modifications se font **sur ton PC Windows**, dans le projet.

### 5.1 Passer le schéma Prisma en PostgreSQL

```bash
code prisma/schema.prisma
```

Change le `datasource` :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

(Avant c'était `provider = "sqlite"`.)

### 5.2 Dockerfile

```bash
code Dockerfile
```

**`pickperfect/Dockerfile`**
```dockerfile
FROM node:20-alpine AS base

# ---- Dépendances ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 5.3 .dockerignore

```bash
code .dockerignore
```

**`pickperfect/.dockerignore`**
```
node_modules
.next
.git
.env.local
public/uploads
*.md
.vscode
```

### 5.4 docker-compose.yml

```bash
code docker-compose.yml
```

**`pickperfect/docker-compose.yml`**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER:     ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB:       ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL:         postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      SESSION_SECRET:       ${SESSION_SECRET}
      NEXT_PUBLIC_APP_URL:  ${NEXT_PUBLIC_APP_URL}
      SMTP_HOST:            ${SMTP_HOST}
      SMTP_PORT:            ${SMTP_PORT}
      SMTP_USER:            ${SMTP_USER}
      SMTP_PASS:            ${SMTP_PASS}
      SMTP_FROM:            ${SMTP_FROM}
      AMAZON_AFFILIATE_TAG: ${AMAZON_AFFILIATE_TAG}
      FNAC_AFFILIATE_ID:    ${FNAC_AFFILIATE_ID}
      DARTY_PARTNER_ID:     ${DARTY_PARTNER_ID}
    volumes:
      - uploads:/app/public/uploads
    ports:
      - "3000:3000"

volumes:
  pgdata:
  uploads:
```

### 5.5 Fichier .env pour la production

```bash
code .env.production
```

**`pickperfect/.env.production`**
```bash
POSTGRES_USER=pickperfect
POSTGRES_PASSWORD=remplace-par-un-mot-de-passe-tres-long-et-aleatoire
POSTGRES_DB=pickperfect

SESSION_SECRET=remplace-par-une-autre-chaine-aleatoire-longue
NEXT_PUBLIC_APP_URL=https://pickperfect.ton-domaine.com

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=ton-email-brevo
SMTP_PASS=ta-cle-smtp-brevo
SMTP_FROM=PickPerfect <noreply@ton-domaine.com>

AMAZON_AFFILIATE_TAG=
FNAC_AFFILIATE_ID=
DARTY_PARTNER_ID=
```

Génère des valeurs aléatoires solides avec PowerShell :

```powershell
$bytes = New-Object Byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[System.Convert]::ToBase64String($bytes)
```

Lance-la deux fois — une valeur pour `POSTGRES_PASSWORD`, une pour `SESSION_SECRET`.

### 5.6 Ajouter au .gitignore

```bash
code .gitignore
```

Ajoute :
```
.env.production
```

---

## ÉTAPE 6 — TRANSFÉRER LE CODE SUR LE MINI PC

### Option A — Avec Git (recommandé)

Si ton code est sur GitHub :

```bash
# Sur le mini PC, en SSH
git clone https://github.com/Damien-Le-Caillec/pickperfect.git
cd pickperfect
```

Puis transfère le `.env.production` séparément (il n'est pas sur Git) :

```powershell
# Depuis ton PC Windows
scp .env.production ton-nom-utilisateur@192.168.1.42:~/pickperfect/.env.production
```

### Option B — Sans Git, copie directe

```powershell
# Depuis ton PC Windows, à la racine du projet
scp -r . ton-nom-utilisateur@192.168.1.42:~/pickperfect
```

(Ça copiera aussi `node_modules` — plus lent mais ça marche. Avec Git c'est plus propre.)

---

## ÉTAPE 7 — PREMIER LANCEMENT

**Sur le mini PC** :

```bash
cd ~/pickperfect

# Build et démarrage
docker compose --env-file .env.production up -d --build
```

Ça prend quelques minutes la première fois (build de l'image Docker).

Vérifie que tout tourne :

```bash
docker compose ps
```

✅ Tu dois voir `postgres` et `app` en état `running` / `healthy`.

### 7.1 Lancer la migration de la base

```bash
docker compose --env-file .env.production exec app npx prisma migrate deploy
```

✅ Toutes les tables sont créées dans PostgreSQL.

### 7.2 Test local

```bash
curl http://localhost:3000
```

✅ Tu dois voir du HTML retourné (la page d'accueil).

Depuis ton PC Windows, ouvre `http://192.168.1.42:3000` dans le navigateur → ✅ l'app s'affiche.

---

## ÉTAPE 8 — NOM DE DOMAINE + CLOUDFLARE TUNNEL

### 8.1 Acheter un nom de domaine

Sites pas chers pour acheter un domaine (~10€/an) :
- **Cloudflare Registrar** — https://www.cloudflare.com/products/registrar (le moins cher, prix coûtant)
- **Porkbun** — https://porkbun.com
- **OVH** — https://www.ovh.com

Achète par exemple `pickperfect.fr` ou similaire.

### 8.2 Créer un compte Cloudflare et ajouter le domaine

1. Va sur https://dash.cloudflare.com → crée un compte gratuit
2. "Add a site" → entre ton domaine
3. Choisis le plan **Free**
4. Cloudflare te donne 2 nameservers (ex: `aria.ns.cloudflare.com`) — va chez ton registrar (OVH, Porkbun...) et remplace les nameservers par ceux de Cloudflare
5. Attends la propagation (quelques minutes à quelques heures)

### 8.3 Installer cloudflared sur le mini PC

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 8.4 Se connecter à Cloudflare

```bash
cloudflared tunnel login
```

Ça affiche un lien — ouvre-le dans **ton navigateur Windows**, connecte-toi à Cloudflare, autorise ton domaine.

### 8.5 Créer le tunnel

```bash
cloudflared tunnel create pickperfect
```

Note l'**ID du tunnel** affiché (un UUID).

### 8.6 Configurer le tunnel

```bash
nano ~/.cloudflared/config.yml
```

Colle (remplace `TON-TUNNEL-ID` par l'ID noté juste avant) :

```yaml
tunnel: TON-TUNNEL-ID
credentials-file: /home/ton-nom-utilisateur/.cloudflared/TON-TUNNEL-ID.json

ingress:
  - hostname: pickperfect.ton-domaine.com
    service: http://localhost:3000
  - service: http_status:404
```

### 8.7 Router le DNS vers le tunnel

```bash
cloudflared tunnel route dns pickperfect pickperfect.ton-domaine.com
```

### 8.8 Lancer le tunnel en service permanent

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Vérifie :

```bash
sudo systemctl status cloudflared
```

✅ "active (running)"

### 8.9 Test final

Depuis n'importe quel appareil (même en 4G, pas besoin d'être sur le même réseau) :

```
https://pickperfect.ton-domaine.com
```

✅ L'app s'affiche, avec un cadenas HTTPS valide — automatique, sans configuration SSL manuelle.

### 8.10 Mettre à jour les variables d'environnement

Maintenant que tu as le vrai domaine, mets à jour `.env.production` sur le mini PC :

```bash
nano ~/pickperfect/.env.production
```

```
NEXT_PUBLIC_APP_URL=https://pickperfect.ton-domaine.com
```

Redémarre l'app :

```bash
cd ~/pickperfect
docker compose --env-file .env.production up -d --build
```

---

## ÉTAPE 9 — SAUVEGARDES AUTOMATIQUES

### 9.1 Script de sauvegarde

```bash
mkdir -p ~/backups
nano ~/backup-pickperfect.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR=~/backups

# Sauvegarde de la base PostgreSQL
docker compose -f ~/pickperfect/docker-compose.yml --env-file ~/pickperfect/.env.production exec -T postgres \
  pg_dump -U pickperfect pickperfect > $BACKUP_DIR/db_$DATE.sql

# Sauvegarde des images uploadées
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C ~/pickperfect/public uploads 2>/dev/null

# Garder seulement les 14 derniers jours
find $BACKUP_DIR -type f -mtime +14 -delete
```

```bash
chmod +x ~/backup-pickperfect.sh
```

### 9.2 Automatiser avec cron

```bash
crontab -e
```

Ajoute cette ligne à la fin (sauvegarde tous les jours à 3h du matin) :

```
0 3 * * * /home/ton-nom-utilisateur/backup-pickperfect.sh
```

Sauvegarde et quitte.

### 9.3 Test manuel

```bash
~/backup-pickperfect.sh
ls -la ~/backups
```

✅ Tu dois voir un fichier `.sql` et un `.tar.gz`.

---

## ÉTAPE 10 — WORKFLOW DE MISE À JOUR

Quand tu modifies le code sur ton PC Windows et veux déployer la nouvelle version :

```powershell
# Sur ton PC Windows — pousse le code
git add .
git commit -m "Nouvelle fonctionnalité"
git push
```

```bash
# Sur le mini PC, en SSH
cd ~/pickperfect
git pull
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec app npx prisma migrate deploy
```

Trois commandes, à chaque mise à jour.

---

## ✅ CHECKLIST FINALE AVANT BETATESTEURS

```
□ L'app est accessible sur https://pickperfect.ton-domaine.com
□ Le cadenas HTTPS est valide
□ Tu as créé un compte et testé : inscription, connexion, création de liste
□ Tu as testé une réservation de bout en bout
□ Les emails partent réellement (vérifie ta boîte mail)
□ La sauvegarde automatique fonctionne (vérifie ~/backups après 24h)
□ Les Mentions légales sont remplies (SIRET, adresse, nom)
□ Ton compte a le rôle ADMIN (vérifié dans Prisma Studio sur le serveur)
□ Tu as testé le panel admin (/admin)
□ Le mini PC redémarre automatiquement Docker après une coupure de courant :
```

Pour ce dernier point :

```bash
sudo systemctl enable docker
```

Docker (et donc tes containers grâce à `restart: unless-stopped`) redémarrera automatiquement si le mini PC reboot après une coupure.

---

## 🎉 TU PEUX MAINTENANT ENVOYER LE LIEN À TES BETATESTEURS

```
https://pickperfect.ton-domaine.com/register
```

---

## 📁 FICHIERS CRÉÉS

```
pickperfect/
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
├── .env.production              ← Sur le mini PC uniquement, jamais sur Git
└── prisma/
    └── schema.prisma            ← provider changé en postgresql

Sur le mini PC uniquement :
~/backup-pickperfect.sh
~/.cloudflared/config.yml
~/backups/
```

---

## 🆘 EN CAS DE PROBLÈME

```bash
# Voir les logs de l'app
docker compose --env-file .env.production logs app -f

# Voir les logs de la base
docker compose --env-file .env.production logs postgres -f

# Redémarrer un service précis
docker compose --env-file .env.production restart app

# Tout arrêter / relancer
docker compose --env-file .env.production down
docker compose --env-file .env.production up -d

# Voir le statut du tunnel Cloudflare
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f
```

---

*PickPerfect — Partie 10 terminée*
*🎄 Prêt pour les betatesteurs, en route vers Noël 2026*
