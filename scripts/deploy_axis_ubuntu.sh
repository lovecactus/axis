#!/usr/bin/env bash
# Axis deployment automation for Ubuntu 24.04 LTS
# This script distills the manual checklist in DEPLOYMENT_UBUNTU24.md.

set -euo pipefail

usage() {
  cat <<EOF
Usage: sudo ./deploy_axis_ubuntu.sh <public_backend_url>

Example:
  sudo ./deploy_axis_ubuntu.sh https://47.77.228.127

The argument populates NEXT_PUBLIC_API_BASE in frontend env files and nginx server_name.
EOF
}

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run this script with sudo or as root."
  exit 1
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

PUBLIC_BACKEND_URL="$1"

DEPLOY_USER=${SUDO_USER:-ubuntu}
DEPLOY_HOME=$(getent passwd "${DEPLOY_USER}" | cut -d: -f6)
PROJECT_ROOT=/var/axis
BACKEND_DIR=${PROJECT_ROOT}/backend
FRONTEND_DIR=${PROJECT_ROOT}/frontend
BACKEND_ENV=${BACKEND_DIR}/.env
FRONTEND_ENV=${FRONTEND_DIR}/.env.production
LOG_DIR=${BACKEND_DIR}/logs
POSTGRES_DB=axis
POSTGRES_USER=axis
POSTGRES_PASSWORD=axis

echo "=== Updating system packages ==="
apt update
apt upgrade -y
apt install -y git curl build-essential pkg-config libpq-dev nginx ufw snapd

echo "=== Removing system python3-pip to avoid conflicts ==="
apt remove -y python3-pip || true

echo "=== Installing Python 3.13 (Deadsnakes) ==="
add-apt-repository ppa:deadsnakes/ppa -y
apt update
apt install -y python3.13 python3.13-venv python3.13-dev
curl -fsSL https://bootstrap.pypa.io/get-pip.py | python3.13

echo "=== Installing Node.js LTS (via NodeSource) ==="
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
npm install -g yarn

echo "=== Configuring firewall (allowing SSH and HTTP/HTTPS) ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=== Preparing deployment directory at ${PROJECT_ROOT} ==="
mkdir -p "${PROJECT_ROOT}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${PROJECT_ROOT}"

if [[ ! -d "${PROJECT_ROOT}/.git" ]]; then
  echo "=== Cloning repository ==="
  sudo -u "${DEPLOY_USER}" git clone https://github.com/lovecactus/axis "${PROJECT_ROOT}"
else
  echo "Repository already exists, skipping clone."
fi

echo "=== Setting up backend virtual environment ==="
cd "${BACKEND_DIR}"
echo "Creating venv at: ${BACKEND_DIR}/.venv"
sudo -u "${DEPLOY_USER}" python3.13 -m venv .venv
sudo -u "${DEPLOY_USER}" bash -lc "cd '${BACKEND_DIR}' && source .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"
echo "=== Installing PostgreSQL and Redis ==="
apt install -y postgresql redis-server

echo "=== Configuring PostgreSQL database and user ==="
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${POSTGRES_DB};"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${POSTGRES_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';"
sudo -u postgres psql -c "ALTER USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO ${POSTGRES_USER};"
sudo -u postgres psql -c "ALTER DATABASE ${POSTGRES_DB} OWNER TO ${POSTGRES_USER};"
sudo -u postgres psql -c "GRANT ALL ON SCHEMA public TO ${POSTGRES_USER};"
sudo -u postgres psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${POSTGRES_USER};"
sudo -u postgres psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${POSTGRES_USER};"

echo "=== Preparing backend .env file ==="
if [[ ! -f "${BACKEND_ENV}" ]]; then
  sudo -u "${DEPLOY_USER}" cp "${BACKEND_DIR}/env.example" "${BACKEND_ENV}"
fi
sudo -u "${DEPLOY_USER}" sed -i \
  -e "s#^DATABASE_URL=.*#DATABASE_URL=postgresql+psycopg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}#" \
  -e "s#^REDIS_URL=.*#REDIS_URL=redis://localhost:6379/0#" \
  "${BACKEND_ENV}"

echo "=== Running Alembic migrations ==="
sudo -u "${DEPLOY_USER}" bash -lc "cd '${BACKEND_DIR}' && source .venv/bin/activate && alembic upgrade head"

echo "=== Preparing backend logs directory ==="
mkdir -p "${LOG_DIR}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" -R "${BACKEND_DIR}"

echo "=== Installing frontend dependencies and building ==="
cd "${FRONTEND_DIR}"
sudo -u "${DEPLOY_USER}" rm -f package-lock.json
sudo -u "${DEPLOY_USER}" bash -lc "if command -v yarn >/dev/null 2>&1; then yarn cache clean --all || true; fi"
sudo -u "${DEPLOY_USER}" rm -rf "${DEPLOY_HOME}/.cache/yarn"
sudo -u "${DEPLOY_USER}" yarn install
if [[ ! -f "${FRONTEND_ENV}" ]]; then
cat <<EOF > "${FRONTEND_ENV}"
NEXT_PUBLIC_API_BASE=${PUBLIC_BACKEND_URL}
NEXT_PUBLIC_PRIVY_APP_ID=cmhu107y80098la0c0bzz57wa
EOF
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${FRONTEND_ENV}"
  echo "!! Update ${FRONTEND_ENV} with real values before launching frontend."
fi

echo "=== Building frontend (production) ==="
sudo -u "${DEPLOY_USER}" yarn build

echo "=== Writing systemd unit files ==="
cat <<EOF > /etc/systemd/system/axis-backend.service
[Unit]
Description=Axis FastAPI backend
After=network.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
WorkingDirectory=${BACKEND_DIR}
EnvironmentFile=${BACKEND_ENV}
ExecStart=${BACKEND_DIR}/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port \$BACKEND_PORT --workers 4 --log-level info
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/backend.log
StandardError=append:${LOG_DIR}/backend.log
Environment=PATH=${BACKEND_DIR}/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin

[Install]
WantedBy=multi-user.target
EOF

cat <<EOF > /etc/systemd/system/axis-frontend.service
[Unit]
Description=Axis Next.js frontend
After=network.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
WorkingDirectory=${FRONTEND_DIR}
EnvironmentFile=${FRONTEND_ENV}
ExecStart=/usr/bin/yarn start
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production PORT=3000 PATH=/usr/bin:/usr/local/bin

[Install]
WantedBy=multi-user.target
EOF

echo "=== Enabling and starting services ==="
systemctl daemon-reload
systemctl enable --now axis-backend axis-frontend

# The public URL may include protocol or trailing slash; strip these so we can reuse
# the hostname/IP for certificate and Nginx configuration.
echo "=== Nginx reverse proxy skeleton ==="
SERVER_NAME=${PUBLIC_BACKEND_URL#https://}
SERVER_NAME=${SERVER_NAME#http://}
SERVER_NAME=${SERVER_NAME%/}
DOLLAR='$'

# Decide whether the endpoint is an IP address or a hostname so the generated
# self-signed certificate contains the correct Subject Alternative Name (SAN).
if [[ "${SERVER_NAME}" =~ ^[0-9.]+$ ]]; then
  CERT_SUBJECT="/CN=${SERVER_NAME}"
  CERT_SAN="IP:${SERVER_NAME}"
else
  CERT_SUBJECT="/CN=${SERVER_NAME}"
  CERT_SAN="DNS:${SERVER_NAME}"
fi

# Generate a self-signed certificate the first time we run (subsequent runs reuse it).
# Browsers will still show a warning because the cert is not trusted by a CA,
# but it enables encrypted transport for smoke testing.
echo "=== Generating self-signed TLS certificate for ${SERVER_NAME} ==="
mkdir -p /etc/ssl/private /etc/ssl/certs
if [[ ! -f /etc/ssl/private/axis-selfsigned.key || ! -f /etc/ssl/certs/axis-selfsigned.crt ]]; then
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout /etc/ssl/private/axis-selfsigned.key \
    -out /etc/ssl/certs/axis-selfsigned.crt \
    -subj "${CERT_SUBJECT}" \
    -addext "subjectAltName=${CERT_SAN}"
fi

cat <<EOF > /etc/nginx/sites-available/axis.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    return 301 https://${DOLLAR}host${DOLLAR}request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${SERVER_NAME};

    ssl_certificate /etc/ssl/certs/axis-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/axis-selfsigned.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host ${DOLLAR}host;
        proxy_set_header X-Real-IP ${DOLLAR}remote_addr;
        proxy_set_header X-Forwarded-For ${DOLLAR}proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto ${DOLLAR}scheme;
    }

    location = /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
        proxy_set_header Host ${DOLLAR}host;
        proxy_set_header X-Real-IP ${DOLLAR}remote_addr;
        proxy_set_header X-Forwarded-For ${DOLLAR}proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto ${DOLLAR}scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host ${DOLLAR}host;
        proxy_set_header X-Real-IP ${DOLLAR}remote_addr;
        proxy_set_header X-Forwarded-For ${DOLLAR}proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto ${DOLLAR}scheme;
        proxy_set_header Upgrade ${DOLLAR}http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
ln -sf /etc/nginx/sites-available/axis.conf /etc/nginx/sites-enabled/axis.conf
nginx -t
systemctl reload nginx

echo "=== Final checks ==="
systemctl status axis-backend --no-pager
systemctl status axis-frontend --no-pager
curl -I http://127.0.0.1:8000/docs || true
curl -I http://127.0.0.1:3000 || true

echo "Deployment script completed. Review configuration files for secrets and update domain/TLS as needed."

