#!/bin/bash
#
# do-create-metmap-app.sh
#
# Optional convenience script to create the MetMap app on DigitalOcean
# App Platform using the doctl CLI.
#
# This is NOT CI/CD automation—it's a one-off helper that mirrors
# what you'd do in the DigitalOcean web UI.
#
# Prerequisites:
#   1. Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/
#   2. Authenticate: doctl auth init
#   3. Ensure you have access to the kentin0-fiz0l/FluxStudio repo on GitHub
#
# Usage:
#   ./scripts/do-create-metmap-app.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_SPEC="$REPO_ROOT/metmap/.do/app.yaml"

echo "=== MetMap App Platform Creator ==="
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "Error: doctl is not installed."
    echo "Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
    echo "Error: doctl is not authenticated."
    echo "Run: doctl auth init"
    exit 1
fi

# Check if app spec exists
if [ ! -f "$APP_SPEC" ]; then
    echo "Error: App spec not found at $APP_SPEC"
    exit 1
fi

echo "App spec: $APP_SPEC"
echo ""
echo "This will create a new MetMap app on DigitalOcean App Platform."
echo "You'll be charged based on usage (Basic plan starts at ~\$5/mo)."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Creating app..."
doctl apps create --spec "$APP_SPEC"

echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo "  1. Go to https://cloud.digitalocean.com/apps to see your app"
echo "  2. Wait for the build to complete (~3-5 minutes)"
echo "  3. Add custom domain (metmap.fluxstudio.art) in Settings → Domains"
echo ""
