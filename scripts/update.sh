#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env ]]; then echo 'Missing .env. Keep the existing server .env before updating.' >&2; exit 1; fi
if ! docker compose version >/dev/null 2>&1; then echo 'Docker Compose v2 is required.' >&2; exit 1; fi
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
previous_image="$(docker compose images -q app | head -n 1)"
rollback_tag="autoprintflow-rollback:$stamp"
if [[ -n "$previous_image" ]]; then docker image tag "$previous_image" "$rollback_tag"; fi
# Build first: the running app keeps serving if the image cannot be built.
docker compose build app
backup_dir="backups/$stamp"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
if [[ -n "$previous_image" ]]; then
  printf 'services:\n  app:\n    image: "%s"\n' "$rollback_tag" > "$backup_dir/rollback.yml"
fi
cp .env "$backup_dir/environment.env"
chmod 600 "$backup_dir/environment.env"
# Stop writes for a consistent pair of database and storage snapshots.
recover() {
  echo "Update failed. Backups: $backup_dir" >&2
  if [[ -f "$backup_dir/rollback.yml" ]]; then
    docker compose -f docker-compose.yml -f "$backup_dir/rollback.yml" up -d --no-build app || true
  else
    docker compose up -d --no-build app || true
  fi
}
trap recover ERR
trap 'recover; exit 130' INT TERM
docker compose stop app
# Use the database container environment; no password appears in command arguments.
docker compose exec -T postgres sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$backup_dir/database.dump"
docker compose run --rm --no-deps -T --entrypoint tar app -C /app/storage -czf - . > "$backup_dir/storage.tar.gz"
test -s "$backup_dir/database.dump"
test -s "$backup_dir/storage.tar.gz"
docker compose up -d --no-build --wait --wait-timeout 180 app
trap - ERR INT TERM
echo "Updated. Database, files and environment backed up in $backup_dir"
docker compose ps
