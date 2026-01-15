#!/bin/bash
# Pre-commit hook to prevent committing secrets and sensitive files
# Install: cp scripts/pre-commit-check.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Running pre-commit security checks..."

# Check for .env files being ADDED (excluding .example files and deletions)
ENV_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.env($|\.[^e])' | grep -v '\.example' || true)
if [ -n "$ENV_FILES" ]; then
    echo -e "${RED}ERROR: Attempting to commit .env files:${NC}"
    echo "$ENV_FILES"
    echo -e "${YELLOW}These files may contain secrets and should not be committed.${NC}"
    exit 1
fi

# Check for common secret patterns in staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|tsx|json|yml|yaml|sh|md)$' || true)

if [ -n "$STAGED_FILES" ]; then
    # Patterns that indicate potential secrets
    SECRET_PATTERNS=(
        'PRIVATE_KEY='
        'SECRET_KEY='
        'API_KEY=[^$]'
        'password\s*=\s*["\047][^$]'
        'sk-[a-zA-Z0-9]{20,}'
        'ghp_[a-zA-Z0-9]{36}'
        'gho_[a-zA-Z0-9]{36}'
        'postgresql://[^${}].*@'
        'mongodb\+srv://[^${}].*@'
        'redis://[^${}].*@'
    )

    for pattern in "${SECRET_PATTERNS[@]}"; do
        MATCHES=$(git diff --cached -G "$pattern" --name-only 2>/dev/null || true)
        if [ -n "$MATCHES" ]; then
            echo -e "${YELLOW}WARNING: Potential secrets detected matching pattern: $pattern${NC}"
            echo "Files: $MATCHES"
            echo -e "${YELLOW}Please review these files carefully before committing.${NC}"
            # Don't exit, just warn - some patterns may have false positives
        fi
    done
fi

# Check for large files (>5MB)
LARGE_FILES=$(git diff --cached --name-only | while read file; do
    if [ -f "$file" ]; then
        SIZE=$(wc -c < "$file" 2>/dev/null || echo "0")
        if [ "$SIZE" -gt 5242880 ]; then
            echo "$file ($(numfmt --to=iec $SIZE 2>/dev/null || echo "${SIZE}B"))"
        fi
    fi
done || true)

if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}WARNING: Large files detected (>5MB):${NC}"
    echo "$LARGE_FILES"
    echo -e "${YELLOW}Consider using Git LFS or excluding these files.${NC}"
fi

# Check for backup files
BACKUP_FILES=$(git diff --cached --name-only | grep -E '\.(backup|bak|old|orig)$' || true)
if [ -n "$BACKUP_FILES" ]; then
    echo -e "${RED}ERROR: Attempting to commit backup files:${NC}"
    echo "$BACKUP_FILES"
    exit 1
fi

echo -e "${GREEN}Pre-commit security checks passed.${NC}"
exit 0
