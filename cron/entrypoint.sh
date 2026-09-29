#!/bin/sh
# Planifie les tâches quotidiennes de PickPerfect (crond de BusyBox) :
# rappels anniversaires, rappels Secret Santa, purge des données expirées.
# Horaires en UTC : 7h UTC = 8h (hiver) / 9h (été) à Paris.
set -e

if [ -z "$CRON_SECRET" ]; then
  echo "CRON_SECRET manquant" >&2
  exit 1
fi

BASE="http://app:3000/api/cron"

cat > /etc/crontabs/root <<EOF
0 7 * * * wget -q -O - "$BASE/birthdays?token=$CRON_SECRET" 2>&1
5 7 * * * wget -q -O - "$BASE/secret-santa?token=$CRON_SECRET" 2>&1
30 3 * * * wget -q -O - "$BASE/cleanup?token=$CRON_SECRET" 2>&1
EOF

echo "Cron PickPerfect démarré"
exec crond -f -l 8
