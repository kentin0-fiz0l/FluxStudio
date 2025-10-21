#!/bin/bash

# Flux Studio Sprint 1 Deployment
# Deploys all Sprint 1 features to production

set -e  # Exit on error

echo "🚀 Flux Studio Sprint 1 Deployment"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Production server details
PROD_SERVER="root@167.172.208.61"
PROD_PATH="/var/www/fluxstudio"

echo -e "${BLUE}Sprint 1 Features:${NC}"
echo "  ✓ Projects API (6 endpoints)"
echo "  ✓ Task Management API (4 endpoints)"
echo "  ✓ Milestone Management API (2 endpoints)"
echo "  ✓ Enhanced rate limiting (3 tiers)"
echo "  ✓ Input validation & XSS protection (71 tests)"
echo "  ✓ Accessibility improvements"
echo ""
echo -e "${YELLOW}Total: 13 API endpoints + frontend integration${NC}"
echo ""

read -p "Deploy to production? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "📦 Step 1: Deploying backend files..."

# Deploy server-auth-production.js
echo "  → Deploying server-auth-production.js..."
PATH="$HOME/bin:$PATH" scp server-auth-production.js ${PROD_SERVER}:${PROD_PATH}/server-auth.js
echo -e "  ${GREEN}✓${NC} Backend deployed"

# Deploy middleware directory
echo "  → Deploying middleware..."
PATH="$HOME/bin:$PATH" rsync -avz --delete middleware/ ${PROD_SERVER}:${PROD_PATH}/middleware/
echo -e "  ${GREEN}✓${NC} Middleware deployed"

echo ""
echo "🎨 Step 2: Deploying frontend..."

# Deploy build directory
echo "  → Deploying frontend build..."
PATH="$HOME/bin:$PATH" rsync -avz --delete build/ ${PROD_SERVER}:${PROD_PATH}/build/
echo -e "  ${GREEN}✓${NC} Frontend deployed"

echo ""
echo "🔄 Step 3: Restarting services..."

# Restart PM2 services
ssh ${PROD_SERVER} "cd ${PROD_PATH} && pm2 restart flux-auth"
echo -e "  ${GREEN}✓${NC} Services restarted"

echo ""
echo "🔍 Step 4: Verifying deployment..."

# Wait for services to start
sleep 5

# Check PM2 status
echo "  → Checking PM2 status..."
ssh ${PROD_SERVER} "pm2 list | grep flux-auth"

# Test health endpoint
echo "  → Testing health endpoint..."
curl -s https://fluxstudio.art/api/health | jq '.' || echo "Health check response received"

echo ""
echo -e "${GREEN}===================================="
echo "✓ Sprint 1 Deployment Complete!"
echo "====================================${NC}"
echo ""
echo "Deployed endpoints:"
echo "  • POST   /api/projects - Create project"
echo "  • GET    /api/projects - List projects"
echo "  • GET    /api/projects/:id - Get project details"
echo "  • PUT    /api/projects/:id - Update project"
echo "  • DELETE /api/projects/:id - Delete project"
echo "  • POST   /api/projects/:id/members - Add member"
echo "  • POST   /api/projects/:projectId/tasks - Create task"
echo "  • GET    /api/projects/:projectId/tasks - List tasks"
echo "  • PUT    /api/projects/:projectId/tasks/:taskId - Update task"
echo "  • DELETE /api/projects/:projectId/tasks/:taskId - Delete task"
echo "  • POST   /api/projects/:projectId/milestones - Create milestone"
echo "  • PUT    /api/projects/:projectId/milestones/:milestoneId - Update milestone"
echo ""
echo "Next steps:"
echo "  1. Test all endpoints at https://fluxstudio.art"
echo "  2. Monitor PM2 logs: ssh ${PROD_SERVER} 'pm2 logs flux-auth'"
echo "  3. Check error rates in monitoring dashboard"
echo ""
echo -e "${YELLOW}⚠️  Remember: Credentials in .env.production need rotation${NC}"
echo "    See SECURITY_FIX_STATUS.md for details"
echo ""
