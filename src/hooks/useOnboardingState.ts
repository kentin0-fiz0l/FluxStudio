/**
 * useOnboardingState - Track user onboarding progress
 *
 * Manages onboarding state across the application:
 * - Tracks completion of onboarding steps
 * - Determines if user should see welcome flow
 * - Persists state in localStorage and syncs with backend
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/slices/authSlice';
import { eventTracker } from '@/services/analytics/eventTracking';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface OnboardingState {
  hasCompletedWelcome: boolean;
  hasCompletedOnboarding: boolean;
  hasCreatedFirstProject: boolean;
  hasInvitedTeamMember: boolean;
  hasUploadedFile: boolean;
  hasSentMessage: boolean;
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  lastUpdated: string | null;
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FluxStudio',
    description: 'Complete the welcome flow',
    completed: false,
  },
  {
    id: 'create-project',
    title: 'Create Your First Project',
    description: 'Set up your first project to get started',
    completed: false,
  },
  {
    id: 'explore-dashboard',
    title: 'Explore the Dashboard',
    description: 'Familiarize yourself with the interface',
    completed: false,
  },
  {
    id: 'invite-team',
    title: 'Invite Team Members',
    description: 'Collaborate with your team',
    completed: false,
  },
  {
    id: 'upload-file',
    title: 'Upload Your First File',
    description: 'Add files to your project',
    completed: false,
  },
];

const STORAGE_KEY = 'fluxstudio_onboarding_state';

function getStoredState(): Partial<OnboardingState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveState(state: Partial<OnboardingState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      lastUpdated: new Date().toISOString(),
    }));
  } catch {
    // Ignore storage errors
  }
}

export interface UseOnboardingStateReturn {
  state: OnboardingState;
  isLoading: boolean;

  // Check methods
  shouldShowWelcome: () => boolean;
  shouldShowOnboarding: () => boolean;
  getCompletionPercentage: () => number;

  // Update methods
  completeStep: (stepId: string) => void;
  completeWelcome: () => void;
  completeOnboarding: () => void;
  markProjectCreated: () => void;
  markTeamMemberInvited: () => void;
  markFileUploaded: () => void;
  markMessageSent: () => void;
  resetOnboarding: () => void;
  skipOnboarding: () => void;
}

export function useOnboardingState(): UseOnboardingStateReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<OnboardingState>(() => {
    const stored = getStoredState();
    return {
      hasCompletedWelcome: stored?.hasCompletedWelcome ?? false,
      hasCompletedOnboarding: stored?.hasCompletedOnboarding ?? false,
      hasCreatedFirstProject: stored?.hasCreatedFirstProject ?? false,
      hasInvitedTeamMember: stored?.hasInvitedTeamMember ?? false,
      hasUploadedFile: stored?.hasUploadedFile ?? false,
      hasSentMessage: stored?.hasSentMessage ?? false,
      currentStep: stored?.currentStep ?? 0,
      totalSteps: DEFAULT_STEPS.length,
      steps: stored?.steps ?? DEFAULT_STEPS,
      lastUpdated: stored?.lastUpdated ?? null,
    };
  });

  // Sync state with backend on mount and user change
  useEffect(() => {
    const syncState = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to fetch from backend
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/users/onboarding', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.onboarding) {
            const backendState = data.onboarding;
            setState((prev) => ({
              ...prev,
              ...backendState,
              steps: backendState.steps || prev.steps,
            }));
            saveState(backendState);
          }
        }
      } catch {
        // Use local state on error
      } finally {
        setIsLoading(false);
      }
    };

    syncState();
  }, [user]);

  // Save state changes
  useEffect(() => {
    if (!isLoading) {
      saveState(state);
    }
  }, [state, isLoading]);

  // Calculate current step based on completed steps
  const calculateCurrentStep = useCallback((steps: OnboardingStep[]): number => {
    const firstIncomplete = steps.findIndex((s) => !s.completed);
    return firstIncomplete === -1 ? steps.length : firstIncomplete;
  }, []);

  // Check if welcome flow should be shown
  const shouldShowWelcome = useCallback((): boolean => {
    // Check localStorage flag first (set by WelcomeFlow)
    const welcomeCompleted = localStorage.getItem('welcome_flow_completed');
    if (welcomeCompleted === 'true') {
      return false;
    }

    // Then check state
    return !state.hasCompletedWelcome;
  }, [state.hasCompletedWelcome]);

  // Check if onboarding should be shown
  const shouldShowOnboarding = useCallback((): boolean => {
    // Must have completed welcome first
    if (!state.hasCompletedWelcome) {
      return false;
    }
    return !state.hasCompletedOnboarding;
  }, [state.hasCompletedWelcome, state.hasCompletedOnboarding]);

  // Get completion percentage
  const getCompletionPercentage = useCallback((): number => {
    const completedSteps = state.steps.filter((s) => s.completed).length;
    return Math.round((completedSteps / state.totalSteps) * 100);
  }, [state.steps, state.totalSteps]);

  // Complete a specific step
  const completeStep = useCallback((stepId: string) => {
    setState((prev) => {
      const updatedSteps = prev.steps.map((step) =>
        step.id === stepId
          ? { ...step, completed: true, completedAt: new Date().toISOString() }
          : step
      );

      const currentStep = calculateCurrentStep(updatedSteps);
      const hasCompletedOnboarding = updatedSteps.every((s) => s.completed);

      // Sprint 44: Track onboarding step completion
      eventTracker.trackEvent('onboarding_wizard_step', { stepId, stepIndex: currentStep });

      return {
        ...prev,
        steps: updatedSteps,
        currentStep,
        hasCompletedOnboarding,
      };
    });
  }, [calculateCurrentStep]);

  // Complete welcome flow
  const completeWelcome = useCallback(() => {
    localStorage.setItem('welcome_flow_completed', 'true');
    setState((prev) => ({
      ...prev,
      hasCompletedWelcome: true,
      steps: prev.steps.map((s) =>
        s.id === 'welcome'
          ? { ...s, completed: true, completedAt: new Date().toISOString() }
          : s
      ),
    }));
    completeStep('welcome');
  }, [completeStep]);

  // Complete entire onboarding
  const completeOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
      steps: prev.steps.map((s) => ({
        ...s,
        completed: true,
        completedAt: s.completedAt || new Date().toISOString(),
      })),
      currentStep: prev.totalSteps,
    }));
  }, []);

  // Mark project created
  const markProjectCreated = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasCreatedFirstProject: true,
    }));
    completeStep('create-project');
  }, [completeStep]);

  // Mark team member invited
  const markTeamMemberInvited = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasInvitedTeamMember: true,
    }));
    completeStep('invite-team');
  }, [completeStep]);

  // Mark file uploaded
  const markFileUploaded = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasUploadedFile: true,
    }));
    completeStep('upload-file');
  }, [completeStep]);

  // Mark message sent
  const markMessageSent = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasSentMessage: true,
    }));
  }, []);

  // Reset onboarding
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('welcome_flow_completed');
    setState({
      hasCompletedWelcome: false,
      hasCompletedOnboarding: false,
      hasCreatedFirstProject: false,
      hasInvitedTeamMember: false,
      hasUploadedFile: false,
      hasSentMessage: false,
      currentStep: 0,
      totalSteps: DEFAULT_STEPS.length,
      steps: DEFAULT_STEPS,
      lastUpdated: null,
    });
  }, []);

  // Skip onboarding
  const skipOnboarding = useCallback(() => {
    localStorage.setItem('welcome_flow_completed', 'true');
    // Sprint 44: Track onboarding skip (drop-off)
    eventTracker.trackEvent('onboarding_wizard_skipped', { atStep: state.currentStep });
    completeOnboarding();
  }, [completeOnboarding, state.currentStep]);

  return {
    state,
    isLoading,
    shouldShowWelcome,
    shouldShowOnboarding,
    getCompletionPercentage,
    completeStep,
    completeWelcome,
    completeOnboarding,
    markProjectCreated,
    markTeamMemberInvited,
    markFileUploaded,
    markMessageSent,
    resetOnboarding,
    skipOnboarding,
  };
}

export default useOnboardingState;
