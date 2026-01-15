#!/bin/bash
# FluxStudio Database Backup Script
# Usage: ./scripts/backup-database.sh [backup-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
BACKUP_NAME="${1:-manual-$(date +%Y%m%d-%H%M%S)}"
DATABASE_ID="${DIGITALOCEAN_DATABASE_ID:-}"

echo -e "${BLUE}FluxStudio Database Backup${NC}"
echo "================================"

# Check if running in production or development
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable not set${NC}"
    echo "Set DATABASE_URL or use doctl for DigitalOcean managed database backups"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Option 1: Local PostgreSQL backup (development)
if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$DATABASE_URL" == *"127.0.0.1"* ]]; then
    echo -e "${YELLOW}Detected local database - creating pg_dump backup${NC}"

    BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.sql.gz"

    echo "Creating backup: $BACKUP_FILE"
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}Backup complete: $BACKUP_FILE ($BACKUP_SIZE)${NC}"

    # List recent backups
    echo ""
    echo "Recent backups:"
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5

    exit 0
fi

# Option 2: DigitalOcean managed database backup
if command -v doctl &> /dev/null && [ -n "$DATABASE_ID" ]; then
    echo -e "${YELLOW}Using DigitalOcean managed backup${NC}"

    echo "Listing current backups..."
    doctl databases backups list "$DATABASE_ID"

    echo ""
    echo -e "${YELLOW}Note: DigitalOcean manages automated daily backups.${NC}"
    echo "To restore from a backup, use:"
    echo "  doctl databases restore $DATABASE_ID --backup-id <BACKUP_ID>"

    exit 0
fi

# Option 3: Remote database backup via pg_dump
echo -e "${YELLOW}Creating remote database backup${NC}"

BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.sql.gz"

echo "Creating backup: $BACKUP_FILE"
echo "This may take a while for large databases..."

# Extract connection details and handle SSL
if pg_dump "$DATABASE_URL" --no-owner --no-acl 2>/dev/null | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}Backup complete: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
else
    # Try with SSL mode if first attempt failed
    echo -e "${YELLOW}Retrying with explicit SSL mode...${NC}"
    pg_dump "$DATABASE_URL?sslmode=require" --no-owner --no-acl | gzip > "$BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}Backup complete: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
fi

# Cleanup old backups (keep last 5)
echo ""
echo "Cleaning up old backups (keeping last 5)..."
ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5

echo ""
echo -e "${GREEN}Backup process complete${NC}"
