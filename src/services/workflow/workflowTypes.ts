/**
 * Type definitions for the Workflow Automation Service.
 *
 * Extracted to keep the main service file focused on orchestration.
 */

import type { Message, Conversation, MessageUser } from '../../types/messaging';
import type { ConversationMetrics } from '../conversationInsightsService';

// Event emitter for workflow events
export type WorkflowEventHandler = (data: unknown) => void;

export interface WorkflowTrigger {
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

export interface TriggerCondition {
  type: 'message_pattern' | 'time_based' | 'user_action' | 'conversation_state' | 'keyword_detection';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches_regex';
  value: string | number | string[] | RegExp;
  field?: string;
}

export interface WorkflowAction {
  type: 'notification' | 'auto_reply' | 'task_creation' | 'status_update' | 'escalation' | 'reminder';
  config: Record<string, unknown>;
  delay?: number;
}

export interface AutomationSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'time_saving' | 'quality_improvement' | 'communication_enhancement' | 'project_tracking';
  estimatedImpact: 'high' | 'medium' | 'low';
  implementation: string[];
  basedOnPattern: string;
  confidence: number;
  potentialSavings: {
    timePerWeek: number;
    messagesReduced: number;
    automationLevel: number;
  };
}

export interface WorkflowContext {
  conversation: Conversation;
  recentMessages: Message[];
  currentUser: MessageUser;
  conversationMetrics?: ConversationMetrics;
  projectContext?: { id?: string; [key: string]: unknown };
}

export interface AutomationRule {
  id: string;
  name: string;
  pattern: string;
  action: string;
  enabled: boolean;
  confidence: number;
}

export interface NotificationConfig {
  message: string;
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  notifyReviewers?: boolean;
}

export interface AutoReplyConfig {
  message: string;
  delay?: number;
}

export interface TaskCreationConfig {
  extractText?: boolean;
  assignToMentioned?: boolean;
  defaultAssignee?: string;
}

export interface ReminderConfig {
  message: string;
  reminderTime?: number;
}

export interface StatusUpdateConfig {
  status: string;
  previousStatus?: string;
}

export interface EscalationConfig {
  escalateTo?: string[];
  priority?: 'critical' | 'high' | 'medium';
  reason?: string;
}
