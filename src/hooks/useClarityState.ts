/**
 * useClarityState - Derive user clarity from existing test mode signals
 *
 * Reads from userTestLogger (confusions, hesitations, tasks) and derives
 * a clarity state without creating any new telemetry.
 *
 * Three states:
 * - 'confident': User is working smoothly
 * - 'uncertain': User may need gentle guidance
 * - 'blocked': User appears stuck and may need help
 *
 * Part of Project Pulse: Tone switching based on observed friction.
 */

import * as React from 'react';
import { userTestLogger, ConfusionReport, HesitationEvent, TaskOutcome } from '@/services/userTestLogger';

export type ClarityState = 'confident' | 'uncertain' | 'blocked';

export interface UseClarityStateOptions {
  /** Whether clarity derivation is enabled (defaults to test mode status) */
  enabled?: boolean;
  /** Lookback window in minutes (default: 10) */
  windowMinutes?: number;
  /** Task completion time threshold in seconds for uncertain state (default: 120) */
  longTaskThresholdSeconds?: number;
}

export interface UseClarityStateReturn {
  /** Current derived clarity state */
  clarity: ClarityState;
  /** Human-readable reasons for the current state */
  reasons: string[];
}

/**
 * Filter items by timestamp within a lookback window
 */
function filterByWindow<T extends { timestamp: string }>(
  items: T[],
  windowMinutes: number
): T[] {
  const windowMs = windowMinutes * 60 * 1000;
  const cutoff = Date.now() - windowMs;

  return items.filter((item) => {
    const itemTime = new Date(item.timestamp).getTime();
    return itemTime >= cutoff;
  });
}

/**
 * Check if any tasks are currently stuck within the window
 */
function getStuckTasksInWindow(
  tasks: TaskOutcome[],
  windowMinutes: number
): TaskOutcome[] {
  const windowMs = windowMinutes * 60 * 1000;
  const cutoff = Date.now() - windowMs;

  return tasks.filter((task) => {
    // Task must be stuck
    if (task.status !== 'stuck') return false;

    // Check if task was started within window
    if (task.startedAt) {
      const startTime = new Date(task.startedAt).getTime();
      return startTime >= cutoff;
    }

    return false;
  });
}

/**
 * Get longest task completion time within window
 */
function getLongestTaskTimeInWindow(
  tasks: TaskOutcome[],
  windowMinutes: number
): number {
  const windowMs = windowMinutes * 60 * 1000;
  const cutoff = Date.now() - windowMs;

  let longest = 0;

  for (const task of tasks) {
    if (task.status !== 'completed' || !task.timeToCompleteMs) continue;

    // Check if task was completed within window
    if (task.completedAt) {
      const completedTime = new Date(task.completedAt).getTime();
      if (completedTime >= cutoff && task.timeToCompleteMs > longest) {
        longest = task.timeToCompleteMs;
      }
    }
  }

  return longest;
}

/**
 * Derive clarity state from confusion, hesitation, and task signals
 */
function deriveClarityState(
  confusions: ConfusionReport[],
  hesitations: HesitationEvent[],
  tasks: TaskOutcome[],
  windowMinutes: number,
  longTaskThresholdSeconds: number
): { clarity: ClarityState; reasons: string[] } {
  const recentConfusions = filterByWindow(confusions, windowMinutes);
  const recentHesitations = filterByWindow(hesitations, windowMinutes);
  const stuckTasks = getStuckTasksInWindow(tasks, windowMinutes);
  const longestTaskTimeMs = getLongestTaskTimeInWindow(tasks, windowMinutes);
  const longTaskThresholdMs = longTaskThresholdSeconds * 1000;

  const reasons: string[] = [];

  // Blocked conditions:
  // - ≥1 confusion AND (≥2 hesitations OR any stuck task)
  // - any stuck task AND ≥1 hesitation
  const hasConfusion = recentConfusions.length >= 1;
  const hasMultipleHesitations = recentHesitations.length >= 2;
  const hasStuckTask = stuckTasks.length >= 1;
  const hasAnyHesitation = recentHesitations.length >= 1;

  if (hasConfusion && (hasMultipleHesitations || hasStuckTask)) {
    if (hasConfusion) reasons.push('reported confusion');
    if (hasMultipleHesitations) reasons.push(`${recentHesitations.length} hesitation moments`);
    if (hasStuckTask) reasons.push(`${stuckTasks.length} stuck task(s)`);
    return { clarity: 'blocked', reasons };
  }

  if (hasStuckTask && hasAnyHesitation) {
    reasons.push(`${stuckTasks.length} stuck task(s)`);
    reasons.push(`${recentHesitations.length} hesitation moment(s)`);
    return { clarity: 'blocked', reasons };
  }

  // Uncertain conditions:
  // - ≥1 confusion report
  // - ≥2 hesitation events
  // - longest task completion time exceeds threshold
  if (hasConfusion) {
    reasons.push('reported confusion');
    return { clarity: 'uncertain', reasons };
  }

  if (hasMultipleHesitations) {
    reasons.push(`${recentHesitations.length} hesitation moments`);
    return { clarity: 'uncertain', reasons };
  }

  if (longestTaskTimeMs > longTaskThresholdMs) {
    const seconds = Math.round(longestTaskTimeMs / 1000);
    reasons.push(`task took ${seconds}s (>${longTaskThresholdSeconds}s threshold)`);
    return { clarity: 'uncertain', reasons };
  }

  // Default: confident
  return { clarity: 'confident', reasons: ['working smoothly'] };
}

export function useClarityState(options?: UseClarityStateOptions): UseClarityStateReturn {
  const {
    enabled = userTestLogger.isTestModeEnabled(),
    windowMinutes = 10,
    longTaskThresholdSeconds = 120,
  } = options ?? {};

  const [clarityResult, setClarityResult] = React.useState<UseClarityStateReturn>({
    clarity: 'confident',
    reasons: ['working smoothly'],
  });

  // Recalculate clarity periodically and when relevant data changes
  React.useEffect(() => {
    if (!enabled) {
      setClarityResult({ clarity: 'confident', reasons: ['test mode off'] });
      return;
    }

    const calculateClarity = () => {
      const confusions = userTestLogger.getConfusionReports();
      const hesitations = userTestLogger.getHesitationEvents();
      const tasks = userTestLogger.getTaskOutcomes();

      const result = deriveClarityState(
        confusions,
        hesitations,
        tasks,
        windowMinutes,
        longTaskThresholdSeconds
      );

      setClarityResult(result);
    };

    // Calculate immediately
    calculateClarity();

    // Recalculate every 30 seconds to catch new signals and window changes
    const intervalId = setInterval(calculateClarity, 30000);

    // Also recalculate on storage events (cross-tab updates)
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('fluxstudio_usertest_')) {
        calculateClarity();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [enabled, windowMinutes, longTaskThresholdSeconds]);

  return clarityResult;
}

export default useClarityState;
