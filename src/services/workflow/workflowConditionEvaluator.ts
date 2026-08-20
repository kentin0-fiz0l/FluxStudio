/**
 * Condition evaluation logic for workflow triggers.
 *
 * Extracted from WorkflowAutomationService to keep each file under 600 lines.
 * Handles: keyword, pattern, time-based, user action, and conversation state conditions.
 */

import type { Message } from '../../types/messaging';
import type { TriggerCondition, WorkflowTrigger, WorkflowContext } from './workflowTypes';

export function evaluateTriggerConditions(
  trigger: WorkflowTrigger,
  message: Message,
  context: WorkflowContext,
): boolean {
  for (const condition of trigger.conditions) {
    if (!evaluateCondition(condition, message, context)) return false;
  }
  return true;
}

function evaluateCondition(
  condition: TriggerCondition,
  message: Message,
  context: WorkflowContext,
): boolean {
  switch (condition.type) {
    case 'keyword_detection':
      return evaluateKeywordCondition(condition, message);
    case 'message_pattern':
      return evaluatePatternCondition(condition, message);
    case 'time_based':
      return evaluateTimeCondition(condition, context);
    case 'user_action':
      return evaluateUserActionCondition(condition, message);
    case 'conversation_state':
      return evaluateConversationStateCondition(condition, context);
    default:
      return false;
  }
}

function evaluateKeywordCondition(condition: TriggerCondition, message: Message): boolean {
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

function evaluatePatternCondition(condition: TriggerCondition, message: Message): boolean {
  const pattern = condition.value instanceof RegExp ? condition.value : new RegExp(String(condition.value), 'i');

  switch (condition.operator) {
    case 'matches_regex':
      return pattern.test(message.content);
    default:
      return false;
  }
}

function evaluateTimeCondition(condition: TriggerCondition, context: WorkflowContext): boolean {
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

function evaluateUserActionCondition(
  condition: TriggerCondition,
  message: Message,
): boolean {
  const target = String(condition.value);

  switch (condition.field) {
    case 'content':
      return compareString(message.content, condition.operator, target);
    case 'author_role':
      return compareString(
        (message as unknown as Record<string, unknown>).authorRole as string ?? '',
        condition.operator,
        target,
      );
    case 'author_id':
      return compareString(message.author.id, condition.operator, target);
    case 'type':
      return compareString(
        (message as unknown as Record<string, unknown>).type as string ?? 'text',
        condition.operator,
        target,
      );
    default:
      return false;
  }
}

function evaluateConversationStateCondition(
  condition: TriggerCondition,
  context: WorkflowContext,
): boolean {
  switch (condition.field) {
    case 'participant_count':
      return compareNumeric(
        context.conversation.participants?.length ?? 0,
        condition.operator,
        Number(condition.value),
      );
    case 'unread_count':
      return compareNumeric(
        (context.conversation as unknown as Record<string, unknown>).unreadCount as number ?? 0,
        condition.operator,
        Number(condition.value),
      );
    case 'message_count':
      return compareNumeric(
        context.recentMessages.length,
        condition.operator,
        Number(condition.value),
      );
    case 'status':
      return compareString(
        (context.conversation as unknown as Record<string, unknown>).status as string ?? 'active',
        condition.operator,
        String(condition.value),
      );
    default:
      return false;
  }
}

function compareNumeric(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case 'equals':
      return actual === target;
    case 'greater_than':
      return actual > target;
    case 'less_than':
      return actual < target;
    default:
      return false;
  }
}

function compareString(actual: string, operator: string, target: string): boolean {
  switch (operator) {
    case 'equals':
      return actual === target;
    case 'contains':
      return actual.toLowerCase().includes(target.toLowerCase());
    case 'matches_regex':
      try {
        return new RegExp(target, 'i').test(actual);
      } catch {
        return false;
      }
    default:
      return false;
  }
}
