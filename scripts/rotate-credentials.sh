#!/bin/bash

# Flux Studio Credential Rotation Script
# Run this script to rotate all production credentials after security incident

set -e  # Exit on error

echo "🔐 Flux Studio Credential Rotation"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in FluxStudio directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from FluxStudio root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will rotate ALL production credentials${NC}"
echo -e "${YELLOW}⚠️  Users will need to log in again after JWT rotation${NC}"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Create backup of current .env.production
echo ""
echo "📦 Creating backup..."
if [ -f ".env.production" ]; then
    cp .env.production ".env.production.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓${NC} Backup created"
else
    echo -e "${YELLOW}⚠${NC}  No .env.production found, will create new file"
fi

# Generate new credentials
echo ""
echo "🔑 Generating new credentials..."

# Generate JWT Secret (256 chars)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(128).toString('hex'))")
echo -e "${GREEN}✓${NC} Generated JWT_SECRET"

# Generate database password (32 chars)
DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32))")
echo -e "${GREEN}✓${NC} Generated POSTGRES_PASSWORD"

# Generate Redis password (64 chars, base64)
REDIS_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
echo -e "${GREEN}✓${NC} Generated REDIS_PASSWORD"

# Generate Grafana admin password (24 chars, base64)
GRAFANA_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(18).toString('base64'))")
echo -e "${GREEN}✓${NC} Generated GRAFANA_ADMIN_PASSWORD"

# Create new .env.production
echo ""
echo "📝 Writing new .env.production..."

cat > .env.production << 'ENV_EOF'
# Flux Studio Production Environment Configuration
# Generated: $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Node Environment
NODE_ENV=production
PORT=3001

# Database Configuration
DATABASE_URL=postgresql://fluxstudio:NEW_PASSWORD_HERE@postgres:5432/fluxstudio
POSTGRES_USER=fluxstudio
POSTGRES_PASSWORD=NEW_PASSWORD_HERE
POSTGRES_DB=fluxstudio

# Authentication  
JWT_SECRET=NEW_JWT_SECRET_HERE
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=NEW_REDIS_PASSWORD_HERE

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=NEW_GRAFANA_PASSWORD_HERE
ENV_EOF

# Replace placeholders
sed -i '' "s|NEW_PASSWORD_HERE|${DB_PASSWORD}|g" .env.production
sed -i '' "s|NEW_JWT_SECRET_HERE|${JWT_SECRET}|g" .env.production
sed -i '' "s|NEW_REDIS_PASSWORD_HERE|${REDIS_PASSWORD}|g" .env.production
sed -i '' "s|NEW_GRAFANA_PASSWORD_HERE|${GRAFANA_PASSWORD}|g" .env.production

echo -e "${GREEN}✓${NC} New .env.production created"

echo ""
echo -e "${GREEN}=================================="
echo "✓ Credential Rotation Complete"
echo "==================================${NC}"
echo ""
echo "Credentials saved to .env.production"
echo "Run: cat .env.production to view"
echo ""
