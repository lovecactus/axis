# Axis Deployment Guide (Ubuntu 24.04 LTS)

Comprehensive checklist for migrating and operating the Axis stack on Ubuntu 24.04 (and 24.0x updates). Adjust paths, domains, and secrets to match your environment.

---

## 0. Automation Cheat Sheet

> Replace `<PATH_TO_PEM>` with the path to your SSH key and `<SERVER_IP_OR_DOMAIN>` with your public hostname or IP.

- **Fresh deployment (run from your workstation):**
  ```bash
  ssh -i <PATH_TO_PEM> root@<SERVER_IP_OR_DOMAIN> 'mkdir -p /opt/axis-tools'
  scp -i <PATH_TO_PEM> scripts/deploy_axis_ubuntu.sh root@<SERVER_IP_OR_DOMAIN>:/opt/axis-tools/deploy_axis_ubuntu.sh
  ssh -i <PATH_TO_PEM> root@<SERVER_IP_OR_DOMAIN> \
    'chmod +x /opt/axis-tools/deploy_axis_ubuntu.sh && /opt/axis-tools/deploy_axis_ubuntu.sh https://<SERVER_IP_OR_DOMAIN>'
  ```
- **Apply new commits / rebuild services (run from your workstation after pushing code):**
  ```bash
  ssh -i <PATH_TO_PEM> root@<SERVER_IP_OR_DOMAIN> 'mkdir -p /opt/axis-tools'
  scp -i <PATH_TO_PEM> scripts/update_axis.sh root@<SERVER_IP_OR_DOMAIN>:/opt/axis-tools/update_axis.sh
  ssh -i <PATH_TO_PEM> root@<SERVER_IP_OR_DOMAIN> \
    'chmod +x /opt/axis-tools/update_axis.sh && /opt/axis-tools/update_axis.sh'
  ```
- **Tail logs (pick the service you care about):**
  ```bash
  ssh -i <PATH_TO_PEM> root@<SERVER_IP_OR_DOMAIN> 'journalctl -u axis-backend -f'
  ssh -i <PATH_TO_PEM> root@<SERVER_IP_OR_DOMAIN> 'journalctl -u axis-frontend -f'
  ```
- Both scripts assume the repo lives at `/var/axis` on the server. Adjust paths if your layout differs.

---

## 1. Server Baseline

> **All shell commands assume you are already logged into the Ubuntu server via SSH. Run them directly in that session (no need to wrap commands with an extra `ssh` call).**

- Update packages and install tooling:
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo apt install -y git curl build-essential pkg-config libpq-dev \
      nginx ufw snapd
  sudo apt remove -y python3-pip || true    # avoid conflicts with get-pip
  ```
- Install Python 3.13 from Deadsnakes:
  ```bash
  sudo add-apt-repository ppa:deadsnakes/ppa -y
  sudo apt install -y python3.13 python3.13-venv python3.13-dev
  curl -fsSL https://bootstrap.pypa.io/get-pip.py | sudo python3.13
  ```
  - Removing the distro `python3-pip` package ensures `get-pip.py` can upgrade pip without hitting the `uninstall-no-record-file` error.
- Install Node.js (choose LTS or current):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
  > Alternative: install `nvm` for per-user Node management.

- Configure firewall (optional but recommended):
  ```bash
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'  # opens 80/443
  sudo ufw enable
  ```

---

## 2. Directory Layout

1. Create deployment tree (adjust owner as needed):
   ```bash
   sudo mkdir -p /var/axis
   sudo chown $USER:$USER /var/axis
   ```
2. Clone the repository:
   ```bash
   git clone https://github.com/lovecactus/axis /var/axis
   ```
3. Copy secrets and configuration:
   - `cp /var/axis/backend/env.example /var/axis/backend/.env`
   - Fill in database credentials, JWT secrets, Redis URL, third-party keys.

---

## 3. Backend Setup (FastAPI)

1. Create and activate virtualenv:
   ```bash
   cd /var/axis/backend
   python3.13 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
2. Provision PostgreSQL + Redis (local or managed):
   ```bash
   sudo apt install -y postgresql redis-server
   sudo -u postgres psql -c "CREATE DATABASE axis;"
   sudo -u postgres psql -c "CREATE USER axis WITH PASSWORD 'axis';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE axis TO axis;"
   sudo -u postgres psql -c "ALTER DATABASE axis OWNER TO axis;"
   sudo -u postgres psql -c "GRANT ALL ON SCHEMA public TO axis;"
   sudo -u postgres psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO axis;"
   sudo -u postgres psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO axis;"
   ```
   - Harden configs (`/etc/postgresql/.../pg_hba.conf`, `/etc/redis/redis.conf`).
3. Run Alembic migrations:
   ```bash
   source /var/axis/backend/.venv/bin/activate
   cd /var/axis/backend
   alembic upgrade head
   ```
4. Smoke-test locally:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info
   ```
   - Visit http://127.0.0.1:8000/docs on the server.

---

## 4. Frontend Setup (Next.js)
1. Install dependencies and build:
   ```bash
   cd /var/axis/frontend
   # Check if npm is installed, install if needed
  if ! command -v npm &> /dev/null; then
      sudo apt update
      sudo apt install -y nodejs npm
  fi
  npm install
  sudo npm install -g yarn
  yarn cache clean --all || true
  rm -rf ~/.cache/yarn
  rm -f package-lock.json          # avoid mixing npm/yarn lockfiles
  yarn install
  cat <<'EOF' > /var/axis/frontend/.env.production
  NEXT_PUBLIC_API_BASE=https://YOUR_PUBLIC_BACKEND_URL/api
  NEXT_PUBLIC_PRIVY_APP_ID=cmhu107y80098la0c0bzz57wa
  EOF
  yarn build
   ```
   - Update `NEXT_PUBLIC_API_BASE` with your actual backend URL (use HTTPS in production).
   - Verify the build completes successfully before proceeding.
   - Clearing the Yarn cache prevents partial archives from prior runs from causing `ENOENT` errors during `yarn install`.

2. Optional: for development mode with HTTPS previews:
   ```bash
   # Generate self-signed certificates first
   mkdir -p /var/axis/frontend/certs
   openssl req -x509 -newkey rsa:4096 -keyout /var/axis/frontend/certs/dev.key -out /var/axis/frontend/certs/dev.crt -days 365 -nodes -subj "/CN=localhost"
   
   # Run development server with HTTPS
   cd /var/axis/frontend
   yarn dev --experimental-https \
     --experimental-https-key certs/dev.key \
     --experimental-https-cert certs/dev.crt \
     --hostname 0.0.0.0
   ```
3. Optional: runtime env overrides for dev only:
   ```bash
   cat <<'EOF' > /var/axis/frontend/.env.local
   NEXT_PUBLIC_API_BASE=http://YOUR_DEV_BACKEND_URL
   NODE_ENV=development
   EOF
   ```
---

## 5. Systemd Services

### Backend (`/etc/systemd/system/axis-backend.service`)

```
[Unit]
Description=Axis FastAPI backend
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/axis/backend
EnvironmentFile=/var/axis/backend/.env
ExecStart=/var/axis/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT --workers 4 --log-level info
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/axis/backend/logs/backend.log
StandardError=append:/var/axis/backend/logs/backend.log
Environment=PATH=/var/axis/backend/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin

[Install]
WantedBy=multi-user.target
```

### Frontend (`/etc/systemd/system/axis-frontend.service`)

```
[Unit]
Description=Axis Next.js frontend
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/axis/frontend
EnvironmentFile=/var/axis/frontend/.env.production
ExecStart=/usr/bin/yarn start
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production PORT=3000 PATH=/usr/bin:/usr/local/bin

[Install]
WantedBy=multi-user.target
```

Ensure the backend user owns the app and log paths:
```bash
sudo chown -R ubuntu:ubuntu /var/axis/backend
sudo mkdir -p /var/axis/backend/logs
sudo chown -R ubuntu:ubuntu /var/axis/backend/logs
```

Activate both services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now axis-backend axis-frontend
sudo systemctl status axis-backend axis-frontend
```

---

## 6. Reverse Proxy (Nginx)

1. Create a **self-signed TLS certificate** (works for IPs, browsers will warn):
   ```bash
   sudo mkdir -p /etc/ssl/private /etc/ssl/certs
   sudo openssl req -x509 -nodes -days 365 \
     -newkey rsa:2048 \
     -keyout /etc/ssl/private/axis-selfsigned.key \
     -out /etc/ssl/certs/axis-selfsigned.crt \
     -subj "/CN=47.77.228.127" \
     -addext "subjectAltName=IP:47.77.228.127"
   ```
   > Replace the IP with your server IP or use `DNS:your.domain` for a hostname.

2. Create `/etc/nginx/sites-available/axis.conf`:
   ```
   server {
       listen 80;
       listen [::]:80;
       server_name 47.77.228.127;  # replace with your IP or domain

       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name 47.77.228.127;

       ssl_certificate /etc/ssl/certs/axis-selfsigned.crt;
       ssl_certificate_key /etc/ssl/private/axis-selfsigned.key;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;

       location /api/ {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location = /openapi.json {
           proxy_pass http://127.0.0.1:8000/openapi.json;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location / {
           proxy_pass http://127.0.0.1:3000/;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
3. Enable site and reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/axis.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. HTTPS via Certbot (recommended when you have a real domain):
   ```bash
   sudo snap install --classic certbot
   sudo certbot --nginx -d example.com -d www.example.com
   sudo certbot renew --dry-run
   ```

---

## 7. Background Execution (nohup fallback)

If systemd is unavailable, start backend manually:
```bash
cd /var/axis/backend
nohup /var/axis/backend/.venv/bin/uvicorn app.main:app \
  --host 0.0.0.0 --port 8000 --workers 4 --log-level info \
  > /var/axis/backend/logs/uvicorn.out 2>&1 &
disown
```
> Systemd remains the preferred approach for restarts and boot persistence.

---

## 8. Verification

- Backend:
  ```bash
  curl http://127.0.0.1:8000/docs
  curl http://PUBLIC_IP_OR_DOMAIN/api/docs
  ```
- Frontend:
  ```bash
  curl http://127.0.0.1:3000
  curl http://PUBLIC_IP_OR_DOMAIN/
  curl -k https://PUBLIC_IP_OR_DOMAIN/   # use -k for self-signed certs
  ```
- Logs:
  ```bash
  sudo journalctl -u axis-backend -f
  sudo journalctl -u axis-frontend -f
  sudo tail -f /var/log/nginx/access.log
  ```

---

## 9. Deployment & Maintenance

- Pull updates:
  ```bash
  cd /var/axis
  git pull
  ```
- Backend refresh:
  ```bash
  cd /var/axis/backend
  source .venv/bin/activate
  pip install -r requirements.txt
  alembic upgrade head
  sudo systemctl restart axis-backend
  ```
- Frontend refresh:
  ```bash
  cd /var/axis/frontend
  yarn install          # only if deps changed
  yarn build
  sudo systemctl restart axis-frontend
  ```
- Security updates:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

### Quick Refresh Script

These steps are kept for reference if you prefer manual control. Otherwise, see **Section 0 – Automation Cheat Sheet** for the `/opt/axis-tools/update_axis.sh` helper that wraps them for you.

---

## 10. Troubleshooting Checklist

- **App unreachable externally**: ensure services bind to `0.0.0.0`, firewall allows traffic, Nginx proxies to correct ports.
- **CORS errors**: confirm backend CORS settings allow frontend origin.
- **Environment vars missing**: verify `.env` files and systemd `EnvironmentFile` paths.
- **TLS renewal failures**: check `sudo certbot renew --dry-run`, inspect `/var/log/letsencrypt/letsencrypt.log`.
- **Out-of-date Node/Python**: rerun the install commands with newer NodeSource script or update the virtualenv.

---

Keep this checklist in version control so future deployments stay consistent. Update steps whenever infrastructure, dependencies, or paths change.
