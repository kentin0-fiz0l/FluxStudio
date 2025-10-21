#!/bin/bash
# FluxStudio Production Secrets Generator
# Generate secure production credentials for DigitalOcean App Platform deployment
#
# SECURITY WARNING: Never commit the output of this script to version control
# Store these credentials in DigitalOcean App Platform Environment Variables ONLY

set -e

echo "=================================="
echo "FluxStudio Production Credentials"
echo "=================================="
echo ""
echo "CRITICAL: Save these credentials to a secure password manager"
echo "           DO NOT commit to git or share publicly"
echo ""
echo "-----------------------------------"
echo ""

echo "# JWT Secret (256-bit)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo ""

echo "# Database Password (64 characters)"
echo "DATABASE_PASSWORD=$(openssl rand -base64 48 | tr -d '/+=' | cut -c1-64)"
echo ""

echo "# Redis Password (64 characters)"
echo "REDIS_PASSWORD=$(openssl rand -base64 48 | tr -d '/+=' | cut -c1-64)"
echo ""

echo "# OAuth Encryption Key (256-bit)"
echo "OAUTH_ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo ""

echo "# Session Secret (256-bit)"
echo "SESSION_SECRET=$(openssl rand -base64 32)"
echo ""

echo "# SMTP Password (Replace with your actual SMTP credentials)"
echo "SMTP_PASSWORD=<GENERATE_IN_YOUR_EMAIL_PROVIDER>"
echo ""

echo "# Slack Signing Secret (Get from Slack App Console)"
echo "SLACK_SIGNING_SECRET=<GET_FROM_SLACK_CONSOLE>"
echo ""

echo "# Figma Webhook Secret (Get from Figma Developer Console)"
echo "FIGMA_WEBHOOK_SECRET=<GET_FROM_FIGMA_CONSOLE>"
echo ""

echo "# GitHub Webhook Secret (Generate and configure in GitHub)"
echo "GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32)"
echo ""

echo "-----------------------------------"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Copy ALL credentials above to DigitalOcean App Platform:"
echo "   - Go to App Platform > Settings > Environment Variables"
echo "   - Add each credential as a separate encrypted variable"
echo ""
echo "2. Rotate OAuth credentials in external services:"
echo "   - Google Cloud Console: Create new OAuth client ID"
echo "   - GitHub Settings: Create new OAuth App"
echo "   - Figma Developer: Create new OAuth application"
echo "   - Slack API: Create new Slack App with new credentials"
echo ""
echo "3. Update OAuth redirect URLs to App Platform URLs:"
echo "   - Google: https://fluxstudio-*.ondigitalocean.app/api/integrations/google/callback"
echo "   - GitHub: https://fluxstudio-*.ondigitalocean.app/api/integrations/github/callback"
echo "   - Figma: https://fluxstudio-*.ondigitalocean.app/api/integrations/figma/callback"
echo "   - Slack: https://fluxstudio-*.ondigitalocean.app/api/integrations/slack/callback"
echo ""
echo "4. IMMEDIATELY delete this output after saving to password manager"
echo ""
echo "5. Never run this script on a production server - generate locally only"
echo ""
echo "=================================="
