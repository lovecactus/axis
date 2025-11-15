#!/usr/bin/env bash
# Axis post-deployment refresh helper.
# Run this script directly on the Ubuntu server (after ssh-ing in).
# It applies the latest git changes, refreshes dependencies, reruns migrations,
# rebuilds the frontend (when needed), and restarts systemd services.

set -euo pipefail

PROJECT_ROOT=/var/axis
BACKEND_DIR=${PROJECT_ROOT}/backend
FRONTEND_DIR=${PROJECT_ROOT}/frontend
DEPLOY_USER=${SUDO_USER:-ubuntu}

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
sudo -u "${DEPLOY_USER}" git config --global --add safe.directory "${PROJECT_ROOT}" >/dev/null 2>&1 || true

# Ensure .git directory has correct ownership for git operations
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${PROJECT_ROOT}/.git" 2>/dev/null || true

log "Pulling latest git changes"
cd "${PROJECT_ROOT}"
# Discard any local changes to yarn.lock that might conflict
sudo -u "${DEPLOY_USER}" git checkout -- frontend/yarn.lock 2>/dev/null || true
sudo -u "${DEPLOY_USER}" git pull

if [[ -d "${BACKEND_DIR}" ]]; then
  log "Refreshing backend dependencies"
  sudo -u "${DEPLOY_USER}" bash -lc "cd '${BACKEND_DIR}' && source .venv/bin/activate && pip install -r requirements.txt"

  log "Applying database migrations"
  sudo -u "${DEPLOY_USER}" bash -lc "cd '${BACKEND_DIR}' && source .venv/bin/activate && alembic upgrade head"
fi

if [[ -d "${FRONTEND_DIR}" ]]; then
  log "Rebuilding frontend"
  sudo -u "${DEPLOY_USER}" bash -lc "cd '${FRONTEND_DIR}' && yarn install && yarn build"
fi

log "Restarting services"
systemctl restart axis-backend
systemctl restart axis-frontend

log "Update complete. Use 'journalctl -u axis-backend -f' to monitor logs."

