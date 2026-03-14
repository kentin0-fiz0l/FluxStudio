import { describe, it, expect } from 'vitest';
import {
  validateSpacing,
  validateStepSize,
  validateTransitions,
  validateFormation,
} from '../formationValidator';
import type { Position } from '../formationTypes';

// ============================================================================
// Helpers
// ============================================================================

function makePositions(pairs: [string, number, number][]): Record<string, Position> {
  const rec: Record<string, Position> = {};
  for (const [id, x, y] of pairs) {
    rec[id] = { x, y };
  }
  return rec;
}

function makePositionMap(pairs: [string, number, number][]): Map<string, Position> {
  const m = new Map<string, Position>();
  for (const [id, x, y] of pairs) {
    m.set(id, { x, y });
  }
  return m;
}

// ============================================================================
// validateSpacing
// ============================================================================

describe('validateSpacing', () => {
  it('returns no warnings when performers are well-spaced', () => {
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 20, 50],
      ['c', 30, 50],
    ]);
    expect(validateSpacing(positions)).toEqual([]);
  });

  it('returns a warning when two performers are closer than minSpacing', () => {
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 11, 50], // 1 unit apart, default minSpacing is 2; 1 >= 1 (half of 2) so severity is 'warning'
    ]);
    const warnings = validateSpacing(positions);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].performerIds).toEqual(['a', 'b']);
    expect(warnings[0].severity).toBe('warning');
  });

  it('returns error severity when distance is less than half minSpacing', () => {
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 10.5, 50], // 0.5 apart, which is < 2*0.5 = 1
    ]);
    const warnings = validateSpacing(positions);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('error');
  });

  it('returns warning severity when distance is between half and full minSpacing', () => {
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 11.5, 50], // 1.5 apart, which is >= 1 (half of 2) but < 2
    ]);
    const warnings = validateSpacing(positions);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
  });

  it('respects custom minSpacing', () => {
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 14, 50], // 4 apart
    ]);
    // Default minSpacing=2 -> no warning
    expect(validateSpacing(positions, 2)).toHaveLength(0);
    // Custom minSpacing=5 -> warning (4 < 5)
    expect(validateSpacing(positions, 5)).toHaveLength(1);
  });

  it('handles empty positions', () => {
    expect(validateSpacing({})).toEqual([]);
  });

  it('handles single performer', () => {
    expect(validateSpacing(makePositions([['a', 50, 50]]))).toEqual([]);
  });

  it('accepts Map input', () => {
    const positions = makePositionMap([
      ['a', 10, 50],
      ['b', 10.5, 50],
    ]);
    const warnings = validateSpacing(positions);
    expect(warnings).toHaveLength(1);
  });

  it('checks all pairs for overlapping positions', () => {
    // All three at the same spot
    const positions = makePositions([
      ['a', 50, 50],
      ['b', 50, 50],
      ['c', 50, 50],
    ]);
    const warnings = validateSpacing(positions);
    // 3 pairs: a-b, a-c, b-c
    expect(warnings).toHaveLength(3);
    warnings.forEach(w => expect(w.severity).toBe('error'));
  });

  it('includes performer IDs in warning message', () => {
    const positions = makePositions([
      ['p1', 10, 50],
      ['p2', 10.5, 50],
    ]);
    const warnings = validateSpacing(positions);
    expect(warnings[0].message).toContain('p1');
    expect(warnings[0].message).toContain('p2');
  });

  it('calculates diagonal distance correctly', () => {
    // Distance between (0,0) and (1,1) = sqrt(2) ~ 1.414
    const positions = makePositions([
      ['a', 0, 0],
      ['b', 1, 1],
    ]);
    const warnings = validateSpacing(positions, 2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('1.4'); // ~1.414 yards
  });
});

// ============================================================================
// validateStepSize
// ============================================================================

describe('validateStepSize', () => {
  it('returns no warnings for reasonable step sizes', () => {
    // Standard 8-to-5 at 120 BPM: 0.625 units/count
    // 5 units over 10 counts = 0.5 units/count (under threshold)
    expect(validateStepSize(5, 10, 120)).toEqual([]);
  });

  it('returns warning when step size exceeds standard', () => {
    // 0.625 threshold at 120 BPM
    // 8 units over 10 counts = 0.8 units/count (over 0.625 but under 1.25)
    const warnings = validateStepSize(8, 10, 120);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
    expect(warnings[0].message).toContain('sprinting');
  });

  it('returns error when step size is physically impossible', () => {
    // Need > 2x threshold: > 1.25 units/count
    // 15 units over 10 counts = 1.5 units/count
    const warnings = validateStepSize(15, 10, 120);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('error');
    expect(warnings[0].message).toContain('impossible');
  });

  it('returns empty for zero counts', () => {
    expect(validateStepSize(10, 0)).toEqual([]);
  });

  it('returns empty for negative counts', () => {
    expect(validateStepSize(10, -5)).toEqual([]);
  });

  it('scales threshold with tempo', () => {
    // At 60 BPM: threshold = 0.625 * (120/60) = 1.25
    // 1.0 units/count is under 1.25, so no warning
    expect(validateStepSize(10, 10, 60)).toEqual([]);
    // At 240 BPM: threshold = 0.625 * (120/240) = 0.3125
    // 0.5 units/count is over 0.3125, so warning
    const warnings = validateStepSize(5, 10, 240);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('warning');
  });

  it('uses default tempo of 120 when not specified', () => {
    // 0.8 units/count should trigger warning at 120 BPM
    const warnings = validateStepSize(8, 10);
    expect(warnings).toHaveLength(1);
  });

  it('has empty performerIds', () => {
    const warnings = validateStepSize(15, 10, 120);
    expect(warnings[0].performerIds).toEqual([]);
  });

  it('handles zero distance', () => {
    expect(validateStepSize(0, 10)).toEqual([]);
  });
});

// ============================================================================
// validateTransitions
// ============================================================================

describe('validateTransitions', () => {
  it('returns empty when all movements are short', () => {
    const kfA = makePositions([
      ['a', 50, 50],
      ['b', 60, 50],
    ]);
    const kfB = makePositions([
      ['a', 51, 50],
      ['b', 61, 50],
    ]);
    const warnings = validateTransitions(kfA, kfB, 16, 120);
    expect(warnings).toEqual([]);
  });

  it('detects step size violations per performer', () => {
    const kfA = makePositions([
      ['a', 10, 50],
    ]);
    const kfB = makePositions([
      ['a', 90, 50], // 80 units over 4 counts = 20 units/count, way over threshold
    ]);
    const warnings = validateTransitions(kfA, kfB, 4, 120);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.performerIds.includes('a'))).toBe(true);
  });

  it('detects path crossings', () => {
    // Two performers swap positions - their paths must cross
    const kfA = makePositions([
      ['a', 10, 50],
      ['b', 90, 50],
    ]);
    const kfB = makePositions([
      ['a', 90, 50],
      ['b', 10, 50],
    ]);
    const warnings = validateTransitions(kfA, kfB, 100, 120);
    const crossingWarnings = warnings.filter(w => w.message.includes('paths cross'));
    expect(crossingWarnings.length).toBeGreaterThan(0);
  });

  it('deduplicates path crossing warnings per pair', () => {
    const kfA = makePositions([
      ['a', 10, 50],
      ['b', 90, 50],
    ]);
    const kfB = makePositions([
      ['a', 90, 50],
      ['b', 10, 50],
    ]);
    const warnings = validateTransitions(kfA, kfB, 100, 120);
    const crossingWarnings = warnings.filter(w => w.message.includes('paths cross'));
    // Should have at most 1 crossing warning per pair
    expect(crossingWarnings.length).toBe(1);
  });

  it('handles performers missing from second keyframe', () => {
    const kfA = makePositions([
      ['a', 10, 50],
      ['b', 50, 50],
    ]);
    const kfB = makePositions([
      ['a', 20, 50],
      // b is missing from kfB
    ]);
    // Should not throw, just skip performer b
    const warnings = validateTransitions(kfA, kfB, 8, 120);
    expect(warnings.every(w => !w.performerIds.includes('b'))).toBe(true);
  });

  it('accepts Map inputs', () => {
    const kfA = makePositionMap([['a', 10, 50]]);
    const kfB = makePositionMap([['a', 90, 50]]);
    const warnings = validateTransitions(kfA, kfB, 4, 120);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('returns empty for empty keyframes', () => {
    expect(validateTransitions({}, {}, 8)).toEqual([]);
  });

  it('includes performer ID in step size warning message', () => {
    const kfA = makePositions([['p1', 10, 50]]);
    const kfB = makePositions([['p1', 90, 50]]);
    const warnings = validateTransitions(kfA, kfB, 4, 120);
    const stepWarnings = warnings.filter(w => !w.message.includes('paths cross'));
    expect(stepWarnings.length).toBeGreaterThan(0);
    expect(stepWarnings[0].message).toContain('p1');
  });
});

// ============================================================================
// validateFormation
// ============================================================================

describe('validateFormation', () => {
  it('validates static spacing only when no nextPositions', () => {
    const positions = makePositions([
      ['a', 50, 50],
      ['b', 50.5, 50], // 0.5 apart -> error
    ]);
    const warnings = validateFormation(positions);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].severity).toBe('error');
  });

  it('includes transition warnings when nextPositions and counts are given', () => {
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 90, 50],
    ]);
    const nextPositions = makePositions([
      ['a', 90, 50],
      ['b', 10, 50],
    ]);
    const warnings = validateFormation(positions, nextPositions, 100, 120);
    // Should include crossing warning from transitions
    expect(warnings.some(w => w.message.includes('paths cross'))).toBe(true);
  });

  it('skips transition validation when counts is zero', () => {
    const positions = makePositions([
      ['a', 10, 50],
    ]);
    const nextPositions = makePositions([
      ['a', 90, 50],
    ]);
    // counts = 0 -> no transition validation
    const warnings = validateFormation(positions, nextPositions, 0);
    // Only static spacing warnings (none for single performer)
    expect(warnings).toEqual([]);
  });

  it('skips transition validation when no nextPositions', () => {
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 20, 50],
    ]);
    const warnings = validateFormation(positions);
    // Only spacing warnings
    expect(warnings.every(w => !w.message.includes('paths cross'))).toBe(true);
  });

  it('combines spacing and transition warnings', () => {
    // Performers start close (spacing warning) and swap positions (crossing warning)
    const positions = makePositions([
      ['a', 10, 50],
      ['b', 11, 50], // 1 unit apart -> spacing warning
      ['c', 90, 50],
    ]);
    const nextPositions = makePositions([
      ['a', 90, 50],
      ['b', 11, 50],
      ['c', 10, 50], // a and c swap -> crossing
    ]);
    const warnings = validateFormation(positions, nextPositions, 100, 120);
    const hasSpacing = warnings.some(w => w.message.includes('yards apart'));
    const hasCrossing = warnings.some(w => w.message.includes('paths cross'));
    expect(hasSpacing).toBe(true);
    expect(hasCrossing).toBe(true);
  });
});
