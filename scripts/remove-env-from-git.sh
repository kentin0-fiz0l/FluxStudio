#!/bin/bash

# Remove .env.production from Git History
# WARNING: This rewrites git history!
#
# Usage: ./scripts/remove-env-from-git.sh

set -e

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║              REMOVE .env.production FROM GIT HISTORY                         ║"
echo "║                                                                              ║"
echo "║                  ⚠️  THIS REWRITES GIT HISTORY ⚠️                            ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if running from project root
if [ ! -d ".git" ]; then
    echo "❌ Error: Must run from git repository root"
    exit 1
fi

# Warning
echo "⚠️  WARNING: This operation will:"
echo ""
echo "   1. Rewrite ALL git history"
echo "   2. Change ALL commit SHAs"
echo "   3. Require force push to remote"
echo "   4. Require all team members to re-clone or reset"
echo ""
echo "📋 Team Coordination Required:"
echo ""
echo "   Before running this script:"
echo "   - ✅ Notify ALL team members"
echo "   - ✅ Ensure no one is actively pushing"
echo "   - ✅ Back up repository (git clone --mirror)"
echo "   - ✅ Confirm credentials have been rotated"
echo ""
echo "   After running this script:"
echo "   - Team members must run: git fetch --all && git reset --hard origin/master"
echo "   - Or re-clone the repository"
echo ""

read -p "Have you completed team coordination? (yes/no): " coordinated

if [ "$coordinated" != "yes" ]; then
    echo "❌ Aborted: Complete team coordination first"
    exit 0
fi

read -p "Type 'REWRITE HISTORY' to confirm: " confirmation

if [ "$confirmation" != "REWRITE HISTORY" ]; then
    echo "❌ Aborted: Confirmation failed"
    exit 0
fi

# Create backup
BACKUP_DIR="./security/git-backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre-rewrite-$(date +%Y%m%d_%H%M%S).bundle"

echo ""
echo "📦 Creating backup bundle..."
git bundle create "$BACKUP_FILE" --all
echo "✅ Backup created: $BACKUP_FILE"

# Check current status
echo ""
echo "📊 Current repository status:"
git log --all --oneline --follow -- .env.production | head -5
echo ""

# Remove .env.production from history
echo "🔄 Removing .env.production from git history..."
echo "   This may take a few minutes..."
echo ""

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production" \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "✅ File removed from history"

# Clean up refs
echo ""
echo "🧹 Cleaning up references..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║                  ✅ GIT HISTORY REWRITE COMPLETE                             ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 NEXT STEPS (CRITICAL):"
echo ""
echo "1. VERIFY CHANGES"
echo "   git log --all --oneline --follow -- .env.production"
echo "   # Should return empty or 'fatal: ambiguous argument'"
echo ""
echo "2. FORCE PUSH TO REMOTE"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. NOTIFY TEAM IMMEDIATELY"
echo "   Send this message to all team members:"
echo ""
echo "   ┌─────────────────────────────────────────────────────┐"
echo "   │ 🚨 GIT HISTORY REWRITTEN - ACTION REQUIRED           │"
echo "   │                                                      │"
echo "   │ The .env.production file has been removed from       │"
echo "   │ git history for security reasons.                    │"
echo "   │                                                      │"
echo "   │ YOU MUST take one of these actions:                 │"
echo "   │                                                      │"
echo "   │ Option 1: Reset your local repository               │"
echo "   │   git fetch --all                                    │"
echo "   │   git reset --hard origin/master                     │"
echo "   │                                                      │"
echo "   │ Option 2: Re-clone the repository                   │"
echo "   │   cd ..                                              │"
echo "   │   mv FluxStudio FluxStudio.old                       │"
echo "   │   git clone <repo-url>                               │"
echo "   │   cd FluxStudio                                      │"
echo "   │   npm install                                        │"
echo "   │                                                      │"
echo "   │ ⚠️  DO NOT try to merge or pull - it will fail      │"
echo "   └─────────────────────────────────────────────────────┘"
echo ""
echo "4. VERIFY .env.production IS IGNORED"
echo "   git check-ignore .env.production"
echo "   # Should output: .env.production"
echo ""
echo "5. UPDATE .gitignore (if needed)"
echo "   Ensure these lines exist in .gitignore:"
echo "     .env"
echo "     .env.local"
echo "     .env.production"
echo "     .env.staging"
echo ""
echo "6. VERIFY NO SECRETS IN HISTORY"
echo "   git log --all --full-history -S 'JWT_SECRET' -- ."
echo "   # Should return empty"
echo ""
echo "📦 Recovery backup saved at:"
echo "   $BACKUP_FILE"
echo ""
echo "   To restore if needed:"
echo "   git clone $BACKUP_FILE recovered-repo"
echo ""
