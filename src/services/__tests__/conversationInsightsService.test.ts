/**
 * Unit Tests for Conversation Insights Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { conversationInsightsService } from '../conversationInsightsService';

const makeMessage = (id: string, content: string, authorId: string, createdAt: string) => ({
  id,
  content,
  author: { id: authorId, name: `User ${authorId}`, userType: 'designer' as const, email: `${authorId}@test.com`, avatar: '' },
  conversationId: 'conv-1',
  createdAt,
  updatedAt: createdAt,
  type: 'text' as const,
  status: 'sent',
  isEdited: false,
  attachments: [],
});

const now = Date.now();
const hour = 3600000;

function makeMessages(count: number, opts: { authorIds?: string[]; startTime?: number; interval?: number; contentFn?: (i: number) => string } = {}) {
  const {
    authorIds = ['u1', 'u2'],
    startTime = now - count * hour,
    interval = hour,
    contentFn = (i: number) => `Message ${i}`,
  } = opts;

  return Array.from({ length: count }, (_, i) => {
    const authorId = authorIds[i % authorIds.length];
    return makeMessage(`msg-${i}`, contentFn(i), authorId, new Date(startTime + i * interval).toISOString());
  });
}

const mockConversation = {
  id: 'conv-1',
  name: 'Test Conversation',
  type: 'group' as const,
  participants: [],
  metadata: { isArchived: false, isMuted: false, isPinned: false, priority: 'medium' as const, tags: [] },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as any;

describe('ConversationInsightsService', () => {
  beforeEach(() => {
    conversationInsightsService.clearCache();
  });

  describe('analyzeConversation', () => {
    it('should throw for insufficient messages', async () => {
      const messages = makeMessages(3);
      await expect(
        conversationInsightsService.analyzeConversation(mockConversation, messages as any)
      ).rejects.toThrow('Insufficient message data');
    });

    it('should return complete insight summary', async () => {
      const messages = makeMessages(10);
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);

      expect(result).toHaveProperty('conversationId', 'conv-1');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('teamDynamics');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('trendAnalysis');
    });

    it('should cache results', async () => {
      const messages = makeMessages(10);
      const result1 = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      const result2 = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result1).toBe(result2); // Same reference from cache
    });

    it('should count participants correctly', async () => {
      const messages = makeMessages(10, { authorIds: ['u1', 'u2', 'u3'] });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.participantCount).toBe(3);
    });

    it('should count messages correctly', async () => {
      const messages = makeMessages(15);
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.messageCount).toBe(15);
    });
  });

  describe('extractActionItems', () => {
    it('should extract action items from messages', async () => {
      const messages = [
        makeMessage('1', 'We need to update the homepage design', 'u1', new Date().toISOString()),
        makeMessage('2', 'Action item: fix the logo alignment', 'u2', new Date().toISOString()),
        makeMessage('3', 'This looks great!', 'u1', new Date().toISOString()),
      ];

      const items = await conversationInsightsService.extractActionItems(messages as any);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('description');
      expect(items[0]).toHaveProperty('status', 'pending');
    });

    it('should detect action keywords', async () => {
      const messages = [
        makeMessage('1', 'action: review the brand guidelines', 'u1', new Date().toISOString()),
      ];
      const items = await conversationInsightsService.extractActionItems(messages as any);
      expect(items.length).toBe(1);
    });

    it('should sort by confidence', async () => {
      const messages = [
        makeMessage('1', 'need to complete this by deadline', 'u1', new Date().toISOString()),
        makeMessage('2', 'should update the docs', 'u2', new Date().toISOString()),
      ];
      const items = await conversationInsightsService.extractActionItems(messages as any);
      if (items.length >= 2) {
        expect(items[0].confidence).toBeGreaterThanOrEqual(items[1].confidence);
      }
    });

    it('should return empty for non-action messages', async () => {
      const messages = [
        makeMessage('1', 'Hello everyone', 'u1', new Date().toISOString()),
        makeMessage('2', 'Welcome to the team', 'u2', new Date().toISOString()),
      ];
      const items = await conversationInsightsService.extractActionItems(messages as any);
      expect(items).toEqual([]);
    });
  });

  describe('analyzeProjectProgress', () => {
    it('should return progress insight structure', async () => {
      const messages = makeMessages(10, {
        contentFn: (i) => i % 2 === 0 ? 'Working on the design' : 'Completed the wireframes',
      });
      const result = await conversationInsightsService.analyzeProjectProgress(messages as any);

      expect(result).toHaveProperty('phase');
      expect(result).toHaveProperty('completionEstimate');
      expect(result).toHaveProperty('blockers');
      expect(result).toHaveProperty('momentum');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('recommendations');
    });

    it('should detect blockers', async () => {
      const messages = [
        makeMessage('1', 'We are blocked on the API', 'u1', new Date().toISOString()),
        makeMessage('2', 'Stuck waiting for client approval', 'u2', new Date().toISOString()),
      ];
      const result = await conversationInsightsService.analyzeProjectProgress(messages as any);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('should identify momentum as steady for few messages', async () => {
      const messages = makeMessages(3);
      const result = await conversationInsightsService.analyzeProjectProgress(messages as any);
      expect(result.momentum).toBe('steady');
    });
  });

  describe('getRealTimeInsights', () => {
    it('should return empty object for no messages', async () => {
      const result = await conversationInsightsService.getRealTimeInsights('conv-1', []);
      expect(result).toEqual({});
    });

    it('should return partial insights for recent messages', async () => {
      const messages = makeMessages(5, { interval: 60000 }); // 1 min apart
      const result = await conversationInsightsService.getRealTimeInsights('conv-1', messages as any);
      expect(result).toHaveProperty('insights');
    });
  });

  describe('team dynamics analysis', () => {
    it('should calculate participation balance', async () => {
      const messages = makeMessages(10, { authorIds: ['u1', 'u2'] });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);

      expect(result.teamDynamics).toHaveProperty('participationBalance');
      expect(result.teamDynamics).toHaveProperty('collaborationScore');
      expect(result.teamDynamics).toHaveProperty('teamHealth');
    });

    it('should detect collaboration through positive keywords', async () => {
      const messages = makeMessages(10, {
        contentFn: (i) => i % 2 === 0 ? 'Great idea, thanks!' : 'I agree with this approach',
      });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.teamDynamics.collaborationScore).toBeGreaterThan(0);
    });

    it('should detect conflict indicators', async () => {
      const messages = [
        ...makeMessages(5),
        makeMessage('conflict-1', 'I disagree with this approach', 'u1', new Date().toISOString()),
        makeMessage('conflict-2', 'This is a bad idea', 'u2', new Date().toISOString()),
      ];
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.teamDynamics.conflictIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('sentiment analysis', () => {
    it('should return positive sentiment for positive messages', async () => {
      const messages = makeMessages(10, {
        contentFn: () => 'This is great and excellent work, I love it',
      });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.sentimentScore).toBeGreaterThan(0);
    });

    it('should return negative sentiment for negative messages', async () => {
      const messages = makeMessages(10, {
        contentFn: () => 'This is terrible and bad, there is a problem',
      });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.sentimentScore).toBeLessThan(0);
    });
  });

  describe('engagement level', () => {
    it('should be high for many messages per participant', async () => {
      const messages = makeMessages(20, { authorIds: ['u1', 'u2'] });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.engagementLevel).toBe('high');
    });

    it('should be low for few messages per participant', async () => {
      const messages = makeMessages(6, { authorIds: ['u1', 'u2', 'u3'] });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.engagementLevel).toBe('low');
    });
  });

  describe('topic extraction', () => {
    it('should extract design-related topics', async () => {
      const messages = makeMessages(10, {
        contentFn: () => 'The design needs a review before deployment',
      });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.topicCoverage).toContain('design');
      expect(result.insights.topicCoverage).toContain('review');
      expect(result.insights.topicCoverage).toContain('deployment');
    });
  });

  describe('recommendations', () => {
    it('should recommend improving response times when slow', async () => {
      // Create messages with large gaps (> 1 hour apart)
      const messages = makeMessages(10, { interval: 2 * hour });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      const responseRec = result.recommendations.find(r => r.id === 'response-time-improvement');
      expect(responseRec).toBeDefined();
    });

    it('should sort recommendations by priority', async () => {
      const messages = makeMessages(10);
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      if (result.recommendations.length >= 2) {
        const priorities = { high: 3, medium: 2, low: 1 };
        for (let i = 0; i < result.recommendations.length - 1; i++) {
          expect(priorities[result.recommendations[i].priority])
            .toBeGreaterThanOrEqual(priorities[result.recommendations[i + 1].priority]);
        }
      }
    });
  });

  describe('trend analysis', () => {
    it('should return stable trends for small datasets', async () => {
      const messages = makeMessages(6);
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.trendAnalysis.responseTimesTrend).toBe('stable');
      expect(result.trendAnalysis.engagementTrend).toBe('stable');
    });

    it('should include weekly comparison', async () => {
      const messages = makeMessages(10);
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.trendAnalysis.weeklyComparison).toHaveProperty('messagesThisWeek');
      expect(result.trendAnalysis.weeklyComparison).toHaveProperty('messagesLastWeek');
      expect(result.trendAnalysis.weeklyComparison).toHaveProperty('percentChange');
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const messages = makeMessages(10);
      await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(conversationInsightsService.getCachedInsights('conv-1', 10)).not.toBeNull();

      conversationInsightsService.clearCache();
      expect(conversationInsightsService.getCachedInsights('conv-1', 10)).toBeNull();
    });

    it('should return null for non-cached insights', () => {
      expect(conversationInsightsService.getCachedInsights('unknown', 5)).toBeNull();
    });
  });

  describe('decision extraction', () => {
    it('should extract decisions from messages', async () => {
      const messages = makeMessages(10, {
        contentFn: (i) => i === 3 ? 'We decided to go with option A' : `Message ${i}`,
      });
      const result = await conversationInsightsService.analyzeConversation(mockConversation, messages as any);
      expect(result.insights.keyDecisions.length).toBeGreaterThan(0);
    });
  });
});
