/**
 * Action execution logic for workflow triggers.
 *
 * Extracted from WorkflowAutomationService to keep each file under 600 lines.
 * Handles: notification, auto-reply, task creation, reminder, status update, escalation.
 */

import type { Message } from '../../types/messaging';
import { createLogger } from '@/services/logging';
import { messagingSocketService } from '../messagingSocketService';
import type {
  WorkflowAction,
  WorkflowContext,
  NotificationConfig,
  AutoReplyConfig,
  TaskCreationConfig,
  ReminderConfig,
  StatusUpdateConfig,
  EscalationConfig,
} from './workflowTypes';

const logger = createLogger('WorkflowActionExecutor');

// Module-level storage shared with the main service via getters
const pendingTasks = new Map<string, unknown>();
const scheduledReminders = new Map<string, unknown>();

export function getPendingTasks(): unknown[] {
  return Array.from(pendingTasks.values());
}

export function getScheduledReminders(): unknown[] {
  return Array.from(scheduledReminders.values());
}

export function cancelReminder(reminderId: string): boolean {
  return scheduledReminders.delete(reminderId);
}

/** Reset module-level state — for testing only. */
export function resetActionExecutorState(): void {
  pendingTasks.clear();
  scheduledReminders.clear();
}

export async function executeTriggerActions(
  actions: WorkflowAction[],
  message: Message,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
  for (const action of actions) {
    try {
      if (action.delay) {
        setTimeout(() => executeAction(action, message, context, emitEvent), action.delay);
      } else {
        await executeAction(action, message, context, emitEvent);
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
    }
  }
}

async function executeAction(
  action: WorkflowAction,
  message: Message,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const config = action.config as unknown;
  switch (action.type) {
    case 'notification':
      await sendNotification(config as NotificationConfig, context, emitEvent);
      break;
    case 'auto_reply':
      await sendAutoReply(config as AutoReplyConfig, context, emitEvent);
      break;
    case 'task_creation':
      await createTask(config as TaskCreationConfig, message, context, emitEvent);
      break;
    case 'reminder':
      await scheduleReminder(config as ReminderConfig, context, emitEvent);
      break;
    case 'status_update':
      await updateStatus(config as StatusUpdateConfig, context, emitEvent);
      break;
    case 'escalation':
      await escalateIssue(config as EscalationConfig, message, context, emitEvent);
      break;
  }
}

async function sendNotification(
  config: NotificationConfig,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
  logger.info('Sending notification', { message: config.message });

  emitEvent('notification', {
    type: 'workflow_notification',
    title: config.title || 'Workflow Notification',
    message: config.message,
    priority: config.priority || 'medium',
    conversationId: context.conversation.id,
    timestamp: new Date(),
  });

  if (config.notifyReviewers && messagingSocketService.getConnectionStatus()) {
    // The notification will be handled by the messaging socket service
  }
}

async function sendAutoReply(
  config: AutoReplyConfig,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
  logger.info('Sending auto-reply', { message: config.message });

  if (messagingSocketService.getConnectionStatus()) {
    messagingSocketService.sendMessage({
      conversationId: context.conversation.id,
      text: config.message,
    });
  }

  emitEvent('auto_reply_sent', {
    conversationId: context.conversation.id,
    message: config.message,
    timestamp: new Date(),
  });
}

async function createTask(
  config: TaskCreationConfig,
  message: Message,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
  logger.info('Creating task from message', { messageId: message.id });

  const taskTitle = extractTaskTitle(message.content);
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

  emitEvent('task_created', taskData);
  pendingTasks.set(`task-${Date.now()}`, taskData);
}

async function scheduleReminder(
  config: ReminderConfig,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
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

  scheduledReminders.set(reminderId, reminderData);

  setTimeout(() => {
    const reminder = scheduledReminders.get(reminderId);
    if (!reminder) return;
    emitEvent('reminder_triggered', reminder);
    scheduledReminders.delete(reminderId);
  }, config.reminderTime || 24 * 60 * 60 * 1000);

  emitEvent('reminder_scheduled', reminderData);
}

async function updateStatus(
  config: StatusUpdateConfig,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
  logger.info('Updating status', { newStatus: config.status });

  emitEvent('status_updated', {
    conversationId: context.conversation.id,
    projectId: context.projectContext?.id,
    previousStatus: config.previousStatus,
    newStatus: config.status,
    updatedAt: new Date(),
    updatedBy: context.currentUser.id,
  });
}

async function escalateIssue(
  config: EscalationConfig,
  message: Message,
  context: WorkflowContext,
  emitEvent: (event: string, data: unknown) => void,
): Promise<void> {
  logger.info('Escalating issue', { messageId: message.id });

  emitEvent('issue_escalated', {
    messageId: message.id,
    content: message.content,
    conversationId: context.conversation.id,
    escalatedTo: config.escalateTo || [],
    priority: config.priority || 'high',
    reason: config.reason || 'Automatic escalation triggered',
    timestamp: new Date(),
  });

  if (messagingSocketService.getConnectionStatus() && config.escalateTo) {
    await sendNotification(
      {
        message: `Issue escalated: ${message.content.slice(0, 100)}...`,
        title: 'Issue Escalation',
        priority: 'high',
      },
      context,
      emitEvent,
    );
  }
}

function extractTaskTitle(content: string): string {
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
