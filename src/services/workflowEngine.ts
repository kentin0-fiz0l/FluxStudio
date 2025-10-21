/**
 * Workflow Engine
 * Orchestrates automated task sequences and cross-feature workflows
 */

import { Project } from '../types/project';
import { Conversation, MessageUser } from '../types/messaging';
import { Organization, Team } from '../types/organization';

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'parallel' | 'sequential' | 'wait';
  config: Record<string, any>;
  nextSteps?: string[];
  errorHandler?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'project' | 'communication' | 'review' | 'onboarding' | 'custom';
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  variables: Record<string, any>;
  requiredRoles?: string[];
}

export interface WorkflowTrigger {
  type: 'manual' | 'event' | 'schedule' | 'condition';
  config: {
    eventName?: string;
    schedule?: string; // cron expression
    condition?: string; // expression to evaluate
  };
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: string | null;
  context: WorkflowContext;
  startedAt: Date;
  completedAt?: Date;
  results: Record<string, any>;
  errors: WorkflowError[];
}

export interface WorkflowContext {
  project?: Project;
  conversation?: Conversation;
  organization?: Organization;
  team?: Team;
  user: MessageUser;
  variables: Record<string, any>;
}

export interface WorkflowError {
  stepId: string;
  message: string;
  timestamp: Date;
  details?: any;
}

export class WorkflowEngine {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private stepHandlers: Map<string, StepHandler> = new Map();

  constructor() {
    this.registerBuiltInTemplates();
    this.registerStepHandlers();
  }

  /**
   * Register built-in workflow templates
   */
  private registerBuiltInTemplates() {
    // Project Kickoff Workflow
    this.registerTemplate({
      id: 'project-kickoff',
      name: 'Project Kickoff',
      description: 'Automated workflow for starting new projects',
      category: 'project',
      triggers: [
        {
          type: 'event',
          config: { eventName: 'project.created' }
        }
      ],
      steps: [
        {
          id: 'create-conversation',
          name: 'Create Project Conversation',
          type: 'action',
          config: {
            action: 'createProjectConversation',
            conversationType: 'project-kickoff'
          },
          nextSteps: ['invite-team']
        },
        {
          id: 'invite-team',
          name: 'Invite Team Members',
          type: 'action',
          config: {
            action: 'inviteTeamMembers',
            roles: ['designer', 'client']
          },
          nextSteps: ['send-welcome']
        },
        {
          id: 'send-welcome',
          name: 'Send Welcome Message',
          type: 'action',
          config: {
            action: 'sendMessage',
            template: 'project-welcome'
          },
          nextSteps: ['create-folders']
        },
        {
          id: 'create-folders',
          name: 'Create Project Folders',
          type: 'action',
          config: {
            action: 'createProjectStructure',
            folders: ['concepts', 'drafts', 'finals', 'assets']
          },
          nextSteps: ['schedule-kickoff']
        },
        {
          id: 'schedule-kickoff',
          name: 'Schedule Kickoff Meeting',
          type: 'action',
          config: {
            action: 'scheduleEvent',
            eventType: 'kickoff-meeting',
            duration: 60
          }
        }
      ],
      variables: {},
      requiredRoles: ['admin', 'project-manager']
    });

    // Design Review Workflow
    this.registerTemplate({
      id: 'design-review',
      name: 'Design Review Process',
      description: 'Automated review and approval workflow',
      category: 'review',
      triggers: [
        {
          type: 'manual',
          config: {}
        }
      ],
      steps: [
        {
          id: 'prepare-assets',
          name: 'Prepare Review Assets',
          type: 'action',
          config: {
            action: 'gatherAssets',
            assetTypes: ['images', 'documents', 'videos']
          },
          nextSteps: ['notify-reviewers']
        },
        {
          id: 'notify-reviewers',
          name: 'Notify Reviewers',
          type: 'action',
          config: {
            action: 'sendNotifications',
            recipientRoles: ['client', 'stakeholder']
          },
          nextSteps: ['wait-for-reviews']
        },
        {
          id: 'wait-for-reviews',
          name: 'Wait for Reviews',
          type: 'wait',
          config: {
            waitFor: 'allReviewsComplete',
            timeout: 172800 // 48 hours
          },
          nextSteps: ['check-approval']
        },
        {
          id: 'check-approval',
          name: 'Check Approval Status',
          type: 'condition',
          config: {
            condition: 'approvalRate >= 0.75'
          },
          nextSteps: ['approved', 'needs-revision']
        },
        {
          id: 'approved',
          name: 'Mark as Approved',
          type: 'action',
          config: {
            action: 'updateStatus',
            status: 'approved'
          },
          nextSteps: ['move-to-production']
        },
        {
          id: 'needs-revision',
          name: 'Request Revisions',
          type: 'action',
          config: {
            action: 'createRevisionRequest',
            assignTo: 'designer'
          }
        },
        {
          id: 'move-to-production',
          name: 'Move to Production',
          type: 'action',
          config: {
            action: 'moveToPhase',
            phase: 'production'
          }
        }
      ],
      variables: {
        approvalRate: 0
      }
    });

    // Client Onboarding Workflow
    this.registerTemplate({
      id: 'client-onboarding',
      name: 'Client Onboarding',
      description: 'Automated onboarding for new clients',
      category: 'onboarding',
      triggers: [
        {
          type: 'event',
          config: { eventName: 'user.created' }
        }
      ],
      steps: [
        {
          id: 'send-welcome-email',
          name: 'Send Welcome Email',
          type: 'action',
          config: {
            action: 'sendEmail',
            template: 'client-welcome'
          },
          nextSteps: ['create-workspace']
        },
        {
          id: 'create-workspace',
          name: 'Create Client Workspace',
          type: 'action',
          config: {
            action: 'createWorkspace'
          },
          nextSteps: ['schedule-onboarding']
        },
        {
          id: 'schedule-onboarding',
          name: 'Schedule Onboarding Call',
          type: 'action',
          config: {
            action: 'scheduleCall',
            duration: 30
          },
          nextSteps: ['send-resources']
        },
        {
          id: 'send-resources',
          name: 'Send Onboarding Resources',
          type: 'action',
          config: {
            action: 'shareResources',
            resources: ['getting-started', 'best-practices', 'faq']
          }
        }
      ],
      variables: {}
    });
  }

  /**
   * Register step handlers for different action types
   */
  private registerStepHandlers() {
    // Action handler
    this.stepHandlers.set('action', async (step, context) => {
      const { action, ...params } = step.config;
      return await this.executeAction(action, params, context);
    });

    // Condition handler
    this.stepHandlers.set('condition', async (step, context) => {
      const { condition } = step.config;
      const result = await this.evaluateCondition(condition, context);
      return {
        success: true,
        nextStep: result ? step.nextSteps?.[0] : step.nextSteps?.[1]
      };
    });

    // Wait handler
    this.stepHandlers.set('wait', async (step, context) => {
      const { waitFor, timeout } = step.config;
      // In production, this would set up actual timers/watchers
      return {
        success: true,
        waiting: true,
        timeout
      };
    });

    // Parallel handler
    this.stepHandlers.set('parallel', async (step, context) => {
      const promises = (step.nextSteps || []).map(stepId =>
        this.executeStep(stepId, context)
      );
      const results = await Promise.allSettled(promises);
      return {
        success: results.every(r => r.status === 'fulfilled'),
        results
      };
    });

    // Sequential handler
    this.stepHandlers.set('sequential', async (step, context) => {
      const results = [];
      for (const stepId of step.nextSteps || []) {
        const result = await this.executeStep(stepId, context);
        results.push(result);
        if (!result.success) break;
      }
      return {
        success: results.every(r => r.success),
        results
      };
    });
  }

  /**
   * Register a workflow template
   */
  registerTemplate(template: WorkflowTemplate) {
    this.templates.set(template.id, template);
  }

  /**
   * Start a workflow instance
   */
  async startWorkflow(
    templateId: string,
    context: WorkflowContext
  ): Promise<WorkflowInstance> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const instance: WorkflowInstance = {
      id: this.generateId(),
      templateId,
      status: 'running',
      currentStep: template.steps[0]?.id || null,
      context,
      startedAt: new Date(),
      results: {},
      errors: []
    };

    this.instances.set(instance.id, instance);

    // Start execution
    if (instance.currentStep) {
      await this.executeStep(instance.currentStep, context);
    }

    return instance;
  }

  /**
   * Execute a workflow step
   */
  private async executeStep(stepId: string, context: WorkflowContext): Promise<any> {
    const instance = Array.from(this.instances.values())
      .find(i => i.currentStep === stepId);

    if (!instance) return { success: false, error: 'Instance not found' };

    const template = this.templates.get(instance.templateId);
    const step = template?.steps.find(s => s.id === stepId);

    if (!step) return { success: false, error: 'Step not found' };

    const handler = this.stepHandlers.get(step.type);
    if (!handler) return { success: false, error: `No handler for ${step.type}` };

    try {
      const result = await handler(step, context);
      instance.results[stepId] = result;

      // Move to next step
      if (result.success && step.nextSteps?.length) {
        instance.currentStep = result.nextStep || step.nextSteps[0];
        await this.executeStep(instance.currentStep, context);
      } else if (!step.nextSteps?.length) {
        // Workflow complete
        instance.status = 'completed';
        instance.completedAt = new Date();
      }

      return result;
    } catch (error: any) {
      instance.errors.push({
        stepId,
        message: error.message,
        timestamp: new Date(),
        details: error
      });
      instance.status = 'failed';
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute an action
   */
  private async executeAction(
    action: string,
    params: any,
    context: WorkflowContext
  ): Promise<any> {
    // In production, these would call actual services
    console.log(`Executing action: ${action}`, params, context);

    // Simulate different actions
    switch (action) {
      case 'createProjectConversation':
        return { success: true, conversationId: this.generateId() };

      case 'inviteTeamMembers':
        return { success: true, invitedCount: params.roles?.length || 0 };

      case 'sendMessage':
        return { success: true, messageId: this.generateId() };

      case 'createProjectStructure':
        return { success: true, folders: params.folders };

      case 'scheduleEvent':
        return { success: true, eventId: this.generateId() };

      default:
        return { success: true };
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    condition: string,
    context: WorkflowContext
  ): Promise<boolean> {
    // Simple expression evaluation
    // In production, use a proper expression evaluator
    try {
      const variables = context.variables || {};
      const expression = condition.replace(/(\w+)/g, (match) => {
        return variables[match] !== undefined ? variables[match] : match;
      });
      return eval(expression);
    } catch {
      return false;
    }
  }

  /**
   * Get workflow suggestions based on context
   */
  getWorkflowSuggestions(context: WorkflowContext): WorkflowTemplate[] {
    const suggestions: WorkflowTemplate[] = [];

    for (const template of this.templates.values()) {
      // Check if template is applicable to current context
      if (template.category === 'project' && context.project) {
        suggestions.push(template);
      } else if (template.category === 'communication' && context.conversation) {
        suggestions.push(template);
      } else if (template.category === 'onboarding' && !context.project) {
        suggestions.push(template);
      }

      // Check role requirements
      if (template.requiredRoles?.some(role =>
        context.user.userType === role || context.user.role === role
      )) {
        if (!suggestions.includes(template)) {
          suggestions.push(template);
        }
      }
    }

    return suggestions;
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Cancel a workflow
   */
  cancelWorkflow(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (instance && instance.status === 'running') {
      instance.status = 'cancelled';
      instance.completedAt = new Date();
      return true;
    }
    return false;
  }

  private generateId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();