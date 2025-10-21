#!/bin/bash

# Emergency Backend Recovery Script for FluxStudio Production
# This script restores all backend dependencies that were deleted during deployment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER_USER="root"
SERVER_HOST="167.172.208.61"
SERVER_PATH="/var/www/fluxstudio"

echo -e "${YELLOW}🚑 FluxStudio Emergency Backend Recovery${NC}"
echo "========================================"
echo ""

# Step 1: Upload critical backend directories
echo -e "${YELLOW}Step 1: Uploading backend directories...${NC}"

echo "  → Uploading config/"
rsync -avz --progress ./config/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/config/

echo "  → Uploading middleware/"
rsync -avz --progress ./middleware/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/middleware/

echo "  → Uploading monitoring/"
rsync -avz --progress ./monitoring/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/monitoring/

echo "  → Uploading lib/"
rsync -avz --progress ./lib/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/lib/

echo "  → Uploading database/"
rsync -avz --progress ./database/ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/database/

echo -e "${GREEN}✓ Backend directories uploaded${NC}"
echo ""

# Step 2: Upload critical files
echo -e "${YELLOW}Step 2: Uploading critical files...${NC}"

echo "  → Uploading health-check.js"
scp ./health-check.js ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/health-check.js

echo -e "${GREEN}✓ Critical files uploaded${NC}"
echo ""

# Step 3: Verify uploads
echo -e "${YELLOW}Step 3: Verifying uploads on server...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
cd /var/www/fluxstudio

echo "Checking directory structure:"
for dir in config middleware monitoring lib database; do
  if [ -d "$dir" ]; then
    count=$(find $dir -type f | wc -l)
    echo "  ✓ $dir/ ($count files)"
  else
    echo "  ✗ $dir/ MISSING"
  fi
done

if [ -f "health-check.js" ]; then
  echo "  ✓ health-check.js"
else
  echo "  ✗ health-check.js MISSING"
fi
EOF

echo -e "${GREEN}✓ Verification complete${NC}"
echo ""

# Step 4: Check for missing node_modules
echo -e "${YELLOW}Step 4: Checking node_modules status...${NC}"
ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
cd /var/www/fluxstudio

if [ -d "node_modules" ]; then
  module_count=$(find node_modules -maxdepth 1 -type d | wc -l)
  echo "  → node_modules exists with $module_count packages"

  # Check for critical packages
  critical_packages=("express" "socket.io" "jsonwebtoken" "bcryptjs" "dotenv" "helmet" "cors")
  missing=()

  for pkg in "${critical_packages[@]}"; do
    if [ ! -d "node_modules/$pkg" ]; then
      missing+=("$pkg")
    fi
  done

  if [ ${#missing[@]} -eq 0 ]; then
    echo "  ✓ All critical packages present"
  else
    echo "  ⚠  Missing packages: ${missing[*]}"
    echo "  → npm install required"
  fi
else
  echo "  ✗ node_modules directory missing"
  echo "  → Full npm install required"
fi
EOF

echo ""

# Step 5: Offer to install dependencies
echo -e "${YELLOW}Step 5: Node modules installation${NC}"
read -p "Do you want to attempt npm install on the server? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "  → Installing dependencies (this may take a while)..."
  ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
cd /var/www/fluxstudio

# Try to install with increased memory
export NODE_OPTIONS="--max-old-space-size=1024"

echo "Attempting npm install..."
if npm install --production --no-optional 2>&1 | tee npm-install.log; then
  echo "✓ npm install completed successfully"
else
  echo "⚠  npm install failed or was killed"
  echo "Check npm-install.log for details"

  # Suggest alternative
  echo ""
  echo "Alternative solutions:"
  echo "1. Install critical packages only:"
  echo "   npm install express socket.io jsonwebtoken bcryptjs dotenv helmet cors"
  echo "2. Upload node_modules as tarball from local machine"
  echo "3. Increase server memory or use Docker"
fi
EOF
else
  echo "  → Skipping npm install"
  echo ""
  echo "Alternative installation methods:"
  echo "1. Create tarball locally and upload:"
  echo "   tar -czf node_modules.tar.gz node_modules/"
  echo "   scp node_modules.tar.gz ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/"
  echo "   ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${SERVER_PATH} && tar -xzf node_modules.tar.gz'"
  echo ""
  echo "2. Install only critical packages on server:"
  echo "   ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${SERVER_PATH} && npm install express socket.io jsonwebtoken bcryptjs dotenv helmet cors'"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Backend recovery script complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Verify services can start: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${SERVER_PATH} && pm2 restart ecosystem.config.js'"
echo "2. Check logs: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${SERVER_PATH} && pm2 logs'"
echo "3. Test health endpoints:"
echo "   curl http://${SERVER_HOST}:3001/health  # Auth service"
echo "   curl http://${SERVER_HOST}:3004/health  # Messaging service"
echo "   curl http://${SERVER_HOST}:4000/health  # Collaboration service"
echo ""
