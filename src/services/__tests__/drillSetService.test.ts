/**
 * Tests for Drill Set Service
 *
 * Covers: CRUD operations (createSet, addSet, removeSet, updateSet, reorderSets),
 *         bidirectional mapping (getSetAtCount, getCountsForSet, setToTimestamp,
 *         timestampToSet, getTotalCounts),
 *         auto-generation (generateSetsFromKeyframes, syncSetsWithKeyframes),
 *         navigation (getNextSet, getPreviousSet, getSetAtIndex, getSetForKeyframe)
 */

import { describe, it, expect } from 'vitest';
import {
  createSet,
  addSet,
  removeSet,
  updateSet,
  reorderSets,
  getSetAtCount,
  getCountsForSet,
  setToTimestamp,
  timestampToSet,
  getTotalCounts,
  generateSetsFromKeyframes,
  syncSetsWithKeyframes,
  getNextSet,
  getPreviousSet,
  getSetAtIndex,
  getSetForKeyframe,
} from '../drillSetService';
import type { DrillSet, Keyframe } from '../formationTypes';
import type { CountSettings } from '../../utils/drillGeometry';

// ============================================================================
// HELPERS
// ============================================================================

function makeSet(
  id: string,
  name: string,
  counts: number,
  keyframeId: string,
  sortOrder: number,
): DrillSet {
  return { id, name, counts, keyframeId, sortOrder };
}

function makeKeyframe(id: string, timestamp: number): Keyframe {
  return { id, timestamp, positions: new Map() };
}

const defaultCountSettings: CountSettings = {
  bpm: 120,
  countsPerPhrase: 8,
  startOffset: 0,
};

// ============================================================================
// createSet
// ============================================================================

describe('createSet', () => {
  it('creates a set with the given keyframeId and counts', () => {
    const set = createSet('kf-1', 8);
    expect(set.keyframeId).toBe('kf-1');
    expect(set.counts).toBe(8);
    expect(set.id).toBeTruthy();
    expect(set.sortOrder).toBe(0);
  });

  it('auto-names based on existing sets count', () => {
    const existingSets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];
    const set = createSet('kf-2', 16, {}, existingSets);
    expect(set.name).toBe('Set 2');
    expect(set.sortOrder).toBe(1);
  });

  it('allows custom name', () => {
    const set = createSet('kf-1', 8, { name: 'Opener Set 1' });
    expect(set.name).toBe('Opener Set 1');
  });

  it('allows custom label and notes', () => {
    const set = createSet('kf-1', 8, {
      label: '1A',
      notes: 'Company front',
      rehearsalMark: 'A',
    });
    expect(set.label).toBe('1A');
    expect(set.notes).toBe('Company front');
    expect(set.rehearsalMark).toBe('A');
  });

  it('generates unique IDs', () => {
    const set1 = createSet('kf-1', 8);
    const set2 = createSet('kf-2', 8);
    expect(set1.id).not.toBe(set2.id);
  });
});

// ============================================================================
// addSet
// ============================================================================

describe('addSet', () => {
  it('appends to end by default', () => {
    const existing = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];
    const newSet = makeSet('s2', 'Set 2', 8, 'kf2', 1);
    const result = addSet(existing, newSet);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('s2');
    expect(result[1].sortOrder).toBe(1);
  });

  it('inserts after specified index', () => {
    const existing = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s3', 'Set 3', 8, 'kf3', 1),
    ];
    const newSet = makeSet('s2', 'Set 2', 8, 'kf2', 99);
    const result = addSet(existing, newSet, 0); // after index 0
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('s1');
    expect(result[1].id).toBe('s2');
    expect(result[2].id).toBe('s3');
  });

  it('re-indexes sortOrder after insertion', () => {
    const existing = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];
    const newSet = makeSet('s3', 'Set 3', 8, 'kf3', 99);
    const result = addSet(existing, newSet, 0);
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
    expect(result[2].sortOrder).toBe(2);
  });

  it('handles inserting into empty array', () => {
    const newSet = makeSet('s1', 'Set 1', 8, 'kf1', 0);
    const result = addSet([], newSet);
    expect(result).toHaveLength(1);
    expect(result[0].sortOrder).toBe(0);
  });
});

// ============================================================================
// removeSet
// ============================================================================

describe('removeSet', () => {
  it('removes the set by ID', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];
    const result = removeSet(sets, 's2');
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.id === 's2')).toBeUndefined();
  });

  it('re-indexes sortOrder after removal', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];
    const result = removeSet(sets, 's1');
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
  });

  it('returns unchanged array if ID not found', () => {
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];
    const result = removeSet(sets, 'nonexistent');
    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// updateSet
// ============================================================================

describe('updateSet', () => {
  it('updates the specified set properties', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];
    const result = updateSet(sets, 's1', { name: 'Opener', counts: 16 });
    expect(result[0].name).toBe('Opener');
    expect(result[0].counts).toBe(16);
    // Other set unchanged
    expect(result[1].name).toBe('Set 2');
  });

  it('does not modify other sets', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 16, 'kf2', 1),
    ];
    const result = updateSet(sets, 's1', { notes: 'Hello' });
    expect(result[1]).toEqual(sets[1]);
  });

  it('returns unchanged array if ID not found', () => {
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];
    const result = updateSet(sets, 'nonexistent', { name: 'X' });
    expect(result).toEqual(sets);
  });
});

// ============================================================================
// reorderSets
// ============================================================================

describe('reorderSets', () => {
  it('moves a set from one position to another', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];
    const result = reorderSets(sets, 2, 0); // Move s3 to front
    expect(result[0].id).toBe('s3');
    expect(result[1].id).toBe('s1');
    expect(result[2].id).toBe('s2');
  });

  it('re-indexes sortOrder after reorder', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];
    const result = reorderSets(sets, 2, 0);
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
    expect(result[2].sortOrder).toBe(2);
  });

  it('handles moving to the same position (no-op)', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];
    const result = reorderSets(sets, 0, 0);
    expect(result[0].id).toBe('s1');
    expect(result[1].id).toBe('s2');
  });
});

// ============================================================================
// getSetAtCount
// ============================================================================

describe('getSetAtCount', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 16, 'kf2', 1),
    makeSet('s3', 'Set 3', 8, 'kf3', 2),
  ];

  it('returns the first set for count 1', () => {
    const result = getSetAtCount(sets, 1);
    expect(result!.id).toBe('s1');
  });

  it('returns the first set for count 8 (boundary)', () => {
    const result = getSetAtCount(sets, 8);
    expect(result!.id).toBe('s1');
  });

  it('returns the second set for count 9', () => {
    const result = getSetAtCount(sets, 9);
    expect(result!.id).toBe('s2');
  });

  it('returns the second set for count 24 (boundary)', () => {
    const result = getSetAtCount(sets, 24);
    expect(result!.id).toBe('s2');
  });

  it('returns the third set for count 25', () => {
    const result = getSetAtCount(sets, 25);
    expect(result!.id).toBe('s3');
  });

  it('returns the last set for counts beyond total', () => {
    const result = getSetAtCount(sets, 100);
    expect(result!.id).toBe('s3');
  });

  it('works with unsorted input (sorts by sortOrder)', () => {
    const unsorted = [
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 16, 'kf2', 1),
    ];
    const result = getSetAtCount(unsorted, 1);
    expect(result!.id).toBe('s1');
  });
});

// ============================================================================
// getCountsForSet
// ============================================================================

describe('getCountsForSet', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 16, 'kf2', 1),
    makeSet('s3', 'Set 3', 8, 'kf3', 2),
  ];

  it('returns correct range for first set', () => {
    const result = getCountsForSet(sets, 's1');
    expect(result).toEqual({ startCount: 1, endCount: 8 });
  });

  it('returns correct range for second set', () => {
    const result = getCountsForSet(sets, 's2');
    expect(result).toEqual({ startCount: 9, endCount: 24 });
  });

  it('returns correct range for third set', () => {
    const result = getCountsForSet(sets, 's3');
    expect(result).toEqual({ startCount: 25, endCount: 32 });
  });

  it('returns undefined for unknown set ID', () => {
    const result = getCountsForSet(sets, 'nonexistent');
    expect(result).toBeUndefined();
  });
});

// ============================================================================
// setToTimestamp
// ============================================================================

describe('setToTimestamp', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 16, 'kf2', 1),
  ];

  it('returns 0 ms for first set at 120 BPM with 0 offset', () => {
    const result = setToTimestamp(sets, 's1', defaultCountSettings);
    // startCount = 1, countToTime(1, {bpm:120, offset:0}) = 0 + (1-1)*500 = 0
    expect(result).toBe(0);
  });

  it('returns correct timestamp for second set', () => {
    const result = setToTimestamp(sets, 's2', defaultCountSettings);
    // startCount = 9, countToTime(9, {bpm:120, offset:0}) = 0 + (9-1)*500 = 4000
    expect(result).toBe(4000);
  });

  it('returns undefined for unknown set', () => {
    const result = setToTimestamp(sets, 'nonexistent', defaultCountSettings);
    expect(result).toBeUndefined();
  });

  it('accounts for startOffset', () => {
    const withOffset: CountSettings = { ...defaultCountSettings, startOffset: 1000 };
    const result = setToTimestamp(sets, 's1', withOffset);
    // countToTime(1, {bpm:120, offset:1000}) = 1000 + 0 = 1000
    expect(result).toBe(1000);
  });
});

// ============================================================================
// timestampToSet
// ============================================================================

describe('timestampToSet', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 16, 'kf2', 1),
  ];

  it('returns first set for timestamp 0', () => {
    const result = timestampToSet(sets, 0, defaultCountSettings);
    expect(result!.id).toBe('s1');
  });

  it('returns first set for timestamp within first 8 counts', () => {
    // 120 BPM => 500ms per beat => 8 counts = 4000ms
    // At 2000ms: count = floor(2000/500) + 1 = 5 => still in set 1
    const result = timestampToSet(sets, 2000, defaultCountSettings);
    expect(result!.id).toBe('s1');
  });

  it('returns second set for timestamp in second set range', () => {
    // Count 9 starts at 4000ms
    const result = timestampToSet(sets, 4500, defaultCountSettings);
    expect(result!.id).toBe('s2');
  });
});

// ============================================================================
// getTotalCounts
// ============================================================================

describe('getTotalCounts', () => {
  it('sums all set counts', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 16, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];
    expect(getTotalCounts(sets)).toBe(32);
  });

  it('returns 0 for empty array', () => {
    expect(getTotalCounts([])).toBe(0);
  });

  it('handles single set', () => {
    const sets = [makeSet('s1', 'Set 1', 12, 'kf1', 0)];
    expect(getTotalCounts(sets)).toBe(12);
  });
});

// ============================================================================
// generateSetsFromKeyframes
// ============================================================================

describe('generateSetsFromKeyframes', () => {
  it('returns empty array for no keyframes', () => {
    const result = generateSetsFromKeyframes([], defaultCountSettings);
    expect(result).toHaveLength(0);
  });

  it('generates one set per keyframe', () => {
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 4000),
      makeKeyframe('kf3', 8000),
    ];
    const result = generateSetsFromKeyframes(keyframes, defaultCountSettings);
    expect(result).toHaveLength(3);
  });

  it('calculates counts from time deltas', () => {
    // 120 BPM => 500ms per beat
    // Delta 4000ms => 4000/500 = 8 counts
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 4000),
    ];
    const result = generateSetsFromKeyframes(keyframes, defaultCountSettings);
    expect(result[0].counts).toBe(8);
  });

  it('last keyframe uses countsPerPhrase', () => {
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 4000),
    ];
    const result = generateSetsFromKeyframes(keyframes, defaultCountSettings);
    expect(result[result.length - 1].counts).toBe(8); // countsPerPhrase
  });

  it('links sets to correct keyframes', () => {
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 2000),
    ];
    const result = generateSetsFromKeyframes(keyframes, defaultCountSettings);
    expect(result[0].keyframeId).toBe('kf1');
    expect(result[1].keyframeId).toBe('kf2');
  });

  it('sets sortOrder sequentially', () => {
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 2000),
      makeKeyframe('kf3', 4000),
    ];
    const result = generateSetsFromKeyframes(keyframes, defaultCountSettings);
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
    expect(result[2].sortOrder).toBe(2);
  });

  it('sorts keyframes by timestamp regardless of input order', () => {
    const keyframes = [
      makeKeyframe('kf3', 8000),
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 4000),
    ];
    const result = generateSetsFromKeyframes(keyframes, defaultCountSettings);
    expect(result[0].keyframeId).toBe('kf1');
    expect(result[1].keyframeId).toBe('kf2');
    expect(result[2].keyframeId).toBe('kf3');
  });

  it('ensures minimum 1 count for very close keyframes', () => {
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 100), // Very small delta
    ];
    const result = generateSetsFromKeyframes(keyframes, defaultCountSettings);
    expect(result[0].counts).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// syncSetsWithKeyframes
// ============================================================================

describe('syncSetsWithKeyframes', () => {
  it('removes sets for deleted keyframes', () => {
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];
    const keyframes = [makeKeyframe('kf1', 0)]; // kf2 deleted

    const result = syncSetsWithKeyframes(sets, keyframes, defaultCountSettings);
    expect(result).toHaveLength(1);
    expect(result[0].keyframeId).toBe('kf1');
  });

  it('adds sets for new keyframes', () => {
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 4000), // New keyframe
    ];

    const result = syncSetsWithKeyframes(sets, keyframes, defaultCountSettings);
    expect(result).toHaveLength(2);
    expect(result.some((s) => s.keyframeId === 'kf2')).toBe(true);
  });

  it('preserves existing sets for matching keyframes', () => {
    const sets = [
      makeSet('s1', 'Custom Name', 16, 'kf1', 0),
    ];
    const keyframes = [makeKeyframe('kf1', 0)];

    const result = syncSetsWithKeyframes(sets, keyframes, defaultCountSettings);
    expect(result[0].name).toBe('Custom Name');
    expect(result[0].counts).toBe(16);
  });

  it('re-sorts by keyframe timestamp order', () => {
    const sets = [
      makeSet('s2', 'Set 2', 8, 'kf2', 0),
      makeSet('s1', 'Set 1', 8, 'kf1', 1),
    ];
    const keyframes = [
      makeKeyframe('kf1', 0),
      makeKeyframe('kf2', 4000),
    ];

    const result = syncSetsWithKeyframes(sets, keyframes, defaultCountSettings);
    expect(result[0].keyframeId).toBe('kf1');
    expect(result[1].keyframeId).toBe('kf2');
    expect(result[0].sortOrder).toBe(0);
    expect(result[1].sortOrder).toBe(1);
  });
});

// ============================================================================
// Navigation helpers
// ============================================================================

describe('getNextSet', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 8, 'kf2', 1),
    makeSet('s3', 'Set 3', 8, 'kf3', 2),
  ];

  it('returns the next set', () => {
    const result = getNextSet(sets, 's1');
    expect(result!.id).toBe('s2');
  });

  it('returns undefined for last set', () => {
    const result = getNextSet(sets, 's3');
    expect(result).toBeUndefined();
  });

  it('returns undefined for unknown set ID', () => {
    const result = getNextSet(sets, 'nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('getPreviousSet', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 8, 'kf2', 1),
    makeSet('s3', 'Set 3', 8, 'kf3', 2),
  ];

  it('returns the previous set', () => {
    const result = getPreviousSet(sets, 's2');
    expect(result!.id).toBe('s1');
  });

  it('returns undefined for first set', () => {
    const result = getPreviousSet(sets, 's1');
    expect(result).toBeUndefined();
  });
});

describe('getSetAtIndex', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 8, 'kf2', 1),
  ];

  it('returns set at index 0', () => {
    const result = getSetAtIndex(sets, 0);
    expect(result!.id).toBe('s1');
  });

  it('returns set at index 1', () => {
    const result = getSetAtIndex(sets, 1);
    expect(result!.id).toBe('s2');
  });

  it('returns undefined for out-of-bounds index', () => {
    const result = getSetAtIndex(sets, 5);
    expect(result).toBeUndefined();
  });
});

describe('getSetForKeyframe', () => {
  const sets = [
    makeSet('s1', 'Set 1', 8, 'kf1', 0),
    makeSet('s2', 'Set 2', 8, 'kf2', 1),
  ];

  it('finds set by keyframe ID', () => {
    const result = getSetForKeyframe(sets, 'kf2');
    expect(result!.id).toBe('s2');
  });

  it('returns undefined for unknown keyframe ID', () => {
    const result = getSetForKeyframe(sets, 'kf_unknown');
    expect(result).toBeUndefined();
  });
});
