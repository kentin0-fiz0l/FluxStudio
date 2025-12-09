#!/bin/bash
# Monitor Phase 4A Deployment

APP_ID="bd400c99-683f-4d84-ac17-e7130fef0781"
DEPLOYMENT_ID="39ffc513-fb51-4b37-a3b8-4fa4d7e8886e"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Phase 4A Deployment Monitor                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Deployment ID:${NC} $DEPLOYMENT_ID"
echo -e "${BLUE}Monitoring...${NC} (Press Ctrl+C to exit)"
echo ""

for i in {1..120}; do
    STATUS=$(doctl apps get-deployment $APP_ID $DEPLOYMENT_ID \
        --format "Phase,Progress" --no-header 2>/dev/null)

    if [ $? -eq 0 ]; then
        PHASE=$(echo "$STATUS" | awk '{print $1}')
        PROGRESS=$(echo "$STATUS" | awk '{print $2}')

        # Clear line and print status
        echo -ne "\r${BLUE}Status:${NC} $PHASE | ${BLUE}Progress:${NC} $PROGRESS              "

        # Check if deployment completed
        if [ "$PHASE" = "ACTIVE" ]; then
            echo ""
            echo ""
            echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
            echo ""
            echo "╔════════════════════════════════════════════════════════════╗"
            echo "║  Phase 4A Deployed to Production                          ║"
            echo "╚════════════════════════════════════════════════════════════╝"
            echo ""
            echo -e "${GREEN}✓${NC} App URL: https://unified-backend-lfx7p.ondigitalocean.app"
            echo ""
            echo "Next steps:"
            echo "  1. Test the new features:"
            echo "     - Visit https://unified-backend-lfx7p.ondigitalocean.app"
            echo "     - Login and navigate to a project"
            echo "     - Click 'Files' tab"
            echo "     - Upload an STL file"
            echo "     - Click 'Print' button and verify QuickPrintDialog"
            echo ""
            echo "  2. Monitor for issues:"
            echo "     doctl apps logs $APP_ID --type run --tail 100"
            echo ""
            echo "  3. Check print endpoints:"
            echo "     curl https://unified-backend-lfx7p.ondigitalocean.app/api/health"
            echo ""
            break
        fi

        # Check if deployment failed
        if [ "$PHASE" = "ERROR" ]; then
            echo ""
            echo ""
            echo -e "${RED}✗ Deployment failed${NC}"
            echo ""
            doctl apps get-deployment $APP_ID $DEPLOYMENT_ID
            exit 1
        fi
    fi

    sleep 5
done

if [ $i -ge 120 ]; then
    echo ""
    echo -e "${YELLOW}⚠ Monitoring timed out after 10 minutes${NC}"
    echo "Check status manually: doctl apps get-deployment $APP_ID $DEPLOYMENT_ID"
fi
