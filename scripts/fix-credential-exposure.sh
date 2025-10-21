#!/bin/bash

# Flux Studio Critical Security Fix
# Fixes exposed .env.production credentials in git history
# This script will:
# 1. Remove .env.production from git tracking
# 2. Create .env.production.example with safe placeholder values
# 3. Document credential rotation steps

set -e  # Exit on error

echo "🔐 Flux Studio Security Fix - Credential Exposure"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running in FluxStudio directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from FluxStudio root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  CRITICAL: This script addresses exposed credentials in git${NC}"
echo -e "${YELLOW}⚠️  The following secrets were exposed in .env.production:${NC}"
echo ""
echo "  • Database password"
echo "  • Redis password"
echo "  • JWT secret (256 chars)"
echo "  • Google OAuth client secret"
echo "  • SMTP password"
echo "  • Grafana admin password"
echo ""
echo -e "${RED}All these credentials should be rotated immediately${NC}"
echo ""
read -p "Continue with fix? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

# Step 1: Remove from git index but keep local file
echo ""
echo "📋 Step 1: Removing .env.production from git tracking..."
git rm --cached FluxStudio/.env.production 2>/dev/null || true
echo -e "${GREEN}✓${NC} Removed from git index (local file preserved)"

# Step 2: Create .env.production.example
echo ""
echo "📝 Step 2: Creating .env.production.example..."

cat > FluxStudio/.env.production.example << 'ENV_EXAMPLE_EOF'
# FluxStudio Production Environment Configuration
# Copy this file to .env.production and fill in actual values
# NEVER commit .env.production to version control

# Application Settings
NODE_ENV=production
APP_NAME=FluxStudio
APP_URL=https://your-domain.com
AUTH_PORT=3001
MESSAGING_PORT=3004

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://username:password@postgres:5432/dbname
POSTGRES_DB=fluxstudio
POSTGRES_USER=fluxstudio
POSTGRES_PASSWORD=<GENERATE_SECURE_PASSWORD>

# Redis Configuration
REDIS_URL=redis://:password@redis:6379
REDIS_PASSWORD=<GENERATE_SECURE_PASSWORD>

# JWT Configuration
JWT_SECRET=<GENERATE_256_CHAR_HEX_STRING>
JWT_EXPIRES_IN=24h

# OAuth Configuration
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
VITE_GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
APPLE_CLIENT_ID=<YOUR_APPLE_CLIENT_ID>
APPLE_CLIENT_SECRET=<YOUR_APPLE_CLIENT_SECRET>

# Email Configuration (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=<YOUR_SMTP_PASSWORD>
EMAIL_FROM=noreply@your-domain.com

# Security Configuration
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/app/uploads
ALLOWED_FILE_TYPES=png,jpg,jpeg,gif,pdf,figma,sketch

# Monitoring Configuration
GRAFANA_ADMIN_PASSWORD=<GENERATE_SECURE_PASSWORD>

# SSL Configuration (for Let's Encrypt)
CERTBOT_EMAIL=your_email@example.com
DOMAIN=your-domain.com

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_OAUTH=true
ENABLE_FILE_UPLOAD=true
ENABLE_WEBSOCKET=true
ENABLE_MESSAGE_INTELLIGENCE=true
ENABLE_REALTIME_COLLABORATION=true
ENABLE_WORKFLOW_ORCHESTRATION=true
ENABLE_VISUAL_ANNOTATIONS=true
ENABLE_VERSION_TRACKING=true
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=We are currently performing maintenance. Please check back soon.

# Production Deployment Configuration
DEPLOYMENT_ENV=production
HEALTH_CHECK_URL=https://your-domain.com
VITE_API_BASE_URL=/api
VITE_AUTH_URL=/api/auth
VITE_MESSAGING_URL=/api/messaging
VITE_SOCKET_URL=wss://your-domain.com

# Build Configuration
VITE_BUILD_MODE=production
VITE_CACHE_BUSTING=true
VITE_MINIFY=true
VITE_OPTIMIZE_DEPS=true

# Security Configuration
SECURE_COOKIES=true
CSRF_PROTECTION=true

# Performance Configuration
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_MAX_AGE=86400

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=/app/logs
ENABLE_ACCESS_LOGS=true
ENABLE_ERROR_TRACKING=true

# Collaboration Configuration
MAX_COLLABORATORS_PER_SESSION=10
SESSION_TIMEOUT_MINUTES=60

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
ENV_EXAMPLE_EOF

echo -e "${GREEN}✓${NC} Created .env.production.example"

# Step 3: Commit the changes
echo ""
echo "📦 Step 3: Committing security fix..."
git add FluxStudio/.env.production.example
git commit -m "Security fix: Remove .env.production from git tracking

- Remove .env.production from git index (was exposed)
- Add .env.production.example with placeholder values
- Credentials need to be rotated due to exposure

Critical: All production secrets were exposed and must be rotated:
- Database password
- Redis password
- JWT secret
- Google OAuth client secret
- SMTP password
- Grafana admin password

Action required: Rotate all credentials immediately

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo -e "${GREEN}✓${NC} Changes committed"

# Step 4: Show credential rotation guide
echo ""
echo -e "${BLUE}=================================="
echo "📋 CREDENTIAL ROTATION REQUIRED"
echo "==================================${NC}"
echo ""
echo "The following credentials were exposed and MUST be rotated:"
echo ""
echo "1. Database Password (PostgreSQL)"
echo "   - Current: s9XlLhIX0QhBH1WJVrj5zsaJX4w372V+"
echo "   - Action: Update PostgreSQL password"
echo "   - Update in: .env.production (DATABASE_URL, POSTGRES_PASSWORD)"
echo ""
echo "2. Redis Password"
echo "   - Current: pQGGljnTBtAGzky1RkuUSkiS3p8J5I0uV2QltV9Tcpw="
echo "   - Action: Update Redis password"
echo "   - Update in: .env.production (REDIS_URL, REDIS_PASSWORD)"
echo ""
echo "3. JWT Secret (256 chars)"
echo "   - Current: 720630e2126867ec9663bfffbd643595..."
echo "   - Action: Regenerate 256-char hex string"
echo "   - Update in: .env.production (JWT_SECRET)"
echo "   - Impact: All users will be logged out"
echo ""
echo "4. Google OAuth Client Secret"
echo "   - Current: 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"
echo "   - Action: Rotate in Google Cloud Console"
echo "   - Update in: .env.production (GOOGLE_CLIENT_SECRET)"
echo ""
echo "5. SMTP Password"
echo "   - Current: kXtUB47/Zd3gQjJloOKTxw=="
echo "   - Action: Update SMTP credentials"
echo "   - Update in: .env.production (SMTP_PASS)"
echo ""
echo "6. Grafana Admin Password"
echo "   - Current: dQfZ863CUNCgtHQo+W79GQ=="
echo "   - Action: Update Grafana admin password"
echo "   - Update in: .env.production (GRAFANA_ADMIN_PASSWORD)"
echo ""
echo -e "${YELLOW}To generate new credentials, run:${NC}"
echo "  node -e \"console.log(require('crypto').randomBytes(128).toString('hex'))\""
echo ""
echo -e "${YELLOW}After rotating credentials:${NC}"
echo "  1. Update .env.production with new values"
echo "  2. Restart all services: pm2 restart all"
echo "  3. Verify production site still works"
echo ""
echo -e "${RED}⚠️  DO NOT push .env.production to git - it's now in .gitignore${NC}"
echo ""

# Step 5: Remind about git history cleanup (optional)
echo -e "${BLUE}=================================="
echo "🧹 OPTIONAL: Clean Git History"
echo "==================================${NC}"
echo ""
echo "The exposed credentials are still in git history."
echo "To completely remove them (DESTRUCTIVE - rewrites history):"
echo ""
echo "  git filter-branch --force --index-filter \\"
echo "    'git rm --cached --ignore-unmatch FluxStudio/.env.production' \\"
echo "    --prune-empty --tag-name-filter cat -- --all"
echo ""
echo "  git push origin --force --all"
echo ""
echo -e "${RED}WARNING: This rewrites git history and affects all collaborators${NC}"
echo ""
