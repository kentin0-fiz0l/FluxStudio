#!/bin/bash

# FluxStudio - Deploy using DigitalOcean CLI (doctl)
# Simpler deployment using doctl

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 FluxStudio Deployment with doctl${NC}"
echo "======================================"

# Configuration
DROPLET_NAME="FluxStudio-Droplet"
DOMAIN="fluxstudio.art"
REGION="sfo2"
SIZE="s-1vcpu-1gb"
IMAGE="ubuntu-22-04-x64"

# Check if authenticated
echo -e "\n${YELLOW}Checking doctl authentication...${NC}"
if ! ~/bin/doctl account get &>/dev/null; then
    echo "Please authenticate doctl first:"
    echo "~/bin/doctl auth init"
    exit 1
fi

echo -e "${GREEN}✓${NC} Authenticated with DigitalOcean"

# Step 1: Create droplet
echo -e "\n${YELLOW}Creating droplet...${NC}"

# Check if droplet already exists
EXISTING_DROPLET=$(~/bin/doctl compute droplet list --format Name,ID --no-header | grep "$DROPLET_NAME" | awk '{print $2}')

if [ ! -z "$EXISTING_DROPLET" ]; then
    echo -e "${YELLOW}Droplet already exists with ID: $EXISTING_DROPLET${NC}"
    echo -n "Use existing droplet? (y/n): "
    read USE_EXISTING

    if [ "$USE_EXISTING" != "y" ]; then
        echo "Exiting..."
        exit 0
    fi
    DROPLET_ID=$EXISTING_DROPLET
else
    # Create new droplet
    DROPLET_ID=$(~/bin/doctl compute droplet create $DROPLET_NAME \
        --size $SIZE \
        --image $IMAGE \
        --region $REGION \
        --ssh-keys $(~/bin/doctl compute ssh-key list --format ID --no-header | head -1) \
        --wait \
        --format ID \
        --no-header)

    echo -e "${GREEN}✓${NC} Droplet created with ID: $DROPLET_ID"

    # Wait for droplet to be ready
    echo "Waiting for droplet to be ready..."
    sleep 30
fi

# Get droplet IP
DROPLET_IP=$(~/bin/doctl compute droplet get $DROPLET_ID --format PublicIPv4 --no-header)
echo -e "${GREEN}✓${NC} Droplet IP: $DROPLET_IP"

# Step 2: Setup DNS
echo -e "\n${YELLOW}Configuring DNS...${NC}"

# Check if domain exists
if ! ~/bin/doctl compute domain get $DOMAIN &>/dev/null; then
    ~/bin/doctl compute domain create $DOMAIN --ip-address $DROPLET_IP
    echo -e "${GREEN}✓${NC} Domain created"
else
    echo "Domain already exists"
fi

# Create/update DNS records
~/bin/doctl compute domain records create $DOMAIN --record-type A --record-name @ --record-data $DROPLET_IP --record-ttl 3600 &>/dev/null || true
~/bin/doctl compute domain records create $DOMAIN --record-type A --record-name www --record-data $DROPLET_IP --record-ttl 3600 &>/dev/null || true

echo -e "${GREEN}✓${NC} DNS records configured"

# Step 3: Setup droplet
echo -e "\n${YELLOW}Setting up droplet...${NC}"

# Wait for SSH
echo "Waiting for SSH..."
for i in {1..30}; do
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH ready'" 2>/dev/null; then
        break
    fi
    sleep 5
done

# Run setup commands
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'SETUP'
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y nginx nodejs npm git ufw certbot python3-certbot-nginx

# Install PM2
npm install -g pm2

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Create app directory
mkdir -p /var/www/fluxstudio

echo "✓ Droplet setup complete"
SETUP

# Step 4: Deploy application
echo -e "\n${YELLOW}Deploying application...${NC}"

# Create deployment package
rm -rf dist
mkdir -p dist
cp -r public dist/
cp -r server dist/
cp -r database dist/
cp package.json dist/
cp package-lock.json dist/

# Create production config
cat > dist/.env << EOF
NODE_ENV=production
PORT=3000
DOMAIN=$DOMAIN
EOF

cat > dist/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fluxstudio',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Package and deploy
cd dist && tar -czf ../fluxstudio.tar.gz . && cd ..
scp -o StrictHostKeyChecking=no fluxstudio.tar.gz root@$DROPLET_IP:/tmp/

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'DEPLOY'
set -e

cd /var/www/fluxstudio
tar -xzf /tmp/fluxstudio.tar.gz
npm ci --production

# Configure Nginx
cat > /etc/nginx/sites-available/fluxstudio << 'NGINX'
server {
    listen 80;
    server_name fluxstudio.art www.fluxstudio.art;

    root /var/www/fluxstudio/public;
    index index.html;

    location / {
        try_files $uri $uri/ @backend;
    }

    location @backend {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/fluxstudio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start app with PM2
pm2 delete fluxstudio 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "✓ Application deployed"
DEPLOY

# Step 5: Setup SSL
echo -e "\n${YELLOW}Setting up SSL...${NC}"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << SSL
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email hello@$DOMAIN --redirect
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
SSL

echo -e "${GREEN}✓${NC} SSL configured"

# Save deployment info
cat > deployment-info.txt << EOF
FluxStudio Deployment
=====================
Date: $(date)
Droplet ID: $DROPLET_ID
Droplet IP: $DROPLET_IP
Domain: $DOMAIN

Access:
- Website: https://$DOMAIN
- SSH: ssh root@$DROPLET_IP
- Logs: ssh root@$DROPLET_IP 'pm2 logs'
EOF

# Final summary
echo ""
echo "======================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "======================================"
echo ""
echo "🌐 Your site is live at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "📧 Email Setup Required:"
echo "   Configure email forwarding at your registrar"
echo "   Or use ImprovMX for free forwarding"
echo ""
echo "🔧 Quick Commands:"
echo "   SSH: ssh root@$DROPLET_IP"
echo "   Logs: ssh root@$DROPLET_IP 'pm2 logs'"
echo "   Status: ~/bin/doctl compute droplet get $DROPLET_ID"
echo ""
echo "======================================"