# Flux Studio Agent System

Welcome to the Flux Studio AI Agent Orchestration System!

## Quick Start

### 1. List Available Agents

```bash
./flux-agent list agents
```

### 2. List Available Workflows

```bash
./flux-agent list workflows
```

### 3. Execute a Task

```bash
./flux-agent task "Add user authentication feature"
```

### 4. Run a Workflow

```bash
./flux-agent workflow newFeature
```

### 5. Check Status

```bash
./flux-agent status
```

## Directory Structure

```
.fluxstudio/
├── agents/                    # Agent definitions (JSON)
│   ├── architecture-agent.json
│   ├── design-agent.json
│   ├── development-agent.json
│   ├── deployment-agent.json
│   ├── testing-agent.json
│   ├── security-agent.json
│   └── optimization-agent.json
├── orchestrator/              # Orchestration engine
│   └── agent-orchestrator.js
├── config/                    # Configuration
│   └── agent-config.json
├── logs/                      # Task and workflow logs
├── flux-agent                 # CLI tool (main entry point)
└── README.md                  # This file
```

## Available Agents

1. **Architecture Agent** - System design, database schema, API architecture
2. **Design Agent** - UI/UX design, components, accessibility
3. **Development Agent** - Feature implementation, code quality
4. **Deployment Agent** - Production deployment, CI/CD
5. **Testing Agent** - Test creation, coverage analysis
6. **Security Agent** - Security audits, vulnerability scanning
7. **Optimization Agent** - Performance optimization, bundle size

## Available Workflows

1. **newFeature** - Complete feature implementation
2. **bugFix** - Bug fix and verification
3. **deployment** - Production deployment
4. **sprintPlanning** - Sprint planning and estimation
5. **securityAudit** - Security audit
6. **codeReview** - Code review
7. **performanceOptimization** - Performance analysis
8. **uiRedesign** - UI redesign and implementation

## Common Commands

```bash
# Task routing (intelligent agent selection)
./flux-agent task "your task description"

# Execute workflow
./flux-agent workflow <workflow-name>

# Deploy to production
./flux-agent deploy production

# Security audit
./flux-agent security-audit

# Performance analysis
./flux-agent analyze performance

# Sprint planning
./flux-agent sprint-plan 11

# View history
./flux-agent history 10

# Help
./flux-agent help
```

## Create an Alias (Recommended)

Add to your `.bashrc` or `.zshrc`:

```bash
alias flux-agent="$PWD/.fluxstudio/flux-agent"
```

Then use:

```bash
flux-agent list
flux-agent task "your task"
```

## Documentation

Comprehensive documentation available at:
- **Full Guide**: `/docs/AGENT_SYSTEM_GUIDE.md`
- **Implementation Summary**: `/AGENT_SYSTEM_COMPLETE.md`

## Support

- Check logs in `./logs/` directory
- Review agent definitions in `./agents/`
- Modify workflows in `./config/agent-config.json`
- Run `./flux-agent help` for command reference

## Version

**Version**: 1.0.0
**Status**: Production Ready ✅
**Last Updated**: October 13, 2025

---

**Happy AI-Assisted Development! 🚀🤖**
