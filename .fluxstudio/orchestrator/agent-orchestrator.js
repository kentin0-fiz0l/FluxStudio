#!/usr/bin/env node

/**
 * Flux Studio Agent Orchestrator
 * Central orchestration engine for managing AI agents
 */

const fs = require('fs');
const path = require('path');

class AgentOrchestrator {
  constructor() {
    this.agentsDir = path.join(__dirname, '../agents');
    this.configPath = path.join(__dirname, '../config/agent-config.json');
    this.logsDir = path.join(__dirname, '../logs');
    this.agents = new Map();
    this.activeTasks = new Map();
    this.taskHistory = [];

    this.loadAgents();
    this.loadConfig();
  }

  /**
   * Load all agent definitions
   */
  loadAgents() {
    const agentFiles = fs.readdirSync(this.agentsDir).filter(f => f.endsWith('.json'));

    agentFiles.forEach(file => {
      try {
        const agentDef = JSON.parse(fs.readFileSync(path.join(this.agentsDir, file), 'utf8'));
        this.agents.set(agentDef.id, agentDef);
        console.log(`✓ Loaded agent: ${agentDef.name}`);
      } catch (error) {
        console.error(`✗ Failed to load agent ${file}:`, error.message);
      }
    });

    console.log(`\nTotal agents loaded: ${this.agents.size}`);
  }

  /**
   * Load orchestrator configuration
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } else {
        this.config = this.createDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error('Failed to load config:', error.message);
      this.config = this.createDefaultConfig();
    }
  }

  /**
   * Create default configuration
   */
  createDefaultConfig() {
    return {
      workflows: {
        newFeature: {
          agents: ['architecture-agent', 'design-agent', 'development-agent', 'testing-agent'],
          sequential: false,
          description: 'Complete new feature implementation workflow'
        },
        bugFix: {
          agents: ['development-agent', 'testing-agent'],
          sequential: true,
          description: 'Bug fix and verification workflow'
        },
        deployment: {
          agents: ['testing-agent', 'security-agent', 'deployment-agent'],
          sequential: true,
          description: 'Production deployment workflow'
        },
        sprintPlanning: {
          agents: ['architecture-agent', 'design-agent', 'development-agent'],
          sequential: false,
          description: 'Sprint planning and estimation workflow'
        },
        securityAudit: {
          agents: ['security-agent', 'optimization-agent'],
          sequential: true,
          description: 'Security and performance audit'
        }
      },
      priorities: {
        critical: ['deployment-agent', 'security-agent'],
        high: ['architecture-agent', 'design-agent', 'development-agent', 'testing-agent'],
        medium: ['optimization-agent']
      },
      maxConcurrentAgents: 3,
      taskTimeout: 600000, // 10 minutes
      retryAttempts: 2
    };
  }

  /**
   * Save configuration
   */
  saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Route task to appropriate agent(s)
   */
  async routeTask(task, options = {}) {
    const { workflow, agents, priority = 'medium' } = options;

    console.log(`\n🎯 Routing task: ${task.substring(0, 100)}...`);

    let selectedAgents = [];

    if (workflow && this.config.workflows[workflow]) {
      selectedAgents = this.config.workflows[workflow].agents;
      console.log(`Using workflow: ${workflow}`);
    } else if (agents && agents.length > 0) {
      selectedAgents = agents;
    } else {
      selectedAgents = this.analyzeTaskAndSelectAgents(task);
    }

    console.log(`Selected agents: ${selectedAgents.join(', ')}`);

    const taskId = this.generateTaskId();
    const taskRecord = {
      id: taskId,
      task,
      agents: selectedAgents,
      workflow,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      results: []
    };

    this.activeTasks.set(taskId, taskRecord);
    this.logTask(taskRecord);

    return {
      taskId,
      agents: selectedAgents,
      message: `Task ${taskId} queued for ${selectedAgents.length} agent(s)`
    };
  }

  /**
   * Analyze task and intelligently select agents
   */
  analyzeTaskAndSelectAgents(task) {
    const taskLower = task.toLowerCase();
    const selectedAgents = [];

    // Architecture keywords
    if (taskLower.match(/\b(architecture|database|schema|api|endpoint|scalability)\b/)) {
      selectedAgents.push('architecture-agent');
    }

    // Design keywords
    if (taskLower.match(/\b(design|ui|ux|component|layout|style|accessibility)\b/)) {
      selectedAgents.push('design-agent');
    }

    // Development keywords
    if (taskLower.match(/\b(implement|code|feature|refactor|fix|bug)\b/)) {
      selectedAgents.push('development-agent');
    }

    // Testing keywords
    if (taskLower.match(/\b(test|testing|coverage|qa|quality)\b/)) {
      selectedAgents.push('testing-agent');
    }

    // Security keywords
    if (taskLower.match(/\b(security|auth|authentication|vulnerability|secure)\b/)) {
      selectedAgents.push('security-agent');
    }

    // Deployment keywords
    if (taskLower.match(/\b(deploy|deployment|production|infrastructure|ci\/cd)\b/)) {
      selectedAgents.push('deployment-agent');
    }

    // Performance keywords
    if (taskLower.match(/\b(optimize|performance|speed|cache|bundle)\b/)) {
      selectedAgents.push('optimization-agent');
    }

    // Default to development if no match
    if (selectedAgents.length === 0) {
      selectedAgents.push('development-agent');
    }

    return selectedAgents;
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowName, context = {}) {
    const workflow = this.config.workflows[workflowName];

    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    console.log(`\n🚀 Executing workflow: ${workflowName}`);
    console.log(`Description: ${workflow.description}`);
    console.log(`Agents: ${workflow.agents.join(', ')}`);
    console.log(`Mode: ${workflow.sequential ? 'Sequential' : 'Parallel'}`);

    const results = {
      workflow: workflowName,
      startTime: new Date().toISOString(),
      agents: workflow.agents,
      context,
      agentResults: [],
      status: 'running'
    };

    if (workflow.sequential) {
      // Execute agents sequentially
      for (const agentId of workflow.agents) {
        const agent = this.agents.get(agentId);
        console.log(`\n⏳ Executing: ${agent.name}...`);

        const agentResult = await this.executeAgent(agentId, context);
        results.agentResults.push(agentResult);

        // Pass results to next agent
        context.previousResults = agentResult;
      }
    } else {
      // Execute agents in parallel
      const promises = workflow.agents.map(agentId => this.executeAgent(agentId, context));
      results.agentResults = await Promise.all(promises);
    }

    results.endTime = new Date().toISOString();
    results.status = 'completed';
    results.duration = new Date(results.endTime) - new Date(results.startTime);

    this.logWorkflowResult(results);

    return results;
  }

  /**
   * Execute a single agent
   */
  async executeAgent(agentId, context = {}) {
    const agent = this.agents.get(agentId);

    if (!agent) {
      throw new Error(`Agent '${agentId}' not found`);
    }

    console.log(`\n🤖 Agent: ${agent.name}`);
    console.log(`Capabilities: ${agent.capabilities.join(', ')}`);

    // Simulate agent execution (in real implementation, this would call Claude API)
    const result = {
      agentId,
      agentName: agent.name,
      startTime: new Date().toISOString(),
      status: 'success',
      output: `[Simulated] ${agent.name} completed its task successfully.`,
      recommendations: [],
      nextSteps: []
    };

    // Add small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    result.endTime = new Date().toISOString();
    result.duration = new Date(result.endTime) - new Date(result.startTime);

    console.log(`✓ ${agent.name} completed in ${result.duration}ms`);

    return result;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * List all available agents
   */
  listAgents() {
    const agentList = [];

    this.agents.forEach((agent, id) => {
      agentList.push({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        priority: agent.priority
      });
    });

    return agentList;
  }

  /**
   * List all available workflows
   */
  listWorkflows() {
    return Object.keys(this.config.workflows).map(key => ({
      name: key,
      ...this.config.workflows[key]
    }));
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log task
   */
  logTask(taskRecord) {
    const logFile = path.join(this.logsDir, `tasks_${new Date().toISOString().split('T')[0]}.log`);

    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    fs.appendFileSync(logFile, JSON.stringify(taskRecord) + '\n');
  }

  /**
   * Log workflow result
   */
  logWorkflowResult(result) {
    const logFile = path.join(this.logsDir, `workflows_${new Date().toISOString().split('T')[0]}.log`);

    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    fs.appendFileSync(logFile, JSON.stringify(result) + '\n');

    // Also save to history
    this.taskHistory.push(result);
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId) {
    return this.activeTasks.get(taskId);
  }

  /**
   * Get task history
   */
  getTaskHistory(limit = 10) {
    return this.taskHistory.slice(-limit);
  }
}

// Export for use as module
module.exports = AgentOrchestrator;

// CLI execution
if (require.main === module) {
  const orchestrator = new AgentOrchestrator();

  console.log('\n=== Flux Studio Agent Orchestrator ===\n');
  console.log('Available agents:');
  orchestrator.listAgents().forEach(agent => {
    console.log(`  • ${agent.name} (${agent.id})`);
    console.log(`    ${agent.description}`);
  });

  console.log('\nAvailable workflows:');
  orchestrator.listWorkflows().forEach(workflow => {
    console.log(`  • ${workflow.name}: ${workflow.description}`);
  });

  console.log('\nOrchestrator ready! Use the CLI tool (flux-agent) to execute tasks.\n');
}
