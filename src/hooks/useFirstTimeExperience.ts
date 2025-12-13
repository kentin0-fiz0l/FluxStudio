/**
 * First-Time Experience Hook
 *
 * Detects if user is new (no projects, conversations, or files) and manages
 * onboarding state with localStorage persistence.
 *
 * Creative Studio tone: warm, clear, non-corporate copy.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// localStorage keys
const STORAGE_KEYS = {
  dismissed: 'fx_onboarding_dismissed_v1',
  completed: 'fx_onboarding_completed_v1',
  stepPrefix: 'fx_onboarding_step_',
  metmapVisited: 'fx_metmap_visited_v1',
} as const;

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  isComplete: boolean;
}

export interface FirstTimeExperienceData {
  projectCount: number;
  conversationCount: number;
  fileCount: number;
}

export interface UseFirstTimeExperienceReturn {
  /** True if user has no data and hasn't dismissed onboarding */
  isFirstTime: boolean;
  /** True if user explicitly dismissed the onboarding */
  isDismissed: boolean;
  /** True if all steps are complete */
  isCompleted: boolean;
  /** Dismiss the onboarding card */
  dismiss: () => void;
  /** Array of onboarding steps with completion status */
  steps: OnboardingStep[];
  /** Mark a specific step as complete */
  markStepComplete: (stepId: string) => void;
  /** Mark all steps as complete */
  completeAll: () => void;
  /** Number of completed steps */
  completedCount: number;
  /** Total number of steps */
  totalSteps: number;
  /** Update data counts (call when data changes) */
  updateData: (data: Partial<FirstTimeExperienceData>) => void;
}

// Step definitions with Creative Studio tone
const STEP_DEFINITIONS = [
  {
    id: 'project',
    title: 'Create a Project',
    description: 'Everything lives in projects — conversations, files, tools, and boards.',
    ctaLabel: 'Create Project',
    ctaHref: '/projects',
  },
  {
    id: 'message',
    title: 'Start a Conversation',
    description: 'Brainstorm, give feedback, and plan next steps — right where the work is.',
    ctaLabel: 'New Conversation',
    ctaHref: '/messages',
  },
  {
    id: 'file',
    title: 'Add Files',
    description: 'Upload references, drafts, audio, or exports to keep context close.',
    ctaLabel: 'Upload File',
    ctaHref: '/files',
  },
  {
    id: 'metmap',
    title: 'Open MetMap',
    description: 'Rehearse tempo + meter changes and map chord progressions.',
    ctaLabel: 'Open MetMap',
    ctaHref: '/tools/metmap',
  },
] as const;

// Helper to safely access localStorage
function getStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage not available (e.g., SSR or private browsing)
  }
}

function getStepStorageKey(stepId: string): string {
  return `${STORAGE_KEYS.stepPrefix}${stepId}_v1`;
}

export function useFirstTimeExperience(
  initialData?: Partial<FirstTimeExperienceData>
): UseFirstTimeExperienceReturn {
  // Data counts
  const [data, setData] = useState<FirstTimeExperienceData>({
    projectCount: initialData?.projectCount ?? -1, // -1 = not loaded
    conversationCount: initialData?.conversationCount ?? -1,
    fileCount: initialData?.fileCount ?? -1,
  });

  // Dismiss and completion state
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return getStorageItem(STORAGE_KEYS.dismissed) === 'true';
  });

  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    return getStorageItem(STORAGE_KEYS.completed) === 'true';
  });

  // Step completion state (from localStorage)
  const [stepCompletions, setStepCompletions] = useState<Record<string, boolean>>(() => {
    const completions: Record<string, boolean> = {};
    STEP_DEFINITIONS.forEach((step) => {
      completions[step.id] = getStorageItem(getStepStorageKey(step.id)) === 'true';
    });
    // Also check MetMap visited
    if (getStorageItem(STORAGE_KEYS.metmapVisited) === 'true') {
      completions['metmap'] = true;
    }
    return completions;
  });

  // Update data counts
  const updateData = useCallback((newData: Partial<FirstTimeExperienceData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  // Compute step completion based on data + manual completions
  const steps = useMemo<OnboardingStep[]>(() => {
    return STEP_DEFINITIONS.map((step) => {
      let isComplete = stepCompletions[step.id] || false;

      // Auto-complete based on data
      switch (step.id) {
        case 'project':
          if (data.projectCount > 0) isComplete = true;
          break;
        case 'message':
          if (data.conversationCount > 0) isComplete = true;
          break;
        case 'file':
          if (data.fileCount > 0) isComplete = true;
          break;
        case 'metmap':
          // MetMap uses manual/visit-based completion
          break;
      }

      return {
        ...step,
        isComplete,
      };
    });
  }, [data, stepCompletions]);

  // Count completed steps
  const completedCount = useMemo(() => {
    return steps.filter((s) => s.isComplete).length;
  }, [steps]);

  const totalSteps = STEP_DEFINITIONS.length;

  // Determine if first-time user
  const isFirstTime = useMemo(() => {
    // If already dismissed or completed, not first-time
    if (isDismissed || isCompleted) return false;

    // If data not loaded yet, don't show onboarding (avoid flash)
    if (data.projectCount === -1 && data.conversationCount === -1 && data.fileCount === -1) {
      return false;
    }

    // If user has any data, not first-time
    const hasProjects = data.projectCount > 0;
    const hasConversations = data.conversationCount > 0;
    const hasFiles = data.fileCount > 0;

    // First-time if all available data sources show zero
    // Only check data that's been loaded (not -1)
    const checkedSources: boolean[] = [];
    if (data.projectCount !== -1) checkedSources.push(hasProjects);
    if (data.conversationCount !== -1) checkedSources.push(hasConversations);
    if (data.fileCount !== -1) checkedSources.push(hasFiles);

    // If no sources loaded, not first-time (fallback)
    if (checkedSources.length === 0) return false;

    // First-time if ALL checked sources are empty
    return checkedSources.every((hasData) => !hasData);
  }, [data, isDismissed, isCompleted]);

  // Mark step complete
  const markStepComplete = useCallback((stepId: string) => {
    setStepCompletions((prev) => {
      const updated = { ...prev, [stepId]: true };
      setStorageItem(getStepStorageKey(stepId), 'true');

      // Special handling for metmap
      if (stepId === 'metmap') {
        setStorageItem(STORAGE_KEYS.metmapVisited, 'true');
      }

      return updated;
    });
  }, []);

  // Dismiss onboarding
  const dismiss = useCallback(() => {
    setIsDismissed(true);
    setStorageItem(STORAGE_KEYS.dismissed, 'true');
  }, []);

  // Complete all steps
  const completeAll = useCallback(() => {
    setIsCompleted(true);
    setStorageItem(STORAGE_KEYS.completed, 'true');

    // Also mark all steps complete
    STEP_DEFINITIONS.forEach((step) => {
      setStorageItem(getStepStorageKey(step.id), 'true');
    });

    setStepCompletions((prev) => {
      const updated = { ...prev };
      STEP_DEFINITIONS.forEach((step) => {
        updated[step.id] = true;
      });
      return updated;
    });
  }, []);

  // Auto-complete when all steps done
  useEffect(() => {
    if (completedCount === totalSteps && !isCompleted) {
      setIsCompleted(true);
      setStorageItem(STORAGE_KEYS.completed, 'true');
    }
  }, [completedCount, totalSteps, isCompleted]);

  return {
    isFirstTime,
    isDismissed,
    isCompleted,
    dismiss,
    steps,
    markStepComplete,
    completeAll,
    completedCount,
    totalSteps,
    updateData,
  };
}

// Export storage keys for external use (e.g., marking MetMap visited on page load)
export { STORAGE_KEYS as ONBOARDING_STORAGE_KEYS };
