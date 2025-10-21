#!/bin/bash

# FluxStudio DigitalOcean Deployment Script
# Usage: ./deploy-to-digitalocean.sh

set -e

echo "🚀 FluxStudio DigitalOcean Deployment"
echo "======================================"

# Configuration
DROPLET_IP=""
DOMAIN="fluxstudio.art"
APP_NAME="fluxstudio"
DEPLOY_USER="deploy"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if DROPLET_IP is set
if [ -z "$DROPLET_IP" ]; then
    echo -n "Enter your DigitalOcean Droplet IP: "
    read DROPLET_IP
fi

echo ""
echo "📋 Deployment Configuration:"
echo "   Domain: $DOMAIN"
echo "   Droplet IP: $DROPLET_IP"
echo "   App Name: $APP_NAME"
echo ""

# Step 1: Create deployment package
print_status "Creating deployment package..."
rm -rf dist
mkdir -p dist

# Copy necessary files
cp -r public dist/
cp -r server dist/
cp -r database dist/
cp package.json dist/
cp package-lock.json dist/

# Create production environment file
cat > dist/.env.production << EOF
NODE_ENV=production
PORT=3000
DOMAIN=$DOMAIN
DATABASE_PATH=./database/fluxstudio.db
EOF

# Create PM2 ecosystem file
cat > dist/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'fluxstudio',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create nginx configuration
cat > dist/nginx.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory
    root /var/www/$APP_NAME/public;
    index index.html;

    # Serve static files
    location / {
        try_files \$uri \$uri/ @backend;
    }

    # Proxy API requests to Node.js backend
    location @backend {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    gzip_vary on;
}
EOF

# Create deployment tarball
print_status "Creating deployment package..."
cd dist
tar -czf ../fluxstudio-deploy.tar.gz .
cd ..

print_status "Deployment package created: fluxstudio-deploy.tar.gz"

# Step 2: Deploy to DigitalOcean
echo ""
echo "📤 Deploying to DigitalOcean Droplet..."
echo ""

# Copy files to server
print_status "Copying files to droplet..."
scp fluxstudio-deploy.tar.gz root@$DROPLET_IP:/tmp/

# SSH into server and deploy
print_status "Connecting to droplet and deploying..."
ssh root@$DROPLET_IP << 'ENDSSH'
set -e

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Create application directory
mkdir -p /var/www/fluxstudio
cd /var/www/fluxstudio

# Extract deployment package
tar -xzf /tmp/fluxstudio-deploy.tar.gz

# Install dependencies
npm ci --production

# Create logs directory
mkdir -p logs

# Copy nginx configuration
cp nginx.conf /etc/nginx/sites-available/fluxstudio
ln -sf /etc/nginx/sites-available/fluxstudio /etc/nginx/sites-enabled/

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Start application with PM2
pm2 delete fluxstudio || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "✅ Deployment complete!"
ENDSSH

print_status "Deployment completed successfully!"

# Step 3: Setup SSL with Let's Encrypt
echo ""
echo "🔒 Setting up SSL with Let's Encrypt..."
echo ""

ssh root@$DROPLET_IP << ENDSSH
# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email hello@$DOMAIN

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "✅ SSL setup complete!"
ENDSSH

# Step 4: DNS Configuration Instructions
echo ""
echo "======================================"
print_status "Deployment Complete!"
echo ""
echo "📌 Next Steps:"
echo ""
echo "1. Configure DNS at your domain registrar:"
echo "   • A Record: @ → $DROPLET_IP"
echo "   • A Record: www → $DROPLET_IP"
echo "   • MX Record: @ → mail.$DOMAIN (priority: 10)"
echo ""
echo "2. For email setup, add these records:"
echo "   • MX: @ → mx1.privateemail.com (priority: 10)"
echo "   • MX: @ → mx2.privateemail.com (priority: 20)"
echo "   • TXT: @ → v=spf1 include:spf.privateemail.com ~all"
echo ""
echo "3. Your website will be available at:"
echo "   • https://$DOMAIN"
echo "   • https://www.$DOMAIN"
echo ""
echo "======================================"