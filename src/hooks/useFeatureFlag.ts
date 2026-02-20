/**
 * useFeatureFlag — React hook for feature flag evaluation
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Usage:
 *   const isEnabled = useFeatureFlag('new-dashboard');
 *   if (isEnabled) return <NewDashboard />;
 *   return <OldDashboard />;
 */

import { useSyncExternalStore, useEffect } from 'react';
import {
  subscribe,
  getSnapshot,
  getFlags,
  getFlagSync,
} from '../services/featureFlagService';

/**
 * Returns whether a feature flag is enabled for the current user.
 * Triggers a background fetch on first use, then reads from cache.
 */
export function useFeatureFlag(flagName: string): boolean {
  const flags = useSyncExternalStore(subscribe, getSnapshot);

  // Trigger fetch on mount (deduped internally)
  useEffect(() => {
    getFlags();
  }, []);

  return flags[flagName] ?? false;
}

/**
 * Returns all evaluated flags as a Record<string, boolean>.
 */
export function useFeatureFlags(): Record<string, boolean> {
  const flags = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    getFlags();
  }, []);

  return flags;
}

export { getFlagSync };
