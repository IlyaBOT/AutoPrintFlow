#!/usr/bin/env bash
set -Eeuo pipefail

COMMUNITY_SCRIPT_URL="${COMMUNITY_SCRIPT_URL:-https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/ct/alpine-docker.sh}"
REPO_URL="${REPO_URL:-https://github.com/IlyaBOT/AutoPrintFlow.git}"
GIT_REF="${GIT_REF:-main}"
COMMUNITY_INSTALL_RESPONSES="${COMMUNITY_INSTALL_RESPONSES:-n\nn\ny\nn\n}"

CTID="${CTID:-320}"
CT_HOSTNAME="${CT_HOSTNAME:-autoprintflow}"
CT_CORES="${CT_CORES:-2}"
CT_RAM_MB="${CT_RAM_MB:-2048}"
CT_DISK_GB="${CT_DISK_GB:-8}"
ALPINE_VERSION="${ALPINE_VERSION:-3.23}"
CT_TEMPLATE_STORAGE="${CT_TEMPLATE_STORAGE:-}"
CT_CONTAINER_STORAGE="${CT_CONTAINER_STORAGE:-}"

APP_DIR="${APP_DIR:-/opt/autoprintflow}"
APP_BIND_IP="${APP_BIND_IP:-0.0.0.0}"
APP_HOST_PORT="${APP_HOST_PORT:-3000}"
APP_ORIGIN="${APP_ORIGIN:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-autoprintflow}"
SESSION_COOKIE_NAME="${SESSION_COOKIE_NAME:-autoprintflow_session}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@autoprintflow.local}"
TURNSTILE_SITE_KEY="${TURNSTILE_SITE_KEY:-}"
TURNSTILE_SECRET_KEY="${TURNSTILE_SECRET_KEY:-}"

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
    return 0
  fi

  od -An -N "$1" -tx1 /dev/urandom | tr -d ' \n'
}

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(random_secret 16)}"
SESSION_SECRET="${SESSION_SECRET:-$(random_secret 32)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(random_secret 12)}"

log() {
  printf '[autoprintflow] %s\n' "$*"
}

fail() {
  printf '[autoprintflow] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

wait_for_container_ip() {
  local ip=""

  for _ in $(seq 1 60); do
    ip=$(pct exec "$CTID" -- sh -c "ip -4 addr show dev eth0 2>/dev/null | awk '/inet / {print \$2}' | cut -d/ -f1 | head -n 1" 2>/dev/null | tr -d '\r')

    if [[ -n "$ip" ]]; then
      printf '%s\n' "$ip"
      return 0
    fi

    sleep 2
  done

  return 1
}

resolve_created_ctid() {
  local create_log="$1"
  local detected=""

  if pct status "$CTID" >/dev/null 2>&1; then
    printf '%s\n' "$CTID"
    return 0
  fi

  detected="$(grep -oE 'LXC Container [0-9]+' "$create_log" | awk '{ print $3 }' | tail -n 1 || true)"

  if [[ -z "$detected" ]]; then
    detected="$(grep -oE 'Container ID: [0-9]+' "$create_log" | awk '{ print $3 }' | tail -n 1 || true)"
  fi

  if [[ -n "$detected" ]]; then
    printf '%s\n' "$detected"
    return 0
  fi

  return 1
}

[[ "${EUID}" -eq 0 ]] || fail "Run this script as root on the Proxmox host."

require_cmd pct
require_cmd curl

if pct status "$CTID" >/dev/null 2>&1; then
  fail "Container ID ${CTID} already exists. Set another CTID, for example: CTID=321"
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log "Creating Alpine Docker LXC ${CTID} via community-scripts"
export PHS_SILENT=1
export var_ctid="$CTID"
export var_hostname="$CT_HOSTNAME"
export var_cpu="$CT_CORES"
export var_ram="$CT_RAM_MB"
export var_disk="$CT_DISK_GB"
export var_os="alpine"
export var_version="$ALPINE_VERSION"
export var_unprivileged="1"
export var_nesting="1"
export var_keyctl="1"
export var_tags="docker;alpine;autoprintflow"
if [[ -n "$CT_TEMPLATE_STORAGE" ]]; then
  export var_template_storage="$CT_TEMPLATE_STORAGE"
fi
if [[ -n "$CT_CONTAINER_STORAGE" ]]; then
  export var_container_storage="$CT_CONTAINER_STORAGE"
fi

CREATE_LOG="$TMP_DIR/community-create.log"
printf '%b' "$COMMUNITY_INSTALL_RESPONSES" | bash <(curl -fsSL "$COMMUNITY_SCRIPT_URL") generated 2>&1 | tee "$CREATE_LOG"

ACTUAL_CTID="$(resolve_created_ctid "$CREATE_LOG" || true)"
[[ -n "$ACTUAL_CTID" ]] || fail "Could not determine which CT community-scripts created. Check $CREATE_LOG"

if [[ "$ACTUAL_CTID" != "$CTID" ]]; then
  log "community-scripts created CT ${ACTUAL_CTID} instead of requested ${CTID}; continuing with the actual CT"
fi
CTID="$ACTUAL_CTID"

if ! pct status "$CTID" | grep -q "status: running"; then
  log "Starting CT ${CTID} before copying deployment files"
  pct start "$CTID" >/dev/null
fi

ACTUAL_HOSTNAME="$(pct config "$CTID" | awk -F': ' '/^hostname: / { print $2 }' | tail -n 1)"
if [[ -n "$ACTUAL_HOSTNAME" ]]; then
  CT_HOSTNAME="$ACTUAL_HOSTNAME"
fi

log "Preparing project deployment files"
ENV_FILE="$TMP_DIR/autoprintflow.env"
cat >"$ENV_FILE" <<EOF
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}
APP_BIND_IP=${APP_BIND_IP}
APP_HOST_PORT=${APP_HOST_PORT}
APP_ORIGIN=${APP_ORIGIN}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/autoprintflow?schema=public
SESSION_COOKIE_NAME=${SESSION_COOKIE_NAME}
SESSION_SECRET=${SESSION_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
TURNSTILE_SITE_KEY=${TURNSTILE_SITE_KEY}
TURNSTILE_SECRET_KEY=${TURNSTILE_SECRET_KEY}
NODE_ENV=production
EOF

DEPLOY_FILE="$TMP_DIR/deploy-autoprintflow.sh"
cat >"$DEPLOY_FILE" <<'EOF'
#!/bin/sh
set -eu

APP_DIR="${APP_DIR:?APP_DIR is required}"
REPO_URL="${REPO_URL:?REPO_URL is required}"
GIT_REF="${GIT_REF:-main}"
ENV_SOURCE="${ENV_SOURCE:-/root/autoprintflow.env}"

ensure_compose() {
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi

  apk add --no-cache docker-cli-compose >/dev/null 2>&1 || true

  if docker compose version >/dev/null 2>&1; then
    return 0
  fi

  arch="$(uname -m)"
  case "$arch" in
    x86_64) compose_bin="docker-compose-linux-x86_64" ;;
    aarch64) compose_bin="docker-compose-linux-aarch64" ;;
    *)
      echo "Unsupported architecture for Docker Compose: $arch" >&2
      exit 1
      ;;
  esac

  compose_version="$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest | awk -F '"' '/tag_name/ { print $4; exit }')"
  mkdir -p /root/.docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/download/${compose_version}/${compose_bin}" -o /root/.docker/cli-plugins/docker-compose
  chmod +x /root/.docker/cli-plugins/docker-compose
}

rc-service docker start >/dev/null 2>&1 || true
rc-update add docker default >/dev/null 2>&1 || true

apk add --no-cache git bash curl openssl >/dev/null
ensure_compose

mkdir -p "$(dirname "$APP_DIR")"

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin "$GIT_REF"
  git -C "$APP_DIR" checkout -B "$GIT_REF" FETCH_HEAD
  git -C "$APP_DIR" reset --hard FETCH_HEAD
else
  rm -rf "$APP_DIR"
  git clone --depth 1 --branch "$GIT_REF" "$REPO_URL" "$APP_DIR"
fi

install -m 600 "$ENV_SOURCE" "$APP_DIR/.env"

cd "$APP_DIR"
docker compose up -d --build
EOF

chmod +x "$DEPLOY_FILE"

log "Copying deployment helper into CT ${CTID}"
pct push "$CTID" "$ENV_FILE" /root/autoprintflow.env >/dev/null
pct push "$CTID" "$DEPLOY_FILE" /root/deploy-autoprintflow.sh >/dev/null
pct exec "$CTID" -- chmod 700 /root/deploy-autoprintflow.sh /root/autoprintflow.env >/dev/null

log "Cloning repository and starting the stack inside CT ${CTID}"
pct exec "$CTID" -- env \
  APP_DIR="$APP_DIR" \
  REPO_URL="$REPO_URL" \
  GIT_REF="$GIT_REF" \
  ENV_SOURCE="/root/autoprintflow.env" \
  /root/deploy-autoprintflow.sh

CT_IP="$(wait_for_container_ip || true)"

log "Deployment complete"
printf '\n'
printf 'CTID: %s\n' "$CTID"
printf 'Hostname: %s\n' "$CT_HOSTNAME"
if [[ -n "$CT_IP" ]]; then
  printf 'LAN URL: http://%s:%s\n' "$CT_IP" "$APP_HOST_PORT"
else
  printf 'LAN URL: http://<container-ip>:%s\n' "$APP_HOST_PORT"
fi
printf 'Admin email: %s\n' "$ADMIN_EMAIL"
printf 'Admin password: %s\n' "$ADMIN_PASSWORD"
printf '\n'
printf 'If Proxmox firewall is enabled for this CT, allow TCP %s.\n' "$APP_HOST_PORT"
