#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
if [[ $# -gt 1 || ($# -eq 1 && "$1" != --no-build) ]]; then
  echo 'Usage: scripts/update.sh [--no-build]' >&2
  exit 2
fi
if [[ ! -f .env ]]; then echo 'Missing .env. Keep the existing server .env before updating.' >&2; exit 1; fi
if ! docker compose version >/dev/null 2>&1; then echo 'Docker Compose v2 is required.' >&2; exit 1; fi
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
previous_container="$(docker compose ps --all -q app | head -n 1)"
if [[ -z "$previous_container" ]]; then
  echo 'Existing app container not found in this Compose project.' >&2
  exit 1
fi
previous_image="${AUTOPRINTFLOW_ROLLBACK_IMAGE:-$(docker container inspect --format '{{.Image}}' "$previous_container")}"
rollback_tag="autoprintflow-rollback:$stamp"
docker image tag "$previous_image" "$rollback_tag"
# Build first: the running app keeps serving if the image cannot be built.
if [[ $# -eq 0 ]]; then docker compose build app; fi
backup_dir="backups/$stamp"
mkdir -p backups
mkdir "$backup_dir"
# A rollback starts the previous server without its startup seed.
printf 'services:\n  app:\n    image: "%s"\n    command: ["npm", "run", "start"]\n' "$rollback_tag" > "$backup_dir/rollback.yml"
cp .env "$backup_dir/environment.env"
chmod 600 "$backup_dir/environment.env"
# Stop writes for a consistent pair of database and storage snapshots.
recover() {
  echo "Update failed. Backups: $backup_dir" >&2
  docker compose -f docker-compose.yml -f "$backup_dir/rollback.yml" up -d --no-build --no-deps app ||
    echo 'Failed to restart the previous app image.' >&2
}
trap recover ERR
trap 'recover; exit 130' INT TERM
docker compose stop app
# Use the database container environment; no password appears in command arguments.
docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$backup_dir/database.dump"
docker compose run --rm --no-deps -T --entrypoint tar app -C /app/storage -czf - . > "$backup_dir/storage.tar.gz"
test -s "$backup_dir/database.dump"
test -s "$backup_dir/storage.tar.gz"
docker compose exec -T postgres pg_restore --file=/dev/null < "$backup_dir/database.dump"
tar -tzf "$backup_dir/storage.tar.gz" > /dev/null
docker compose up -d --no-build --no-deps --wait --wait-timeout 180 app
trap - ERR INT TERM
echo "Updated. Database, files and environment backed up in $backup_dir"
docker compose ps
