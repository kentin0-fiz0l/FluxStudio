/**
 * Unit Tests for useOnboardingState Hook
 * @file src/hooks/__tests__/useOnboardingState.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', email: 'test@example.com' },
  })),
}));

import { useOnboardingState } from '../useOnboardingState';

describe('useOnboardingState', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return default onboarding state', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.state.hasCompletedWelcome).toBe(false);
      expect(result.current.state.hasCompletedOnboarding).toBe(false);
      expect(result.current.state.steps).toHaveLength(5);
      expect(result.current.state.totalSteps).toBe(5);
    });

    it('should load state from localStorage', async () => {
      localStorage.setItem(
        'fluxstudio_onboarding_state',
        JSON.stringify({
          hasCompletedWelcome: true,
          currentStep: 1,
        })
      );

      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.state.hasCompletedWelcome).toBe(true);
    });
  });

  describe('shouldShowWelcome', () => {
    it('should show welcome for new users', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWelcome()).toBe(true);
    });

    it('should not show welcome after completion', async () => {
      localStorage.setItem('welcome_flow_completed', 'true');

      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWelcome()).toBe(false);
    });
  });

  describe('shouldShowOnboarding', () => {
    it('should not show onboarding before welcome', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowOnboarding()).toBe(false);
    });

    it('should show onboarding after welcome', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeWelcome();
      });

      expect(result.current.shouldShowOnboarding()).toBe(true);
    });
  });

  describe('completeStep', () => {
    it('should mark a step as complete', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('welcome');
      });

      const welcomeStep = result.current.state.steps.find(s => s.id === 'welcome');
      expect(welcomeStep?.completed).toBe(true);
      expect(welcomeStep?.completedAt).toBeDefined();
    });

    it('should advance currentStep', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('welcome');
      });

      expect(result.current.state.currentStep).toBeGreaterThan(0);
    });
  });

  describe('getCompletionPercentage', () => {
    it('should return 0 for no completed steps', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getCompletionPercentage()).toBe(0);
    });

    it('should calculate percentage correctly', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeStep('welcome');
      });

      expect(result.current.getCompletionPercentage()).toBe(20); // 1/5 = 20%
    });
  });

  describe('completeOnboarding', () => {
    it('should mark all steps complete', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeOnboarding();
      });

      expect(result.current.state.hasCompletedOnboarding).toBe(true);
      expect(result.current.state.steps.every(s => s.completed)).toBe(true);
    });
  });

  describe('markProjectCreated', () => {
    it('should set hasCreatedFirstProject and complete step', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.markProjectCreated();
      });

      expect(result.current.state.hasCreatedFirstProject).toBe(true);
      const step = result.current.state.steps.find(s => s.id === 'create-project');
      expect(step?.completed).toBe(true);
    });
  });

  describe('resetOnboarding', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.completeOnboarding();
      });
      expect(result.current.state.hasCompletedOnboarding).toBe(true);

      act(() => {
        result.current.resetOnboarding();
      });

      expect(result.current.state.hasCompletedOnboarding).toBe(false);
      expect(result.current.state.hasCompletedWelcome).toBe(false);
      expect(result.current.state.currentStep).toBe(0);
    });
  });

  describe('skipOnboarding', () => {
    it('should complete onboarding and set welcome flag', async () => {
      const { result } = renderHook(() => useOnboardingState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.skipOnboarding();
      });

      expect(result.current.state.hasCompletedOnboarding).toBe(true);
      expect(localStorage.getItem('welcome_flow_completed')).toBe('true');
    });
  });
});
