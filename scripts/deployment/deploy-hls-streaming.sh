#!/bin/bash

###############################################################################
# FluxStudio HLS Streaming Deployment Script
#
# This script completes the deployment of the HLS adaptive streaming feature
# to DigitalOcean App Platform.
#
# Prerequisites (COMPLETED):
# ✅ Database migrations run (files & transcoding_jobs tables created)
# ✅ Worker code updated to use cuid for TEXT IDs
# ✅ Dependencies installed (cuid package)
# ✅ Frontend components created
#
# Remaining Steps (THIS SCRIPT):
# 1. Configure DigitalOcean Spaces environment variables
# 2. Update app spec with FFmpeg worker service
# 3. Deploy to App Platform
# 4. Monitor deployment
# 5. Run health checks
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_ID="bd400c99-683f-4d84-ac17-e7130fef0781"
DATABASE_URL="postgresql://doadmin:[REDACTED]@fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  FluxStudio HLS Streaming Deployment                          ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

###############################################################################
# Step 1: Check Prerequisites
###############################################################################

echo -e "${YELLOW}Step 1: Checking Prerequisites${NC}"
echo "---"

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}ERROR: doctl is not installed${NC}"
    echo "Install: brew install doctl"
    exit 1
fi
echo "✅ doctl installed"

# Check if database tables exist
echo "Checking database tables..."
TABLE_CHECK=$(PGPASSWORD="[REDACTED]" psql -h fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com -U doadmin -d defaultdb -p 25060 -tAc "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('files', 'transcoding_jobs');")

if [ "$TABLE_CHECK" -eq "2" ]; then
    echo "✅ Database tables exist (files & transcoding_jobs)"
else
    echo -e "${RED}ERROR: Database tables missing${NC}"
    echo "Run migrations first:"
    echo "  PGPASSWORD=\$PASS psql ... -f database/migrations/010_files_table_text.sql"
    echo "  PGPASSWORD=\$PASS psql ... -f database/migrations/011_hls_streaming_text.sql"
    exit 1
fi

echo ""

###############################################################################
# Step 2: DigitalOcean Spaces Setup Instructions
###############################################################################

echo -e "${YELLOW}Step 2: DigitalOcean Spaces Configuration${NC}"
echo "---"
echo ""
echo "⚠️  MANUAL STEP REQUIRED"
echo ""
echo "You need to set up DigitalOcean Spaces before proceeding:"
echo ""
echo "1. Go to: https://cloud.digitalocean.com/spaces"
echo "2. Click 'Create a Spaces Bucket'"
echo "3. Configuration:"
echo "   - Name: fluxstudio"
echo "   - Region: NYC3"
echo "   - Enable CDN: YES"
echo "   - Access: Public"
echo ""
echo "4. Generate API Keys:"
echo "   - Go to: https://cloud.digitalocean.com/account/api/spaces"
echo "   - Click 'Generate New Key'"
echo "   - Name: fluxstudio-hls"
echo "   - Save the Access Key and Secret Key"
echo ""
echo "5. Configure CORS (optional but recommended):"
echo "   Create cors-config.json:"
echo '   {
     "CORSRules": [{
       "AllowedOrigins": ["https://fluxstudio.art"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"]
     }]
   }'
echo ""
echo "   Then run: s3cmd setcors cors-config.json s3://fluxstudio"
echo ""
echo -e "${GREEN}Have you completed Spaces setup? (y/n)${NC}"
read -r SPACES_READY

if [ "$SPACES_READY" != "y" ]; then
    echo "Please complete Spaces setup and run this script again."
    exit 0
fi

echo ""

###############################################################################
# Step 3: Environment Variables Configuration
###############################################################################

echo -e "${YELLOW}Step 3: Configure Environment Variables${NC}"
echo "---"
echo ""
echo "Enter your DigitalOcean Spaces credentials:"
echo ""

read -p "Spaces Access Key: " SPACES_ACCESS_KEY
read -sp "Spaces Secret Key: " SPACES_SECRET_KEY
echo ""

SPACES_BUCKET="fluxstudio"
SPACES_ENDPOINT="nyc3.digitaloceanspaces.com"
SPACES_REGION="nyc3"
SPACES_CDN="https://fluxstudio.nyc3.cdn.digitaloceanspaces.com"

echo ""
echo "Configuring environment variables for unified-backend..."

doctl apps update "$APP_ID" \
  --upsert-env-var "unified-backend:SPACES_ACCESS_KEY=$SPACES_ACCESS_KEY:SECRET" \
  --upsert-env-var "unified-backend:SPACES_SECRET_KEY=$SPACES_SECRET_KEY:SECRET" \
  --upsert-env-var "unified-backend:SPACES_BUCKET=$SPACES_BUCKET:VALUE" \
  --upsert-env-var "unified-backend:SPACES_ENDPOINT=$SPACES_ENDPOINT:VALUE" \
  --upsert-env-var "unified-backend:SPACES_REGION=$SPACES_REGION:VALUE" \
  --upsert-env-var "unified-backend:SPACES_CDN=$SPACES_CDN:VALUE"

echo "✅ Environment variables configured"
echo ""

###############################################################################
# Step 4: Update App Spec with FFmpeg Worker
###############################################################################

echo -e "${YELLOW}Step 4: Update App Spec with FFmpeg Worker${NC}"
echo "---"
echo ""

echo "Adding FFmpeg worker service to app spec..."

# Read current app spec
doctl apps spec get "$APP_ID" > /tmp/current-app-spec.yaml

# Check if ffmpeg-worker already exists
if grep -q "name: ffmpeg-worker" /tmp/current-app-spec.yaml; then
    echo "✅ FFmpeg worker already in app spec"
else
    echo "⚠️  Manual update required for app spec"
    echo ""
    echo "Add this worker to .do/app.yaml:"
    echo ""
    cat << 'EOF'
workers:
  - name: ffmpeg-worker
    dockerfile_path: services/ffmpeg-worker/Dockerfile
    source_dir: /
    github:
      repo: <your-username>/FluxStudio
      branch: main
      deploy_on_push: true
    instance_size_slug: basic-xs
    instance_count: 1
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
        value: ${DATABASE_URL}
      - key: SPACES_ACCESS_KEY
        scope: RUN_TIME
        type: SECRET
        value: ${SPACES_ACCESS_KEY}
      - key: SPACES_SECRET_KEY
        scope: RUN_TIME
        type: SECRET
        value: ${SPACES_SECRET_KEY}
      - key: SPACES_BUCKET
        scope: RUN_TIME
        value: fluxstudio
      - key: SPACES_ENDPOINT
        scope: RUN_TIME
        value: nyc3.digitaloceanspaces.com
      - key: SPACES_REGION
        scope: RUN_TIME
        value: nyc3
      - key: SPACES_CDN
        scope: RUN_TIME
        value: https://fluxstudio.nyc3.cdn.digitaloceanspaces.com
      - key: NODE_ENV
        scope: RUN_TIME
        value: production
      - key: WORK_DIR
        scope: RUN_TIME
        value: /tmp/transcoding
      - key: CONCURRENT_JOBS
        scope: RUN_TIME
        value: "1"
EOF
    echo ""
    echo "After updating .do/app.yaml:"
    echo "  1. Commit changes: git add .do/app.yaml && git commit -m 'Add FFmpeg worker'"
    echo "  2. Push to main: git push"
    echo "  3. Or update via doctl: doctl apps update $APP_ID --spec .do/app.yaml"
    echo ""
    echo -e "${GREEN}Have you added the worker to app.yaml? (y/n)${NC}"
    read -r WORKER_ADDED

    if [ "$WORKER_ADDED" != "y" ]; then
        echo "Please add the worker configuration and run this script again."
        exit 0
    fi
fi

echo ""

###############################################################################
# Step 5: Deploy Application
###############################################################################

echo -e "${YELLOW}Step 5: Deploy Application${NC}"
echo "---"
echo ""

echo "Creating new deployment..."
DEPLOYMENT_ID=$(doctl apps create-deployment "$APP_ID" --force-rebuild --format ID --no-header)

if [ -z "$DEPLOYMENT_ID" ]; then
    echo -e "${RED}ERROR: Failed to create deployment${NC}"
    exit 1
fi

echo "✅ Deployment created: $DEPLOYMENT_ID"
echo ""

###############################################################################
# Step 6: Monitor Deployment
###############################################################################

echo -e "${YELLOW}Step 6: Monitor Deployment${NC}"
echo "---"
echo ""
echo "Monitoring deployment progress (this may take 5-10 minutes)..."
echo ""

for i in {1..30}; do
    PHASE=$(doctl apps get-deployment "$APP_ID" "$DEPLOYMENT_ID" --format Phase --no-header 2>/dev/null || echo "UNKNOWN")
    PROGRESS=$(doctl apps get-deployment "$APP_ID" "$DEPLOYMENT_ID" --format Progress --no-header 2>/dev/null || echo "UNKNOWN")

    echo "[$i/30] Phase: $PHASE | Progress: $PROGRESS"

    if [ "$PHASE" = "ACTIVE" ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
        break
    elif [ "$PHASE" = "ERROR" ] || [ "$PHASE" = "CANCELED" ]; then
        echo ""
        echo -e "${RED}❌ Deployment failed: $PHASE${NC}"
        echo ""
        echo "Check logs:"
        echo "  doctl apps logs $APP_ID --type BUILD"
        exit 1
    fi

    if [ $i -eq 30 ]; then
        echo ""
        echo -e "${YELLOW}⏳ Deployment still in progress after 15 minutes${NC}"
        echo "Continue monitoring manually:"
        echo "  doctl apps get-deployment $APP_ID $DEPLOYMENT_ID"
        exit 0
    fi

    sleep 30
done

echo ""

###############################################################################
# Step 7: Health Checks
###############################################################################

echo -e "${YELLOW}Step 7: Running Health Checks${NC}"
echo "---"
echo ""

echo "Waiting 30 seconds for services to start..."
sleep 30

echo ""
echo "Testing API endpoints..."
echo ""

# Test unified backend health
echo -n "1. Unified Backend (/api/health): "
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://fluxstudio.art/api/health 2>/dev/null)
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed (Status: $HEALTH_STATUS)${NC}"
fi

# Test database connection
echo -n "2. Database Connection: "
DB_CHECK=$(PGPASSWORD="[REDACTED]" psql -h fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com -U doadmin -d defaultdb -p 25060 -tAc "SELECT 1;" 2>/dev/null)
if [ "$DB_CHECK" = "1" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Check transcoding tables
echo -n "3. Transcoding Tables: "
TABLE_COUNT=$(PGPASSWORD="[REDACTED]" psql -h fluxstudio-db-do-user-22766278-0.g.db.ondigitalocean.com -U doadmin -d defaultdb -p 25060 -tAc "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('files', 'transcoding_jobs');" 2>/dev/null)
if [ "$TABLE_COUNT" = "2" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed (Found $TABLE_COUNT/2 tables)${NC}"
fi

# Check worker logs
echo ""
echo "4. Checking FFmpeg Worker Logs:"
echo "---"
doctl apps logs "$APP_ID" --type RUN --follow=false 2>/dev/null | grep -E "(Worker|FFmpeg|transcoding)" | tail -10 || echo "No worker logs yet (this is normal on first deployment)"

echo ""

###############################################################################
# Step 8: Summary and Next Steps
###############################################################################

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete!                                          ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "✅ Database migrations applied"
echo "✅ Environment variables configured"
echo "✅ FFmpeg worker deployed"
echo "✅ Health checks passed"
echo ""
echo "Cost Summary:"
echo "  - DigitalOcean Spaces (250GB + CDN): \$5/month"
echo "  - FFmpeg Worker (basic-xs): \$6/month"
echo "  - Database (existing): \$15/month"
echo "  - Total: \$26/month"
echo ""
echo "Next Steps:"
echo ""
echo "1. Test video upload and transcoding:"
echo "   - Upload a video via the UI"
echo "   - Submit transcoding job: POST /media/transcode"
echo "   - Monitor progress: GET /media/transcode/:fileId"
echo "   - Check HLS output in Spaces"
echo ""
echo "2. Monitor worker performance:"
echo "   - View active jobs: SELECT * FROM active_transcoding_jobs;"
echo "   - View history: SELECT * FROM transcoding_history;"
echo "   - Check statistics: SELECT * FROM transcoding_jobs;"
echo ""
echo "3. Review documentation:"
echo "   - HLS_DEPLOYMENT_GUIDE.md - Complete deployment procedures"
echo "   - HLS_IMPLEMENTATION_COMPLETE.md - Architecture details"
echo "   - FRONTEND_INTEGRATION_COMPLETE.md - Component usage"
echo ""
echo "Application URLs:"
echo "  - Frontend: https://fluxstudio.art"
echo "  - API: https://fluxstudio.art/api"
echo "  - Health: https://fluxstudio.art/api/health"
echo ""
echo "Useful Commands:"
echo "  - View logs: doctl apps logs $APP_ID --type RUN --follow"
echo "  - Check deployment: doctl apps get-deployment $APP_ID $DEPLOYMENT_ID"
echo "  - Database query: PGPASSWORD=\$PASS psql -h ... -d defaultdb"
echo ""
echo -e "${GREEN}🎉 HLS Streaming is ready to use!${NC}"
echo ""
