/**
 * Unit Tests for useFirstTimeExperience Hook
 * @file src/hooks/__tests__/useFirstTimeExperience.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFirstTimeExperience } from '../useFirstTimeExperience';

describe('useFirstTimeExperience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should not show first-time before data loads', () => {
      const { result } = renderHook(() => useFirstTimeExperience());
      // Data counts default to -1 (not loaded)
      expect(result.current.isFirstTime).toBe(false);
    });

    it('should show first-time when user has no data', () => {
      const { result } = renderHook(() =>
        useFirstTimeExperience({ projectCount: 0, conversationCount: 0, fileCount: 0 })
      );
      expect(result.current.isFirstTime).toBe(true);
    });

    it('should not show first-time when user has projects', () => {
      const { result } = renderHook(() =>
        useFirstTimeExperience({ projectCount: 1, conversationCount: 0, fileCount: 0 })
      );
      expect(result.current.isFirstTime).toBe(false);
    });

    it('should not show first-time when dismissed', () => {
      localStorage.setItem('fx_onboarding_dismissed_v1', 'true');
      const { result } = renderHook(() =>
        useFirstTimeExperience({ projectCount: 0, conversationCount: 0, fileCount: 0 })
      );
      expect(result.current.isFirstTime).toBe(false);
    });

    it('should not show first-time when completed', () => {
      localStorage.setItem('fx_onboarding_completed_v1', 'true');
      const { result } = renderHook(() =>
        useFirstTimeExperience({ projectCount: 0, conversationCount: 0, fileCount: 0 })
      );
      expect(result.current.isFirstTime).toBe(false);
    });
  });

  describe('Steps', () => {
    it('should return 4 onboarding steps', () => {
      const { result } = renderHook(() => useFirstTimeExperience());
      expect(result.current.steps).toHaveLength(4);
      expect(result.current.totalSteps).toBe(4);
    });

    it('should auto-complete project step when user has projects', () => {
      const { result } = renderHook(() =>
        useFirstTimeExperience({ projectCount: 1 })
      );

      const projectStep = result.current.steps.find(s => s.id === 'project');
      expect(projectStep?.isComplete).toBe(true);
    });

    it('should auto-complete message step when user has conversations', () => {
      const { result } = renderHook(() =>
        useFirstTimeExperience({ conversationCount: 1 })
      );

      const messageStep = result.current.steps.find(s => s.id === 'message');
      expect(messageStep?.isComplete).toBe(true);
    });

    it('should auto-complete file step when user has files', () => {
      const { result } = renderHook(() =>
        useFirstTimeExperience({ fileCount: 1 })
      );

      const fileStep = result.current.steps.find(s => s.id === 'file');
      expect(fileStep?.isComplete).toBe(true);
    });
  });

  describe('Mark Step Complete', () => {
    it('should mark a step complete and persist', () => {
      const { result } = renderHook(() => useFirstTimeExperience());

      act(() => {
        result.current.markStepComplete('metmap');
      });

      const metmapStep = result.current.steps.find(s => s.id === 'metmap');
      expect(metmapStep?.isComplete).toBe(true);
      expect(localStorage.getItem('fx_onboarding_step_metmap_v1')).toBe('true');
    });

    it('should increment completedCount', () => {
      const { result } = renderHook(() => useFirstTimeExperience());

      const initialCount = result.current.completedCount;

      act(() => {
        result.current.markStepComplete('metmap');
      });

      expect(result.current.completedCount).toBe(initialCount + 1);
    });
  });

  describe('Dismiss', () => {
    it('should dismiss onboarding', () => {
      const { result } = renderHook(() =>
        useFirstTimeExperience({ projectCount: 0, conversationCount: 0, fileCount: 0 })
      );

      expect(result.current.isFirstTime).toBe(true);

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.isDismissed).toBe(true);
      expect(result.current.isFirstTime).toBe(false);
      expect(localStorage.getItem('fx_onboarding_dismissed_v1')).toBe('true');
    });
  });

  describe('Complete All', () => {
    it('should complete all steps', () => {
      const { result } = renderHook(() => useFirstTimeExperience());

      act(() => {
        result.current.completeAll();
      });

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.completedCount).toBe(4);
      expect(result.current.steps.every(s => s.isComplete)).toBe(true);
    });
  });

  describe('Update Data', () => {
    it('should update data counts dynamically', () => {
      const { result } = renderHook(() =>
        useFirstTimeExperience({ projectCount: 0, conversationCount: 0, fileCount: 0 })
      );

      expect(result.current.isFirstTime).toBe(true);

      act(() => {
        result.current.updateData({ projectCount: 1 });
      });

      // No longer first-time since user now has a project
      expect(result.current.isFirstTime).toBe(false);
    });
  });
});
