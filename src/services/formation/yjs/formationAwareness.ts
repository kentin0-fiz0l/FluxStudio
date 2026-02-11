/**
 * Formation Awareness Utilities
 *
 * Helper functions for managing user presence and awareness state
 * in real-time formation collaboration.
 */

import type { FormationAwarenessState } from './formationYjsTypes';

// ============================================================================
// Types
// ============================================================================

export interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface PresenceInfo {
  userId: string;
  userName: string;
  userColor: string;
  userAvatar?: string;
  isActive: boolean;
  lastActivity: number;
  cursor?: CursorPosition;
  selectedPerformerIds?: string[];
  draggingPerformerId?: string;
  activeKeyframeId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** How long until a user is considered idle (30 seconds) */
export const IDLE_THRESHOLD_MS = 30000;

/** How long until a cursor is considered stale (5 seconds) */
export const CURSOR_STALE_THRESHOLD_MS = 5000;

/** How often to update activity timestamp (10 seconds) */
export const ACTIVITY_UPDATE_INTERVAL_MS = 10000;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a user is idle based on their last activity timestamp
 */
export function isUserIdle(lastActivity: number, threshold = IDLE_THRESHOLD_MS): boolean {
  return Date.now() - lastActivity > threshold;
}

/**
 * Check if a cursor position is stale
 */
export function isCursorStale(cursorTimestamp: number, threshold = CURSOR_STALE_THRESHOLD_MS): boolean {
  return Date.now() - cursorTimestamp > threshold;
}

/**
 * Convert awareness state to presence info
 */
export function awarenessToPresence(state: FormationAwarenessState): PresenceInfo {
  return {
    userId: state.user.id,
    userName: state.user.name,
    userColor: state.user.color,
    userAvatar: state.user.avatar,
    isActive: state.isActive,
    lastActivity: state.lastActivity,
    cursor: state.cursor,
    selectedPerformerIds: state.selectedPerformerIds,
    draggingPerformerId: state.draggingPerformerId,
    activeKeyframeId: state.activeKeyframeId,
  };
}

/**
 * Filter and sort collaborators by activity
 */
export function getActiveCollaborators(
  collaborators: FormationAwarenessState[],
  excludeUserId?: string
): FormationAwarenessState[] {
  return collaborators
    .filter((c) => {
      // Exclude specified user
      if (excludeUserId && c.user.id === excludeUserId) return false;
      // Only include active users
      return c.isActive;
    })
    .sort((a, b) => {
      // Sort by activity (most recent first)
      return b.lastActivity - a.lastActivity;
    });
}

/**
 * Get collaborators who have a specific performer selected
 */
export function getCollaboratorsWithPerformerSelected(
  collaborators: FormationAwarenessState[],
  performerId: string,
  excludeUserId?: string
): FormationAwarenessState[] {
  return collaborators.filter((c) => {
    if (excludeUserId && c.user.id === excludeUserId) return false;
    return c.selectedPerformerIds?.includes(performerId) ?? false;
  });
}

/**
 * Get the collaborator who is dragging a specific performer (if any)
 */
export function getCollaboratorDraggingPerformer(
  collaborators: FormationAwarenessState[],
  performerId: string,
  excludeUserId?: string
): FormationAwarenessState | undefined {
  return collaborators.find((c) => {
    if (excludeUserId && c.user.id === excludeUserId) return false;
    return c.draggingPerformerId === performerId;
  });
}

/**
 * Check if any collaborator is dragging a specific performer
 */
export function isPerformerBeingDraggedByOther(
  collaborators: FormationAwarenessState[],
  performerId: string,
  currentUserId: string
): boolean {
  return collaborators.some((c) => {
    if (c.user.id === currentUserId) return false;
    return c.draggingPerformerId === performerId;
  });
}

/**
 * Get collaborators editing a specific keyframe
 */
export function getCollaboratorsOnKeyframe(
  collaborators: FormationAwarenessState[],
  keyframeId: string,
  excludeUserId?: string
): FormationAwarenessState[] {
  return collaborators.filter((c) => {
    if (excludeUserId && c.user.id === excludeUserId) return false;
    return c.activeKeyframeId === keyframeId;
  });
}

/**
 * Create a summary of collaboration activity
 */
export function getCollaborationSummary(collaborators: FormationAwarenessState[]): {
  total: number;
  active: number;
  idle: number;
  dragging: number;
  withCursor: number;
} {
  let active = 0;
  let idle = 0;
  let dragging = 0;
  let withCursor = 0;

  collaborators.forEach((c) => {
    if (isUserIdle(c.lastActivity)) {
      idle++;
    } else {
      active++;
    }

    if (c.draggingPerformerId) {
      dragging++;
    }

    if (c.cursor && !isCursorStale(c.cursor.timestamp)) {
      withCursor++;
    }
  });

  return {
    total: collaborators.length,
    active,
    idle,
    dragging,
    withCursor,
  };
}

/**
 * Format a relative time string for last activity
 */
export function formatLastActivity(lastActivity: number): string {
  const diff = Date.now() - lastActivity;

  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Debounce helper for high-frequency updates (like cursor position)
 */
export function createDebouncedUpdater<T>(
  updateFn: (value: T) => void,
  delay: number
): {
  update: (value: T) => void;
  flush: () => void;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: T | null = null;

  const flush = () => {
    if (pendingValue !== null) {
      updateFn(pendingValue);
      pendingValue = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingValue = null;
  };

  const update = (value: T) => {
    pendingValue = value;

    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        flush();
      }, delay);
    }
  };

  return { update, flush, cancel };
}

/**
 * Throttle helper for rate-limited updates
 */
export function createThrottledUpdater<T>(
  updateFn: (value: T) => void,
  interval: number
): {
  update: (value: T) => void;
  cancel: () => void;
} {
  let lastUpdate = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: T | null = null;

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingValue = null;
  };

  const update = (value: T) => {
    const now = Date.now();

    if (now - lastUpdate >= interval) {
      // Enough time has passed, update immediately
      updateFn(value);
      lastUpdate = now;
      pendingValue = null;

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else {
      // Store pending value and schedule update
      pendingValue = value;

      if (!timeoutId) {
        const delay = interval - (now - lastUpdate);
        timeoutId = setTimeout(() => {
          if (pendingValue !== null) {
            updateFn(pendingValue);
            lastUpdate = Date.now();
            pendingValue = null;
          }
          timeoutId = null;
        }, delay);
      }
    }
  };

  return { update, cancel };
}
