/**
 * Drill Set Service - FluxStudio
 *
 * Manages the sets/counts paradigm that maps 1:1 to keyframes.
 * Provides CRUD operations, bidirectional mapping between sets and timestamps,
 * and auto-generation from existing keyframes.
 */

import type { DrillSet, Keyframe } from './formationTypes';
import { countToTime, timeToCount, type CountSettings } from '../utils/drillGeometry';
import type { TempoMap } from './tempoMap';

type TimingParam = CountSettings | TempoMap;

function isTempoMap(timing: TimingParam): timing is TempoMap {
  return 'segments' in timing;
}

// ============================================================================
// SET CRUD OPERATIONS
// ============================================================================

/**
 * Create a new DrillSet linked to a keyframe.
 */
export function createSet(
  keyframeId: string,
  counts: number,
  options: Partial<Pick<DrillSet, 'name' | 'label' | 'notes' | 'rehearsalMark'>> = {},
  existingSets: DrillSet[] = [],
): DrillSet {
  const sortOrder = existingSets.length;
  const name = options.name ?? `Set ${sortOrder + 1}`;

  return {
    id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name,
    label: options.label,
    counts,
    keyframeId,
    notes: options.notes,
    rehearsalMark: options.rehearsalMark,
    sortOrder,
  };
}

/**
 * Add a set to the sets array, maintaining sort order.
 */
export function addSet(
  sets: DrillSet[],
  newSet: DrillSet,
  insertAfterIndex?: number,
): DrillSet[] {
  const result = [...sets];

  if (insertAfterIndex !== undefined && insertAfterIndex >= 0) {
    // Insert after the specified index
    const insertAt = insertAfterIndex + 1;
    result.splice(insertAt, 0, newSet);
  } else {
    result.push(newSet);
  }

  // Re-index sort orders
  return result.map((s, i) => ({ ...s, sortOrder: i }));
}

/**
 * Remove a set by ID.
 */
export function removeSet(sets: DrillSet[], setId: string): DrillSet[] {
  return sets
    .filter((s) => s.id !== setId)
    .map((s, i) => ({ ...s, sortOrder: i }));
}

/**
 * Update set properties.
 */
export function updateSet(
  sets: DrillSet[],
  setId: string,
  updates: Partial<Omit<DrillSet, 'id'>>,
): DrillSet[] {
  return sets.map((s) =>
    s.id === setId ? { ...s, ...updates } : s
  );
}

/**
 * Reorder sets (e.g., after drag-and-drop).
 */
export function reorderSets(sets: DrillSet[], fromIndex: number, toIndex: number): DrillSet[] {
  const result = [...sets];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result.map((s, i) => ({ ...s, sortOrder: i }));
}

// ============================================================================
// BIDIRECTIONAL MAPPING
// ============================================================================

/**
 * Get the set at a given absolute count (1-based).
 */
export function getSetAtCount(
  sets: DrillSet[],
  absoluteCount: number,
): DrillSet | undefined {
  let accumulated = 0;
  const sorted = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const set of sorted) {
    accumulated += set.counts;
    if (absoluteCount <= accumulated) {
      return set;
    }
  }

  return sorted[sorted.length - 1];
}

/**
 * Get the start and end count (1-based, inclusive) for a set.
 */
export function getCountsForSet(
  sets: DrillSet[],
  setId: string,
): { startCount: number; endCount: number } | undefined {
  const sorted = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  let startCount = 1;

  for (const set of sorted) {
    if (set.id === setId) {
      return {
        startCount,
        endCount: startCount + set.counts - 1,
      };
    }
    startCount += set.counts;
  }

  return undefined;
}

/**
 * Convert a set to a timestamp in milliseconds.
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function setToTimestamp(
  sets: DrillSet[],
  setId: string,
  timing: TimingParam,
): number | undefined {
  const counts = getCountsForSet(sets, setId);
  if (!counts) return undefined;
  return countToTime(counts.startCount, timing);
}

/**
 * Convert a timestamp to the containing set.
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function timestampToSet(
  sets: DrillSet[],
  timestampMs: number,
  timing: TimingParam,
): DrillSet | undefined {
  const count = timeToCount(timestampMs, timing);
  return getSetAtCount(sets, count);
}

/**
 * Get total counts across all sets.
 */
export function getTotalCounts(sets: DrillSet[]): number {
  return sets.reduce((sum, s) => sum + s.counts, 0);
}

// ============================================================================
// AUTO-GENERATION FROM KEYFRAMES
// ============================================================================

/**
 * Auto-generate sets from existing keyframes.
 * Uses the time delta between keyframes and BPM to calculate counts.
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function generateSetsFromKeyframes(
  keyframes: Keyframe[],
  timing: TimingParam,
): DrillSet[] {
  if (keyframes.length === 0) return [];

  const sorted = [...keyframes].sort((a, b) => a.timestamp - b.timestamp);
  const sets: DrillSet[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const kf = sorted[i];
    let counts: number;

    if (i < sorted.length - 1) {
      const deltaMs = sorted[i + 1].timestamp - kf.timestamp;
      if (isTempoMap(timing)) {
        // Use variable tempo: find counts from timestamps
        const startCount = timeToCount(kf.timestamp, timing);
        const endCount = timeToCount(sorted[i + 1].timestamp, timing);
        counts = Math.max(1, Math.round(endCount - startCount));
      } else {
        const msPerBeat = 60000 / timing.bpm;
        counts = Math.max(1, Math.round(deltaMs / msPerBeat));
      }
    } else {
      // Last keyframe: default to phrase length
      counts = isTempoMap(timing) ? 8 : timing.countsPerPhrase;
    }

    sets.push({
      id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${i}`,
      name: `Set ${i + 1}`,
      counts,
      keyframeId: kf.id,
      sortOrder: i,
    });
  }

  return sets;
}

/**
 * Sync sets with keyframes after keyframe add/remove.
 * Ensures 1:1 mapping is maintained.
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function syncSetsWithKeyframes(
  sets: DrillSet[],
  keyframes: Keyframe[],
  timing: TimingParam,
): DrillSet[] {
  const keyframeIds = new Set(keyframes.map((kf) => kf.id));
  const setKeyframeIds = new Set(sets.map((s) => s.keyframeId));

  // Remove sets for deleted keyframes
  let result = sets.filter((s) => keyframeIds.has(s.keyframeId));

  // Add sets for new keyframes
  const sortedKeyframes = [...keyframes].sort((a, b) => a.timestamp - b.timestamp);
  for (const kf of sortedKeyframes) {
    if (!setKeyframeIds.has(kf.id)) {
      const kfIndex = sortedKeyframes.indexOf(kf);
      let counts = isTempoMap(timing) ? 8 : timing.countsPerPhrase;

      if (kfIndex < sortedKeyframes.length - 1) {
        const deltaMs = sortedKeyframes[kfIndex + 1].timestamp - kf.timestamp;
        if (isTempoMap(timing)) {
          const startCount = timeToCount(kf.timestamp, timing);
          const endCount = timeToCount(sortedKeyframes[kfIndex + 1].timestamp, timing);
          counts = Math.max(1, Math.round(endCount - startCount));
        } else {
          const msPerBeat = 60000 / timing.bpm;
          counts = Math.max(1, Math.round(deltaMs / msPerBeat));
        }
      }

      result.push({
        id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name: `Set ${result.length + 1}`,
        counts,
        keyframeId: kf.id,
        sortOrder: result.length,
      });
    }
  }

  // Re-sort by keyframe timestamp order
  const kfOrder = new Map(sortedKeyframes.map((kf, i) => [kf.id, i]));
  result.sort((a, b) => (kfOrder.get(a.keyframeId) ?? 0) - (kfOrder.get(b.keyframeId) ?? 0));

  return result.map((s, i) => ({ ...s, sortOrder: i }));
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Get the next set after the given set ID.
 */
export function getNextSet(sets: DrillSet[], currentSetId: string): DrillSet | undefined {
  const sorted = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((s) => s.id === currentSetId);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined;
}

/**
 * Get the previous set before the given set ID.
 */
export function getPreviousSet(sets: DrillSet[], currentSetId: string): DrillSet | undefined {
  const sorted = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((s) => s.id === currentSetId);
  return idx > 0 ? sorted[idx - 1] : undefined;
}

/**
 * Get the set at a specific index (0-based).
 */
export function getSetAtIndex(sets: DrillSet[], index: number): DrillSet | undefined {
  const sorted = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted[index];
}

/**
 * Find the set that corresponds to a keyframe.
 */
export function getSetForKeyframe(sets: DrillSet[], keyframeId: string): DrillSet | undefined {
  return sets.find((s) => s.keyframeId === keyframeId);
}
