# 🎁 PICKPERFECT — PARTIE 10 BIS
## Adaptation pour Mac Mini

> Ce document liste uniquement ce qui **change** par rapport à la Partie 10.
> Tout le reste (Dockerfile, docker-compose.yml, schéma Prisma, sauvegardes,
> workflow de mise à jour) reste **strictement identique**.

---

## 🧠 RÉFLEXION

> Pas besoin d'effacer macOS pour installer Ubuntu — ça serait même contre-productif :
> tu perds le support matériel optimisé d'Apple, et certains Mac Mini récents
> (puce M-series) ont un boot loader qui complique sérieusement l'installation
> d'un OS tiers. macOS fait très bien le travail de serveur Docker.
>
> Le vrai piège du Mac Mini c'est qu'il est pensé pour être un poste de travail,
> pas un serveur — il s'endort, et Docker Desktop a besoin d'une session
> graphique ouverte pour fonctionner. On corrige ces deux points et c'est tout.

---

## CE QUI NE CHANGE PAS

- Le `Dockerfile`
- Le `docker-compose.yml`
- Le `schema.prisma` (PostgreSQL)
- Le `.env.production`
- Cloudflare Tunnel (même principe, juste l'installation diffère)
- Le script de sauvegarde
- Le workflow de mise à jour (`git pull` + `docker compose up -d --build`)

---

## ÉTAPE 1 — PAS D'INSTALLATION D'OS

Tu sautes entièrement les Étapes 1 et 2 de la Partie 10. Ton Mac Mini tourne déjà sous macOS — c'est ton serveur.

---

## ÉTAPE 2 — ACTIVER L'ACCÈS SSH

Sur le Mac Mini :

**Réglages Système** → **Général** → **Partage** → active **"Connexion à distance"** (Remote Login)

Note l'adresse affichée, du type `ssh damien@192.168.1.42`.

Depuis ton PC Windows, teste :

```powershell
ssh damien@192.168.1.42
```

(Pas besoin d'installer OpenSSH — c'est déjà inclus dans macOS.)

### IP fixe

Même chose que sur la Partie 10 — réserve une IP fixe pour le Mac Mini dans les réglages DHCP de ta box, en te basant sur son adresse MAC (visible dans **Réglages Système → Réseau → [ta connexion] → Détails**).

---

## ÉTAPE 3 — EMPÊCHER LE MAC DE S'ENDORMIR

Crucial — sans ça, ton serveur s'éteint dès que personne n'est devant l'écran.

**Réglages Système** → **Économiseur d'énergie** (ou **Batterie** sur certains modèles) :

- Désactive complètement la mise en veille
- Active **"Réveiller pour accès réseau"**
- Si tu as une coupure de courant : **"Redémarrer automatiquement après une coupure de courant"** → active

Ou en ligne de commande, dans le Terminal du Mac :

```bash
sudo pmset -a sleep 0
sudo pmset -a disksleep 0
sudo pmset -a autorestart 1
```

### Connexion automatique après reboot

Docker Desktop a besoin d'une session utilisateur ouverte pour fonctionner — donc le Mac doit se reconnecter tout seul après un redémarrage.

**Réglages Système** → **Utilisateurs et groupes** → **Options de connexion** → **Connexion automatique** → sélectionne ton compte.

---

## ÉTAPE 4 — INSTALLER DOCKER

Pas le script Linux de la Partie 10 — sur Mac, c'est **Docker Desktop**.

### Option A — Via Homebrew (recommandé)

Si Homebrew n'est pas installé :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Puis Docker :

```bash
brew install --cask docker
```

### Option B — Téléchargement direct

https://www.docker.com/products/docker-desktop → télécharge la version Mac (vérifie si ton Mac Mini a une puce **Apple Silicon (M1/M2/M3/M4)** ou **Intel** — le site détecte normalement automatiquement).

### Lancer Docker Desktop

Ouvre l'app Docker depuis le Launchpad une première fois, accepte les permissions demandées.

**Important** — dans Docker Desktop → **Settings** → **General** → coche **"Start Docker Desktop when you log in"**.

Vérifie dans le Terminal :

```bash
docker --version
docker compose version
```

---

## ÉTAPE 5 — PAS DE UFW

macOS a son propre pare-feu, plus simple à gérer.

**Réglages Système** → **Réseau** → **Pare-feu** → active-le.

Tu n'as **aucune règle particulière à ajouter** — comme sur la Partie 10, le tunnel Cloudflare ne nécessite aucun port entrant ouvert.

---

## ÉTAPE 6 — TRANSFÉRER LE CODE

Identique à la Partie 10 (Étape 6) — `git clone` ou `scp` fonctionnent pareil sur macOS.

```bash
# Sur le Mac Mini, dans le Terminal
git clone https://github.com/Damien-Le-Caillec/pickperfect.git
cd pickperfect
```

```powershell
# Depuis ton PC Windows
scp .env.production damien@192.168.1.42:~/pickperfect/.env.production
```

---

## ÉTAPE 7 — LANCEMENT

Strictement identique à la Partie 10 (Étape 7) :

```bash
cd ~/pickperfect
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production exec app npx prisma migrate deploy
```

---

## ÉTAPE 8 — CLOUDFLARE TUNNEL SUR MAC

Même principe, installation différente.

```bash
brew install cloudflared
```

Le reste est identique à la Partie 10 (Étapes 8.4 à 8.9) :

```bash
cloudflared tunnel login
cloudflared tunnel create pickperfect
```

```bash
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: TON-TUNNEL-ID
credentials-file: /Users/damien/.cloudflared/TON-TUNNEL-ID.json

ingress:
  - hostname: pickperfect.ton-domaine.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
cloudflared tunnel route dns pickperfect pickperfect.ton-domaine.com
```

### Lancer cloudflared en service permanent (différence avec Linux)

Sur Linux on utilisait `systemctl`. Sur macOS, `cloudflared` gère ça automatiquement via `launchd` :

```bash
sudo cloudflared service install
```

Vérifie que ça tourne :

```bash
sudo launchctl list | grep cloudflared
```

✅ Si une ligne apparaît avec un PID, le service tourne.

---

## ÉTAPE 9 — SAUVEGARDES

Identique à la Partie 10. `crontab -e` fonctionne pareil sur macOS.

```bash
nano ~/backup-pickperfect.sh
chmod +x ~/backup-pickperfect.sh
crontab -e
```

```
0 3 * * * /Users/damien/backup-pickperfect.sh
```

---

## ✅ CHECKLIST SPÉCIFIQUE MAC MINI

```
□ Connexion à distance (SSH) activée
□ Mise en veille désactivée
□ Connexion automatique au démarrage activée
□ Docker Desktop configuré pour démarrer à la connexion
□ Pare-feu macOS activé
□ Redémarrage automatique après coupure de courant activé
□ cloudflared installé en service (vérifié avec launchctl)
```

Tout le reste de la checklist de la Partie 10 (HTTPS, emails, sauvegardes, admin) s'applique pareil.

---

## ⚠️ POINT D'ATTENTION — DOCKER DESKTOP VS DOCKER ENGINE

Sur Linux, Docker tourne en tant que service système indépendant de toute session utilisateur. Sur Mac, **Docker Desktop est une application** qui nécessite une session ouverte. Concrètement :

- Si quelqu'un se déconnecte de la session macOS → Docker Desktop s'arrête → ton app est down
- D'où l'importance absolue de la **connexion automatique** (Étape 3)
- Ne mets jamais le Mac Mini en veille manuellement, même pour "économiser de l'énergie" — ton serveur doit rester actif 24/7

---

*PickPerfect — Partie 10 Bis terminée*
