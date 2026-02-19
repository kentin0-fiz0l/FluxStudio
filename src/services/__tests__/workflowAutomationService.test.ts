/**
 * Unit Tests for Workflow Automation Service
 * @file src/services/__tests__/workflowAutomationService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/services/logging', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock('../messagingSocketService', () => ({
  messagingSocketService: {
    getConnectionStatus: vi.fn().mockReturnValue(false),
    sendMessage: vi.fn(),
  },
}));

vi.mock('../conversationInsightsService', () => ({}));

import { workflowAutomationService } from '../workflowAutomationService';
import type { WorkflowContext } from '../workflowAutomationService';
import type { Message, Conversation, MessageUser } from '../../types/messaging';

function createMockUser(overrides: Partial<MessageUser> = {}): MessageUser {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    userType: 'designer',
    ...overrides,
  };
}

function createMockConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conv-1',
    type: 'project',
    name: 'Test Project',
    participants: [],
    metadata: {
      isArchived: false,
      isMuted: false,
      isPinned: false,
      priority: 'medium',
      tags: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: new Date(),
    unreadCount: 0,
    ...overrides,
  } as Conversation;
}

function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    type: 'text',
    content: 'Hello world',
    author: createMockUser(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    isDeleted: false,
    readBy: [],
    reactions: [],
    ...overrides,
  } as Message;
}

function createContext(overrides: Partial<WorkflowContext> = {}): WorkflowContext {
  return {
    conversation: createMockConversation(),
    recentMessages: [],
    currentUser: createMockUser(),
    ...overrides,
  };
}

describe('WorkflowAutomationService', () => {
  beforeEach(() => {
    // Clear state between tests
    workflowAutomationService.clearCache();
    workflowAutomationService.getActiveTriggers().forEach(t => {
      workflowAutomationService.removeTrigger(t.id);
    });
    (workflowAutomationService as any).automationHistory = [];
    (workflowAutomationService as any).pendingTasks.clear();
    (workflowAutomationService as any).scheduledReminders.clear();
  });

  // ============================================================================
  // TRIGGER MANAGEMENT
  // ============================================================================

  describe('setupTrigger', () => {
    it('should create a trigger with defaults', async () => {
      const trigger = await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Test Trigger',
      });

      expect(trigger.id).toMatch(/^trigger-/);
      expect(trigger.name).toBe('Test Trigger');
      expect(trigger.enabled).toBe(true);
      expect(trigger.priority).toBe('medium');
      expect(trigger.triggerCount).toBe(0);
    });

    it('should create a trigger with full config', async () => {
      const trigger = await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Deadline Trigger',
        description: 'Track deadlines',
        priority: 'high',
        category: 'project_management',
        conditions: [{ type: 'keyword_detection', operator: 'contains', value: ['deadline'] }],
        actions: [{ type: 'reminder', config: { message: 'Deadline!' } }],
      });

      expect(trigger.priority).toBe('high');
      expect(trigger.category).toBe('project_management');
      expect(trigger.conditions.length).toBe(1);
      expect(trigger.actions.length).toBe(1);
    });

    it('should store the trigger in active triggers', async () => {
      await workflowAutomationService.setupTrigger('conv-1', { name: 'T1' });
      expect(workflowAutomationService.getActiveTriggers().length).toBe(1);
    });
  });

  describe('updateTriggerStatus', () => {
    it('should enable/disable a trigger', async () => {
      const trigger = await workflowAutomationService.setupTrigger('conv-1', { name: 'T' });

      expect(workflowAutomationService.updateTriggerStatus(trigger.id, false)).toBe(true);
      const updated = workflowAutomationService.getActiveTriggers().find(t => t.id === trigger.id);
      expect(updated!.enabled).toBe(false);
    });

    it('should return false for non-existent trigger', () => {
      expect(workflowAutomationService.updateTriggerStatus('none', true)).toBe(false);
    });
  });

  describe('removeTrigger', () => {
    it('should remove a trigger', async () => {
      const trigger = await workflowAutomationService.setupTrigger('conv-1', { name: 'T' });
      expect(workflowAutomationService.removeTrigger(trigger.id)).toBe(true);
      expect(workflowAutomationService.getActiveTriggers().length).toBe(0);
    });

    it('should return false for non-existent trigger', () => {
      expect(workflowAutomationService.removeTrigger('none')).toBe(false);
    });
  });

  // ============================================================================
  // TRIGGER PROCESSING
  // ============================================================================

  describe('processMessageForTriggers', () => {
    it('should trigger on keyword match', async () => {
      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('reminder_scheduled', eventHandler);

      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Deadline Detect',
        conditions: [{ type: 'keyword_detection', operator: 'contains', value: ['deadline'] }],
        actions: [{ type: 'reminder', config: { message: 'Deadline reminder', reminderTime: 1000 } }],
      });

      const msg = createMockMessage({ content: 'The deadline is next Friday' });
      await workflowAutomationService.processMessageForTriggers(msg, createContext());

      expect(eventHandler).toHaveBeenCalled();
      unsub();
    });

    it('should not trigger disabled triggers', async () => {
      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Disabled',
        enabled: false,
        conditions: [{ type: 'keyword_detection', operator: 'contains', value: ['test'] }],
        actions: [{ type: 'notification', config: { message: 'Test' } }],
      });

      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('notification', eventHandler);

      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'test message' }),
        createContext()
      );

      expect(eventHandler).not.toHaveBeenCalled();
      unsub();
    });

    it('should trigger on regex pattern match', async () => {
      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('task_created', eventHandler);

      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Task Detect',
        conditions: [{ type: 'message_pattern', operator: 'matches_regex', value: /todo|task/i }],
        actions: [{ type: 'task_creation', config: { extractText: true } }],
      });

      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'Task: Update the landing page' }),
        createContext()
      );

      expect(eventHandler).toHaveBeenCalled();
      unsub();
    });

    it('should increment trigger count on match', async () => {
      const trigger = await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Counter',
        conditions: [{ type: 'keyword_detection', operator: 'contains', value: ['hello'] }],
        actions: [{ type: 'notification', config: { message: 'hi' } }],
      });

      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'hello world' }),
        createContext()
      );

      const updated = workflowAutomationService.getActiveTriggers().find(t => t.id === trigger.id);
      expect(updated!.triggerCount).toBe(1);
      expect(updated!.lastTriggered).toBeDefined();
    });

    it('should handle errors in trigger processing gracefully', async () => {
      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Bad Trigger',
        conditions: [{ type: 'keyword_detection', operator: 'contains', value: ['error'] }],
        actions: [{ type: 'notification', config: null as any }],
      });

      // Should not throw
      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'trigger error here' }),
        createContext()
      );
    });

    it('should require all conditions to be true', async () => {
      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('notification', eventHandler);

      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Multi Condition',
        conditions: [
          { type: 'keyword_detection', operator: 'contains', value: ['design'] },
          { type: 'keyword_detection', operator: 'contains', value: ['review'] },
        ],
        actions: [{ type: 'notification', config: { message: 'Review needed' } }],
      });

      // Only one condition met - should NOT trigger
      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'design update' }),
        createContext()
      );
      expect(eventHandler).not.toHaveBeenCalled();

      // Both conditions met
      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'design review needed' }),
        createContext()
      );
      expect(eventHandler).toHaveBeenCalled();

      unsub();
    });
  });

  // ============================================================================
  // CONDITION EVALUATION
  // ============================================================================

  describe('condition evaluation', () => {
    it('should evaluate keyword equals condition', async () => {
      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('notification', eventHandler);

      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Exact',
        conditions: [{ type: 'keyword_detection', operator: 'equals', value: ['approved'] }],
        actions: [{ type: 'notification', config: { message: 'Approved!' } }],
      });

      // Partial match should NOT trigger
      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'not approved yet' }),
        createContext()
      );
      expect(eventHandler).not.toHaveBeenCalled();

      // Exact match should trigger
      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'approved' }),
        createContext()
      );
      expect(eventHandler).toHaveBeenCalled();

      unsub();
    });

    it('should evaluate time-based conditions', async () => {
      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('notification', eventHandler);

      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'Stale',
        conditions: [{ type: 'time_based', operator: 'greater_than', value: 1000 }],
        actions: [{ type: 'notification', config: { message: 'Stale!' } }],
      });

      // Recent message - should NOT trigger
      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'test' }),
        createContext({
          recentMessages: [createMockMessage({ createdAt: new Date() })],
        })
      );
      expect(eventHandler).not.toHaveBeenCalled();

      // Old message - should trigger
      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'test' }),
        createContext({
          recentMessages: [createMockMessage({ createdAt: new Date(Date.now() - 5000) })],
        })
      );
      expect(eventHandler).toHaveBeenCalled();

      unsub();
    });

    it('should return false for user_action condition (placeholder)', async () => {
      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('notification', eventHandler);

      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'User Action',
        conditions: [{ type: 'user_action', operator: 'equals', value: 'click' }],
        actions: [{ type: 'notification', config: { message: 'Clicked' } }],
      });

      await workflowAutomationService.processMessageForTriggers(
        createMockMessage({ content: 'test' }),
        createContext()
      );
      expect(eventHandler).not.toHaveBeenCalled();

      unsub();
    });

    it('should return false for conversation_state condition (placeholder)', async () => {
      const eventHandler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('notification', eventHandler);

      await workflowAutomationService.setupTrigger('conv-1', {
        name: 'State',
        conditions: [{ type: 'conversation_state', operator: 'equals', value: 'active' }],
        actions: [{ type: 'notification', config: { message: 'Active' } }],
      });

      await workflowAutomationService.processMessageForTriggers(
        createMockMessage(),
        createContext()
      );
      expect(eventHandler).not.toHaveBeenCalled();

      unsub();
    });
  });

  // ============================================================================
  // SUGGESTIONS
  // ============================================================================

  describe('generateWorkflowSuggestions', () => {
    it('should return suggestions based on context', async () => {
      const ctx = createContext({
        recentMessages: [
          createMockMessage({ content: 'The deadline is tomorrow' }),
        ],
      });

      const suggestions = await workflowAutomationService.generateWorkflowSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should cache suggestions', async () => {
      const ctx = createContext({
        recentMessages: [createMockMessage()],
      });

      const first = await workflowAutomationService.generateWorkflowSuggestions(ctx);
      const second = await workflowAutomationService.generateWorkflowSuggestions(ctx);
      expect(first).toEqual(second);
    });

    it('should suggest deadline automation when deadline messages found', async () => {
      const ctx = createContext({
        recentMessages: [
          createMockMessage({ content: 'The deadline is next week' }),
        ],
      });

      const suggestions = await workflowAutomationService.generateWorkflowSuggestions(ctx);
      const deadlineSuggestion = suggestions.find(s => s.id === 'deadline-automation');
      expect(deadlineSuggestion).toBeDefined();
    });
  });

  describe('getSmartWorkflowSuggestions', () => {
    it('should return suggestions including templates', async () => {
      const suggestions = await workflowAutomationService.getSmartWorkflowSuggestions(createContext());
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should detect frequent questions pattern', async () => {
      const messages = Array.from({ length: 5 }, (_, i) =>
        createMockMessage({ id: `msg-${i}`, content: `Question ${i}?` })
      );

      const suggestions = await workflowAutomationService.getSmartWorkflowSuggestions(
        createContext({ recentMessages: messages })
      );
      const faq = suggestions.find(s => s.id === 'faq-automation');
      expect(faq).toBeDefined();
    });

    it('should sort suggestions by confidence', async () => {
      const suggestions = await workflowAutomationService.getSmartWorkflowSuggestions(createContext());
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });
  });

  describe('getAutomationTemplates', () => {
    it('should return all templates', () => {
      const templates = workflowAutomationService.getAutomationTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should filter by category', () => {
      const templates = workflowAutomationService.getAutomationTemplates('project_management');
      templates.forEach(t => {
        expect(t.category).toBe('project_management');
      });
    });

    it('should return empty for non-existent category', () => {
      const templates = workflowAutomationService.getAutomationTemplates('nonexistent');
      expect(templates).toEqual([]);
    });
  });

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  describe('getAutomationAnalytics', () => {
    it('should return analytics with zero values initially', () => {
      const analytics = workflowAutomationService.getAutomationAnalytics();
      expect(analytics.totalTriggers).toBe(0);
      expect(analytics.activeTriggers).toBe(0);
      expect(analytics.totalExecutions).toBe(0);
      expect(analytics.successRate).toBe(0);
    });

    it('should track active vs total triggers', async () => {
      const t1 = await workflowAutomationService.setupTrigger('conv-1', { name: 'T1' });

      const analytics = workflowAutomationService.getAutomationAnalytics();
      expect(analytics.totalTriggers).toBe(1);
      expect(analytics.activeTriggers).toBe(1);

      // Disable it
      workflowAutomationService.updateTriggerStatus(t1.id, false);
      const analytics2 = workflowAutomationService.getAutomationAnalytics();
      expect(analytics2.totalTriggers).toBe(1);
      expect(analytics2.activeTriggers).toBe(0);
    });
  });

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  describe('onWorkflowEvent', () => {
    it('should subscribe and unsubscribe from events', () => {
      const handler = vi.fn();
      const unsub = workflowAutomationService.onWorkflowEvent('test_event', handler);

      // Emit event manually
      (workflowAutomationService as any).emitWorkflowEvent('test_event', { data: 'test' });
      expect(handler).toHaveBeenCalledWith({ data: 'test' });

      unsub();

      // After unsubscribe, should not be called
      handler.mockClear();
      (workflowAutomationService as any).emitWorkflowEvent('test_event', { data: 'test2' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // STORAGE
  // ============================================================================

  describe('getPendingTasks', () => {
    it('should return empty initially', () => {
      expect(workflowAutomationService.getPendingTasks()).toEqual([]);
    });
  });

  describe('getScheduledReminders', () => {
    it('should return empty initially', () => {
      expect(workflowAutomationService.getScheduledReminders()).toEqual([]);
    });
  });

  describe('cancelReminder', () => {
    it('should return false for non-existent reminder', () => {
      expect(workflowAutomationService.cancelReminder('none')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear suggestion cache', async () => {
      const ctx = createContext({ recentMessages: [createMockMessage()] });
      await workflowAutomationService.generateWorkflowSuggestions(ctx);

      workflowAutomationService.clearCache();

      // Cache is cleared - verify by checking internal state
      expect((workflowAutomationService as any).suggestionCache.size).toBe(0);
    });
  });
});
