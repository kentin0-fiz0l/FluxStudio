/**
 * Momentum Stall Detection Utility
 *
 * Detects when a project appears to be stuck based on:
 * - No meaningful activity for a configurable window (default 72 hours)
 * - Outstanding work exists (accepted next steps or open questions)
 *
 * This is a client-side utility that uses existing data to create
 * "helpful nudges" rather than constant pings.
 */

// ============================================================================
// Configuration
// ============================================================================

/** Feature flag - set to false to disable momentum stall notifications */
export const MOMENTUM_STALL_NOTIFS_ENABLED = true;

/** Hours of inactivity before considering a project stalled (default: 72 = 3 days) */
export const STALL_WINDOW_HOURS = 72;

/** Hours between stall notifications for the same project (default: 24 = 1 day) */
export const COOLDOWN_HOURS = 24;

// ============================================================================
// Types
// ============================================================================

export interface ActivityTimestamps {
  /** Latest message timestamp (ISO string or null) */
  latestMessage?: string | null;
  /** Latest asset upload/update timestamp (ISO string or null) */
  latestAsset?: string | null;
  /** Latest MetMap session update timestamp (ISO string or null) */
  latestMetMap?: string | null;
}

export interface OutstandingWork {
  /** Number of accepted (but not completed) next steps */
  acceptedStepsCount: number;
  /** Number of open questions from AI summaries */
  openQuestionsCount: number;
}

export interface StallCheckResult {
  /** Whether a momentum stall was detected */
  isStalled: boolean;
  /** Last activity timestamp (ISO string) */
  lastActivityAt: string | null;
  /** Hours since last activity */
  hoursSinceActivity: number | null;
  /** Outstanding work details */
  outstanding: OutstandingWork;
  /** Whether notification is on cooldown */
  onCooldown: boolean;
  /** Should we trigger a notification? */
  shouldNotify: boolean;
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

/**
 * Get the localStorage key for last stall notification timestamp
 */
function getStallNotifiedKey(projectId: string): string {
  return `fluxstudio_stall_notified_${projectId}`;
}

/**
 * Get the last time a stall notification was shown for this project
 */
export function getLastStallNotifiedAt(projectId: string): string | null {
  try {
    return localStorage.getItem(getStallNotifiedKey(projectId));
  } catch {
    return null;
  }
}

/**
 * Record that a stall notification was shown for this project
 */
export function setLastStallNotifiedAt(projectId: string, isoString: string): void {
  try {
    localStorage.setItem(getStallNotifiedKey(projectId), isoString);
  } catch {
    // localStorage not available
  }
}

/**
 * Clear the stall notification record (useful for testing or when activity resumes)
 */
export function clearLastStallNotifiedAt(projectId: string): void {
  try {
    localStorage.removeItem(getStallNotifiedKey(projectId));
  } catch {
    // localStorage not available
  }
}

// ============================================================================
// Activity Detection
// ============================================================================

/**
 * Get the most recent activity timestamp from available data
 */
export function getLastProjectActivityAt(timestamps: ActivityTimestamps): string | null {
  const validTimestamps: Date[] = [];

  if (timestamps.latestMessage) {
    const date = new Date(timestamps.latestMessage);
    if (!isNaN(date.getTime())) {
      validTimestamps.push(date);
    }
  }

  if (timestamps.latestAsset) {
    const date = new Date(timestamps.latestAsset);
    if (!isNaN(date.getTime())) {
      validTimestamps.push(date);
    }
  }

  if (timestamps.latestMetMap) {
    const date = new Date(timestamps.latestMetMap);
    if (!isNaN(date.getTime())) {
      validTimestamps.push(date);
    }
  }

  if (validTimestamps.length === 0) {
    return null;
  }

  // Return the most recent timestamp
  const mostRecent = validTimestamps.reduce((latest, current) =>
    current > latest ? current : latest
  );

  return mostRecent.toISOString();
}

// ============================================================================
// Outstanding Work Detection
// ============================================================================

/**
 * Get outstanding work signals from next step states and snapshot
 */
export function getOutstandingSignals(
  nextStepStates: Record<string, 'suggested' | 'accepted' | 'completed'>,
  openQuestionsCount: number
): OutstandingWork {
  // Count accepted (but not completed) steps
  const acceptedStepsCount = Object.values(nextStepStates).filter(
    status => status === 'accepted'
  ).length;

  return {
    acceptedStepsCount,
    openQuestionsCount,
  };
}

// ============================================================================
// Stall Detection
// ============================================================================

/**
 * Check if a project should trigger a momentum stall notification
 */
export function shouldTriggerMomentumStall(params: {
  projectId: string;
  lastActivityAt: string | null;
  outstanding: OutstandingWork;
  now?: Date;
  stallWindowHours?: number;
  cooldownHours?: number;
}): StallCheckResult {
  const {
    projectId,
    lastActivityAt,
    outstanding,
    now = new Date(),
    stallWindowHours = STALL_WINDOW_HOURS,
    cooldownHours = COOLDOWN_HOURS,
  } = params;

  // If no activity data, we can't determine stall status
  if (!lastActivityAt) {
    return {
      isStalled: false,
      lastActivityAt: null,
      hoursSinceActivity: null,
      outstanding,
      onCooldown: false,
      shouldNotify: false,
    };
  }

  // Calculate hours since last activity
  const lastActivity = new Date(lastActivityAt);
  const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

  // Check if beyond stall window
  const isBeyondStallWindow = hoursSinceActivity > stallWindowHours;

  // Check if there's outstanding work
  const hasOutstandingWork =
    outstanding.acceptedStepsCount > 0 || outstanding.openQuestionsCount > 0;

  // Determine if project is stalled
  const isStalled = isBeyondStallWindow && hasOutstandingWork;

  // Check cooldown
  const lastNotifiedAt = getLastStallNotifiedAt(projectId);
  let onCooldown = false;

  if (lastNotifiedAt) {
    const lastNotified = new Date(lastNotifiedAt);
    const hoursSinceNotified = (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);
    onCooldown = hoursSinceNotified < cooldownHours;
  }

  // Should notify only if stalled and not on cooldown
  const shouldNotify = isStalled && !onCooldown;

  return {
    isStalled,
    lastActivityAt,
    hoursSinceActivity,
    outstanding,
    onCooldown,
    shouldNotify,
  };
}

// ============================================================================
// Notification Message Builder
// ============================================================================

export interface StallNotificationContent {
  title: string;
  body: string;
  projectId: string;
  projectName: string;
  acceptedStepsCount: number;
  openQuestionsCount: number;
}

/**
 * Build the notification content for a momentum stall
 */
export function buildStallNotificationContent(params: {
  projectId: string;
  projectName: string;
  hoursSinceActivity: number;
  outstanding: OutstandingWork;
}): StallNotificationContent {
  const { projectId, projectName, hoursSinceActivity, outstanding } = params;

  // Build readable time period
  const days = Math.floor(hoursSinceActivity / 24);
  const timePeriod = days > 1 ? `${days} days` : days === 1 ? '1 day' : 'a while';

  // Build body message
  let body = `No activity in the last ${timePeriod}.`;

  const parts: string[] = [];
  if (outstanding.acceptedStepsCount > 0) {
    parts.push(`${outstanding.acceptedStepsCount} accepted next step${outstanding.acceptedStepsCount > 1 ? 's' : ''}`);
  }
  if (outstanding.openQuestionsCount > 0) {
    parts.push(`${outstanding.openQuestionsCount} open question${outstanding.openQuestionsCount > 1 ? 's' : ''}`);
  }

  if (parts.length > 0) {
    body += ` ${parts.join(', ')}.`;
  }

  return {
    title: 'Momentum stalled',
    body,
    projectId,
    projectName,
    acceptedStepsCount: outstanding.acceptedStepsCount,
    openQuestionsCount: outstanding.openQuestionsCount,
  };
}
