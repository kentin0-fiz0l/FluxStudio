/**
 * useMomentumStallNotification Hook
 *
 * Detects and triggers momentum stall notifications when a project
 * appears to be stuck. Runs on page mount and visibility change.
 *
 * Usage:
 * ```tsx
 * useMomentumStallNotification(projectId, {
 *   projectName: project?.name,
 *   recentMessages,
 *   projectAssets,
 *   metmapSessions: songs,
 *   snapshot,
 *   nextStepStates,
 * });
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import {
  MOMENTUM_STALL_NOTIFS_ENABLED,
  getLastProjectActivityAt,
  shouldTriggerMomentumStall,
  buildStallNotificationContent,
  setLastStallNotifiedAt,
} from '../utils/momentumStall';

// ============================================================================
// Types
// ============================================================================

interface RecentMessage {
  id: string;
  createdAt: string;
  [key: string]: unknown;
}

interface ProjectAsset {
  id: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface MetMapSession {
  id: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface Snapshot {
  openQuestions?: Array<{ text: string; [key: string]: unknown }>;
  aiEnabled?: boolean;
  [key: string]: unknown;
}

type NextStepStatus = 'suggested' | 'accepted' | 'completed';

interface UseMomentumStallOptions {
  /** Project name for notification display */
  projectName?: string;
  /** Recent messages with createdAt timestamps */
  recentMessages?: RecentMessage[];
  /** Project assets with createdAt/updatedAt timestamps */
  projectAssets?: ProjectAsset[];
  /** MetMap sessions with createdAt/updatedAt timestamps */
  metmapSessions?: MetMapSession[];
  /** AI snapshot with open questions */
  snapshot?: Snapshot | null;
  /** Next step states from localStorage */
  nextStepStates?: Record<string, NextStepStatus>;
  /** Whether data is still loading */
  isLoading?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract activity timestamps from available data
 */
function extractActivityTimestamps(options: UseMomentumStallOptions): ActivityTimestamps {
  const { recentMessages, projectAssets, metmapSessions } = options;

  // Get latest message timestamp
  let latestMessage: string | null = null;
  if (recentMessages && recentMessages.length > 0) {
    // Messages are usually sorted newest first, but let's be safe
    const sorted = [...recentMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    latestMessage = sorted[0]?.createdAt || null;
  }

  // Get latest asset timestamp (use updatedAt if available, otherwise createdAt)
  let latestAsset: string | null = null;
  if (projectAssets && projectAssets.length > 0) {
    const timestamps = projectAssets.map(a => a.updatedAt || a.createdAt);
    const sorted = timestamps
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    latestAsset = sorted[0] || null;
  }

  // Get latest MetMap session timestamp
  let latestMetMap: string | null = null;
  if (metmapSessions && metmapSessions.length > 0) {
    const timestamps = metmapSessions.map(s => s.updatedAt || s.createdAt);
    const sorted = timestamps
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    latestMetMap = sorted[0] || null;
  }

  return {
    latestMessage,
    latestAsset,
    latestMetMap,
  };
}

/**
 * Extract outstanding work signals from options
 */
function extractOutstandingSignals(options: UseMomentumStallOptions): OutstandingWork {
  const { snapshot, nextStepStates } = options;

  // Count accepted steps
  const acceptedStepsCount = nextStepStates
    ? Object.values(nextStepStates).filter(status => status === 'accepted').length
    : 0;

  // Count open questions (only if AI is enabled and snapshot exists)
  const openQuestionsCount =
    snapshot?.aiEnabled !== false && snapshot?.openQuestions
      ? snapshot.openQuestions.length
      : 0;

  return {
    acceptedStepsCount,
    openQuestionsCount,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to detect and trigger momentum stall notifications
 *
 * @param projectId - The project ID to check
 * @param options - Data sources for stall detection
 */
export function useMomentumStallNotification(
  projectId: string | undefined,
  options: UseMomentumStallOptions = {}
): void {
  const { showNotification } = useNotifications();
  const hasCheckedRef = useRef(false);
  const lastCheckTimeRef = useRef<number>(0);

  // Debounce check to avoid rapid re-checks
  const DEBOUNCE_MS = 5000; // 5 seconds between checks

  const checkAndNotify = useCallback(() => {
    // Skip if feature is disabled
    if (!MOMENTUM_STALL_NOTIFS_ENABLED) {
      return;
    }

    // Skip if no project ID
    if (!projectId) {
      return;
    }

    // Skip if still loading
    if (options.isLoading) {
      return;
    }

    // Debounce
    const now = Date.now();
    if (now - lastCheckTimeRef.current < DEBOUNCE_MS) {
      return;
    }
    lastCheckTimeRef.current = now;

    // Extract timestamps and outstanding work
    const timestamps = extractActivityTimestamps(options);
    const lastActivityAt = getLastProjectActivityAt(timestamps);
    const outstanding = extractOutstandingSignals(options);

    // Check if we should trigger a notification
    const result = shouldTriggerMomentumStall({
      projectId,
      lastActivityAt,
      outstanding,
    });

    // If we should notify, show the notification
    if (result.shouldNotify && result.hoursSinceActivity !== null) {
      const content = buildStallNotificationContent({
        projectId,
        projectName: options.projectName || 'This project',
        hoursSinceActivity: result.hoursSinceActivity,
        outstanding,
      });

      // Show the notification
      showNotification({
        type: 'info',
        title: content.title,
        message: content.body,
        data: {
          projectId,
          projectName: options.projectName,
          acceptedStepsCount: content.acceptedStepsCount,
          openQuestionsCount: content.openQuestionsCount,
          action: 'momentum_stall',
          // Primary CTA data
          primaryAction: {
            label: 'Open Project Overview',
            url: `/projects/${projectId}/overview`,
          },
          // Secondary CTA if there are accepted steps
          secondaryAction: content.acceptedStepsCount > 0 ? {
            label: 'Review Next Steps',
            url: `/projects/${projectId}/overview#next-steps`,
          } : undefined,
        },
        projectId,
        projectName: options.projectName,
      });

      // Record that we notified
      setLastStallNotifiedAt(projectId, new Date().toISOString());
    }
  }, [projectId, options, showNotification]);

  // Check on mount and when data changes
  useEffect(() => {
    // Skip initial check until data is loaded
    if (options.isLoading) {
      return;
    }

    // Perform check
    checkAndNotify();

    // Mark as checked
    hasCheckedRef.current = true;
  }, [checkAndNotify, options.isLoading]);

  // Check on visibility change (when tab becomes visible)
  useEffect(() => {
    if (!projectId) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasCheckedRef.current) {
        // Re-check when tab becomes visible (debounced)
        checkAndNotify();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [projectId, checkAndNotify]);
}

export default useMomentumStallNotification;
