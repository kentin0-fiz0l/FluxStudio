# Flux Studio - Quick Start Guide

## Daily Workflow

### Morning Routine (5 minutes)

```bash
# Run daily standup
./.fluxstudio/workflows/daily-standup.sh

# Check your tasks
./.fluxstudio/flux-agent status

# Queue today's work
./.fluxstudio/flux-agent task "Implement load testing for authentication"
```

### During Development

```bash
# Route any task to agents
./.fluxstudio/flux-agent task "your task description"

# Execute workflows
./.fluxstudio/flux-agent workflow newFeature
./.fluxstudio/flux-agent workflow bugFix

# Check production health anytime
curl https://fluxstudio.art/api/health | python3 -m json.tool
```

### Before Committing

```bash
# Run code review workflow
./.fluxstudio/flux-agent workflow codeReview

# Check tests
npm test
```

### Weekly Review (Fridays)

```bash
# Run weekly review
./.fluxstudio/workflows/weekly-review.sh

# View task history
./.fluxstudio/flux-agent history 20
```

### Before Deployment

```bash
# Run pre-deployment checklist
./.fluxstudio/workflows/deploy-check.sh

# If all checks pass, deploy
./.fluxstudio/flux-agent deploy production
```

---

## Agent System Commands

### Task Management

```bash
# Route a task
flux-agent task "your task description"

# Check status
flux-agent status

# View history
flux-agent history [limit]
```

### Workflows

```bash
# List all workflows
flux-agent list workflows

# Execute workflow
flux-agent workflow <name>

# Common workflows:
flux-agent workflow newFeature
flux-agent workflow deployment
flux-agent workflow sprintPlanning
flux-agent workflow securityAudit
```

### Quick Actions

```bash
# Deploy
flux-agent deploy production

# Analyze performance
flux-agent analyze performance

# Security audit
flux-agent security-audit

# Sprint planning
flux-agent sprint-plan 11
```

### Information

```bash
# List agents
flux-agent list agents

# Help
flux-agent help
```

---

## Production Management

### Check Health

```bash
# API health
curl https://fluxstudio.art/api/health | python3 -m json.tool

# Services status
ssh root@167.172.208.61 "pm2 list"

# Detailed status
ssh root@167.172.208.61 "pm2 jlist"
```

### View Logs

```bash
# PM2 logs
ssh root@167.172.208.61 "pm2 logs --lines 50"

# Agent logs
cat .fluxstudio/logs/tasks_$(date +%Y-%m-%d).log
cat .fluxstudio/logs/workflows_$(date +%Y-%m-%d).log
```

### Restart Services

```bash
# Restart all services
ssh root@167.172.208.61 "pm2 restart all"

# Restart specific service
ssh root@167.172.208.61 "pm2 restart flux-auth"
ssh root@167.172.208.61 "pm2 restart flux-messaging"
```

---

## Sprint 11 Quick Commands

### Week 1 Tasks

```bash
# Monday-Tuesday: Load Testing
flux-agent task "Set up k6 load testing infrastructure"
flux-agent task "Create load test scenarios for auth and file upload"
flux-agent task "Run baseline load tests"

# Wednesday-Thursday: Database Optimization
flux-agent task "Audit database queries in analytics dashboard"
flux-agent task "Add database indexes for frequently queried fields"
flux-agent task "Implement Redis caching layer"

# Friday: Review
./.fluxstudio/workflows/weekly-review.sh
```

### Week 2 Tasks

```bash
# Monday-Tuesday: Collaboration
flux-agent task "Design real-time collaboration architecture"
flux-agent task "Implement basic cursor tracking"
flux-agent task "Add file version control system"

# Wednesday: AI & Integration
flux-agent task "Expand AI design analysis capabilities"
flux-agent task "Research and prototype Figma plugin"

# Thursday: Slack Integration
flux-agent task "Implement Slack OAuth and webhook integration"
flux-agent task "Add Slack notification bot"

# Friday: Sprint Review
flux-agent workflow deployment
```

---

## Common Tasks

### Feature Development

```bash
# Plan the feature
flux-agent task "Design architecture for [feature]"

# Implement
flux-agent workflow newFeature

# Test
npm test

# Deploy
./.fluxstudio/workflows/deploy-check.sh
flux-agent deploy production
```

### Bug Fixing

```bash
# Analyze the bug
flux-agent task "Investigate [bug description]"

# Fix
flux-agent workflow bugFix

# Verify
npm test
```

### Performance Issues

```bash
# Analyze
flux-agent analyze performance

# Optimize
flux-agent workflow performanceOptimization

# Verify improvement
npm run build
```

### Security Concerns

```bash
# Audit
flux-agent security-audit

# Review findings
cat .fluxstudio/logs/workflows_$(date +%Y-%m-%d).log

# Fix issues
flux-agent task "Fix security issue: [description]"
```

---

## Keyboard Shortcuts (Recommended Aliases)

Add to `.bashrc` or `.zshrc`:

```bash
# Agent system
alias fa="./.fluxstudio/flux-agent"
alias fal="fa list"
alias fas="fa status"
alias fah="fa history"

# Workflows
alias standup="./.fluxstudio/workflows/daily-standup.sh"
alias review="./.fluxstudio/workflows/weekly-review.sh"
alias deploy-check="./.fluxstudio/workflows/deploy-check.sh"

# Production
alias prod-health="curl https://fluxstudio.art/api/health | python3 -m json.tool"
alias prod-logs="ssh root@167.172.208.61 'pm2 logs --lines 50'"
alias prod-status="ssh root@167.172.208.61 'pm2 list'"
```

Then use:

```bash
fa task "your task"
standup
review
deploy-check
prod-health
```

---

## Troubleshooting

### Agent System Not Working

```bash
# Check if agents loaded
./.fluxstudio/flux-agent list agents

# Check logs
cat .fluxstudio/logs/tasks_$(date +%Y-%m-%d).log

# Verify file permissions
chmod +x .fluxstudio/flux-agent
chmod +x .fluxstudio/workflows/*.sh
```

### Production Issues

```bash
# Check service status
ssh root@167.172.208.61 "pm2 list"

# Restart services
ssh root@167.172.208.61 "pm2 restart all"

# Check logs
ssh root@167.172.208.61 "pm2 logs --lines 100"

# Verify nginx
ssh root@167.172.208.61 "nginx -t"
```

### Deployment Failures

```bash
# Run pre-deployment checks
./.fluxstudio/workflows/deploy-check.sh

# Check what failed
npm test
npm run build

# Fix issues, then retry
```

---

## Resources

### Documentation
- **Agent System Guide**: `/docs/AGENT_SYSTEM_GUIDE.md`
- **API Documentation**: `/docs/API_DOCUMENTATION.md`
- **Sprint 11 Plan**: `/SPRINT_11_PLAN.md`
- **Agent System Complete**: `/AGENT_SYSTEM_COMPLETE.md`

### Agent Definitions
- **Location**: `.fluxstudio/agents/`
- **Configuration**: `.fluxstudio/config/agent-config.json`

### Logs
- **Task Logs**: `.fluxstudio/logs/tasks_*.log`
- **Workflow Logs**: `.fluxstudio/logs/workflows_*.log`

---

## Best Practices

### Do's ✅
- Run daily standup every morning
- Use agent system for all major tasks
- Run security audit weekly
- Check production health regularly
- Use workflows for complex processes
- Document decisions in sprint reports

### Don'ts ❌
- Don't deploy without running checks
- Don't skip tests
- Don't commit without code review
- Don't ignore security warnings
- Don't deploy on Fridays (unless critical)

---

## Emergency Contacts

### Production Down
1. Check service status: `prod-status`
2. Check logs: `prod-logs`
3. Restart services: `ssh root@167.172.208.61 "pm2 restart all"`
4. Check health: `prod-health`
5. Rollback if needed: `flux-agent task "Rollback to last stable version"`

### Security Incident
1. Run security audit: `flux-agent security-audit`
2. Check logs for suspicious activity
3. Review access logs
4. Implement fixes
5. Re-audit: `flux-agent security-audit`

---

**Quick Start Complete!** 🚀

Now you're ready to use the Flux Studio Agent System for daily development, sprint management, and production operations.

**Next Steps**:
1. Run your first daily standup: `./.fluxstudio/workflows/daily-standup.sh`
2. Queue your first task: `flux-agent task "your task"`
3. Check Sprint 11 plan: `cat SPRINT_11_PLAN.md`

**Happy developing!** 🤖✨
