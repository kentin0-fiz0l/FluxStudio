# Staging Environment Setup Guide

**Purpose:** Create a safe testing environment that mirrors production
**Timeline:** 2-3 hours
**Cost:** ~$12/month (DigitalOcean droplet)

---

## 🎯 Why Staging is Critical

Today's deployment attempt showed why staging is essential:
- ❌ Production crashed due to missing dependencies
- ❌ 15 minutes of downtime
- ❌ 30+ service restarts
- ❌ Had to rollback

**With staging, we would have:**
- ✅ Caught dependency issues before production
- ✅ Tested database migrations safely
- ✅ Verified services start correctly
- ✅ Zero production impact

---

## 🏗️ Staging Environment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  LOCAL DEVELOPMENT                                          │
│  ├─ Week 1 Security Sprint Code                            │
│  ├─ npm install --legacy-peer-deps                         │
│  ├─ Run tests locally                                      │
│  └─ Push to Git                                            │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  STAGING (staging.fluxstudio.art)                          │
│  ├─ Clone of production server                             │
│  ├─ Deploy new code here first                             │
│  ├─ Run all tests                                          │
│  ├─ Test database migrations                               │
│  └─ Verify everything works                                │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ ✅ If tests pass
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  PRODUCTION (fluxstudio.art)                                │
│  ├─ Deploy same code from staging                          │
│  ├─ Already tested, high confidence                        │
│  ├─ Minimal risk of issues                                 │
│  └─ Happy users!                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] DigitalOcean account (or AWS/GCP)
- [ ] SSH key configured
- [ ] Access to production server (for cloning)
- [ ] Domain control (for staging.fluxstudio.art subdomain)

---

## 🚀 Step-by-Step Setup

### Step 1: Create Staging Droplet (10 minutes)

**Using DigitalOcean CLI:**
```bash
# Install doctl if not already installed
brew install doctl

# Authenticate
doctl auth init

# Create droplet (same specs as production)
doctl compute droplet create fluxstudio-staging \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header) \
  --enable-monitoring \
  --enable-backups \
  --tag-name staging,fluxstudio

# Get the IP address
doctl compute droplet list --format ID,Name,PublicIPv4
```

**Using DigitalOcean Web Interface:**
1. Go to https://cloud.digitalocean.com/droplets
2. Click "Create Droplet"
3. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic - $24/month (2 vCPU, 4GB RAM, 80GB SSD)
   - **Datacenter:** Same as production (NYC1)
   - **Additional Options:**
     - ✅ Monitoring
     - ✅ Automated backups
   - **SSH Keys:** Add your key
   - **Hostname:** fluxstudio-staging
4. Click "Create Droplet"
5. Note the IP address

**Save the IP:**
```bash
export STAGING_IP="YOUR_DROPLET_IP"
echo "STAGING_IP=$STAGING_IP" >> ~/.bashrc
```

---

### Step 2: Configure DNS (5 minutes)

**Create subdomain for staging:**

1. Go to your DNS provider (e.g., Cloudflare, DigitalOcean)
2. Add A record:
   - **Name:** staging
   - **Value:** [Staging Droplet IP]
   - **TTL:** 300 (5 minutes)

**Verify DNS propagation:**
```bash
dig staging.fluxstudio.art +short
# Should return your staging IP
```

Wait 5-10 minutes for DNS to propagate globally.

---

### Step 3: Initial Server Setup (15 minutes)

**Connect to staging server:**
```bash
ssh root@$STAGING_IP
```

**Update system and install basics:**
```bash
# Update package list
apt update && apt upgrade -y

# Install essential packages
apt install -y \
  curl \
  wget \
  git \
  build-essential \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw

# Enable firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

**Install Node.js (same version as production):**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify versions
node --version  # Should be v18.x.x
npm --version   # Should be 10.x.x

# Install PM2 globally
npm install -g pm2
```

**Install PostgreSQL:**
```bash
# Install PostgreSQL 14
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE fluxstudio_staging;
CREATE USER fluxstudio WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE fluxstudio_staging TO fluxstudio;
\q
EOF
```

**Install Redis:**
```bash
# Install Redis
apt install -y redis-server

# Configure Redis for production-like settings
sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf

# Restart Redis
systemctl restart redis-server
systemctl enable redis-server

# Test Redis
redis-cli ping  # Should return PONG
```

---

### Step 4: Clone Production Data (20 minutes)

**Option A: Copy from production backup (Recommended)**

```bash
# On production server
ssh root@167.172.208.61 << 'EOF'
cd /var/www
# Create fresh backup
tar czf fluxstudio-staging-clone-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env.local \
  fluxstudio/

# Export database
pg_dump -U fluxstudio fluxstudio > /tmp/fluxstudio-db-$(date +%Y%m%d).sql
EOF

# Copy to local machine
scp root@167.172.208.61:/var/www/fluxstudio-staging-clone-*.tar.gz .
scp root@167.172.208.61:/tmp/fluxstudio-db-*.sql .

# Copy to staging
scp fluxstudio-staging-clone-*.tar.gz root@$STAGING_IP:/tmp/
scp fluxstudio-db-*.sql root@$STAGING_IP:/tmp/

# On staging server
ssh root@$STAGING_IP << 'EOF'
# Extract application files
mkdir -p /var/www/fluxstudio
tar xzf /tmp/fluxstudio-staging-clone-*.tar.gz -C /var/www/fluxstudio --strip-components=1

# Import database
psql -U fluxstudio -d fluxstudio_staging < /tmp/fluxstudio-db-*.sql

# Set permissions
chown -R www-data:www-data /var/www/fluxstudio
EOF
```

**Option B: Fresh install (Faster but no production data)**

```bash
ssh root@$STAGING_IP << 'EOF'
# Clone from Git (if you have a repository)
cd /var/www
git clone YOUR_GIT_REPO fluxstudio

# Or create fresh directory
mkdir -p /var/www/fluxstudio

# Set permissions
chown -R www-data:www-data /var/www/fluxstudio
EOF
```

---

### Step 5: Configure Staging Environment (15 minutes)

**Create staging environment file:**

```bash
ssh root@$STAGING_IP << 'EOF'
cd /var/www/fluxstudio

# Create .env.staging
cat > .env.staging << 'ENVEOF'
# Staging Environment Configuration
NODE_ENV=staging

# Database (Staging)
DATABASE_URL=postgresql://fluxstudio:CHANGE_THIS@localhost/fluxstudio_staging
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=fluxstudio_staging
POSTGRES_USER=fluxstudio
POSTGRES_PASSWORD=CHANGE_THIS

# Redis (Local)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (Use different secret than production!)
JWT_SECRET=STAGING_SECRET_CHANGE_THIS
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth (Staging credentials)
GOOGLE_CLIENT_ID=STAGING_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=STAGING_GOOGLE_CLIENT_SECRET
VITE_GOOGLE_CLIENT_ID=STAGING_GOOGLE_CLIENT_ID

# Server Ports
PORT=3001
MESSAGING_PORT=3004
COLLABORATION_PORT=4000

# URLs
FRONTEND_URL=https://staging.fluxstudio.art
BACKEND_URL=https://staging.fluxstudio.art
API_URL=https://staging.fluxstudio.art/api

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600

# Email (Use test account for staging)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=MAILTRAP_USER
SMTP_PASS=MAILTRAP_PASS
SMTP_FROM=staging@fluxstudio.art

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true

# Security
HELMET_ENABLED=true
CORS_ENABLED=true
RATE_LIMIT_ENABLED=true

# Feature Flags
ENABLE_JWT_REFRESH_TOKENS=true
ENABLE_XSS_PROTECTION=true
ENABLE_CSP_HEADERS=true

# Staging-specific
STAGING_MODE=true
LOG_LEVEL=debug
ENVEOF

# Link to .env
ln -sf .env.staging .env

# Set permissions
chmod 600 .env.staging .env
EOF
```

**Create Google OAuth credentials for staging:**

1. Go to Google Cloud Console
2. Create new OAuth 2.0 Client ID
3. Name: "FluxStudio Staging"
4. Authorized JavaScript origins:
   - `https://staging.fluxstudio.art`
   - `http://localhost:5173` (for local testing against staging API)
5. Authorized redirect URIs:
   - `https://staging.fluxstudio.art/api/auth/google/callback`
6. Copy Client ID and Secret to `.env.staging`

---

### Step 6: Install Dependencies & Build (15 minutes)

```bash
ssh root@$STAGING_IP << 'EOF'
cd /var/www/fluxstudio

# Install dependencies (use package.json from local dev)
npm install --legacy-peer-deps

# Build frontend
npm run build

# Create uploads directory
mkdir -p uploads
chown www-data:www-data uploads
EOF
```

---

### Step 7: Configure Nginx (10 minutes)

```bash
ssh root@$STAGING_IP << 'EOF'
# Create Nginx configuration
cat > /etc/nginx/sites-available/fluxstudio-staging << 'NGINXEOF'
# FluxStudio Staging Server
server {
    listen 80;
    server_name staging.fluxstudio.art;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.fluxstudio.art;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/staging.fluxstudio.art/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.fluxstudio.art/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), microphone=()" always;

    # Staging banner (visual indicator)
    add_header X-Staging-Environment "true" always;

    # Root directory
    root /var/www/fluxstudio/build;
    index index.html;

    # Max upload size
    client_max_body_size 100M;

    # Frontend (React app)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to auth service
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # Health endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }

    # WebSocket proxy for collaboration
    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logs
    access_log /var/log/nginx/staging.fluxstudio.art.access.log;
    error_log /var/log/nginx/staging.fluxstudio.art.error.log;
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/fluxstudio-staging /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Don't reload yet - need SSL first
EOF
```

---

### Step 8: Get SSL Certificate (5 minutes)

```bash
ssh root@$STAGING_IP << 'EOF'
# Get Let's Encrypt certificate
certbot --nginx \
  -d staging.fluxstudio.art \
  --non-interactive \
  --agree-tos \
  --email YOUR_EMAIL@example.com \
  --redirect

# Reload Nginx
systemctl reload nginx
EOF
```

---

### Step 9: Start Services (5 minutes)

```bash
ssh root@$STAGING_IP << 'EOF'
cd /var/www/fluxstudio

# Start services with PM2
pm2 start ecosystem.config.js --env staging

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup systemd
# (Run the command PM2 outputs)

# Check status
pm2 status
EOF
```

---

### Step 10: Verify Staging Environment (10 minutes)

**Run verification checks:**

```bash
# Check all services are running
ssh root@$STAGING_IP "pm2 status"

# Check health endpoint
curl -s https://staging.fluxstudio.art/health | jq

# Check frontend loads
curl -s https://staging.fluxstudio.art | grep -o "<title>.*</title>"

# Check auth endpoint
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://staging.fluxstudio.art/api/auth/me

# Check WebSocket
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://staging.fluxstudio.art/ws

# Check logs
ssh root@$STAGING_IP "pm2 logs --lines 20 --nostream"
```

**Expected results:**
- ✅ All services: online
- ✅ Health: `{"status":"ok"}`
- ✅ Frontend: `<title>Flux Studio - Design in Motion</title>`
- ✅ Auth: HTTP 401 (correct - unauthenticated)
- ✅ Logs: No errors

---

## 🎯 Staging Environment Checklist

After setup, verify all checkboxes:

### Infrastructure
- [ ] Droplet created and accessible
- [ ] DNS pointing to staging server
- [ ] SSL certificate installed
- [ ] Nginx configured and running
- [ ] Firewall configured (UFW)

### Database
- [ ] PostgreSQL installed
- [ ] Database created: fluxstudio_staging
- [ ] User created with proper permissions
- [ ] Production data imported (if using Option A)

### Services
- [ ] Node.js 18.x installed
- [ ] PM2 installed globally
- [ ] Redis installed and running
- [ ] All 3 services started (auth, messaging, collaboration)
- [ ] PM2 configured for auto-start on reboot

### Application
- [ ] Code deployed
- [ ] Dependencies installed
- [ ] Frontend built
- [ ] Environment variables configured
- [ ] Google OAuth credentials created (staging)
- [ ] Uploads directory created

### Verification
- [ ] https://staging.fluxstudio.art loads
- [ ] /health endpoint returns 200 OK
- [ ] /api endpoints respond
- [ ] WebSocket connection works
- [ ] No errors in PM2 logs
- [ ] All services show "online" status

---

## 🚀 Using Staging Environment

### Deploying to Staging

**From local machine:**

```bash
# Build locally
npm run build

# Deploy to staging
rsync -avz --delete --exclude=node_modules \
  build/ \
  lib/ \
  middleware/ \
  config/ \
  database/ \
  server-auth.js \
  server-messaging.js \
  server-collaboration.js \
  package.json \
  ecosystem.config.js \
  root@$STAGING_IP:/var/www/fluxstudio/

# Update .env if needed
scp .env.production root@$STAGING_IP:/var/www/fluxstudio/.env.staging

# Install dependencies on staging
ssh root@$STAGING_IP "cd /var/www/fluxstudio && npm install --legacy-peer-deps"

# Restart services
ssh root@$STAGING_IP "cd /var/www/fluxstudio && pm2 restart all"

# Verify
curl https://staging.fluxstudio.art/health
```

### Testing on Staging

**Manual testing:**
1. Open https://staging.fluxstudio.art in browser
2. Test user registration
3. Test Google OAuth login
4. Test file uploads
5. Test collaboration features
6. Check for console errors

**Automated testing:**
```bash
# Run tests against staging API
API_URL=https://staging.fluxstudio.art npm test

# Load testing
npx artillery quick --duration 60 --rate 10 https://staging.fluxstudio.art
```

---

## 🔄 Staging → Production Workflow

Once staging tests pass:

```bash
# 1. Tag the release
git tag -a v1.1.0 -m "Week 1 Security Sprint"
git push origin v1.1.0

# 2. Deploy to production (exact same files as staging)
./deploy-to-production.sh

# 3. Monitor production
ssh root@167.172.208.61 "pm2 logs --lines 50"

# 4. If issues occur, rollback
# (Use rollback procedure from DEPLOYMENT_ATTEMPT_REPORT.md)
```

---

## 💰 Cost Breakdown

**DigitalOcean Droplet:**
- **Plan:** Basic ($24/month)
- **Specs:** 2 vCPU, 4GB RAM, 80GB SSD
- **Backups:** +$4.80/month (20% of droplet cost)
- **Monitoring:** Free

**Total:** ~$29/month

**Cost-saving options:**
- Use smaller droplet ($12/month) if staging doesn't need production specs
- Destroy droplet when not in use (save snapshot)
- Use shared database with production (not recommended)

---

## 🛠️ Maintenance

### Weekly Tasks
- [ ] Update system packages: `apt update && apt upgrade`
- [ ] Check PM2 logs for errors
- [ ] Verify SSL certificate renewal
- [ ] Test backup/restore procedure

### Monthly Tasks
- [ ] Refresh production data snapshot
- [ ] Review and clean old logs
- [ ] Update Node.js/npm if needed
- [ ] Security audit

### As Needed
- [ ] Test new features before production deployment
- [ ] Database migration testing
- [ ] Load testing
- [ ] Breaking change testing

---

## 🆘 Troubleshooting

### Staging server not accessible
```bash
# Check droplet status
doctl compute droplet list

# Check firewall
ssh root@$STAGING_IP "ufw status"

# Check Nginx
ssh root@$STAGING_IP "systemctl status nginx"
```

### SSL certificate issues
```bash
# Renew manually
ssh root@$STAGING_IP "certbot renew --nginx"

# Check certificate
curl -vI https://staging.fluxstudio.art 2>&1 | grep "expire"
```

### Services won't start
```bash
# Check logs
ssh root@$STAGING_IP "pm2 logs --err --lines 50"

# Try starting manually
ssh root@$STAGING_IP "cd /var/www/fluxstudio && node server-auth.js"
```

### Database connection issues
```bash
# Check PostgreSQL status
ssh root@$STAGING_IP "systemctl status postgresql"

# Test connection
ssh root@$STAGING_IP "psql -U fluxstudio -d fluxstudio_staging -c 'SELECT version();'"
```

---

## ✅ Success!

You now have a fully functional staging environment that:
- ✅ Mirrors production exactly
- ✅ Allows safe testing before production deployments
- ✅ Prevents downtime from deployment issues
- ✅ Enables confident, rapid deployments

**Next steps:**
1. Deploy Week 1 Security Sprint to staging
2. Test thoroughly
3. Deploy to production with confidence

**Estimated time to deploy to production after staging tests pass:** 15 minutes

---

**Setup Guide Version:** 1.0
**Last Updated:** 2025-10-15
**Next Review:** Before first staging deployment
