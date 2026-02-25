/**
 * Feature Flag Client Service
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Fetches evaluated flags from the API and caches them in memory.
 * Provides a subscribe/notify pattern for the React hook.
 */

import { apiService } from '@/services/apiService';

const CACHE_TTL_MS = 60_000; // 60 seconds

type FlagMap = Record<string, boolean>;
type Listener = () => void;

let flags: FlagMap = {};
let fetchedAt = 0;
let fetchPromise: Promise<FlagMap> | null = null;
const listeners = new Set<Listener>();

async function fetchFlags(): Promise<FlagMap> {
  try {
    const result = await apiService.get<FlagMap>('/admin/flags/evaluate');
    flags = result.data as FlagMap;
    fetchedAt = Date.now();
    notifyListeners();
    return flags;
  } catch {
    return flags; // Network error — keep stale values
  } finally {
    fetchPromise = null;
  }
}

/**
 * Get all evaluated flags (with caching).
 * Deduplicates concurrent requests.
 */
export async function getFlags(): Promise<FlagMap> {
  if (Date.now() - fetchedAt < CACHE_TTL_MS) return flags;
  if (!fetchPromise) fetchPromise = fetchFlags();
  return fetchPromise;
}

/**
 * Check a single flag synchronously from cache.
 * Returns false if not yet loaded.
 */
export function getFlagSync(name: string): boolean {
  return flags[name] ?? false;
}

/**
 * Force refresh flags from server.
 */
export async function refreshFlags(): Promise<FlagMap> {
  fetchedAt = 0;
  fetchPromise = null;
  return getFlags();
}

/**
 * Subscribe to flag changes.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Get the current snapshot of flags (for useSyncExternalStore).
 */
export function getSnapshot(): FlagMap {
  return flags;
}
