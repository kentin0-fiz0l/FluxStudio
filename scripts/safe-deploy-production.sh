#!/bin/bash

# Safe Production Deployment Script for FluxStudio
# This script deploys without deleting critical backend files

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVER_USER="root"
SERVER_HOST="167.172.208.61"
SERVER_PATH="/var/www/fluxstudio"

echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e "${BLUE}  FluxStudio Safe Production Deploy ${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo ""

# Step 1: Build frontend locally
echo -e "${YELLOW}Step 1: Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Step 2: Create deployment package (frontend only + server files)
echo -e "${YELLOW}Step 2: Creating deployment package...${NC}"

# Create temp directory for deployment
DEPLOY_DIR="/tmp/fluxstudio-deploy-$(date +%s)"
mkdir -p "$DEPLOY_DIR"

# Copy frontend build
echo "  → Copying frontend assets..."
cp -r dist/* "$DEPLOY_DIR/"

# Copy server files (but not node_modules or existing data)
echo "  → Copying server files..."
cp server-auth.js "$DEPLOY_DIR/"
cp server-messaging.js "$DEPLOY_DIR/"
cp server-collaboration.js "$DEPLOY_DIR/"
cp ecosystem.config.js "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp health-check.js "$DEPLOY_DIR/"
cp .env.production "$DEPLOY_DIR/.env"

# Copy directories
echo "  → Copying backend directories..."
cp -r config "$DEPLOY_DIR/"
cp -r middleware "$DEPLOY_DIR/"
cp -r monitoring "$DEPLOY_DIR/"
cp -r lib "$DEPLOY_DIR/"
cp -r database "$DEPLOY_DIR/"

echo -e "${GREEN}✓ Deployment package created${NC}"
echo ""

# Step 3: Upload to server (SAFE MODE - no --delete flag)
echo -e "${YELLOW}Step 3: Uploading to server (safe mode)...${NC}"

# Upload frontend files (can overwrite, these are static assets)
echo "  → Uploading frontend assets..."
rsync -avz --progress \
  --include='*.html' \
  --include='*.js' \
  --include='*.css' \
  --include='*.json' \
  --include='*.svg' \
  --include='*.ico' \
  --include='*.webp' \
  --include='*.png' \
  --include='*.jpg' \
  --include='assets/***' \
  --include='icons/***' \
  --include='fonts/***' \
  --include='placeholders/***' \
  --exclude='*' \
  "$DEPLOY_DIR/" ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# Upload backend files (safe - won't delete node_modules or logs)
echo "  → Uploading backend files..."
rsync -avz --progress \
  "$DEPLOY_DIR"/server-*.js \
  "$DEPLOY_DIR"/ecosystem.config.js \
  "$DEPLOY_DIR"/package.json \
  "$DEPLOY_DIR"/health-check.js \
  "$DEPLOY_DIR"/.env \
  ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# Upload backend directories
echo "  → Uploading backend directories..."
for dir in config middleware monitoring lib database; do
  rsync -avz --progress "$DEPLOY_DIR/$dir/" ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/$dir/
done

echo -e "${GREEN}✓ Files uploaded safely${NC}"
echo ""

# Step 4: Verify critical files on server
echo -e "${YELLOW}Step 4: Verifying deployment...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
cd /var/www/fluxstudio

echo "Checking critical files:"
critical_files=(
  "server-auth.js"
  "server-messaging.js"
  "server-collaboration.js"
  "ecosystem.config.js"
  "package.json"
  ".env"
  "health-check.js"
)

critical_dirs=(
  "config"
  "middleware"
  "monitoring"
  "lib"
  "database"
  "node_modules"
  "logs"
)

all_good=true

for file in "${critical_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file MISSING"
    all_good=false
  fi
done

for dir in "${critical_dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✓ $dir/"
  else
    echo "  ✗ $dir/ MISSING"
    all_good=false
  fi
done

if [ "$all_good" = false ]; then
  echo ""
  echo "⚠️  WARNING: Some critical files/directories are missing!"
  echo "Deployment may not work correctly."
  exit 1
fi
EOF

echo -e "${GREEN}✓ Verification passed${NC}"
echo ""

# Step 5: Restart PM2 services
echo -e "${YELLOW}Step 5: Restarting backend services...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
cd /var/www/fluxstudio
pm2 restart ecosystem.config.js --env production
echo ""
echo "Waiting for services to stabilize..."
sleep 5
pm2 status
EOF

echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Step 6: Health checks
echo -e "${YELLOW}Step 6: Running health checks...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
cd /var/www/fluxstudio

echo "Testing service endpoints..."
services=("3001:auth" "3004:messaging" "4000:collaboration")

all_healthy=true
for service in "${services[@]}"; do
  port="${service%:*}"
  name="${service#*:}"

  response=$(curl -s -w "%{http_code}" localhost:$port/health -o /dev/null || echo "000")

  if [ "$response" = "200" ]; then
    echo "  ✓ $name service (port $port) - healthy"
  else
    echo "  ✗ $name service (port $port) - unhealthy (HTTP $response)"
    all_healthy=false
  fi
done

if [ "$all_healthy" = false ]; then
  echo ""
  echo "⚠️  WARNING: Some services are unhealthy!"
  echo "Check PM2 logs with: pm2 logs"
  exit 1
fi
EOF

echo -e "${GREEN}✓ All health checks passed${NC}"
echo ""

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
rm -rf "$DEPLOY_DIR"
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${GREEN}════════════════════════════════════${NC}"
echo -e "${GREEN}  ✨ Deployment Successful! ✨${NC}"
echo -e "${GREEN}════════════════════════════════════${NC}"
echo ""
echo "Your application is now live at:"
echo "  → https://fluxstudio.art (or http://${SERVER_HOST})"
echo ""
echo "Service Status:"
echo "  → Auth Service: http://${SERVER_HOST}:3001/health"
echo "  → Messaging Service: http://${SERVER_HOST}:3004/health"
echo "  → Collaboration Service: http://${SERVER_HOST}:4000/health"
echo ""
echo "Monitor logs with:"
echo "  → ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs'"
echo ""
