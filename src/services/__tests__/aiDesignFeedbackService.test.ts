/**
 * Unit Tests for AI Design Feedback Service
 * @file src/services/__tests__/aiDesignFeedbackService.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}));

vi.mock('@/services/logging', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock import.meta.env
vi.stubEnv('VITE_ANTHROPIC_API_KEY', '');

import { aiDesignFeedbackService } from '../aiDesignFeedbackService';
import type { DesignAnalysis } from '../aiDesignFeedbackService';

describe('AIDesignFeedbackService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    aiDesignFeedbackService.clearCache();
    // Mock fetch so it resolves immediately instead of hanging with fake timers
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function createMockAnalysis(overrides: Partial<DesignAnalysis> = {}): DesignAnalysis {
    return {
      id: 'analysis-1',
      imageUrl: 'https://example.com/design.png',
      analyzedAt: new Date(),
      elements: [
        { type: 'color', description: 'Blue palette', confidence: 0.92 },
        { type: 'typography', description: 'Sans-serif', confidence: 0.88 },
        { type: 'layout', description: 'Grid layout', confidence: 0.85 },
        { type: 'spacing', description: 'Consistent spacing', confidence: 0.90 },
      ],
      overallScore: 0.87,
      strengths: ['Strong visual hierarchy', 'Good color palette'],
      improvements: ['Add more visual contrast', 'Increase spacing between sections'],
      brandAlignment: 0.82,
      accessibilityScore: 0.78,
      moodAnalysis: {
        mood: 'Professional',
        confidence: 0.89,
        emotions: ['Trust', 'Innovation'],
      },
      ...overrides,
    };
  }

  describe('analyzeDesign', () => {
    it('should return simulated analysis when no API key', async () => {
      const promise = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png');
      // advanceTimersByTimeAsync drains microtasks (fetch mock) then advances timers (setTimeout)
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.id).toMatch(/^analysis-/);
      expect(result.imageUrl).toBe('https://example.com/img.png');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it('should cache analysis results', async () => {
      const promise1 = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png');
      await vi.advanceTimersByTimeAsync(2000);
      const result1 = await promise1;

      // Second call should return cached result immediately
      const result2 = await aiDesignFeedbackService.analyzeDesign('https://example.com/img.png');
      expect(result2.id).toBe(result1.id);
    });

    it('should include mood analysis', async () => {
      const promise = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png');
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.moodAnalysis).toBeDefined();
      expect(result.moodAnalysis!.mood).toBeTruthy();
      expect(result.moodAnalysis!.emotions.length).toBeGreaterThan(0);
    });

    it('should include accessibility score', async () => {
      const promise = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png');
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.accessibilityScore).toBeDefined();
      expect(result.accessibilityScore).toBeGreaterThan(0);
    });

    it('should use different cache keys for different contexts', async () => {
      const promise1 = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png', { industry: 'tech' });
      await vi.advanceTimersByTimeAsync(2000);
      const result1 = await promise1;

      const promise2 = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png', { industry: 'finance' });
      await vi.advanceTimersByTimeAsync(2000);
      const result2 = await promise2;

      // Different contexts should produce different cache entries
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('generateFeedback', () => {
    it('should generate feedback from analysis', async () => {
      const analysis = createMockAnalysis();
      const result = await aiDesignFeedbackService.generateFeedback(analysis);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(suggestion => {
        expect(suggestion.id).toBeTruthy();
        expect(suggestion.type).toBeTruthy();
        expect(suggestion.description).toBeTruthy();
      });
    });

    it('should include improvement suggestions from analysis', async () => {
      const analysis = createMockAnalysis({ improvements: ['Fix contrast', 'Add spacing'] });
      const result = await aiDesignFeedbackService.generateFeedback(analysis);

      const improvements = result.filter(s => s.type === 'improvement');
      expect(improvements.length).toBeGreaterThan(0);
    });

    it('should add accessibility suggestion when score is low', async () => {
      const analysis = createMockAnalysis({ accessibilityScore: 0.5 });
      const result = await aiDesignFeedbackService.generateFeedback(analysis);

      const a11y = result.find(s => s.category === 'accessibility');
      expect(a11y).toBeDefined();
      expect(a11y!.priority).toBe('high');
    });

    it('should not add accessibility suggestion when score is high', async () => {
      const analysis = createMockAnalysis({ accessibilityScore: 0.9 });
      const result = await aiDesignFeedbackService.generateFeedback(analysis);

      const a11y = result.find(s => s.id === 'accessibility-improvement');
      expect(a11y).toBeUndefined();
    });

    it('should sort suggestions by priority', async () => {
      const analysis = createMockAnalysis({ accessibilityScore: 0.5 });
      const result = await aiDesignFeedbackService.generateFeedback(analysis);

      const priorityOrder = { high: 3, medium: 2, low: 1 };
      for (let i = 1; i < result.length; i++) {
        expect(priorityOrder[result[i - 1].priority]).toBeGreaterThanOrEqual(
          priorityOrder[result[i].priority]
        );
      }
    });

    it('should generate praise for high-confidence elements', async () => {
      const analysis = createMockAnalysis({
        elements: [
          { type: 'color', description: 'Great colors', confidence: 0.95 },
        ],
      });
      const result = await aiDesignFeedbackService.generateFeedback(analysis);

      const praise = result.find(s => s.type === 'praise');
      expect(praise).toBeDefined();
    });

    it('should provide examples for improvements with matching keywords', async () => {
      const analysis = createMockAnalysis({
        improvements: ['Improve contrast between text and background'],
      });
      const result = await aiDesignFeedbackService.generateFeedback(analysis);

      const contrastImprovement = result.find(s =>
        s.description.includes('contrast')
      );
      expect(contrastImprovement?.examples?.length).toBeGreaterThan(0);
    });
  });

  describe('getContextualInsights', () => {
    it('should return trend and best practice insights', async () => {
      const analysis = createMockAnalysis();
      const result = await aiDesignFeedbackService.getContextualInsights(analysis);

      expect(result.length).toBeGreaterThan(0);
      const types = result.map(i => i.type);
      expect(types).toContain('trend');
      expect(types).toContain('best_practice');
    });

    it('should return industry insights for tech', async () => {
      const analysis = createMockAnalysis();
      const result = await aiDesignFeedbackService.getContextualInsights(analysis, 'tech');

      const industryInsight = result.find(i => i.id?.includes('tech'));
      expect(industryInsight).toBeDefined();
    });

    it('should return industry insights for healthcare', async () => {
      const analysis = createMockAnalysis();
      const result = await aiDesignFeedbackService.getContextualInsights(analysis, 'healthcare');

      const insight = result.find(i => i.id?.includes('healthcare'));
      expect(insight).toBeDefined();
    });

    it('should return industry insights for finance', async () => {
      const analysis = createMockAnalysis();
      const result = await aiDesignFeedbackService.getContextualInsights(analysis, 'finance');

      const insight = result.find(i => i.id?.includes('finance'));
      expect(insight).toBeDefined();
    });

    it('should sort by relevance', async () => {
      const analysis = createMockAnalysis();
      const result = await aiDesignFeedbackService.getContextualInsights(analysis, 'tech');

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].relevance).toBeGreaterThanOrEqual(result[i].relevance);
      }
    });

    it('should return insights without industry', async () => {
      const analysis = createMockAnalysis();
      const result = await aiDesignFeedbackService.getContextualInsights(analysis);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear the analysis cache', async () => {
      const promise = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png');
      await vi.advanceTimersByTimeAsync(2000);
      const result1 = await promise;

      aiDesignFeedbackService.clearCache();

      const promise2 = aiDesignFeedbackService.analyzeDesign('https://example.com/img.png');
      await vi.advanceTimersByTimeAsync(2000);
      const result2 = await promise2;

      expect(result2.id).not.toBe(result1.id);
    });
  });

  describe('getCachedAnalysis', () => {
    it('should return null when not cached', () => {
      const result = aiDesignFeedbackService.getCachedAnalysis('https://example.com/none.png');
      expect(result).toBeNull();
    });

    it('should return cached analysis', async () => {
      const promise = aiDesignFeedbackService.analyzeDesign('https://example.com/cached.png');
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      const cached = aiDesignFeedbackService.getCachedAnalysis('https://example.com/cached.png');
      expect(cached).not.toBeNull();
      expect(cached!.imageUrl).toBe('https://example.com/cached.png');
    });
  });
});
