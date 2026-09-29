# 🎁 PickPerfect

Plateforme de listes de cadeaux à partager : créez vos listes, invitez vos proches,
ils réservent les cadeaux sans que vous le sachiez — fini les doublons.

**Fonctionnalités** : listes (publiques / non listées / privées, collaboratives, mode surprise),
ajout de produits par URL, réservations et cagnottes, groupes et Secret Santa, amis,
anniversaires avec rappels, commentaires, notifications, points / badges / défis / récompenses,
export PDF et QR code, liens affiliés, espace admin.

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Prisma 5 + PostgreSQL · Docker.

---

## Développement local

Prérequis : Node 20+, Docker Desktop.

```bash
npm install

# 1. Base Postgres de dev (port 5433)
docker compose -f docker-compose.dev.yml up -d

# 2. Dans .env ET .env.local :
#    DATABASE_URL="postgresql://pickperfect:pickperfect@localhost:5433/pickperfect"

# 3. Créer les tables
npm run db:migrate

# 4. Lancer
npm run dev
```

→ http://localhost:3000

Sans SMTP configuré, les emails sont affichés dans la console (mode dev).

Commandes utiles :

| Commande | Rôle |
|---|---|
| `npm run db:studio` | Interface pour voir / modifier la base |
| `npm run db:migrate` | Créer une migration après modification de `prisma/schema.prisma` |
| `npm run db:reset` | Vider et recréer la base de dev |
| `npx eslint .` | Lint |
| `npx tsc --noEmit` | Vérification des types |

Pour passer un compte en admin : `npm run db:studio` → table `users` → colonne `role` = `ADMIN`.

## Production

Sur le serveur (Docker + Docker Compose installés) :

```bash
git clone https://github.com/Damien-Le-Caillec/pickperfect.git ~/pickperfect
cd ~/pickperfect
cp .env.production.example .env.production   # puis remplir les valeurs
./deploy.sh
```

`docker-compose.yml` lance 3 services :

- **postgres** — la base (volume `pgdata`)
- **app** — Next.js ; les migrations Prisma s'appliquent automatiquement au démarrage
- **cron** — appelle chaque jour `/api/cron/birthdays` et `/api/cron/secret-santa`

Les fichiers envoyés (avatars, images) sont dans le volume `uploads`.
`backup.sh` sauvegarde la base et les uploads (à planifier en crontab sur le serveur).

L'application écoute sur le port 3000 : placez un reverse proxy HTTPS devant
(Caddy, Nginx, Traefik…).

## Organisation du code

```
app/            pages et routes API (app/api/**/route.ts)
components/     composants partagés (Header, PageLayout…)
lib/            logique métier : auth, emails, points, affiliation, sécurité
prisma/         schéma et migrations
proxy.ts        protection des pages privées (ex-middleware)
cron/           planification des tâches quotidiennes (conteneur cron)
```

Ce qui reste à configurer à la main (infos légales, comptes affiliés, SMTP…) est listé
dans [A_COMPLETER.md](A_COMPLETER.md).
