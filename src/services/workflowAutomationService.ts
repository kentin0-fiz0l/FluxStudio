/**
 * Workflow Automation Service
 * Automated workflow triggers and intelligent suggestions for productivity
 */

import { Message, Conversation, MessageUser } from '../types/messaging';
import { ConversationMetrics } from './conversationInsightsService';
import { createLogger } from '@/services/logging';
import { messagingSocketService } from './messagingSocketService';

const logger = createLogger('WorkflowAutomation');

// Event emitter for workflow events
type WorkflowEventHandler = (data: unknown) => void;
const workflowEventHandlers: Map<string, Set<WorkflowEventHandler>> = new Map();

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
  value: string | number | string[] | RegExp;
  field?: string; // For specific field conditions
}

interface WorkflowAction {
  type: 'notification' | 'auto_reply' | 'task_creation' | 'status_update' | 'escalation' | 'reminder';
  config: Record<string, unknown>;
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
  projectContext?: { id?: string; [key: string]: unknown };
}

interface AutomationRule {
  id: string;
  name: string;
  pattern: string;
  action: string;
  enabled: boolean;
  confidence: number;
}

// Action configuration interfaces
interface NotificationConfig {
  message: string;
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  notifyReviewers?: boolean;
}

interface AutoReplyConfig {
  message: string;
  delay?: number;
}

interface TaskCreationConfig {
  extractText?: boolean;
  assignToMentioned?: boolean;
  defaultAssignee?: string;
}

interface ReminderConfig {
  message: string;
  reminderTime?: number; // milliseconds
}

interface StatusUpdateConfig {
  status: string;
  previousStatus?: string;
}

interface EscalationConfig {
  escalateTo?: string[];
  priority?: 'critical' | 'high' | 'medium';
  reason?: string;
}

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
          context: { error: error instanceof Error ? error.message : 'Unknown error' }
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
    const keywords = Array.isArray(condition.value) ? condition.value : [String(condition.value)];
    const content = message.content.toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return keywords.some(keyword => content.includes(String(keyword).toLowerCase()));
      case 'equals':
        return keywords.some(keyword => content === String(keyword).toLowerCase());
      default:
        return false;
    }
  }

  private evaluatePatternCondition(condition: TriggerCondition, message: Message): boolean {
    const pattern = condition.value instanceof RegExp ? condition.value : new RegExp(String(condition.value), 'i');

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
        return timeSinceLastMessage > Number(condition.value);
      case 'less_than':
        return timeSinceLastMessage < Number(condition.value);
      default:
        return false;
    }
  }

  private evaluateUserActionCondition(
    _condition: TriggerCondition,
    _message: Message,
    _context: WorkflowContext
  ): boolean {
    // Implement user action evaluation logic
    return false; // Placeholder
  }

  private evaluateConversationStateCondition(
    _condition: TriggerCondition,
    _context: WorkflowContext
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
    const config = action.config as unknown;
    switch (action.type) {
      case 'notification':
        await this.sendNotification(config as NotificationConfig, context);
        break;

      case 'auto_reply':
        await this.sendAutoReply(config as AutoReplyConfig, context);
        break;

      case 'task_creation':
        await this.createTask(config as TaskCreationConfig, message, context);
        break;

      case 'reminder':
        await this.scheduleReminder(config as ReminderConfig, context);
        break;

      case 'status_update':
        await this.updateStatus(config as StatusUpdateConfig, context);
        break;

      case 'escalation':
        await this.escalateIssue(config as EscalationConfig, message, context);
        break;
    }
  }

  private async sendNotification(config: NotificationConfig, context: WorkflowContext): Promise<void> {
    logger.info('Sending notification', { message: config.message });

    // Emit workflow event for UI to handle
    this.emitWorkflowEvent('notification', {
      type: 'workflow_notification',
      title: config.title || 'Workflow Notification',
      message: config.message,
      priority: config.priority || 'medium',
      conversationId: context.conversation.id,
      timestamp: new Date(),
    });

    // If configured to notify specific users, send via socket
    if (config.notifyReviewers && messagingSocketService.getConnectionStatus()) {
      // The notification will be handled by the messaging socket service
      // which broadcasts to connected users
    }
  }

  private async sendAutoReply(config: AutoReplyConfig, context: WorkflowContext): Promise<void> {
    logger.info('Sending auto-reply', { message: config.message });

    // Send message via socket service
    if (messagingSocketService.getConnectionStatus()) {
      messagingSocketService.sendMessage({
        conversationId: context.conversation.id,
        text: config.message,
      });
    }

    // Emit event for tracking
    this.emitWorkflowEvent('auto_reply_sent', {
      conversationId: context.conversation.id,
      message: config.message,
      timestamp: new Date(),
    });
  }

  private async createTask(config: TaskCreationConfig, message: Message, context: WorkflowContext): Promise<void> {
    logger.info('Creating task from message', { messageId: message.id });

    // Extract task details from message
    const taskTitle = this.extractTaskTitle(message.content);
    const assignees = config.assignToMentioned && message.mentions
      ? message.mentions
      : [];

    const taskData = {
      title: taskTitle,
      description: config.extractText ? message.content : undefined,
      sourceMessageId: message.id,
      conversationId: context.conversation.id,
      projectId: context.projectContext?.id,
      assignees,
      createdAt: new Date(),
      status: 'pending',
    };

    // Emit task creation event for UI/backend to handle
    this.emitWorkflowEvent('task_created', taskData);

    // Store pending task for tracking
    this.pendingTasks.set(`task-${Date.now()}`, taskData);
  }

  private async scheduleReminder(config: ReminderConfig, context: WorkflowContext): Promise<void> {
    logger.info('Scheduling reminder', { message: config.message, delay: config.reminderTime });

    const reminderId = `reminder-${Date.now()}`;
    const reminderTime = Date.now() + (config.reminderTime || 24 * 60 * 60 * 1000);

    const reminderData = {
      id: reminderId,
      message: config.message,
      scheduledFor: new Date(reminderTime),
      conversationId: context.conversation.id,
      userId: context.currentUser.id,
    };

    // Store reminder
    this.scheduledReminders.set(reminderId, reminderData);

    // Schedule the actual reminder
    setTimeout(() => {
      this.executeReminder(reminderId);
    }, config.reminderTime || 24 * 60 * 60 * 1000);

    // Emit event
    this.emitWorkflowEvent('reminder_scheduled', reminderData);
  }

  private async updateStatus(config: StatusUpdateConfig, context: WorkflowContext): Promise<void> {
    logger.info('Updating status', { newStatus: config.status });

    const statusUpdate = {
      conversationId: context.conversation.id,
      projectId: context.projectContext?.id,
      previousStatus: config.previousStatus,
      newStatus: config.status,
      updatedAt: new Date(),
      updatedBy: context.currentUser.id,
    };

    // Emit status update event
    this.emitWorkflowEvent('status_updated', statusUpdate);
  }

  private async escalateIssue(config: EscalationConfig, message: Message, context: WorkflowContext): Promise<void> {
    logger.info('Escalating issue', { messageId: message.id });

    const escalation = {
      messageId: message.id,
      content: message.content,
      conversationId: context.conversation.id,
      escalatedTo: config.escalateTo || [],
      priority: config.priority || 'high',
      reason: config.reason || 'Automatic escalation triggered',
      timestamp: new Date(),
    };

    // Emit escalation event
    this.emitWorkflowEvent('issue_escalated', escalation);

    // Send notification to escalation targets
    if (messagingSocketService.getConnectionStatus() && config.escalateTo) {
      await this.sendNotification(
        {
          message: `Issue escalated: ${message.content.slice(0, 100)}...`,
          title: 'Issue Escalation',
          priority: 'high',
        },
        context
      );
    }
  }

  // Helper method to extract task title from message content
  private extractTaskTitle(content: string): string {
    // Look for common task patterns
    const patterns = [
      /(?:todo|task|action item):\s*(.+?)(?:\.|$)/i,
      /(?:need to|should|must)\s+(.+?)(?:\.|$)/i,
      /^(.+?)(?:\.|$)/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim().slice(0, 100);
      }
    }

    return content.slice(0, 100);
  }

  // Execute a scheduled reminder
  private executeReminder(reminderId: string): void {
    const reminder = this.scheduledReminders.get(reminderId);
    if (!reminder) return;

    this.emitWorkflowEvent('reminder_triggered', reminder);
    this.scheduledReminders.delete(reminderId);
  }

  // Event emission helper
  private emitWorkflowEvent(event: string, data: unknown): void {
    const handlers = workflowEventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          logger.error('Error in workflow event handler', error as Error);
        }
      });
    }
  }

  // Storage for pending items
  private pendingTasks: Map<string, unknown> = new Map();
  private scheduledReminders: Map<string, unknown> = new Map();

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

  private async analyzeMessagePatterns(messages: Message[]): Promise<{ type: string; count: number }[]> {
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

  private async createSuggestionFromPattern(pattern: { type: string; count: number }, _context: WorkflowContext): Promise<AutomationSuggestion | null> {
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

  private async getTemplateSuggestions(_context: WorkflowContext): Promise<AutomationSuggestion[]> {
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

  /**
   * Subscribe to workflow events
   */
  onWorkflowEvent(event: string, handler: WorkflowEventHandler): () => void {
    if (!workflowEventHandlers.has(event)) {
      workflowEventHandlers.set(event, new Set());
    }
    workflowEventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      workflowEventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): unknown[] {
    return Array.from(this.pendingTasks.values());
  }

  /**
   * Get scheduled reminders
   */
  getScheduledReminders(): unknown[] {
    return Array.from(this.scheduledReminders.values());
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(reminderId: string): boolean {
    return this.scheduledReminders.delete(reminderId);
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