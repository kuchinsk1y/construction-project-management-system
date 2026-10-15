#!/usr/bin/env bash
# Updates the production deployment: backup -> pull -> rebuild -> restart.
# Usage (from the repository root): ./deploy/deploy.sh [branch]   (default: main)
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="${1:-main}"
COMPOSE="docker compose -f docker-compose.prod.yml"

# WEB_PORT lives in .env; read it so the health check hits our container, not another project's
WEB_PORT="$(grep -E '^WEB_PORT=' .env | cut -d= -f2 | tr -d '\r' || true)"
WEB_PORT="${WEB_PORT:-8081}"

echo "==> Backing up the database"
./deploy/backup-db.sh

echo "==> Fetching $BRANCH"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
echo "    Now at: $(git log -1 --oneline)"

echo "==> Building images"
$COMPOSE build api web

echo "==> Restarting containers (migrations run on API start)"
$COMPOSE up -d

echo "==> Waiting for the API"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${WEB_PORT}/api/" > /dev/null; then
    echo "    API is up"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "!! API did not respond in 60s. Check: $COMPOSE logs --tail=100 api" >&2
    exit 1
  fi
  sleep 2
done

echo "==> Cleaning up old images"
docker image prune -f > /dev/null

$COMPOSE ps
echo "==> Done"
