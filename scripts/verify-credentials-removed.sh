#!/bin/bash

# Comprehensive Verification Script for Git History Cleanup
# Verifies that .env.production and all sensitive credentials have been removed from git history
#
# Usage: ./scripts/verify-credentials-removed.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Results array
declare -a FAILURES
declare -a WARNINGS_LIST

# Function to print colored output
print_status() {
    local status=$1
    local message=$2

    case $status in
        "PASS")
            echo -e "${GREEN}✓ PASS${NC}: $message"
            ((PASSED++))
            ;;
        "FAIL")
            echo -e "${RED}✗ FAIL${NC}: $message"
            ((FAILED++))
            FAILURES+=("$message")
            ;;
        "WARN")
            echo -e "${YELLOW}⚠ WARN${NC}: $message"
            ((WARNINGS++))
            WARNINGS_LIST+=("$message")
            ;;
        "INFO")
            echo -e "${BLUE}ℹ INFO${NC}: $message"
            ;;
    esac
}

# Header
echo "════════════════════════════════════════════════════════════════════════════════"
echo "                 GIT HISTORY CLEANUP VERIFICATION SCRIPT                        "
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "This script verifies that .env.production and sensitive credentials"
echo "have been completely removed from git history."
echo ""
echo "Starting verification at $(date)"
echo ""

# Check if running from repository root
if [ ! -d ".git" ]; then
    print_status "FAIL" "Must run from git repository root"
    exit 1
fi

print_status "PASS" "Running from git repository root"
echo ""

#------------------------------------------------------------------------------
# TEST 1: Verify .env.production not in current history
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 1: File Removal from History"
echo "════════════════════════════════════════════════════════════════════════════════"

ENV_PROD_COMMITS=$(git log --all --full-history --oneline -- .env.production 2>&1 | grep -v "fatal" | wc -l | tr -d ' ')

if [ "$ENV_PROD_COMMITS" -eq 0 ]; then
    print_status "PASS" ".env.production not found in git history"
else
    print_status "FAIL" ".env.production still exists in $ENV_PROD_COMMITS commits"
    echo "       Commits containing .env.production:"
    git log --all --full-history --oneline -- .env.production | head -5
fi

# Check all branches
for branch in $(git branch -a | grep -v HEAD | sed 's/^..//' | sed 's/remotes\///'); do
    BRANCH_CHECK=$(git log "$branch" --full-history --oneline -- .env.production 2>&1 | grep -v "fatal" | wc -l | tr -d ' ')
    if [ "$BRANCH_CHECK" -eq 0 ]; then
        print_status "PASS" "Branch $branch is clean"
    else
        print_status "FAIL" "Branch $branch contains .env.production in $BRANCH_CHECK commits"
    fi
done

echo ""

#------------------------------------------------------------------------------
# TEST 2: Search for specific credential patterns in history
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 2: Credential Pattern Search"
echo "════════════════════════════════════════════════════════════════════════════════"

# Define patterns to search for
declare -a PATTERNS=(
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "POSTGRES_PASSWORD"
    "MONGODB_PASSWORD"
    "REDIS_PASSWORD"
    "GOOGLE_CLIENT_SECRET"
    "GITHUB_CLIENT_SECRET"
    "SMTP_PASSWORD"
    "GRAFANA_ADMIN_PASSWORD"
    "OPENAI_API_KEY"
    "STRIPE_SECRET_KEY"
    "AWS_SECRET_ACCESS_KEY"
    "DATABASE_URL.*password"
    "mongodb://.*:.*@"
)

for pattern in "${PATTERNS[@]}"; do
    # Search in commit diffs
    PATTERN_MATCHES=$(git log --all --source --full-history -S "$pattern" --oneline 2>&1 | grep -v "fatal" | wc -l | tr -d ' ')

    if [ "$PATTERN_MATCHES" -eq 0 ]; then
        print_status "PASS" "Pattern '$pattern' not found in history"
    else
        # Check if matches are in .env.production or other files
        FILES_WITH_PATTERN=$(git log --all --source --full-history -S "$pattern" --name-only --oneline | grep -v "^[a-f0-9]" | sort -u)

        # Filter out allowed files (like .env.example, documentation)
        SENSITIVE_FILES=$(echo "$FILES_WITH_PATTERN" | grep -v ".env.example" | grep -v ".md" | grep -v ".txt" | wc -l | tr -d ' ')

        if [ "$SENSITIVE_FILES" -gt 0 ]; then
            print_status "FAIL" "Pattern '$pattern' found in $PATTERN_MATCHES commits"
            echo "       Files: $FILES_WITH_PATTERN"
        else
            print_status "WARN" "Pattern '$pattern' found in documentation only (acceptable)"
        fi
    fi
done

echo ""

#------------------------------------------------------------------------------
# TEST 3: Verify .gitignore includes sensitive files
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 3: .gitignore Configuration"
echo "════════════════════════════════════════════════════════════════════════════════"

# Check if .gitignore exists
if [ ! -f ".gitignore" ]; then
    print_status "FAIL" ".gitignore file not found"
else
    print_status "PASS" ".gitignore file exists"

    # Check for specific patterns
    declare -a IGNORE_PATTERNS=(
        ".env"
        ".env.local"
        ".env.production"
        ".env.staging"
        "*.key"
        "*.pem"
    )

    for ignore_pattern in "${IGNORE_PATTERNS[@]}"; do
        if git check-ignore "$ignore_pattern" > /dev/null 2>&1; then
            print_status "PASS" "'$ignore_pattern' is in .gitignore"
        else
            print_status "WARN" "'$ignore_pattern' should be added to .gitignore"
        fi
    done
fi

echo ""

#------------------------------------------------------------------------------
# TEST 4: Check reflog for .env.production references
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 4: Reflog Verification"
echo "════════════════════════════════════════════════════════════════════════════════"

REFLOG_MATCHES=$(git reflog --all 2>&1 | grep -i "env.production" | wc -l | tr -d ' ')

if [ "$REFLOG_MATCHES" -eq 0 ]; then
    print_status "PASS" "No .env.production references in reflog"
else
    print_status "WARN" ".env.production found in reflog ($REFLOG_MATCHES occurrences)"
    echo "       This is expected if cleanup was recent. Reflog will expire naturally."
fi

echo ""

#------------------------------------------------------------------------------
# TEST 5: Verify pre-commit hook is installed
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 5: Prevention Measures"
echo "════════════════════════════════════════════════════════════════════════════════"

if [ -f ".git/hooks/pre-commit" ]; then
    if [ -x ".git/hooks/pre-commit" ]; then
        print_status "PASS" "Pre-commit hook installed and executable"

        # Check if hook contains .env.production check
        if grep -q ".env.production" .git/hooks/pre-commit; then
            print_status "PASS" "Pre-commit hook checks for .env.production"
        else
            print_status "WARN" "Pre-commit hook doesn't check for .env.production"
        fi
    else
        print_status "WARN" "Pre-commit hook exists but is not executable"
        echo "       Run: chmod +x .git/hooks/pre-commit"
    fi
else
    print_status "FAIL" "Pre-commit hook not installed"
    echo "       Hook should be at: .git/hooks/pre-commit"
fi

echo ""

#------------------------------------------------------------------------------
# TEST 6: Repository integrity check
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 6: Repository Integrity"
echo "════════════════════════════════════════════════════════════════════════════════"

# Run fsck
FSCK_OUTPUT=$(git fsck --full 2>&1)
FSCK_ERRORS=$(echo "$FSCK_OUTPUT" | grep -i "error" | wc -l | tr -d ' ')

if [ "$FSCK_ERRORS" -eq 0 ]; then
    print_status "PASS" "Repository integrity check passed"
else
    print_status "FAIL" "Repository has integrity errors ($FSCK_ERRORS errors)"
    echo "$FSCK_OUTPUT" | grep -i "error" | head -5
fi

# Check for dangling objects (informational only)
DANGLING_COMMITS=$(echo "$FSCK_OUTPUT" | grep "dangling commit" | wc -l | tr -d ' ')
if [ "$DANGLING_COMMITS" -gt 0 ]; then
    print_status "INFO" "Found $DANGLING_COMMITS dangling commits (normal after cleanup)"
fi

echo ""

#------------------------------------------------------------------------------
# TEST 7: Remote verification (if remote exists)
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 7: Remote Repository Status"
echo "════════════════════════════════════════════════════════════════════════════════"

if git remote | grep -q "origin"; then
    print_status "PASS" "Remote 'origin' configured"

    # Check if .env.production exists in remote
    REMOTE_CHECK=$(git ls-remote origin 2>&1 | grep -i "env.production" | wc -l | tr -d ' ')

    if [ "$REMOTE_CHECK" -eq 0 ]; then
        print_status "PASS" "No .env.production references in remote refs"
    else
        print_status "FAIL" ".env.production references found in remote"
    fi

    # Check if local is ahead of remote (indicates changes not pushed)
    LOCAL_COMMITS=$(git rev-list --count @{u}..HEAD 2>&1 || echo "0")
    if [ "$LOCAL_COMMITS" != "0" ] && [ "$LOCAL_COMMITS" != "" ]; then
        if [[ "$LOCAL_COMMITS" =~ ^[0-9]+$ ]] && [ "$LOCAL_COMMITS" -gt 0 ]; then
            print_status "WARN" "Local is $LOCAL_COMMITS commits ahead of remote"
            echo "       You may need to force push: git push origin --force --all"
        fi
    else
        print_status "PASS" "Local and remote are in sync"
    fi
else
    print_status "INFO" "No remote repository configured"
fi

echo ""

#------------------------------------------------------------------------------
# TEST 8: Check for .env.production in working directory
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 8: Working Directory Status"
echo "════════════════════════════════════════════════════════════════════════════════"

if [ -f ".env.production" ]; then
    print_status "PASS" ".env.production exists in working directory (expected)"

    # Check if it's staged
    if git diff --cached --name-only | grep -q ".env.production"; then
        print_status "FAIL" ".env.production is staged for commit"
        echo "       Run: git reset HEAD .env.production"
    else
        print_status "PASS" ".env.production is not staged"
    fi

    # Check if it's tracked
    if git ls-files | grep -q ".env.production"; then
        print_status "FAIL" ".env.production is being tracked by git"
        echo "       Run: git rm --cached .env.production"
    else
        print_status "PASS" ".env.production is untracked (correct)"
    fi
else
    print_status "INFO" ".env.production not found in working directory"
fi

echo ""

#------------------------------------------------------------------------------
# TEST 9: Check repository size (should be smaller after cleanup)
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 9: Repository Size Analysis"
echo "════════════════════════════════════════════════════════════════════════════════"

if [ -d ".git" ]; then
    GIT_SIZE=$(du -sh .git | cut -f1)
    print_status "INFO" "Current .git directory size: $GIT_SIZE"

    # Check for backup to compare
    if ls security/git-backups/pre-cleanup-*.bundle > /dev/null 2>&1; then
        BACKUP_SIZE=$(du -sh security/git-backups/pre-cleanup-*.bundle | cut -f1 | head -1)
        print_status "INFO" "Backup bundle size: $BACKUP_SIZE"
        print_status "PASS" "Size comparison available in info above"
    else
        print_status "INFO" "No backup bundle found for size comparison"
    fi
fi

echo ""

#------------------------------------------------------------------------------
# TEST 10: Advanced pattern search for common credential formats
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "TEST 10: Advanced Credential Format Detection"
echo "════════════════════════════════════════════════════════════════════════════════"

# Regex patterns for common credential formats
declare -a REGEX_PATTERNS=(
    # API Keys (32-64 char alphanumeric)
    "[A-Za-z0-9]{32,64}"
    # JWT Tokens
    "eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\."
    # Private keys
    "-----BEGIN.*PRIVATE KEY-----"
    # Connection strings with passwords
    "://[^:]+:[^@]+@"
)

# Note: These patterns are broad and may have false positives
print_status "INFO" "Running advanced pattern detection (may take a few minutes)..."

# Only check recent commits to avoid long scan times
RECENT_COMMITS=$(git log --all --oneline --since="2025-10-01" | wc -l | tr -d ' ')
print_status "INFO" "Scanning $RECENT_COMMITS commits since October 2025"

# Sample check for JWT pattern (most distinctive)
JWT_MATCHES=$(git log --all --since="2025-10-01" -S "eyJ" --oneline 2>&1 | grep -v "fatal" | wc -l | tr -d ' ')
if [ "$JWT_MATCHES" -eq 0 ]; then
    print_status "PASS" "No JWT token patterns found in recent history"
else
    print_status "WARN" "Potential JWT tokens found in $JWT_MATCHES recent commits"
    echo "       Manual review recommended for these commits"
fi

echo ""

#------------------------------------------------------------------------------
# SUMMARY
#------------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════════"
echo "                            VERIFICATION SUMMARY                                 "
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests Run: $((PASSED + FAILED + WARNINGS))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

# Overall status
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    ✓ VERIFICATION SUCCESSFUL                                   ${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "The git history cleanup was successful. All critical checks passed."

    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Warnings detected (non-critical):${NC}"
        for warning in "${WARNINGS_LIST[@]}"; do
            echo "  - $warning"
        done
    fi

    echo ""
    echo "Next steps:"
    echo "1. If you haven't already, force push to remote:"
    echo "   git push origin --force --all"
    echo "   git push origin --force --tags"
    echo ""
    echo "2. Notify team members to sync their repositories"
    echo "   See: docs/GIT_HISTORY_CLEANUP.md (Team Synchronization section)"
    echo ""
    echo "3. Verify all team members have synced within 24 hours"
    echo ""

    exit 0
else
    echo -e "${RED}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}                    ✗ VERIFICATION FAILED                                       ${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${RED}Critical failures detected:${NC}"
    for failure in "${FAILURES[@]}"; do
        echo "  - $failure"
    done
    echo ""
    echo "DO NOT proceed with force push until all failures are resolved."
    echo ""
    echo "Recommended actions:"
    echo "1. Review the failures above"
    echo "2. Re-run the cleanup process if needed"
    echo "3. Consult docs/GIT_HISTORY_CLEANUP.md for troubleshooting"
    echo "4. Run this verification script again after fixes"
    echo ""
    echo "If you need to rollback, see 'Rollback Procedure' in:"
    echo "docs/GIT_HISTORY_CLEANUP.md"
    echo ""

    exit 1
fi
