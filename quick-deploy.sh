#!/bin/bash

# Quick FluxStudio Deployment

DROPLET_IP="167.172.208.61"
DOMAIN="fluxstudio.art"

echo "🚀 Quick FluxStudio Deployment"
echo "=============================="

# Create minimal package
echo "Creating deployment package..."
rm -rf dist
mkdir -p dist

# Copy files
cp -r public dist/
cp server.js dist/
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || cp package.json dist/package-lock.json

# Create database directory
mkdir -p dist/database

# Package
cd dist && tar -czf ../fluxstudio.tar.gz . && cd ..
echo "✓ Package created"

# Upload
echo "Uploading..."
scp -o StrictHostKeyChecking=no fluxstudio.tar.gz root@$DROPLET_IP:/tmp/

# Deploy
echo "Deploying..."
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP << 'DEPLOY'
# Wait for apt to finish
while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 ; do
    echo "Waiting for apt to finish..."
    sleep 5
done

# Deploy app
cd /var/www/fluxstudio
tar -xzf /tmp/fluxstudio.tar.gz
npm install --production

# Simple PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fluxstudio',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start app
pm2 delete fluxstudio 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✓ Deployed"
DEPLOY

echo ""
echo "===================================="
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Visit: http://$DROPLET_IP"
echo "   (Domain will work after DNS propagates)"
echo ""
echo "📧 For email: Visit improvmx.com"
echo "===================================="