/**
 * Unit Tests for AI Design Assistant Service
 * @file src/services/__tests__/aiDesignAssistant.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiDesignAssistant } from '../aiDesignAssistant';

describe('AIDesignAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('analyzeDesign', () => {
    it('should return design suggestions', async () => {
      const promise = aiDesignAssistant.analyzeDesign({ context: 'landing page' });
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        title: expect.any(String),
        confidence: expect.any(Number),
        impact: expect.any(String),
      });
    });

    it('should include color, spacing, typography, and accessibility suggestions', async () => {
      const promise = aiDesignAssistant.analyzeDesign({});
      vi.advanceTimersByTime(2000);
      const result = await promise;

      const types = result.map(s => s.type);
      expect(types).toContain('color');
      expect(types).toContain('spacing');
      expect(types).toContain('typography');
      expect(types).toContain('accessibility');
    });

    it('should include implementation details with CSS', async () => {
      const promise = aiDesignAssistant.analyzeDesign({});
      vi.advanceTimersByTime(2000);
      const result = await promise;

      result.forEach(s => {
        expect(s.implementation).toBeDefined();
        expect(s.implementation.instructions).toBeTruthy();
      });
    });

    it('should include reasoning and tags', async () => {
      const promise = aiDesignAssistant.analyzeDesign({});
      vi.advanceTimersByTime(2000);
      const result = await promise;

      result.forEach(s => {
        expect(s.reasoning).toBeTruthy();
        expect(s.tags.length).toBeGreaterThan(0);
      });
    });

    it('should return empty array on error', async () => {
      // Force error by mocking delay to throw
      const origDelay = (aiDesignAssistant as any).delay;
      (aiDesignAssistant as any).delay = () => Promise.reject(new Error('fail'));

      const result = await aiDesignAssistant.analyzeDesign({});
      expect(result).toEqual([]);

      (aiDesignAssistant as any).delay = origDelay;
    });
  });

  describe('generateColorPalette', () => {
    it('should return color palettes', async () => {
      const promise = aiDesignAssistant.generateColorPalette({ industry: 'tech' });
      vi.advanceTimersByTime(1500);
      const result = await promise;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        harmony: expect.any(String),
      });
    });

    it('should include colors with accessibility info', async () => {
      const promise = aiDesignAssistant.generateColorPalette({});
      vi.advanceTimersByTime(1500);
      const result = await promise;

      result[0].colors.forEach(color => {
        expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i);
        expect(color.role).toBeTruthy();
        expect(color.accessibility).toBeDefined();
        expect(typeof color.accessibility.wcagCompliant).toBe('boolean');
      });
    });

    it('should include mood and industry arrays', async () => {
      const promise = aiDesignAssistant.generateColorPalette({});
      vi.advanceTimersByTime(1500);
      const result = await promise;

      result.forEach(palette => {
        expect(palette.mood.length).toBeGreaterThan(0);
        expect(palette.industry.length).toBeGreaterThan(0);
      });
    });

    it('should return empty array on error', async () => {
      const origDelay = (aiDesignAssistant as any).delay;
      (aiDesignAssistant as any).delay = () => Promise.reject(new Error('fail'));

      const result = await aiDesignAssistant.generateColorPalette({});
      expect(result).toEqual([]);

      (aiDesignAssistant as any).delay = origDelay;
    });
  });

  describe('analyzeLayout', () => {
    it('should return layout analysis with score', async () => {
      const promise = aiDesignAssistant.analyzeLayout({
        elements: [],
        viewport: { width: 1920, height: 1080 },
      });
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.score).toBeGreaterThan(0);
      expect(result.id).toMatch(/^layout-analysis-/);
    });

    it('should include issues with severity', async () => {
      const promise = aiDesignAssistant.analyzeLayout({
        elements: [],
        viewport: { width: 1920, height: 1080 },
      });
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.issues.length).toBeGreaterThan(0);
      result.issues.forEach(issue => {
        expect(['low', 'medium', 'high']).toContain(issue.severity);
        expect(issue.description).toBeTruthy();
        expect(issue.suggestion).toBeTruthy();
      });
    });

    it('should include strengths and improvements', async () => {
      const promise = aiDesignAssistant.analyzeLayout({
        elements: [],
        viewport: { width: 1920, height: 1080 },
      });
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it('should throw on error', async () => {
      const origDelay = (aiDesignAssistant as any).delay;
      (aiDesignAssistant as any).delay = () => Promise.reject(new Error('fail'));

      await expect(
        aiDesignAssistant.analyzeLayout({ elements: [], viewport: { width: 100, height: 100 } })
      ).rejects.toThrow('fail');

      (aiDesignAssistant as any).delay = origDelay;
    });
  });

  describe('analyzeCollaboration', () => {
    it('should return collaboration insights', async () => {
      const promise = aiDesignAssistant.analyzeCollaboration({
        messages: [],
        feedback: [],
        designIterations: [],
        teamMembers: [],
      });
      vi.advanceTimersByTime(2500);
      const result = await promise;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        type: expect.any(String),
        title: expect.any(String),
        confidence: expect.any(Number),
        actionable: expect.any(Boolean),
      });
    });

    it('should include suggestions in insights', async () => {
      const promise = aiDesignAssistant.analyzeCollaboration({
        messages: [],
        feedback: [],
        designIterations: [],
        teamMembers: [],
      });
      vi.advanceTimersByTime(2500);
      const result = await promise;

      result.forEach(insight => {
        expect(insight.suggestions.length).toBeGreaterThan(0);
      });
    });

    it('should return empty array on error', async () => {
      const origDelay = (aiDesignAssistant as any).delay;
      (aiDesignAssistant as any).delay = () => Promise.reject(new Error('fail'));

      const result = await aiDesignAssistant.analyzeCollaboration({
        messages: [], feedback: [], designIterations: [], teamMembers: [],
      });
      expect(result).toEqual([]);

      (aiDesignAssistant as any).delay = origDelay;
    });
  });

  describe('getRealTimeSuggestions', () => {
    it('should return suggestions quickly', async () => {
      const promise = aiDesignAssistant.getRealTimeSuggestions({});
      vi.advanceTimersByTime(600);
      const result = await promise;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('spacing');
    });

    it('should return empty on error', async () => {
      const origDelay = (aiDesignAssistant as any).delay;
      (aiDesignAssistant as any).delay = () => Promise.reject(new Error('fail'));

      const result = await aiDesignAssistant.getRealTimeSuggestions({});
      expect(result).toEqual([]);

      (aiDesignAssistant as any).delay = origDelay;
    });
  });

  describe('generateAccessibilityReport', () => {
    it('should return accessibility score and issues', async () => {
      const promise = aiDesignAssistant.generateAccessibilityReport({});
      vi.advanceTimersByTime(1200);
      const result = await promise;

      expect(result.score).toBeGreaterThan(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should include WCAG-related recommendations', async () => {
      const promise = aiDesignAssistant.generateAccessibilityReport({});
      vi.advanceTimersByTime(1200);
      const result = await promise;

      const a11yRec = result.recommendations.find(r => r.type === 'accessibility');
      expect(a11yRec).toBeDefined();
      expect(a11yRec!.tags).toContain('wcag');
    });

    it('should throw on error', async () => {
      const origDelay = (aiDesignAssistant as any).delay;
      (aiDesignAssistant as any).delay = () => Promise.reject(new Error('fail'));

      await expect(aiDesignAssistant.generateAccessibilityReport({})).rejects.toThrow('fail');

      (aiDesignAssistant as any).delay = origDelay;
    });
  });
});
