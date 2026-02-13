/**
 * Tests for useAIContext hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Mock the store
const mockStore = vi.hoisted(() => ({
  projects: {
    projects: [
      { id: 'proj-1', name: 'Test Project', type: 'design' },
      { id: 'proj-2', name: 'Other Project', type: 'development' },
    ],
  },
}));

vi.mock('@/store', () => ({
  useStore: () => mockStore,
}));

// Mock react-router-dom hooks
const mockLocation = vi.hoisted(() => ({
  pathname: '/projects',
  search: '',
  hash: '',
  state: null,
  key: 'default',
}));

const mockParams = vi.hoisted(() => ({} as Record<string, string>));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useLocation: () => mockLocation,
    useParams: () => mockParams,
  };
});

import { useAIContext } from '../useAIContext';

function wrapper({ children }: { children: ReactNode }) {
  return createElement(BrowserRouter, null, children);
}

describe('useAIContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockLocation.pathname = '/projects';
    Object.keys(mockParams).forEach(key => delete mockParams[key]);

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Page tracking', () => {
    it('should detect the current page from pathname', () => {
      mockLocation.pathname = '/projects';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.page).toBe('Projects');
      expect(result.current.context.route).toBe('/projects');
    });

    it('should map known pages correctly', () => {
      mockLocation.pathname = '/messages';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.page).toBe('Messages');
    });

    it('should return Home for root path', () => {
      mockLocation.pathname = '/';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.page).toBe('Home');
    });

    it('should capitalize unknown page names', () => {
      mockLocation.pathname = '/custom-page';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.page).toBe('Custom-page');
    });

    it('should track route params', () => {
      mockParams.projectId = 'proj-1';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.params).toEqual({ projectId: 'proj-1' });
    });
  });

  describe('Active project tracking', () => {
    it('should set active project from route params', () => {
      mockParams.projectId = 'proj-1';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.activeProject).toEqual({
        id: 'proj-1',
        name: 'Test Project',
        type: 'design',
      });
    });

    it('should handle id param for project lookup', () => {
      mockParams.id = 'proj-2';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.activeProject).toEqual({
        id: 'proj-2',
        name: 'Other Project',
        type: 'development',
      });
    });

    it('should not set active project for unknown id', () => {
      mockParams.projectId = 'unknown';
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.activeProject).toBeUndefined();
    });
  });

  describe('Action tracking', () => {
    it('should track navigation as an action', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.recentActions).toContain('Navigated to Projects');
    });

    it('should add custom actions', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.addAction('Opened design file');
      });

      expect(result.current.context.recentActions).toContain('Opened design file');
    });

    it('should limit recent actions to maxRecentActions', () => {
      const { result } = renderHook(
        () => useAIContext({ maxRecentActions: 3 }),
        { wrapper }
      );

      act(() => {
        result.current.addAction('Action 1');
        result.current.addAction('Action 2');
        result.current.addAction('Action 3');
        result.current.addAction('Action 4');
      });

      // Should keep only the most recent 3
      expect(result.current.context.recentActions.length).toBeLessThanOrEqual(3);
      expect(result.current.context.recentActions[0]).toBe('Action 4');
    });

    it('should not track actions when trackActions is false', () => {
      const { result } = renderHook(
        () => useAIContext({ trackActions: false }),
        { wrapper }
      );

      // Navigation should not be tracked
      expect(result.current.context.recentActions).toHaveLength(0);
    });

    it('should update lastActivityAt on action', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      const before = result.current.context.lastActivityAt;

      vi.advanceTimersByTime(1000);

      act(() => {
        result.current.addAction('Something');
      });

      expect(result.current.context.lastActivityAt).not.toBe(before);
    });
  });

  describe('Selected element', () => {
    it('should set selected element', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.setSelectedElement({
          type: 'button',
          id: 'btn-1',
          properties: { label: 'Submit' },
        });
      });

      expect(result.current.context.selectedElement).toEqual({
        type: 'button',
        id: 'btn-1',
        properties: { label: 'Submit' },
      });
    });

    it('should track selection as action', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.setSelectedElement({ type: 'image', id: 'img-1' });
      });

      expect(result.current.context.recentActions).toContain('Selected image element');
    });

    it('should clear selected element', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.setSelectedElement({ type: 'div', id: 'd-1' });
      });

      act(() => {
        result.current.setSelectedElement(undefined);
      });

      expect(result.current.context.selectedElement).toBeUndefined();
    });
  });

  describe('Active entity', () => {
    it('should set active entity', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.setActiveEntity({
          type: 'document',
          id: 'doc-1',
          name: 'Design Brief',
        });
      });

      expect(result.current.context.activeEntity).toEqual({
        type: 'document',
        id: 'doc-1',
        name: 'Design Brief',
      });
    });

    it('should track entity opening as action', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.setActiveEntity({ type: 'board', id: 'b-1', name: 'Moodboard' });
      });

      expect(result.current.context.recentActions).toContain('Opened board: Moodboard');
    });
  });

  describe('Viewport tracking', () => {
    it('should detect desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1440 });
      Object.defineProperty(window, 'innerHeight', { value: 900 });

      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.isMobile).toBe(false);
      expect(result.current.context.viewportSize.width).toBe(1440);
      expect(result.current.context.viewportSize.height).toBe(900);
    });

    it('should detect mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      const { result } = renderHook(() => useAIContext(), { wrapper });

      expect(result.current.context.isMobile).toBe(true);
    });
  });

  describe('Session duration', () => {
    it('should update session duration periodically', () => {
      const { result } = renderHook(
        () => useAIContext({ updateInterval: 1000 }),
        { wrapper }
      );

      expect(result.current.context.sessionDuration).toBe(0);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.context.sessionDuration).toBeGreaterThan(0);
    });
  });

  describe('Context summary', () => {
    it('should generate a text summary of context', () => {
      mockLocation.pathname = '/projects';
      mockParams.projectId = 'proj-1';

      const { result } = renderHook(() => useAIContext(), { wrapper });

      const summary = result.current.getContextSummary();

      expect(summary).toContain('Projects page');
      expect(summary).toContain('Test Project');
      expect(summary).toContain('desktop');
    });

    it('should include active entity in summary', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.setActiveEntity({ type: 'canvas', id: 'c-1', name: 'Main Canvas' });
      });

      const summary = result.current.getContextSummary();
      expect(summary).toContain('canvas');
      expect(summary).toContain('Main Canvas');
    });

    it('should include selected element in summary', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.setSelectedElement({ type: 'layer', id: 'l-1' });
      });

      const summary = result.current.getContextSummary();
      expect(summary).toContain('layer');
    });

    it('should include recent actions in summary', () => {
      const { result } = renderHook(() => useAIContext(), { wrapper });

      act(() => {
        result.current.addAction('Edited text layer');
      });

      const summary = result.current.getContextSummary();
      expect(summary).toContain('Edited text layer');
    });
  });
});
