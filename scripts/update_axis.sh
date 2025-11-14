#!/usr/bin/env bash
# Axis post-deployment refresh helper.
# Run this script directly on the Ubuntu server (after ssh-ing in).
# It applies the latest git changes, refreshes dependencies, reruns migrations,
# rebuilds the frontend (when needed), and restarts systemd services.

set -euo pipefail

PROJECT_ROOT=/var/axis
BACKEND_DIR=${PROJECT_ROOT}/backend
FRONTEND_DIR=${PROJECT_ROOT}/frontend

GREEN='\033[0;32m'
NC='\033[0m'

log() {
  echo -e "${GREEN}==>${NC} $1"
}

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run this script as root (use sudo or login as root)."
  exit 1
fi

# Allow git to operate when directory ownership differs (common with sudo).
git config --global --add safe.directory "${PROJECT_ROOT}" >/dev/null 2>&1 || true

log "Pulling latest git changes"
cd "${PROJECT_ROOT}"
git pull

if [[ -d "${BACKEND_DIR}" ]]; then
  log "Refreshing backend dependencies"
  cd "${BACKEND_DIR}"
  if [[ -f ".venv/bin/activate" ]]; then
    source .venv/bin/activate
  else
    echo "Backend virtualenv not found at ${BACKEND_DIR}/.venv"
    exit 1
  fi
  if [[ -f "requirements.txt" ]]; then
    pip install -r requirements.txt
  fi

  if command -v alembic >/dev/null 2>&1; then
    log "Applying database migrations"
    alembic upgrade head
  else
    echo "Alembic not found in virtualenv; skipping migrations."
  fi
fi

if [[ -d "${FRONTEND_DIR}" ]]; then
  log "Rebuilding frontend"
  cd "${FRONTEND_DIR}"
  if [[ -f "package.json" ]]; then
    yarn install --frozen-lockfile || yarn install
    yarn build
  else
    echo "package.json not found in ${FRONTEND_DIR}; skipping frontend build."
  fi
fi

log "Restarting services"
systemctl restart axis-backend
systemctl restart axis-frontend

log "Update complete. Use 'journalctl -u axis-backend -f' to monitor logs."

