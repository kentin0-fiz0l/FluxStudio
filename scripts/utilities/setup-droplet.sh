#!/bin/bash

# FluxStudio DigitalOcean Droplet Setup Script
# Run this on a fresh Ubuntu 22.04 droplet

set -e

echo "🔧 FluxStudio Droplet Setup"
echo "============================"

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ufw \
    fail2ban \
    htop \
    unzip

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Create deploy user
echo "👤 Creating deploy user..."
adduser --disabled-password --gecos "" deploy || true
usermod -aG sudo deploy
usermod -aG www-data deploy

# Setup directories
echo "📁 Setting up directories..."
mkdir -p /var/www/fluxstudio
chown -R deploy:www-data /var/www/fluxstudio
chmod -R 755 /var/www/fluxstudio

# Install Certbot for SSL
echo "🔒 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Setup swap (useful for smaller droplets)
echo "💾 Setting up swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
fi

# Configure Nginx
echo "⚙️ Configuring Nginx..."
rm -f /etc/nginx/sites-enabled/default

# Setup fail2ban
echo "🔒 Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Install mail utilities for email
echo "📧 Installing mail utilities..."
apt-get install -y postfix mailutils

# During postfix installation, select "Internet Site"
# System mail name: fluxstudio.art

echo ""
echo "============================"
echo "✅ Droplet setup complete!"
echo ""
echo "Next steps:"
echo "1. Run the deployment script: ./deploy-to-digitalocean.sh"
echo "2. Configure DNS records at your domain registrar"
echo "3. Set up email forwarding"
echo ""
echo "============================"