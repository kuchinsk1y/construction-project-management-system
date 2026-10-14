#!/usr/bin/env bash
# Dumps the production PostgreSQL database to backups/ and keeps the last 14 dumps.
# Usage (from the repository root): ./deploy/backup-db.sh
set -euo pipefail

cd "$(dirname "$0")/.."

set -a
source ./.env
set +a

BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
KEEP="${BACKUP_KEEP:-14}"
mkdir -p "$BACKUP_DIR"

FILE="$BACKUP_DIR/erp_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip > "$FILE"

echo "Backup saved: $FILE"

ls -1t "$BACKUP_DIR"/erp_*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
