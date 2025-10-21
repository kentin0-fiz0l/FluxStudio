/**
 * Workflow Automation Service
 * Automated workflow triggers and intelligent suggestions for productivity
 */

import { Message, Conversation, MessageUser } from '../types/messaging';
import { ConversationMetrics } from './conversationInsightsService';

interface WorkflowTrigger {
  id: string;
  name: string;
  description: string;
  conditions: TriggerCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  category: 'productivity' | 'communication' | 'project_management' | 'quality_assurance';
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

interface TriggerCondition {
  type: 'message_pattern' | 'time_based' | 'user_action' | 'conversation_state' | 'keyword_detection';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches_regex';
  value: any;
  field?: string; // For specific field conditions
}

interface WorkflowAction {
  type: 'notification' | 'auto_reply' | 'task_creation' | 'status_update' | 'escalation' | 'reminder';
  config: Record<string, any>;
  delay?: number; // Delay in milliseconds before executing
}

interface AutomationSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'time_saving' | 'quality_improvement' | 'communication_enhancement' | 'project_tracking';
  estimatedImpact: 'high' | 'medium' | 'low';
  implementation: string[];
  basedOnPattern: string;
  confidence: number;
  potentialSavings: {
    timePerWeek: number; // in minutes
    messagesReduced: number;
    automationLevel: number; // 0-100%
  };
}

interface WorkflowContext {
  conversation: Conversation;
  recentMessages: Message[];
  currentUser: MessageUser;
  conversationMetrics?: ConversationMetrics;
  projectContext?: any;
}

interface AutomationRule {
  id: string;
  name: string;
  pattern: string;
  action: string;
  enabled: boolean;
  confidence: number;
}

class WorkflowAutomationService {
  private activeTriggers = new Map<string, WorkflowTrigger>();
  private suggestionCache = new Map<string, AutomationSuggestion[]>();
  private automationHistory: Array<{ triggerId: string; timestamp: Date; success: boolean; context: any }> = [];

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
          value: ['deadline', 'due date', 'delivery', 'launch']
        }
      ],
      actions: [
        {
          type: 'reminder',
          config: { reminderTime: 24 * 60 * 60 * 1000, message: 'Deadline reminder: Don\'t forget about the upcoming deadline!' }
        }
      ]
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
          value: /(?:action item|todo|task|need to|should|must)/i
        }
      ],
      actions: [
        {
          type: 'task_creation',
          config: { extractText: true, assignToMentioned: true }
        }
      ]
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
          value: 48 * 60 * 60 * 1000, // 48 hours of inactivity
        }
      ],
      actions: [
        {
          type: 'auto_reply',
          config: { message: 'Hey team! It\'s been quiet here. Could we get a quick status update?' }
        }
      ]
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
          value: 'attachment'
        },
        {
          type: 'keyword_detection',
          operator: 'contains',
          value: ['design', 'mockup', 'prototype', 'wireframe']
        }
      ],
      actions: [
        {
          type: 'notification',
          config: {
            message: 'New design shared! Starting review process...',
            notifyReviewers: true
          }
        }
      ]
    }
  ];

  /**
   * Analyze conversation and suggest workflow automations
   */
  async generateWorkflowSuggestions(context: WorkflowContext): Promise<AutomationSuggestion[]> {
    const cacheKey = this.generateCacheKey(context.conversation.id, context.recentMessages.length);

    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey)!;
    }

    try {
      const suggestions = await this.analyzeAndSuggest(context);
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
  async setupTrigger(conversationId: string, trigger: Partial<WorkflowTrigger>): Promise<WorkflowTrigger> {
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
      triggerCount: 0
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
        const shouldTrigger = await this.evaluateTriggerConditions(trigger, message, context);

        if (shouldTrigger) {
          await this.executeTriggerActions(trigger, message, context);

          // Update trigger statistics
          trigger.triggerCount++;
          trigger.lastTriggered = new Date();

          // Log automation event
          this.automationHistory.push({
            triggerId,
            timestamp: new Date(),
            success: true,
            context: {
              messageId: message.id,
              conversationId: context.conversation.id,
              triggerName: trigger.name
            }
          });
        }
      } catch (error) {
        console.error(`Failed to process trigger ${triggerId}:`, error);

        this.automationHistory.push({
          triggerId,
          timestamp: new Date(),
          success: false,
          context: { error: error.message }
        });
      }
    }
  }

  /**
   * Get smart suggestions for improving workflow efficiency
   */
  async getSmartWorkflowSuggestions(context: WorkflowContext): Promise<AutomationSuggestion[]> {
    const suggestions: AutomationSuggestion[] = [];

    // Analyze message patterns for automation opportunities
    const patterns = await this.analyzeMessagePatterns(context.recentMessages);

    // Generate suggestions based on patterns
    for (const pattern of patterns) {
      const suggestion = await this.createSuggestionFromPattern(pattern, context);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Add template-based suggestions
    const templateSuggestions = await this.getTemplateSuggestions(context);
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
      recentActivity: this.automationHistory.slice(-10)
    };
  }

  private async analyzeAndSuggest(context: WorkflowContext): Promise<AutomationSuggestion[]> {
    const suggestions: AutomationSuggestion[] = [];

    // Analyze repetitive patterns
    const repetitivePatterns = this.findRepetitivePatterns(context.recentMessages);
    if (repetitivePatterns.length > 0) {
      suggestions.push({
        id: 'repetitive-automation',
        title: 'Automate Repetitive Messages',
        description: 'You have repetitive message patterns that could be automated',
        category: 'time_saving',
        estimatedImpact: 'high',
        implementation: [
          'Create template responses for common questions',
          'Set up auto-replies for status updates',
          'Use quick actions for frequent tasks'
        ],
        basedOnPattern: 'Repetitive message content detected',
        confidence: 0.85,
        potentialSavings: {
          timePerWeek: 120,
          messagesReduced: 25,
          automationLevel: 60
        }
      });
    }

    // Check for deadline management needs
    const hasDeadlineMessages = context.recentMessages.some(m =>
      /deadline|due|delivery|launch|ship/i.test(m.content)
    );

    if (hasDeadlineMessages && !this.hasDeadlineAutomation()) {
      suggestions.push({
        id: 'deadline-automation',
        title: 'Automated Deadline Tracking',
        description: 'Set up automatic reminders for mentioned deadlines',
        category: 'project_tracking',
        estimatedImpact: 'high',
        implementation: [
          'Extract deadline dates from messages',
          'Create calendar reminders',
          'Send progress check notifications'
        ],
        basedOnPattern: 'Deadline mentions without tracking',
        confidence: 0.90,
        potentialSavings: {
          timePerWeek: 45,
          messagesReduced: 8,
          automationLevel: 40
        }
      });
    }

    // Analyze for quality gates
    const hasDesignSharing = context.recentMessages.some(m =>
      m.attachments?.some(a => /\.(png|jpg|jpeg|gif|figma|sketch)$/i.test(a.name || ''))
    );

    if (hasDesignSharing) {
      suggestions.push({
        id: 'quality-gate-automation',
        title: 'Automated Design Review Process',
        description: 'Trigger review workflows when design files are shared',
        category: 'quality_improvement',
        estimatedImpact: 'medium',
        implementation: [
          'Auto-notify reviewers when designs are shared',
          'Create review checklists',
          'Track review completion status'
        ],
        basedOnPattern: 'Design file sharing detected',
        confidence: 0.75,
        potentialSavings: {
          timePerWeek: 30,
          messagesReduced: 12,
          automationLevel: 35
        }
      });
    }

    return suggestions;
  }

  private async evaluateTriggerConditions(
    trigger: WorkflowTrigger,
    message: Message,
    context: WorkflowContext
  ): Promise<boolean> {
    for (const condition of trigger.conditions) {
      const result = await this.evaluateCondition(condition, message, context);
      if (!result) return false; // All conditions must be true
    }
    return true;
  }

  private async evaluateCondition(
    condition: TriggerCondition,
    message: Message,
    context: WorkflowContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'keyword_detection':
        return this.evaluateKeywordCondition(condition, message);

      case 'message_pattern':
        return this.evaluatePatternCondition(condition, message);

      case 'time_based':
        return this.evaluateTimeCondition(condition, context);

      case 'user_action':
        return this.evaluateUserActionCondition(condition, message, context);

      case 'conversation_state':
        return this.evaluateConversationStateCondition(condition, context);

      default:
        return false;
    }
  }

  private evaluateKeywordCondition(condition: TriggerCondition, message: Message): boolean {
    const keywords = Array.isArray(condition.value) ? condition.value : [condition.value];
    const content = message.content.toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return keywords.some(keyword => content.includes(keyword.toLowerCase()));
      case 'equals':
        return keywords.some(keyword => content === keyword.toLowerCase());
      default:
        return false;
    }
  }

  private evaluatePatternCondition(condition: TriggerCondition, message: Message): boolean {
    const pattern = condition.value instanceof RegExp ? condition.value : new RegExp(condition.value, 'i');

    switch (condition.operator) {
      case 'matches_regex':
        return pattern.test(message.content);
      default:
        return false;
    }
  }

  private evaluateTimeCondition(condition: TriggerCondition, context: WorkflowContext): boolean {
    const now = new Date();
    const lastMessage = context.recentMessages[context.recentMessages.length - 1];

    if (!lastMessage) return false;

    const timeSinceLastMessage = now.getTime() - new Date(lastMessage.createdAt).getTime();

    switch (condition.operator) {
      case 'greater_than':
        return timeSinceLastMessage > condition.value;
      case 'less_than':
        return timeSinceLastMessage < condition.value;
      default:
        return false;
    }
  }

  private evaluateUserActionCondition(
    condition: TriggerCondition,
    message: Message,
    context: WorkflowContext
  ): boolean {
    // Implement user action evaluation logic
    return false; // Placeholder
  }

  private evaluateConversationStateCondition(
    condition: TriggerCondition,
    context: WorkflowContext
  ): boolean {
    // Implement conversation state evaluation logic
    return false; // Placeholder
  }

  private async executeTriggerActions(
    trigger: WorkflowTrigger,
    message: Message,
    context: WorkflowContext
  ): Promise<void> {
    for (const action of trigger.actions) {
      try {
        if (action.delay) {
          setTimeout(() => this.executeAction(action, message, context), action.delay);
        } else {
          await this.executeAction(action, message, context);
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  private async executeAction(
    action: WorkflowAction,
    message: Message,
    context: WorkflowContext
  ): Promise<void> {
    switch (action.type) {
      case 'notification':
        await this.sendNotification(action.config, context);
        break;

      case 'auto_reply':
        await this.sendAutoReply(action.config, context);
        break;

      case 'task_creation':
        await this.createTask(action.config, message, context);
        break;

      case 'reminder':
        await this.scheduleReminder(action.config, context);
        break;

      case 'status_update':
        await this.updateStatus(action.config, context);
        break;

      case 'escalation':
        await this.escalateIssue(action.config, message, context);
        break;
    }
  }

  private async sendNotification(config: any, context: WorkflowContext): Promise<void> {
    console.log('Notification sent:', config.message);
    // In a real implementation, this would send actual notifications
  }

  private async sendAutoReply(config: any, context: WorkflowContext): Promise<void> {
    console.log('Auto-reply sent:', config.message);
    // In a real implementation, this would send a message to the conversation
  }

  private async createTask(config: any, message: Message, context: WorkflowContext): Promise<void> {
    console.log('Task created from message:', message.content);
    // In a real implementation, this would create a task in a task management system
  }

  private async scheduleReminder(config: any, context: WorkflowContext): Promise<void> {
    console.log('Reminder scheduled:', config.message);
    // In a real implementation, this would schedule a reminder
  }

  private async updateStatus(config: any, context: WorkflowContext): Promise<void> {
    console.log('Status updated:', config);
    // In a real implementation, this would update project status
  }

  private async escalateIssue(config: any, message: Message, context: WorkflowContext): Promise<void> {
    console.log('Issue escalated:', message.content);
    // In a real implementation, this would escalate to appropriate team members
  }

  private findRepetitivePatterns(messages: Message[]): string[] {
    const patterns: string[] = [];
    const contentMap = new Map<string, number>();

    // Simple pattern detection - count similar messages
    messages.forEach(message => {
      const words = message.content.toLowerCase().split(/\s+/);
      const key = words.slice(0, 3).join(' '); // First 3 words as pattern key

      if (key.length > 10) { // Only consider meaningful patterns
        contentMap.set(key, (contentMap.get(key) || 0) + 1);
      }
    });

    // Find patterns that appear more than twice
    for (const [pattern, count] of contentMap) {
      if (count > 2) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private hasDeadlineAutomation(): boolean {
    return Array.from(this.activeTriggers.values()).some(trigger =>
      trigger.name.toLowerCase().includes('deadline') ||
      trigger.conditions.some(condition =>
        condition.type === 'keyword_detection' &&
        Array.isArray(condition.value) &&
        condition.value.some(keyword => /deadline|due/i.test(keyword))
      )
    );
  }

  private async analyzeMessagePatterns(messages: Message[]): Promise<any[]> {
    // Simplified pattern analysis
    const patterns = [];

    // Check for question patterns
    const questions = messages.filter(m => m.content.includes('?'));
    if (questions.length > 3) {
      patterns.push({ type: 'frequent_questions', count: questions.length });
    }

    // Check for status update patterns
    const statusUpdates = messages.filter(m =>
      /status|update|progress|done|complete/i.test(m.content)
    );
    if (statusUpdates.length > 2) {
      patterns.push({ type: 'status_updates', count: statusUpdates.length });
    }

    return patterns;
  }

  private async createSuggestionFromPattern(pattern: any, context: WorkflowContext): Promise<AutomationSuggestion | null> {
    // Convert patterns to automation suggestions
    if (pattern.type === 'frequent_questions') {
      return {
        id: 'faq-automation',
        title: 'Create FAQ Automation',
        description: 'Set up auto-responses for frequently asked questions',
        category: 'communication_enhancement',
        estimatedImpact: 'medium',
        implementation: [
          'Identify common questions',
          'Create template responses',
          'Set up keyword triggers'
        ],
        basedOnPattern: `${pattern.count} questions detected`,
        confidence: 0.7,
        potentialSavings: {
          timePerWeek: 20,
          messagesReduced: pattern.count,
          automationLevel: 30
        }
      };
    }

    return null;
  }

  private async getTemplateSuggestions(context: WorkflowContext): Promise<AutomationSuggestion[]> {
    return this.automationTemplates.map((template, index) => ({
      id: `template-${index}`,
      title: `Enable ${template.name}`,
      description: template.description || 'Pre-built automation template',
      category: 'time_saving',
      estimatedImpact: template.priority === 'high' ? 'high' : 'medium',
      implementation: [
        'Enable pre-built automation',
        'Customize trigger conditions',
        'Test automation workflow'
      ],
      basedOnPattern: 'Pre-built template',
      confidence: 0.8,
      potentialSavings: {
        timePerWeek: template.priority === 'high' ? 60 : 30,
        messagesReduced: 10,
        automationLevel: 50
      }
    }));
  }

  private generateCacheKey(conversationId: string, messageCount: number): string {
    return `${conversationId}-${messageCount}`;
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
}

// Singleton instance
export const workflowAutomationService = new WorkflowAutomationService();

export type {
  WorkflowTrigger,
  TriggerCondition,
  WorkflowAction,
  AutomationSuggestion,
  WorkflowContext,
  AutomationRule
};

export default workflowAutomationService;