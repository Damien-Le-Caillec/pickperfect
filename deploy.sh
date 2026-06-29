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