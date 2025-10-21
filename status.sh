#!/bin/bash

# FluxStudio Status Checker

echo "🔍 FluxStudio Status Check"
echo "========================="

echo ""
echo "📡 DNS Status:"
echo "Current nameservers:"
dig ns fluxstudio.art +short | head -3

echo ""
echo "A Record resolution:"
dig a fluxstudio.art +short

echo ""
echo "🌐 Website Status:"
echo -n "Direct IP (167.172.208.61): "
curl -s -o /dev/null -w "%{http_code}\n" http://167.172.208.61 || echo "Not responding"

echo -n "Domain (fluxstudio.art): "
curl -s -o /dev/null -w "%{http_code}\n" http://fluxstudio.art || echo "Not responding"

echo ""
echo "🖥️  Server Status:"
ssh -o ConnectTimeout=5 root@167.172.208.61 "pm2 status" 2>/dev/null || echo "SSH connection failed"

echo ""
echo "📧 Email Setup:"
echo "Visit https://improvmx.com to set up email forwarding"
echo "Add domain: fluxstudio.art"
echo "Forward: hello@fluxstudio.art → your@email.com"