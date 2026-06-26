# 🎁 PICKPERFECT — PARTIE 10 BIS (COMPLÈTE)
## Déploiement Mac Mini + Auto-déploiement sur git push

---

## 🧠 RÉFLEXION

> On garde macOS — pas besoin d'effacer quoi que ce soit.
> Docker Desktop tourne sur Mac, Cloudflare Tunnel s'installe en une commande,
> et GitHub Actions fait le lien : chaque `git push` sur `main` déclenche
> automatiquement le déploiement sur le Mac Mini.
> Tu codes sur ton PC Windows, tu pushs, et 2 minutes plus tard
> c'est en ligne sans toucher au Mac.

---

## 📋 CE QU'ON FAIT

1. Préparer le Mac Mini (SSH, veille, Docker)
2. Préparer le projet (Dockerfile, docker-compose, PostgreSQL)
3. Premier déploiement manuel
4. Cloudflare Tunnel (HTTPS sans ouvrir de port)
5. GitHub Actions (auto-déploiement à chaque push)
6. Sauvegardes automatiques
7. Checklist finale

---

## ÉTAPE 1 — PRÉPARER LE MAC MINI

### 1.1 Activer SSH

Sur le Mac Mini :

**Réglages Système → Général → Partage → active "Connexion à distance"**

Note l'adresse affichée : `ssh damien@192.168.1.42`

### 1.2 IP fixe locale

Dans les réglages de ta box internet, réserve une IP fixe pour le Mac Mini.
L'adresse MAC se trouve dans :
**Réglages Système → Réseau → [ta connexion] → Détails**

### 1.3 Empêcher la mise en veille

Dans le Terminal du Mac Mini :

```bash
sudo pmset -a sleep 0
sudo pmset -a disksleep 0
sudo pmset -a autorestart 1
```

**Réglages Système → Utilisateurs et groupes → Options de connexion → Connexion automatique → ton compte**

### 1.4 Créer une clé SSH pour GitHub Actions

```bash
ssh-keygen -t ed25519 -C "github-actions-pickperfect" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Affiche la clé privée et copie tout le contenu (tu en auras besoin à l'Étape 5) :

```bash
cat ~/.ssh/github_actions
```

### 1.5 Installer Docker Desktop

```bash
brew install --cask docker
```

Si Homebrew n'est pas installé :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Ouvre Docker Desktop depuis le Launchpad, accepte les permissions.

**Docker Desktop → Settings → General → coche "Start Docker Desktop when you log in"**

```bash
docker --version
docker compose version
```

---

## ÉTAPE 2 — PRÉPARER LE PROJET (sur ton PC Windows)

### 2.1 PostgreSQL dans le schéma Prisma

```bash
code prisma/schema.prisma
```

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2.2 Dockerfile

```bash
code Dockerfile
```

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public                               ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder /app/prisma                               ./prisma
COPY --from=builder /app/node_modules/.prisma                 ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma                 ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### 2.3 .dockerignore

```bash
code .dockerignore
```

```
node_modules
.next
.git
.env.local
.env.production
public/uploads
*.md
.vscode
```

### 2.4 docker-compose.yml

```bash
code docker-compose.yml
```

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
      timeout:  5s
      retries:  5

  app:
    build: .
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL:        postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      SESSION_SECRET:      ${SESSION_SECRET}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      SMTP_HOST:           ${SMTP_HOST}
      SMTP_PORT:           ${SMTP_PORT}
      SMTP_USER:           ${SMTP_USER}
      SMTP_PASS:           ${SMTP_PASS}
      SMTP_FROM:           ${SMTP_FROM}
      CRON_SECRET:         ${CRON_SECRET}
    volumes:
      - uploads:/app/public/uploads
    ports:
      - "3000:3000"

volumes:
  pgdata:
  uploads:
```

### 2.5 Script de déploiement

```bash
code deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement PickPerfect..."
cd ~/pickperfect

echo "📥 Récupération du code..."
git pull origin main

echo "🏗️  Build et redémarrage..."
docker compose --env-file .env.production up -d --build

echo "🗄️  Migrations..."
docker compose --env-file .env.production exec -T app npx prisma migrate deploy

echo "🧹 Nettoyage images Docker..."
docker image prune -f

echo "✅ Déploiement terminé !"
```

### 2.6 Script de sauvegarde

```bash
code backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR

docker compose -f ~/pickperfect/docker-compose.yml \
  --env-file ~/pickperfect/.env.production \
  exec -T postgres \
  pg_dump -U pickperfect pickperfect \
  > $BACKUP_DIR/db_$DATE.sql

tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
  -C ~/pickperfect/public uploads 2>/dev/null || true

find $BACKUP_DIR -type f -mtime +14 -delete
echo "✅ Sauvegarde : $BACKUP_DIR/db_$DATE.sql"
```

### 2.7 GitHub Actions workflow

```powershell
mkdir .github\workflows
code .github/workflows/deploy.yml
```

```yaml
name: Deploy to Mac Mini

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Connexion Tailscale
        uses: tailscale/github-action@v2
        with:
          oauth-client-id:     ${{ secrets.TAILSCALE_CLIENT_ID }}
          oauth-secret:        ${{ secrets.TAILSCALE_CLIENT_SECRET }}
          tags:                tag:ci

      - name: Déploiement SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host:        ${{ secrets.MAC_HOST }}
          username:    ${{ secrets.MAC_USER }}
          key:         ${{ secrets.MAC_SSH_KEY }}
          port:        22
          script_stop: true
          script: |
            bash ~/pickperfect/deploy.sh

      - name: Vérification
        uses: appleboy/ssh-action@v1.0.3
        with:
          host:     ${{ secrets.MAC_HOST }}
          username: ${{ secrets.MAC_USER }}
          key:      ${{ secrets.MAC_SSH_KEY }}
          port:     22
          script: |
            sleep 15
            curl -f http://localhost:3000 > /dev/null 2>&1 && \
              echo "✅ App OK" || echo "⚠️ App non accessible"
```

### 2.8 .gitignore

Ajoute :

```
.env.production
backup.sh
deploy.sh.log
```

### 2.9 Pusher sur GitHub

```powershell
git add .
git commit -m "Setup déploiement Mac Mini + GitHub Actions"
git push
```

---

## ÉTAPE 3 — PREMIER LANCEMENT SUR LE MAC MINI

```bash
# Cloner le repo
git clone https://github.com/Damien-Le-Caillec/pickperfect.git ~/pickperfect
cd ~/pickperfect

# Rendre les scripts exécutables
chmod +x deploy.sh backup.sh
```

Créer le fichier de variables d'environnement :

```bash
nano ~/pickperfect/.env.production
```

```bash
POSTGRES_USER=pickperfect
POSTGRES_PASSWORD=REMPLACE_PAR_MOT_DE_PASSE_LONG
POSTGRES_DB=pickperfect

SESSION_SECRET=REMPLACE_PAR_CHAINE_ALEATOIRE_LONGUE

NEXT_PUBLIC_APP_URL=https://pickperfect.ton-domaine.com

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=ton-email-brevo@exemple.com
SMTP_PASS=ta-cle-smtp-brevo
SMTP_FROM=PickPerfect <noreply@ton-domaine.com>

CRON_SECRET=UNE_TROISIEME_CHAINE_ALEATOIRE
```

Génère les valeurs aléatoires :

```bash
openssl rand -base64 48
# Lance 3 fois → une valeur par secret
```

Lancement initial :

```bash
cd ~/pickperfect
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec app npx prisma migrate deploy
```

Test :

```bash
curl http://localhost:3000
# ✅ Du HTML s'affiche
```

---

## ÉTAPE 4 — CLOUDFLARE TUNNEL

### 4.1 Acheter un domaine

**Cloudflare Registrar** (le moins cher) : https://www.cloudflare.com/products/registrar

### 4.2 Ajouter le domaine sur Cloudflare

1. https://dash.cloudflare.com → "Add a site" → plan **Free**
2. Cloudflare te donne 2 nameservers → les renseigner chez ton registrar
3. Attendre 5-30 minutes

### 4.3 Installer et configurer

```bash
brew install cloudflared
cloudflared tunnel login
cloudflared tunnel create pickperfect
```

Note l'UUID du tunnel affiché.

```bash
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: TON-UUID-ICI
credentials-file: /Users/damien/.cloudflared/TON-UUID-ICI.json

ingress:
  - hostname: pickperfect.ton-domaine.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
cloudflared tunnel route dns pickperfect pickperfect.ton-domaine.com
sudo cloudflared service install
```

Vérification :

```bash
sudo launchctl list | grep cloudflared
# ✅ Une ligne avec un PID
```

Mettre à jour l'URL et redémarrer :

```bash
# Édite .env.production et mets la vraie URL
nano ~/pickperfect/.env.production
# NEXT_PUBLIC_APP_URL=https://pickperfect.ton-domaine.com

cd ~/pickperfect
docker compose --env-file .env.production up -d --build
```

Test depuis ton téléphone en 4G → ✅ cadenas HTTPS valide.

---

## ÉTAPE 5 — TAILSCALE + GITHUB ACTIONS

Tailscale crée un réseau privé entre le Mac Mini et GitHub Actions.
C'est ce qui permet à GitHub d'atteindre ton Mac qui est derrière ta box internet.

### 5.1 Installer Tailscale sur le Mac Mini

```bash
brew install tailscale
sudo tailscaled &
sudo tailscale up
```

Connecte-toi sur https://login.tailscale.com (avec Google ou GitHub).

Note l'IP Tailscale du Mac Mini — du type `100.x.x.x` — visible dans le dashboard.

### 5.2 Créer un client OAuth Tailscale

1. Va sur https://login.tailscale.com/admin/settings/oauth
2. "Generate OAuth client"
3. Coche la permission **"Devices → Write"**
4. Note le **Client ID** et le **Client secret**

### 5.3 Ajouter les secrets dans GitHub

**github.com/Damien-Le-Caillec/pickperfect → Settings → Secrets and variables → Actions**

"New repository secret" pour chacun :

| Secret | Valeur |
|--------|--------|
| `MAC_HOST` | IP Tailscale du Mac, ex: `100.64.0.1` |
| `MAC_USER` | Ton nom d'utilisateur Mac, ex: `damien` |
| `MAC_SSH_KEY` | Contenu entier de `~/.ssh/github_actions` (copié à l'Étape 1.4) |
| `TAILSCALE_CLIENT_ID` | Client ID OAuth Tailscale |
| `TAILSCALE_CLIENT_SECRET` | Client secret OAuth Tailscale |

---

## ÉTAPE 6 — TESTER L'AUTO-DÉPLOIEMENT

```powershell
# Sur ton PC Windows
# Fais un petit changement (par ex dans app/page.tsx)
git add .
git commit -m "Test auto-déploiement"
git push
```

Va sur **github.com/Damien-Le-Caillec/pickperfect → Actions**

✅ Workflow "Deploy to Mac Mini" se lance automatiquement
✅ Statut vert après ~2 minutes
✅ Le changement est visible sur ton domaine

---

## ÉTAPE 7 — SAUVEGARDES ET CRON

```bash
# Sur le Mac Mini
crontab -e
```

```
# Sauvegarde quotidienne à 3h
0 3 * * * /bin/bash /Users/damien/pickperfect/backup.sh >> /Users/damien/backups/backup.log 2>&1

# Rappels anniversaires à 8h
0 8 * * * curl -s "https://pickperfect.ton-domaine.com/api/cron/birthdays?token=TON_CRON_SECRET" > /dev/null
```

Test manuel :

```bash
bash ~/pickperfect/backup.sh
ls -la ~/backups
# ✅ Fichiers .sql et .tar.gz
```

---

## ✅ CHECKLIST FINALE

```
□ https://pickperfect.ton-domaine.com accessible depuis un téléphone en 4G
□ Cadenas HTTPS valide
□ Docker Desktop démarre automatiquement
□ Mac Mini ne se met jamais en veille
□ Connexion automatique au démarrage activée
□ Tailscale installé et connecté (dashboard Tailscale = Mac visible)
□ GitHub Actions → test push → statut vert
□ Sauvegarde testée manuellement
□ Compte ADMIN configuré (Prisma Studio)
□ Emails Brevo fonctionnels (tester l'inscription)
□ Mentions légales complètes (SIRET, adresse, nom)
```

---

## 🆘 COMMANDES UTILES

```bash
# Logs app en temps réel
docker compose --env-file ~/pickperfect/.env.production logs app -f

# Redémarrer l'app
docker compose --env-file ~/pickperfect/.env.production restart app

# Rebuild complet
cd ~/pickperfect && docker compose --env-file .env.production up -d --build

# Statut tunnel Cloudflare
sudo launchctl list | grep cloudflared

# Prisma Studio (interface visuelle pour la base)
cd ~/pickperfect && \
  export DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d= -f2-) && \
  npx prisma studio

# Accès PostgreSQL direct
docker compose --env-file .env.production exec postgres psql -U pickperfect -d pickperfect
```

---

## 🔄 WORKFLOW QUOTIDIEN

```powershell
# Sur ton PC Windows — coder normalement
git add .
git commit -m "Description du changement"
git push
# → GitHub Actions déploie automatiquement en ~2 minutes
# → Tu n'as plus jamais besoin de toucher au Mac Mini
```

---

*PickPerfect — Déploiement Mac Mini avec auto-deploy terminé*
*🎄 Lien à envoyer : https://pickperfect.ton-domaine.com/register*
