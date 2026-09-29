#!/bin/bash
set -e

echo "🚀 Déploiement PickPerfect..."
cd ~/pickperfect

echo "📥 Récupération du code..."
git pull origin master

echo "🏗️  Build et redémarrage (les migrations s'appliquent au démarrage de l'app)..."
docker compose --env-file .env.production up -d --build

echo "🧹 Nettoyage images Docker..."
docker image prune -f

echo "✅ Déploiement terminé !"