/**
 * Workflow Automation Service
 * Automated workflow triggers and intelligent suggestions for productivity.
 *
 * Orchestrates sub-modules:
 * - workflow/workflowTypes.ts — type definitions
 * - workflow/workflowConditionEvaluator.ts — trigger condition evaluation
 * - workflow/workflowActionExecutor.ts — action execution (notifications, tasks, reminders)
 * - workflow/workflowPatternAnalyzer.ts — pattern analysis and suggestion generation
 */

import type { Message } from '../types/messaging';
import { evaluateTriggerConditions } from './workflow/workflowConditionEvaluator';
import {
  executeTriggerActions,
  getPendingTasks,
  getScheduledReminders,
  cancelReminder,
  resetActionExecutorState,
} from './workflow/workflowActionExecutor';
import {
  analyzeAndSuggest,
  analyzeMessagePatterns,
  createSuggestionFromPattern,
  getTemplateSuggestions,
} from './workflow/workflowPatternAnalyzer';
import type {
  WorkflowTrigger,
  WorkflowAction,
  AutomationSuggestion,
  WorkflowContext,
  AutomationRule,
  WorkflowEventHandler,
} from './workflow/workflowTypes';

// Re-export types for backward compatibility
export type {
  WorkflowTrigger,
  WorkflowAction,
  AutomationSuggestion,
  WorkflowContext,
  AutomationRule,
};

// Event emitter for workflow events
const workflowEventHandlers: Map<string, Set<WorkflowEventHandler>> = new Map();

class WorkflowAutomationService {
  private activeTriggers = new Map<string, WorkflowTrigger>();
  private suggestionCache = new Map<string, AutomationSuggestion[]>();
  private automationHistory: Array<{ triggerId: string; timestamp: Date; success: boolean; context: Record<string, unknown> }> = [];

  // Pre-defined automation templates
  private readonly automationTemplates: Partial<WorkflowTrigger>[] = [
    {
      name: 'Deadline Reminder',
      description: 'Automatically remind team when deadlines are mentioned',
      category: 'project_management',
      priority: 'high',
      conditions: [
        {
          type: 'keyword_detection',
          operator: 'contains',
          value: ['deadline', 'due date', 'delivery', 'launch'],
        },
      ],
      actions: [
        {
          type: 'reminder',
          config: { reminderTime: 24 * 60 * 60 * 1000, message: 'Deadline reminder: Don\'t forget about the upcoming deadline!' },
        },
      ],
    },
    {
      name: 'Action Item Creation',
      description: 'Auto-create tasks when action items are identified',
      category: 'productivity',
      priority: 'medium',
      conditions: [
        {
          type: 'message_pattern',
          operator: 'matches_regex',
          value: /(?:action item|todo|task|need to|should|must)/i,
        },
      ],
      actions: [
        {
          type: 'task_creation',
          config: { extractText: true, assignToMentioned: true },
        },
      ],
    },
    {
      name: 'Status Update Request',
      description: 'Request status updates when projects go quiet',
      category: 'communication',
      priority: 'medium',
      conditions: [
        {
          type: 'time_based',
          operator: 'greater_than',
          value: 48 * 60 * 60 * 1000,
        },
      ],
      actions: [
        {
          type: 'auto_reply',
          config: { message: 'Hey team! It\'s been quiet here. Could we get a quick status update?' },
        },
      ],
    },
    {
      name: 'Quality Gate Trigger',
      description: 'Trigger review process when design files are shared',
      category: 'quality_assurance',
      priority: 'high',
      conditions: [
        {
          type: 'message_pattern',
          operator: 'contains',
          value: 'attachment',
        },
        {
          type: 'keyword_detection',
          operator: 'contains',
          value: ['design', 'mockup', 'prototype', 'wireframe'],
        },
      ],
      actions: [
        {
          type: 'notification',
          config: {
            message: 'New design shared! Starting review process...',
            notifyReviewers: true,
          },
        },
      ],
    },
  ];

  /**
   * Analyze conversation and suggest workflow automations
   */
  async generateWorkflowSuggestions(context: WorkflowContext): Promise<AutomationSuggestion[]> {
    const cacheKey = `${context.conversation.id}-${context.recentMessages.length}`;

    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey)!;
    }

    try {
      const suggestions = analyzeAndSuggest(context, this.activeTriggers);
      this.suggestionCache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Failed to generate workflow suggestions:', error);
      return [];
    }
  }

  /**
   * Set up automated trigger for conversation
   */
  async setupTrigger(_conversationId: string, trigger: Partial<WorkflowTrigger>): Promise<WorkflowTrigger> {
    const fullTrigger: WorkflowTrigger = {
      id: `trigger-${Date.now()}`,
      name: trigger.name || 'Custom Trigger',
      description: trigger.description || 'Automated workflow trigger',
      conditions: trigger.conditions || [],
      actions: trigger.actions || [],
      enabled: trigger.enabled !== false,
      priority: trigger.priority || 'medium',
      category: trigger.category || 'productivity',
      createdAt: new Date(),
      triggerCount: 0,
    };

    this.activeTriggers.set(fullTrigger.id, fullTrigger);
    return fullTrigger;
  }

  /**
   * Process incoming message for trigger conditions
   */
  async processMessageForTriggers(message: Message, context: WorkflowContext): Promise<void> {
    for (const [triggerId, trigger] of this.activeTriggers) {
      if (!trigger.enabled) continue;

      try {
        const shouldTrigger = evaluateTriggerConditions(trigger, message, context);

        if (shouldTrigger) {
          await executeTriggerActions(
            trigger.actions,
            message,
            context,
            (event, data) => this.emitWorkflowEvent(event, data),
          );

          trigger.triggerCount++;
          trigger.lastTriggered = new Date();

          this.automationHistory.push({
            triggerId,
            timestamp: new Date(),
            success: true,
            context: {
              messageId: message.id,
              conversationId: context.conversation.id,
              triggerName: trigger.name,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to process trigger ${triggerId}:`, error);

        this.automationHistory.push({
          triggerId,
          timestamp: new Date(),
          success: false,
          context: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  }

  /**
   * Get smart suggestions for improving workflow efficiency
   */
  async getSmartWorkflowSuggestions(context: WorkflowContext): Promise<AutomationSuggestion[]> {
    const suggestions: AutomationSuggestion[] = [];

    const patterns = analyzeMessagePatterns(context.recentMessages);

    for (const pattern of patterns) {
      const suggestion = createSuggestionFromPattern(pattern);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    const templateSuggestions = getTemplateSuggestions(this.automationTemplates);
    suggestions.push(...templateSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get automation templates applicable to current context
   */
  getAutomationTemplates(category?: string): Partial<WorkflowTrigger>[] {
    if (category) {
      return this.automationTemplates.filter(template => template.category === category);
    }
    return this.automationTemplates;
  }

  /**
   * Enable/disable specific trigger
   */
  updateTriggerStatus(triggerId: string, enabled: boolean): boolean {
    const trigger = this.activeTriggers.get(triggerId);
    if (trigger) {
      trigger.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get automation analytics
   */
  getAutomationAnalytics() {
    const totalTriggers = this.activeTriggers.size;
    const activeTriggers = Array.from(this.activeTriggers.values()).filter(t => t.enabled).length;
    const totalExecutions = this.automationHistory.length;
    const successfulExecutions = this.automationHistory.filter(h => h.success).length;

    const categoryBreakdown = Array.from(this.activeTriggers.values()).reduce((acc, trigger) => {
      acc[trigger.category] = (acc[trigger.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTriggers,
      activeTriggers,
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      categoryBreakdown,
      recentActivity: this.automationHistory.slice(-10),
    };
  }

  /**
   * Clear suggestion cache
   */
  clearCache(): void {
    this.suggestionCache.clear();
  }

  /**
   * Remove trigger
   */
  removeTrigger(triggerId: string): boolean {
    return this.activeTriggers.delete(triggerId);
  }

  /**
   * Get all active triggers
   */
  getActiveTriggers(): WorkflowTrigger[] {
    return Array.from(this.activeTriggers.values());
  }

  /**
   * Subscribe to workflow events
   */
  onWorkflowEvent(event: string, handler: WorkflowEventHandler): () => void {
    if (!workflowEventHandlers.has(event)) {
      workflowEventHandlers.set(event, new Set());
    }
    workflowEventHandlers.get(event)!.add(handler);

    return () => {
      workflowEventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): unknown[] {
    return getPendingTasks();
  }

  /**
   * Get scheduled reminders
   */
  getScheduledReminders(): unknown[] {
    return getScheduledReminders();
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(reminderId: string): boolean {
    return cancelReminder(reminderId);
  }

  /** Reset all internal state — for testing only. */
  _resetForTesting(): void {
    this.activeTriggers.clear();
    this.suggestionCache.clear();
    this.automationHistory = [];
    resetActionExecutorState();
  }

  private emitWorkflowEvent(event: string, data: unknown): void {
    const handlers = workflowEventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in workflow event handler', error);
        }
      });
    }
  }
}

// Singleton instance
export const workflowAutomationService = new WorkflowAutomationService();

export default workflowAutomationService;
