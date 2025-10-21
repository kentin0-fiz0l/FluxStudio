#!/bin/bash

# FluxStudio Deployment Monitor

echo "🚀 FluxStudio Deployment Monitor"
echo "================================="
echo "Started: $(date)"
echo ""

while true; do
    echo "⏰ $(date +%H:%M:%S) - Checking status..."

    # Check DNS propagation
    echo -n "📡 DNS: "
    NS=$(dig ns fluxstudio.art +short | head -1)
    if [[ $NS == *"digitalocean.com"* ]]; then
        echo "✅ Propagated to DigitalOcean"

        # Check A record
        A_RECORD=$(dig a fluxstudio.art +short)
        if [[ $A_RECORD == "167.172.208.61" ]]; then
            echo "✅ A record pointing to our server"
        else
            echo "⏳ A record: $A_RECORD (should be 167.172.208.61)"
        fi
    else
        echo "⏳ Still propagating (current: ${NS:-none})"
    fi

    # Check server status
    echo -n "🖥️  Server: "
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@167.172.208.61 "which pm2" &>/dev/null; then
        echo "✅ Ready for deployment"

        # Check if app is running
        APP_STATUS=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@167.172.208.61 "pm2 list | grep fluxstudio" 2>/dev/null || echo "not running")
        if [[ $APP_STATUS == *"online"* ]]; then
            echo "✅ FluxStudio app running"
        else
            echo "⏳ App not deployed yet"
        fi
    else
        echo "⏳ Installing packages..."
    fi

    # Check website
    echo -n "🌐 Website: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://167.172.208.61 2>/dev/null || echo "000")
    if [[ $HTTP_CODE == "200" ]]; then
        echo "✅ Responding (HTTP $HTTP_CODE)"
    else
        echo "❌ Not responding (HTTP $HTTP_CODE)"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Exit if everything is ready
    if [[ $NS == *"digitalocean.com"* ]] && [[ $A_RECORD == "167.172.208.61" ]] && [[ $HTTP_CODE == "200" ]]; then
        echo ""
        echo "🎉 DEPLOYMENT COMPLETE!"
        echo "✅ DNS propagated"
        echo "✅ Server ready"
        echo "✅ Website responding"
        echo ""
        echo "🌐 Your site is live at: https://fluxstudio.art"
        break
    fi

    sleep 30
done