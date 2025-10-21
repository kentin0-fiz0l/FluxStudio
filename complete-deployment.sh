#!/bin/bash

# Complete FluxStudio Deployment
# Run this to finish the deployment

DROPLET_IP="167.172.208.61"
DOMAIN="fluxstudio.art"

echo "📦 Completing FluxStudio Deployment"
echo "===================================="
echo "Droplet IP: $DROPLET_IP"
echo "Domain: $DOMAIN"
echo ""

# Create deployment package
echo "Creating deployment package..."
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
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Package files
cd dist && tar -czf ../fluxstudio.tar.gz . && cd ..
echo "✓ Package created"

# Copy to server
echo "Uploading to server..."
scp -o StrictHostKeyChecking=no fluxstudio.tar.gz root@$DROPLET_IP:/tmp/

# Deploy on server
echo "Deploying application..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'DEPLOY'
set -e

# Complete system setup if needed
apt-get update -y
apt-get install -y nginx nodejs npm git ufw certbot python3-certbot-nginx
npm install -g pm2

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Deploy application
mkdir -p /var/www/fluxstudio
cd /var/www/fluxstudio
tar -xzf /tmp/fluxstudio.tar.gz
npm ci --production || npm install --production

# Configure Nginx
cat > /etc/nginx/sites-available/fluxstudio << 'NGINX'
server {
    listen 80;
    server_name fluxstudio.art www.fluxstudio.art;

    root /var/www/fluxstudio/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/fluxstudio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start application with PM2
cd /var/www/fluxstudio
pm2 delete fluxstudio 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "✓ Application deployed"
DEPLOY

# Setup SSL
echo "Setting up SSL certificate..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << SSL
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email hello@$DOMAIN --redirect || echo "SSL setup will complete when DNS propagates"
SSL

echo ""
echo "===================================="
echo "🎉 Deployment Complete!"
echo "===================================="
echo ""
echo "🌐 Your site will be available at:"
echo "   http://$DOMAIN (now)"
echo "   https://$DOMAIN (after DNS propagates)"
echo ""
echo "📧 Email Setup:"
echo "   Visit improvmx.com to set up free email forwarding"
echo ""
echo "🔧 Server Access:"
echo "   ssh root@$DROPLET_IP"
echo ""
echo "⏱️ DNS may take 5-30 minutes to propagate"
echo "===================================="