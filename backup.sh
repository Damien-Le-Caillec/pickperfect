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

# Rotation sur 30 jours (durée annoncée dans la politique de confidentialité)
find $BACKUP_DIR -type f -mtime +30 -delete
echo "✅ Sauvegarde : $BACKUP_DIR/db_$DATE.sql"