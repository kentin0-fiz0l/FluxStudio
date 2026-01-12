#!/bin/bash

# FluxStudio - Automated DigitalOcean Droplet Creation & Deployment
# This script creates a droplet and deploys FluxStudio automatically

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DROPLET_NAME="FluxStudio-Droplet"
DROPLET_SIZE="s-1vcpu-1gb"
DROPLET_REGION="sfo2"
DROPLET_IMAGE="ubuntu-22-04-x64"
VPC_UUID="a88fcb04-45f2-404e-9b93-25b8563344a7"
DOMAIN="fluxstudio.art"

echo -e "${BLUE}🚀 FluxStudio Automated Deployment${NC}"
echo "======================================"

# Check for DigitalOcean token
if [ -z "$DO_TOKEN" ]; then
    echo -e "${YELLOW}DigitalOcean API token not found in environment.${NC}"
    echo -n "Enter your DigitalOcean API token: "
    read -s DO_TOKEN
    echo ""
fi

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 failed"
        exit 1
    fi
}

# Step 1: Create the droplet
echo -e "\n${YELLOW}Creating DigitalOcean Droplet...${NC}"

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DO_TOKEN" \
    -d '{
        "name": "'$DROPLET_NAME'",
        "size": "'$DROPLET_SIZE'",
        "region": "'$DROPLET_REGION'",
        "image": "'$DROPLET_IMAGE'",
        "vpc_uuid": "'$VPC_UUID'",
        "tags": ["fluxstudio", "production"],
        "user_data": "#!/bin/bash
            apt-get update
            apt-get install -y nginx nodejs npm git ufw
            ufw allow OpenSSH
            ufw allow '\''Nginx Full'\''
            ufw --force enable
            npm install -g pm2
            mkdir -p /var/www/fluxstudio
            "
    }' \
    "https://api.digitalocean.com/v2/droplets")

# Extract droplet ID
DROPLET_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['droplet']['id'])" 2>/dev/null)

if [ -z "$DROPLET_ID" ]; then
    echo -e "${RED}Failed to create droplet. Response:${NC}"
    echo $RESPONSE
    exit 1
fi

echo -e "${GREEN}✓${NC} Droplet created with ID: $DROPLET_ID"

# Step 2: Wait for droplet to be ready
echo -e "\n${YELLOW}Waiting for droplet to be ready...${NC}"
sleep 30

# Get droplet IP
for i in {1..20}; do
    DROPLET_INFO=$(curl -s -X GET \
        -H "Authorization: Bearer $DO_TOKEN" \
        "https://api.digitalocean.com/v2/droplets/$DROPLET_ID")

    DROPLET_IP=$(echo $DROPLET_INFO | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['droplet']['networks']['v4'][0]['ip_address'] if data['droplet']['networks']['v4'] else '')" 2>/dev/null)

    if [ ! -z "$DROPLET_IP" ]; then
        break
    fi

    echo -n "."
    sleep 10
done

if [ -z "$DROPLET_IP" ]; then
    echo -e "\n${RED}Failed to get droplet IP address${NC}"
    exit 1
fi

echo -e "\n${GREEN}✓${NC} Droplet IP: $DROPLET_IP"

# Step 3: Configure DNS
echo -e "\n${YELLOW}Configuring DNS for $DOMAIN...${NC}"

# Check if domain exists in DigitalOcean
DOMAIN_CHECK=$(curl -s -X GET \
    -H "Authorization: Bearer $DO_TOKEN" \
    "https://api.digitalocean.com/v2/domains/$DOMAIN")

if [[ $DOMAIN_CHECK == *"not_found"* ]]; then
    # Create domain
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $DO_TOKEN" \
        -d '{"name": "'$DOMAIN'", "ip_address": "'$DROPLET_IP'"}' \
        "https://api.digitalocean.com/v2/domains" > /dev/null
    check_status "Domain created"
else
    echo "Domain already exists, updating records..."
fi

# Create/Update A records
curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DO_TOKEN" \
    -d '{"type": "A", "name": "@", "data": "'$DROPLET_IP'", "ttl": 3600}' \
    "https://api.digitalocean.com/v2/domains/$DOMAIN/records" > /dev/null

curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DO_TOKEN" \
    -d '{"type": "A", "name": "www", "data": "'$DROPLET_IP'", "ttl": 3600}' \
    "https://api.digitalocean.com/v2/domains/$DOMAIN/records" > /dev/null

check_status "DNS records configured"

# Step 4: Wait for SSH to be ready
echo -e "\n${YELLOW}Waiting for SSH to be ready...${NC}"
for i in {1..30}; do
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH ready'" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} SSH connection established"
        break
    fi
    echo -n "."
    sleep 10
done

# Step 5: Deploy FluxStudio
echo -e "\n${YELLOW}Deploying FluxStudio application...${NC}"

# Create deployment package
rm -rf dist
mkdir -p dist
cp -r public dist/
cp -r server dist/
cp -r database dist/
cp package.json dist/
cp package-lock.json dist/

# Create production environment file
cat > dist/.env << EOF
NODE_ENV=production
PORT=3000
DOMAIN=$DOMAIN
DATABASE_PATH=./database/fluxstudio.db
EOF

# Create PM2 config
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

# Create tarball
cd dist && tar -czf ../fluxstudio.tar.gz . && cd ..
check_status "Deployment package created"

# Copy to droplet
scp -o StrictHostKeyChecking=no fluxstudio.tar.gz root@$DROPLET_IP:/tmp/
check_status "Files uploaded to droplet"

# Deploy on droplet
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'ENDSSH'
set -e

# Extract application
cd /var/www/fluxstudio
tar -xzf /tmp/fluxstudio.tar.gz

# Install dependencies
npm ci --production

# Configure Nginx
cat > /etc/nginx/sites-available/fluxstudio << 'NGINX'
server {
    listen 80;
    listen [::]:80;
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

# Enable site
ln -sf /etc/nginx/sites-available/fluxstudio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start application with PM2
pm2 delete fluxstudio 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "Application deployed!"
ENDSSH

check_status "Application deployed"

# Step 6: Setup SSL with Let's Encrypt
echo -e "\n${YELLOW}Setting up SSL certificate...${NC}"

ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << ENDSSH
# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email hello@$DOMAIN --redirect

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
ENDSSH

check_status "SSL certificate installed"

# Step 7: Create monitoring script
echo -e "\n${YELLOW}Setting up monitoring...${NC}"

cat > monitor-fluxstudio.sh << 'EOF'
#!/bin/bash
# Monitor FluxStudio deployment

DROPLET_IP='$DROPLET_IP'
DOMAIN='$DOMAIN'

echo "🔍 FluxStudio Monitoring Dashboard"
echo "===================================="
echo ""

# Check website
echo -n "Website Status: "
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200"; then
    echo "✅ Online"
else
    echo "❌ Offline"
fi

# Check SSL
echo -n "SSL Certificate: "
if echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
    echo "✅ Valid"
else
    echo "❌ Invalid"
fi

# Check server
echo -n "Server Status: "
if ping -c 1 $DROPLET_IP > /dev/null 2>&1; then
    echo "✅ Responding"
else
    echo "❌ Not responding"
fi

echo ""
echo "📊 Server Details:"
ssh root@$DROPLET_IP "pm2 status; df -h /; free -h"
EOF

chmod +x monitor-fluxstudio.sh

# Final summary
echo ""
echo "======================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "======================================"
echo ""
echo "📋 Deployment Summary:"
echo "   Droplet Name: $DROPLET_NAME"
echo "   Droplet IP: $DROPLET_IP"
echo "   Droplet ID: $DROPLET_ID"
echo "   Region: $DROPLET_REGION"
echo "   Size: $DROPLET_SIZE"
echo ""
echo "🌐 Your website is now live at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "📧 Email Setup:"
echo "   Configure email forwarding at your domain registrar"
echo "   Suggested: hello@$DOMAIN → your personal email"
echo ""
echo "🔧 Management Commands:"
echo "   SSH: ssh root@$DROPLET_IP"
echo "   Monitor: ./monitor-fluxstudio.sh"
echo "   Logs: ssh root@$DROPLET_IP 'pm2 logs'"
echo ""
echo "💾 Saved Information:"
echo "   export DROPLET_IP=$DROPLET_IP"
echo "   export DROPLET_ID=$DROPLET_ID"
echo ""
echo "======================================"

# Save deployment info
cat > deployment-info.txt << EOF
FluxStudio Deployment Information
==================================
Date: $(date)
Droplet Name: $DROPLET_NAME
Droplet ID: $DROPLET_ID
Droplet IP: $DROPLET_IP
Domain: $DOMAIN
Region: $DROPLET_REGION
Size: $DROPLET_SIZE
EOF

echo -e "${GREEN}Deployment information saved to deployment-info.txt${NC}"