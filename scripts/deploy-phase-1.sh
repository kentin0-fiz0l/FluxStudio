#!/bin/bash

# Phase 1 Deployment Script
# OAuth Integration + Figma + Slack + PostgreSQL MCP
#
# This script deploys Phase 1 implementation to production

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production server
PROD_SERVER="root@167.172.208.61"
PROD_PATH="/var/www/fluxstudio"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 1 Deployment: OAuth + MCP${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Timestamp: $(date)"
echo ""

# Step 1: Deploy database migration
echo -e "${YELLOW}[1/8] Deploying Database Migration...${NC}"
scp database/migrations/007_oauth_tokens.sql $PROD_SERVER:$PROD_PATH/database/migrations/

ssh $PROD_SERVER "sudo -u postgres psql -d fluxstudio -f $PROD_PATH/database/migrations/007_oauth_tokens.sql" || {
  echo -e "${YELLOW}⚠️  Migration may have already been applied (this is okay)${NC}"
}

echo -e "${GREEN}✅ Database migration deployed${NC}"
echo ""

# Step 2: Deploy Phase 1 code files
echo -e "${YELLOW}[2/8] Deploying Phase 1 Code Files...${NC}"

# Create directories if they don't exist
ssh $PROD_SERVER "mkdir -p $PROD_PATH/lib $PROD_PATH/config $PROD_PATH/src/services"

# Deploy OAuth Manager
echo "  • Deploying lib/oauth-manager.js..."
scp lib/oauth-manager.js $PROD_SERVER:$PROD_PATH/lib/

# Deploy MCP Manager
echo "  • Deploying lib/mcp-manager.js..."
scp lib/mcp-manager.js $PROD_SERVER:$PROD_PATH/lib/

# Deploy MCP Config
echo "  • Deploying config/mcp-config.js..."
scp config/mcp-config.js $PROD_SERVER:$PROD_PATH/config/

# Deploy Figma Service
echo "  • Deploying src/services/figmaService.ts..."
scp src/services/figmaService.ts $PROD_SERVER:$PROD_PATH/src/services/

# Deploy Slack Service
echo "  • Deploying src/services/slackService.ts..."
scp src/services/slackService.ts $PROD_SERVER:$PROD_PATH/src/services/

echo -e "${GREEN}✅ Phase 1 code files deployed${NC}"
echo ""

# Step 3: Deploy updated server-auth.js
echo -e "${YELLOW}[3/8] Deploying Updated Server...${NC}"
scp server-auth.js $PROD_SERVER:$PROD_PATH/

echo -e "${GREEN}✅ Server updated${NC}"
echo ""

# Step 4: Install npm dependencies on production
echo -e "${YELLOW}[4/8] Installing NPM Dependencies...${NC}"
ssh $PROD_SERVER "cd $PROD_PATH && npm install --production --legacy-peer-deps @modelcontextprotocol/sdk @anthropic-ai/sdk passport passport-oauth2 express-session axios @slack/web-api figma-api"

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 5: Update .env file (backup first)
echo -e "${YELLOW}[5/8] Updating Environment Variables...${NC}"

# Backup existing .env
ssh $PROD_SERVER "cp $PROD_PATH/.env $PROD_PATH/.env.backup.phase1"

# Add Phase 1 environment variables if they don't exist
ssh $PROD_SERVER "cd $PROD_PATH && cat >> .env << 'EOF'

# Phase 1: OAuth Integration & MCP
MCP_AUTO_CONNECT=false
MCP_ENABLE_CACHING=true
MCP_POSTGRES_ENABLED=false
MCP_FIGMA_ENABLED=false
MCP_FILESYSTEM_ENABLED=false
MCP_GIT_ENABLED=false

# Figma OAuth (TODO: Configure these)
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=
FIGMA_REDIRECT_URI=https://fluxstudio.art/api/integrations/figma/callback
FIGMA_WEBHOOK_SECRET=

# Slack OAuth (TODO: Configure these)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=https://fluxstudio.art/api/integrations/slack/callback
SLACK_SIGNING_SECRET=

# GitHub OAuth (Future)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=https://fluxstudio.art/api/integrations/github/callback
EOF
"

echo -e "${GREEN}✅ Environment variables updated${NC}"
echo -e "${YELLOW}⚠️  NOTE: OAuth credentials must be configured manually!${NC}"
echo ""

# Step 6: Verify database migration
echo -e "${YELLOW}[6/8] Verifying Database Schema...${NC}"

# Check if oauth_tokens table exists
TABLES=$(ssh $PROD_SERVER "sudo -u postgres psql -d fluxstudio -t -c \"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'oauth%';\"")

if echo "$TABLES" | grep -q "oauth_tokens"; then
  echo -e "${GREEN}✅ oauth_tokens table exists${NC}"
else
  echo -e "${RED}❌ oauth_tokens table NOT found!${NC}"
  exit 1
fi

if echo "$TABLES" | grep -q "oauth_integration_settings"; then
  echo -e "${GREEN}✅ oauth_integration_settings table exists${NC}"
else
  echo -e "${RED}❌ oauth_integration_settings table NOT found!${NC}"
  exit 1
fi

if echo "$TABLES" | grep -q "oauth_state_tokens"; then
  echo -e "${GREEN}✅ oauth_state_tokens table exists${NC}"
else
  echo -e "${RED}❌ oauth_state_tokens table NOT found!${NC}"
  exit 1
fi

echo ""

# Step 7: Restart PM2
echo -e "${YELLOW}[7/8] Restarting Server...${NC}"
ssh $PROD_SERVER "cd $PROD_PATH && pm2 restart flux-auth"

# Wait for server to start
echo "  • Waiting for server to start..."
sleep 5

echo -e "${GREEN}✅ Server restarted${NC}"
echo ""

# Step 8: Verify deployment
echo -e "${YELLOW}[8/8] Verifying Deployment...${NC}"

# Check PM2 status
PM2_STATUS=$(ssh $PROD_SERVER "pm2 list | grep flux-auth")
if echo "$PM2_STATUS" | grep -q "online"; then
  echo -e "${GREEN}✅ flux-auth is online${NC}"
else
  echo -e "${RED}❌ flux-auth is NOT online!${NC}"
  ssh $PROD_SERVER "pm2 logs flux-auth --lines 50 --nostream"
  exit 1
fi

# Check recent logs for errors
ERRORS=$(ssh $PROD_SERVER "pm2 logs flux-auth --lines 20 --nostream 2>&1 | grep -i 'error' | grep -v 'no errors' | wc -l")
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✅ No errors in recent logs${NC}"
else
  echo -e "${YELLOW}⚠️  Found $ERRORS error(s) in recent logs${NC}"
  ssh $PROD_SERVER "pm2 logs flux-auth --lines 20 --nostream | grep -i 'error'"
fi

# Test API endpoint
echo "  • Testing API health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://fluxstudio.art/api/health 2>&1 || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ API health check passed (200 OK)${NC}"
else
  echo -e "${YELLOW}⚠️  API returned code: $HTTP_CODE${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 1 Deployment Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✅ Phase 1 deployed successfully!${NC}"
echo ""
echo "🚀 New Features Available:"
echo "  • OAuth integration framework (Figma, Slack, GitHub)"
echo "  • PostgreSQL MCP for natural language queries"
echo "  • Integration webhook endpoints"
echo "  • API endpoints:"
echo "    - GET  /api/integrations"
echo "    - GET  /api/integrations/:provider/auth"
echo "    - GET  /api/integrations/:provider/callback"
echo "    - DEL  /api/integrations/:provider"
echo "    - GET  /api/integrations/figma/files"
echo "    - GET  /api/integrations/figma/files/:fileKey"
echo "    - GET  /api/integrations/slack/channels"
echo "    - POST /api/integrations/slack/message"
echo "    - POST /api/mcp/query"
echo "    - GET  /api/mcp/tools"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Next Steps${NC}"
echo ""
echo "1. Configure OAuth Credentials:"
echo "   SSH to production: ssh $PROD_SERVER"
echo "   Edit .env: nano $PROD_PATH/.env"
echo "   Add Figma/Slack client IDs and secrets"
echo ""
echo "2. Enable MCP (optional):"
echo "   Set MCP_POSTGRES_ENABLED=true in .env"
echo "   Set MCP_AUTO_CONNECT=true in .env"
echo "   Restart: pm2 restart flux-auth"
echo ""
echo "3. Test OAuth Flows:"
echo "   • Visit: https://fluxstudio.art/settings/integrations"
echo "   • Connect Figma account"
echo "   • Connect Slack workspace"
echo ""
echo "4. Test MCP Queries:"
echo "   curl -X POST https://fluxstudio.art/api/mcp/query \\"
echo "     -H \"Authorization: Bearer \$TOKEN\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"query\": \"show me users who joined in the last 7 days\"}'  "
echo ""
echo "5. Monitor Logs:"
echo "   ssh $PROD_SERVER \"pm2 logs flux-auth\""
echo ""
echo "6. Rollback if needed:"
echo "   ssh $PROD_SERVER"
echo "   cd $PROD_PATH"
echo "   cp .env.backup.phase1 .env"
echo "   pm2 restart flux-auth"
echo ""
echo "Deployment completed at $(date)"
echo ""
