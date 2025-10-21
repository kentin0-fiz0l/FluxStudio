#!/bin/bash

# Rollback Script for Git History Cleanup
# Use this if the git history cleanup goes wrong and you need to restore from backup
#
# Usage: ./scripts/rollback-git-cleanup.sh

set -e

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "                     GIT HISTORY CLEANUP ROLLBACK SCRIPT                        "
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${RED}⚠️  WARNING: This script will restore your repository from backup${NC}"
echo ""
echo "This should ONLY be used if:"
echo "  1. The git history cleanup failed"
echo "  2. Repository is corrupted"
echo "  3. Critical commits were lost"
echo "  4. Team coordination failed"
echo ""

# Check if running from repository root
if [ ! -d ".git" ]; then
    echo -e "${RED}✗ Error: Must run from git repository root${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running from git repository root${NC}"
echo ""

# Ask for reason
echo "════════════════════════════════════════════════════════════════════════════════"
echo "ROLLBACK REASON"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
read -p "Why are you rolling back? (required): " rollback_reason

if [ -z "$rollback_reason" ]; then
    echo -e "${RED}✗ Rollback reason is required for documentation${NC}"
    exit 1
fi

# List available backups
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "AVAILABLE BACKUPS"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Check for bundle backups
if ls security/git-backups/pre-cleanup-*.bundle > /dev/null 2>&1; then
    echo -e "${GREEN}Bundle Backups Found:${NC}"
    ls -lh security/git-backups/pre-cleanup-*.bundle | awk '{print "  "$9" ("$5")"}'
    BUNDLE_AVAILABLE=true
else
    echo -e "${YELLOW}No bundle backups found in security/git-backups/${NC}"
    BUNDLE_AVAILABLE=false
fi

echo ""

# Check for mirror backups
cd ..
if ls FluxStudio-backup-*.git > /dev/null 2>&1; then
    echo -e "${GREEN}Mirror Backups Found:${NC}"
    du -sh FluxStudio-backup-*.git | awk '{print "  "$2" ("$1")"}'
    MIRROR_AVAILABLE=true
else
    echo -e "${YELLOW}No mirror backups found in parent directory${NC}"
    MIRROR_AVAILABLE=false
fi
cd FluxStudio

echo ""

# Check if any backups available
if [ "$BUNDLE_AVAILABLE" = false ] && [ "$MIRROR_AVAILABLE" = false ]; then
    echo -e "${RED}✗ ERROR: No backups found!${NC}"
    echo ""
    echo "Cannot proceed with rollback without a backup."
    echo ""
    echo "If you have a backup in another location:"
    echo "  1. Copy it to security/git-backups/"
    echo "  2. Run this script again"
    echo ""
    exit 1
fi

# Choose rollback method
echo "════════════════════════════════════════════════════════════════════════════════"
echo "ROLLBACK METHOD"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Choose rollback method:"
echo ""

METHOD_NUM=1

if [ "$BUNDLE_AVAILABLE" = true ]; then
    echo "  $METHOD_NUM) Restore from Bundle Backup (Recommended)"
    echo "     - Restores all branches and history"
    echo "     - Preserves working directory"
    echo "     - Faster"
    BUNDLE_METHOD=$METHOD_NUM
    ((METHOD_NUM++))
fi

if [ "$MIRROR_AVAILABLE" = true ]; then
    echo "  $METHOD_NUM) Restore from Mirror Backup"
    echo "     - Complete repository replacement"
    echo "     - Most thorough"
    echo "     - Removes current directory"
    MIRROR_METHOD=$METHOD_NUM
    ((METHOD_NUM++))
fi

echo "  $METHOD_NUM) Cancel (recommended if unsure)"
CANCEL_METHOD=$METHOD_NUM

echo ""
read -p "Enter choice (1-$METHOD_NUM): " choice

# Process choice
if [ "$choice" = "$CANCEL_METHOD" ]; then
    echo -e "${BLUE}Rollback cancelled${NC}"
    exit 0
fi

# Validate choice
if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt $((METHOD_NUM - 1)) ]; then
    echo -e "${RED}✗ Invalid choice${NC}"
    exit 1
fi

# Confirm rollback
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "CONFIRMATION"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${RED}⚠️  THIS WILL OVERWRITE YOUR CURRENT REPOSITORY${NC}"
echo ""
echo "Current repository state will be:"
echo "  - Backed up to FluxStudio.pre-rollback-$(date +%Y%m%d_%H%M%S)"
echo "  - Replaced with backup from before cleanup"
echo ""
echo "This means:"
echo "  ✗ Any commits made AFTER the backup will be lost"
echo "  ✗ The .env.production file will be back in history"
echo "  ✗ All exposed credentials will be in history again"
echo ""
echo "After rollback, you MUST:"
echo "  1. Rotate all credentials again (they're still exposed)"
echo "  2. Notify the team immediately"
echo "  3. Plan a new cleanup attempt"
echo ""

read -p "Type 'ROLLBACK NOW' to confirm: " confirmation

if [ "$confirmation" != "ROLLBACK NOW" ]; then
    echo -e "${BLUE}Rollback cancelled${NC}"
    exit 0
fi

# Create pre-rollback backup of current state
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "SAFETY BACKUP"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Creating backup of current state (in case rollback needs to be undone)..."

CURRENT_BACKUP="../FluxStudio.pre-rollback-$(date +%Y%m%d_%H%M%S)"
cd ..
cp -R FluxStudio "$CURRENT_BACKUP"
cd FluxStudio

echo -e "${GREEN}✓ Current state backed up to: $CURRENT_BACKUP${NC}"
echo ""

# Execute rollback based on choice
echo "════════════════════════════════════════════════════════════════════════════════"
echo "EXECUTING ROLLBACK"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

if [ "$BUNDLE_AVAILABLE" = true ] && [ "$choice" = "$BUNDLE_METHOD" ]; then
    # Restore from bundle
    echo "Restoring from bundle backup..."
    echo ""

    # Find most recent bundle
    BUNDLE_FILE=$(ls -t security/git-backups/pre-cleanup-*.bundle | head -1)
    echo "Using backup: $BUNDLE_FILE"
    echo ""

    # Verify bundle integrity
    echo "Verifying bundle integrity..."
    if ! git bundle verify "$BUNDLE_FILE"; then
        echo -e "${RED}✗ ERROR: Bundle verification failed${NC}"
        echo "Bundle may be corrupted. Try mirror backup instead."
        exit 1
    fi
    echo -e "${GREEN}✓ Bundle verified${NC}"
    echo ""

    # Fetch from bundle
    echo "Fetching history from bundle..."
    git fetch "$BUNDLE_FILE" refs/heads/*:refs/heads/*

    # Reset to master
    echo "Resetting to master branch..."
    git checkout master
    git reset --hard FETCH_HEAD

    # Clean up
    echo "Cleaning up..."
    git reflog expire --expire=now --all
    git gc --prune=now

    echo ""
    echo -e "${GREEN}✓ Rollback from bundle complete${NC}"

elif [ "$MIRROR_AVAILABLE" = true ] && [ "$choice" = "$MIRROR_METHOD" ]; then
    # Restore from mirror
    echo "Restoring from mirror backup..."
    echo ""

    # Find most recent mirror
    cd ..
    MIRROR_DIR=$(ls -td FluxStudio-backup-*.git | head -1)
    echo "Using backup: $MIRROR_DIR"
    echo ""

    # Remove current directory and restore
    echo "Removing current FluxStudio directory..."
    rm -rf FluxStudio

    echo "Copying mirror backup..."
    cp -R "$MIRROR_DIR" FluxStudio

    cd FluxStudio

    echo ""
    echo -e "${GREEN}✓ Rollback from mirror complete${NC}"

else
    echo -e "${RED}✗ ERROR: Invalid method selection${NC}"
    exit 1
fi

# Verification
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "VERIFICATION"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Check if .env.production is back in history (should be)
echo "Checking if .env.production is back in history..."
ENV_PROD_COMMITS=$(git log --all --full-history --oneline -- .env.production | wc -l | tr -d ' ')

if [ "$ENV_PROD_COMMITS" -gt 0 ]; then
    echo -e "${GREEN}✓ .env.production is back in history ($ENV_PROD_COMMITS commits)${NC}"
else
    echo -e "${YELLOW}⚠ .env.production not found in history (unexpected)${NC}"
fi

# Check repository integrity
echo ""
echo "Checking repository integrity..."
if git fsck --full > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Repository integrity check passed${NC}"
else
    echo -e "${RED}✗ Repository has integrity issues${NC}"
    git fsck --full | head -10
fi

# Check current branch
echo ""
echo "Current branch:"
git branch --show-current
echo ""
echo "Recent commits:"
git log --oneline -5

# Log rollback
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo "ROLLBACK COMPLETE"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Create rollback log
ROLLBACK_LOG="security/rollback-log-$(date +%Y%m%d_%H%M%S).txt"
mkdir -p security
cat > "$ROLLBACK_LOG" << EOF
Git History Cleanup Rollback Log
=================================

Timestamp: $(date)
Reason: $rollback_reason
Method: $([ "$choice" = "$BUNDLE_METHOD" ] && echo "Bundle" || echo "Mirror")
Executed by: $(whoami)
Backup used: $([ "$choice" = "$BUNDLE_METHOD" ] && echo "$BUNDLE_FILE" || echo "$MIRROR_DIR")

Current State:
- .env.production commits in history: $ENV_PROD_COMMITS
- Repository integrity: $(git fsck --full > /dev/null 2>&1 && echo "OK" || echo "ISSUES")
- Current branch: $(git branch --show-current)
- Latest commit: $(git log --oneline -1)

Safety backup of pre-rollback state: $CURRENT_BACKUP

Next Steps Required:
1. Rotate all credentials IMMEDIATELY (they're exposed in history again)
2. Notify team of rollback
3. Investigate why cleanup failed
4. Plan new cleanup attempt
5. Review and fix issues before next attempt

EOF

echo "Rollback logged to: $ROLLBACK_LOG"
echo ""

echo -e "${GREEN}✓ Repository has been restored from backup${NC}"
echo ""
echo -e "${RED}CRITICAL NEXT STEPS:${NC}"
echo ""
echo "1. ROTATE ALL CREDENTIALS IMMEDIATELY"
echo "   ./scripts/rotate-credentials.sh"
echo ""
echo "2. NOTIFY TEAM OF ROLLBACK"
echo "   Send email explaining:"
echo "   - Cleanup was rolled back"
echo "   - Repository is back to pre-cleanup state"
echo "   - New cleanup will be scheduled"
echo "   - Credentials are being rotated again"
echo ""
echo "3. INVESTIGATE FAILURE"
echo "   Rollback reason: $rollback_reason"
echo "   Review what went wrong before next attempt"
echo ""
echo "4. DO NOT ATTEMPT CLEANUP AGAIN"
echo "   Until root cause is identified and fixed"
echo ""
echo "5. VERIFY TEAM MEMBERS ARE AWARE"
echo "   Everyone should know the cleanup was rolled back"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Safety backups:"
echo "  Current state: $CURRENT_BACKUP"
echo "  Original backup: $([ "$choice" = "$BUNDLE_METHOD" ] && echo "$BUNDLE_FILE" || echo "$MIRROR_DIR")"
echo ""
echo "To undo this rollback (restore to post-cleanup state):"
echo "  cd .."
echo "  rm -rf FluxStudio"
echo "  mv $CURRENT_BACKUP FluxStudio"
echo "  cd FluxStudio"
echo ""
