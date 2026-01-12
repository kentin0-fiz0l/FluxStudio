#!/bin/bash

# Final FluxStudio Deployment

DROPLET_IP="167.172.208.61"
DOMAIN="fluxstudio.art"

echo "🚀 Final FluxStudio Deployment"
echo "============================="

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf dist
mkdir -p dist

# Copy files (React build structure)
cp -r build/* dist/
cp server-react.js dist/server.js
cp package-production.json dist/package.json

# Create simple package-lock.json if it doesn't exist
[ ! -f package-lock.json ] && echo '{}' > dist/package-lock.json || cp package-lock.json dist/

# Create production config
cat > dist/.env << EOF
NODE_ENV=production
PORT=3000
DOMAIN=$DOMAIN
EOF

# Create PM2 config
cat > dist/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fluxstudio',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/fluxstudio-error.log',
    out_file: '/var/log/fluxstudio-out.log',
    log_file: '/var/log/fluxstudio.log'
  }]
};
EOF

# Package
cd dist && tar -czf ../fluxstudio-final.tar.gz . && cd ..
echo "✅ Package created"

# Upload
echo "📤 Uploading to server..."
scp -o StrictHostKeyChecking=no fluxstudio-final.tar.gz root@$DROPLET_IP:/tmp/

# Deploy
echo "🚀 Deploying application..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'DEPLOY'
set -e

# Create app directory
mkdir -p /var/www/fluxstudio
cd /var/www/fluxstudio

# Extract and install
tar -xzf /tmp/fluxstudio-final.tar.gz
npm install --production --legacy-peer-deps

# Configure Nginx
cat > /etc/nginx/sites-available/fluxstudio << 'NGINX'
server {
    listen 80;
    server_name fluxstudio.art www.fluxstudio.art;

    # Serve everything from Express.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes to Node.js
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json;
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/fluxstudio /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t && systemctl reload nginx

# Setup firewall
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

# Start application
pm2 delete fluxstudio 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "✅ Application deployed and running!"
DEPLOY

echo ""
echo "================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "================================="
echo ""
echo "🌐 Your FluxStudio site is now live at:"
echo "   http://$DOMAIN"
echo "   http://www.$DOMAIN"
echo ""
echo "📧 Next: Set up email at https://improvmx.com"
echo "   Add domain: $DOMAIN"
echo "   Forward: hello@$DOMAIN → your@email.com"
echo ""
echo "🔧 Server management:"
echo "   SSH: ssh root@$DROPLET_IP"
echo "   Logs: ssh root@$DROPLET_IP 'pm2 logs'"
echo "   Restart: ssh root@$DROPLET_IP 'pm2 restart fluxstudio'"
echo ""
echo "🔒 SSL will be auto-configured once DNS fully propagates"
echo "================================="