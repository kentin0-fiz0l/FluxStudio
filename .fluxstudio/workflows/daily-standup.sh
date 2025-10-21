#!/bin/bash

# Flux Studio Daily Standup Automation
# Run this every morning to check project status

echo "==================================="
echo "🌅 Flux Studio Daily Standup"
echo "==================================="
echo ""
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Production Health Check
echo "🏥 Production Health:"
./.fluxstudio/flux-agent task "Check production health and report any issues" > /dev/null 2>&1
curl -s https://fluxstudio.art/api/health | python3 -m json.tool 2>/dev/null || echo "❌ Production health check failed"
echo ""

# Active Tasks
echo "📋 Active Tasks:"
./.fluxstudio/flux-agent status
echo ""

# Recent Activity
echo "📊 Recent Activity (last 24h):"
./.fluxstudio/flux-agent history 5
echo ""

# PM2 Services
echo "⚙️  Services Status:"
ssh root@167.172.208.61 "pm2 jlist" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for proc in data:
    name = proc['name']
    status = proc['pm2_env']['status']
    uptime = proc['pm2_env'].get('pm_uptime', 0)
    mem = proc['monit']['memory'] / 1024 / 1024
    cpu = proc['monit']['cpu']
    print(f'  {name}: {status} (Uptime: {uptime//3600}h, CPU: {cpu}%, Mem: {mem:.1f}MB)')
" 2>/dev/null || echo "  Services check failed"
echo ""

# Today's Focus
echo "🎯 Sprint 11 Focus Areas:"
echo "  1. Load Testing & Performance Optimization"
echo "  2. Real-time Collaboration Features"
echo "  3. Figma/Slack Integration"
echo "  4. Predictive Analytics"
echo ""

echo "💡 Tip: Queue today's tasks with: flux-agent task \"your task\""
echo ""
echo "==================================="
