# Flux Studio Agent System Guide

## Overview

The Flux Studio Agent System is a comprehensive AI-powered orchestration platform that manages specialized agents for project architecture, design, development, deployment, testing, security, and optimization.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Agent Definitions](#agent-definitions)
3. [Using the CLI](#using-the-cli)
4. [Workflows](#workflows)
5. [Configuration](#configuration)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

The agent system is already installed in your Flux Studio project at `.fluxstudio/`.

### Quick Start

```bash
# List all available agents
./.fluxstudio/flux-agent list agents

# Execute a task
./.fluxstudio/flux-agent task "Add user profile editing feature"

# Run a workflow
./.fluxstudio/flux-agent workflow newFeature

# Check task status
./.fluxstudio/flux-agent status

# View task history
./.fluxstudio/flux-agent history
```

### Create Alias (Recommended)

Add to your `.bashrc` or `.zshrc`:

```bash
alias flux-agent="$PWD/.fluxstudio/flux-agent"
```

Then use simply:
```bash
flux-agent list
flux-agent task "your task here"
```

## Agent Definitions

### 1. Architecture Agent

**Purpose**: System design, database schema, API architecture, scalability planning

**Best for**:
- Designing new features from a system perspective
- Database schema design and optimization
- API endpoint design
- Microservices architecture
- Infrastructure planning

**Example Usage**:
```bash
flux-agent task "Design architecture for real-time collaboration feature"
```

**Capabilities**:
- System architecture design
- Database schema design
- API design and optimization
- Microservices architecture
- Scalability planning
- Infrastructure design
- Technology stack recommendations

---

### 2. Design Agent

**Purpose**: UI/UX design, component architecture, design system management, accessibility

**Best for**:
- Creating new UI components
- Redesigning existing interfaces
- Ensuring accessibility compliance
- Design system maintenance
- Responsive design

**Example Usage**:
```bash
flux-agent task "Design a mobile-friendly project dashboard"
```

**Capabilities**:
- UI component design
- UX workflow design
- Design system management
- WCAG 2.1 AA accessibility compliance
- Responsive design
- CSS optimization
- Design documentation

---

### 3. Development Agent

**Purpose**: Feature implementation, code quality, testing, refactoring

**Best for**:
- Implementing new features
- Bug fixes
- Code refactoring
- Adding TypeScript types
- Writing tests

**Example Usage**:
```bash
flux-agent task "Implement file upload with progress tracking"
```

**Capabilities**:
- Feature implementation
- Code refactoring
- TypeScript development
- React development
- API implementation
- Error handling
- Code review

---

### 4. Deployment Agent

**Purpose**: Production deployment, CI/CD, infrastructure management

**Best for**:
- Deploying to production
- Infrastructure configuration
- Monitoring setup
- Deployment automation

**Example Usage**:
```bash
flux-agent deploy production
```

**Capabilities**:
- Deployment automation
- Infrastructure configuration
- Monitoring setup
- Health checks
- Rollback management
- Environment configuration

---

### 5. Testing Agent

**Purpose**: Test creation, coverage analysis, quality assurance

**Best for**:
- Creating unit tests
- Integration testing
- E2E testing
- Test coverage analysis

**Example Usage**:
```bash
flux-agent task "Create tests for authentication flow"
```

**Capabilities**:
- Unit testing
- Integration testing
- E2E testing
- Test coverage analysis
- Regression testing

---

### 6. Security Agent

**Purpose**: Security audits, vulnerability scanning, secure coding practices

**Best for**:
- Security audits
- Authentication/authorization review
- Vulnerability scanning
- Secure configuration

**Example Usage**:
```bash
flux-agent security-audit
```

**Capabilities**:
- Security audit
- Vulnerability scanning
- Authentication review
- Authorization review
- Input validation
- Secure coding practices

---

### 7. Optimization Agent

**Purpose**: Performance optimization, bundle size reduction, caching strategies

**Best for**:
- Performance optimization
- Bundle size reduction
- Database query optimization
- Caching implementation

**Example Usage**:
```bash
flux-agent analyze performance
```

**Capabilities**:
- Performance optimization
- Bundle optimization
- Database optimization
- Caching strategy
- Image optimization

## Using the CLI

### Basic Commands

#### Task Routing
Route a task to appropriate agents based on content analysis:

```bash
flux-agent task "your task description"
```

The orchestrator will analyze your task and automatically select the most appropriate agents.

#### Workflow Execution
Execute predefined workflows:

```bash
flux-agent workflow <workflow-name>
```

Available workflows:
- `newFeature` - Complete feature implementation
- `bugFix` - Bug fix and verification
- `deployment` - Production deployment
- `sprintPlanning` - Sprint planning
- `securityAudit` - Security audit
- `codeReview` - Comprehensive code review
- `performanceOptimization` - Performance analysis
- `uiRedesign` - UI redesign and implementation

#### List Resources

List all agents:
```bash
flux-agent list agents
```

List all workflows:
```bash
flux-agent list workflows
```

List both:
```bash
flux-agent list
```

#### Task Management

Check status of all active tasks:
```bash
flux-agent status
```

Check specific task:
```bash
flux-agent status <task-id>
```

View task history:
```bash
flux-agent history [limit]
```

### Advanced Commands

#### Deployment

Deploy to production:
```bash
flux-agent deploy production
```

Deploy to staging:
```bash
flux-agent deploy staging
```

#### Analysis

Performance analysis:
```bash
flux-agent analyze performance
```

Security analysis:
```bash
flux-agent analyze security
```

#### Sprint Planning

```bash
flux-agent sprint-plan 11
```

## Workflows

### New Feature Workflow

**Agents**: Architecture, Design, Development, Testing (parallel)
**Use case**: Implementing a complete new feature

```bash
flux-agent workflow newFeature
```

**Steps**:
1. Architecture Agent designs system architecture
2. Design Agent creates UI/UX specifications
3. Development Agent implements the feature
4. Testing Agent creates test suite

---

### Bug Fix Workflow

**Agents**: Development, Testing (sequential)
**Use case**: Fixing bugs and verifying fixes

```bash
flux-agent workflow bugFix
```

**Steps**:
1. Development Agent fixes the bug
2. Testing Agent verifies the fix

---

### Deployment Workflow

**Agents**: Testing, Security, Deployment (sequential)
**Use case**: Deploying to production safely

```bash
flux-agent workflow deployment
```

**Steps**:
1. Testing Agent runs full test suite
2. Security Agent performs security scan
3. Deployment Agent executes deployment

---

### Sprint Planning Workflow

**Agents**: Architecture, Design, Development (parallel)
**Use case**: Planning upcoming sprint

```bash
flux-agent sprint-plan 11
```

**Steps**:
1. Architecture Agent reviews technical feasibility
2. Design Agent estimates UI/UX work
3. Development Agent estimates implementation effort

## Configuration

### Agent Configuration

Agent definitions are stored in `.fluxstudio/agents/` as JSON files. Each agent has:

- **id**: Unique identifier
- **name**: Display name
- **capabilities**: List of what the agent can do
- **contextPaths**: Files/directories the agent has access to
- **workflows**: Predefined workflows the agent supports
- **prompts**: System and task prompts for the AI

### Workflow Configuration

Workflows are configured in `.fluxstudio/config/agent-config.json`:

```json
{
  "workflows": {
    "newFeature": {
      "agents": ["architecture-agent", "design-agent", "development-agent", "testing-agent"],
      "sequential": false,
      "description": "Complete new feature implementation workflow"
    }
  }
}
```

### Custom Workflows

You can add custom workflows by editing `.fluxstudio/config/agent-config.json`:

```json
"customWorkflow": {
  "agents": ["agent1", "agent2"],
  "sequential": true,
  "description": "Your custom workflow"
}
```

## Best Practices

### 1. Task Descriptions

Write clear, specific task descriptions:

**Good**:
```bash
flux-agent task "Add user authentication with email/password and Google OAuth"
```

**Better**:
```bash
flux-agent task "Implement user authentication system with:
- Email/password signup and login
- Google OAuth integration
- JWT token management
- Secure password hashing
- Session management"
```

### 2. Workflow Selection

Use workflows for complex, multi-step processes:

- Use `newFeature` for complete feature implementations
- Use `deployment` before production deploys
- Use `sprintPlanning` at the start of each sprint
- Use `securityAudit` regularly (weekly/monthly)

### 3. Agent Collaboration

Some tasks benefit from multiple agents:

```bash
# Architecture + Design for UI-heavy features
flux-agent task "Design and architect a real-time collaboration canvas"

# Development + Testing for bug fixes
flux-agent workflow bugFix
```

### 4. Regular Audits

Schedule regular audits:

```bash
# Weekly security audit
flux-agent security-audit

# Monthly performance review
flux-agent analyze performance
```

## Troubleshooting

### Common Issues

#### Agent Not Found

**Error**: `Agent 'xyz' not found`

**Solution**: Check that agent definition exists in `.fluxstudio/agents/`

```bash
ls .fluxstudio/agents/
```

#### Workflow Not Found

**Error**: `Workflow 'xyz' not found`

**Solution**: List available workflows:

```bash
flux-agent list workflows
```

#### Task Timeout

**Error**: `Task exceeded timeout`

**Solution**: Increase timeout in config:

```json
{
  "taskTimeout": 900000  // 15 minutes
}
```

### Logs

Check logs for detailed information:

```bash
# View today's task logs
cat .fluxstudio/logs/tasks_$(date +%Y-%m-%d).log

# View workflow logs
cat .fluxstudio/logs/workflows_$(date +%Y-%m-%d).log
```

### Debug Mode

Run orchestrator in debug mode:

```bash
DEBUG=true flux-agent task "your task"
```

## Integration with Development Workflow

### Git Workflow

```bash
# Before starting new feature
git checkout -b feature/new-feature
flux-agent workflow newFeature

# Before committing
flux-agent task "Review code quality and security"

# Before creating PR
flux-agent workflow codeReview

# Before deploying
flux-agent workflow deployment
```

### Sprint Workflow

```bash
# Sprint planning
flux-agent sprint-plan 11

# Daily development
flux-agent task "implement feature X"
flux-agent task "fix bug Y"

# Sprint review
flux-agent analyze performance
flux-agent history 20
```

## API Integration

### Programmatic Usage

```javascript
const AgentOrchestrator = require('./.fluxstudio/orchestrator/agent-orchestrator');

const orchestrator = new AgentOrchestrator();

// Route a task
const result = await orchestrator.routeTask('Implement user dashboard');

// Execute workflow
const workflowResult = await orchestrator.executeWorkflow('newFeature');

// List agents
const agents = orchestrator.listAgents();
```

## Future Enhancements

Planned features for the agent system:

- **Web Dashboard**: Visual interface for agent management
- **Real-time Notifications**: Slack/Discord integration
- **Agent Learning**: Continuous improvement from task history
- **Custom Agent Creation**: User-defined agents
- **Parallel Execution**: Better multi-agent coordination
- **Cloud Integration**: Deploy agents to cloud
- **Collaboration Features**: Multi-developer agent sharing

## Support

For issues or questions:

1. Check this documentation
2. Review logs in `.fluxstudio/logs/`
3. Open an issue in the project repository
4. Contact the development team

---

**Version**: 1.0.0
**Last Updated**: October 13, 2025
**Status**: Production Ready ✅
