#!/bin/bash

# Flux Studio Weekly Review Automation
# Run this every Friday to review weekly progress

echo "==================================="
echo "📊 Flux Studio Weekly Review"
echo "==================================="
echo ""
echo "📅 Week of: $(date -v-7d '+%Y-%m-%d') to $(date '+%Y-%m-%d')"
echo ""

# Weekly Tasks
echo "✅ Completed Tasks This Week:"
./.fluxstudio/flux-agent history 20 | grep -A 2 "completed"
echo ""

# Performance Check
echo "⚡ Performance Check:"
./.fluxstudio/flux-agent analyze performance > /dev/null 2>&1 &
echo "  Running performance analysis..."
echo ""

# Security Audit
echo "🔒 Security Status:"
./.fluxstudio/flux-agent security-audit > /dev/null 2>&1 &
echo "  Running security audit..."
echo ""

# Production Metrics
echo "📈 Production Metrics:"
curl -s https://fluxstudio.art/api/health | python3 -m json.tool 2>/dev/null
echo ""

# Sprint Progress
echo "🏃 Sprint 11 Progress:"
echo "  Week 1 of 2 completed"
echo "  See SPRINT_11_PLAN.md for details"
echo ""

echo "💡 Next Steps:"
echo "  1. Review task completion rate"
echo "  2. Adjust Sprint 11 priorities if needed"
echo "  3. Plan next week's focus"
echo ""
echo "==================================="
