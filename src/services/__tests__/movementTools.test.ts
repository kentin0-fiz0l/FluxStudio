/**
 * Tests for Movement Tools Service
 *
 * Covers: calculateMorphMapping, generateCounterMarch, generateSpiral,
 *         generateStagger, morphFormation, generateParadeGate,
 *         generateSequentialPush, generateFaceToPoint, generateFollow,
 *         interpolatePositions
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMorphMapping,
  morphFormation,
  generateCounterMarch,
  generateSpiral,
  generateStagger,
  generateParadeGate,
  generateSequentialPush,
  generateFaceToPoint,
  generateFollow,
  interpolatePositions,
} from '../movementTools';
import type { Position } from '../formationTypes';

// ============================================================================
// HELPERS
// ============================================================================

function positionsInRange(positions: Position[]): boolean {
  return positions.every(
    (p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100,
  );
}

// ============================================================================
// calculateMorphMapping
// ============================================================================

describe('calculateMorphMapping', () => {
  describe('index method', () => {
    it('maps performers 1:1 by index', () => {
      const from: Position[] = [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ];
      const to: Position[] = [
        { x: 90, y: 90 },
        { x: 80, y: 80 },
        { x: 70, y: 70 },
      ];

      const mapping = calculateMorphMapping(from, to, 'index');
      expect(mapping).toHaveLength(3);
      expect(mapping[0]).toEqual({ fromIndex: 0, toIndex: 0 });
      expect(mapping[1]).toEqual({ fromIndex: 1, toIndex: 1 });
      expect(mapping[2]).toEqual({ fromIndex: 2, toIndex: 2 });
    });

    it('uses min count when arrays differ in length', () => {
      const from: Position[] = [{ x: 10, y: 10 }, { x: 20, y: 20 }];
      const to: Position[] = [
        { x: 90, y: 90 },
        { x: 80, y: 80 },
        { x: 70, y: 70 },
      ];

      const mapping = calculateMorphMapping(from, to, 'index');
      expect(mapping).toHaveLength(2);
    });

    it('handles empty arrays', () => {
      const mapping = calculateMorphMapping([], [], 'index');
      expect(mapping).toHaveLength(0);
    });
  });

  describe('proximity method', () => {
    it('maps performers to nearest targets', () => {
      const from: Position[] = [
        { x: 10, y: 10 },
        { x: 90, y: 90 },
      ];
      const to: Position[] = [
        { x: 85, y: 85 }, // closer to from[1]
        { x: 15, y: 15 }, // closer to from[0]
      ];

      const mapping = calculateMorphMapping(from, to, 'proximity');
      expect(mapping).toHaveLength(2);

      // from[0] (10,10) should map to to[1] (15,15) -- nearest
      const mapping0 = mapping.find((m) => m.fromIndex === 0);
      expect(mapping0!.toIndex).toBe(1);

      // from[1] (90,90) should map to to[0] (85,85)
      const mapping1 = mapping.find((m) => m.fromIndex === 1);
      expect(mapping1!.toIndex).toBe(0);
    });

    it('produces unique mappings (no target used twice)', () => {
      const from: Position[] = [
        { x: 10, y: 50 },
        { x: 12, y: 50 }, // very close to from[0]
        { x: 90, y: 50 },
      ];
      const to: Position[] = [
        { x: 11, y: 50 },
        { x: 50, y: 50 },
        { x: 88, y: 50 },
      ];

      const mapping = calculateMorphMapping(from, to, 'proximity');
      expect(mapping).toHaveLength(3);

      // All target indices should be unique
      const toIndices = mapping.map((m) => m.toIndex);
      expect(new Set(toIndices).size).toBe(3);
    });

    it('handles single-element arrays', () => {
      const from: Position[] = [{ x: 50, y: 50 }];
      const to: Position[] = [{ x: 60, y: 60 }];

      const mapping = calculateMorphMapping(from, to, 'proximity');
      expect(mapping).toEqual([{ fromIndex: 0, toIndex: 0 }]);
    });
  });

  describe('manual method', () => {
    it('returns the provided manual mapping', () => {
      const from: Position[] = [{ x: 10, y: 10 }];
      const to: Position[] = [{ x: 90, y: 90 }];
      const manual = [{ fromIndex: 0, toIndex: 0 }];

      const mapping = calculateMorphMapping(from, to, 'manual', manual);
      expect(mapping).toEqual(manual);
    });

    it('returns empty array if no manual mapping provided', () => {
      const from: Position[] = [{ x: 10, y: 10 }];
      const to: Position[] = [{ x: 90, y: 90 }];

      const mapping = calculateMorphMapping(from, to, 'manual');
      expect(mapping).toEqual([]);
    });
  });
});

// ============================================================================
// morphFormation
// ============================================================================

describe('morphFormation', () => {
  it('returns target positions mapped by proximity', () => {
    const from: Position[] = [
      { x: 10, y: 50 },
      { x: 90, y: 50 },
    ];
    const to: Position[] = [
      { x: 85, y: 50 },
      { x: 15, y: 50 },
    ];

    const result = morphFormation(from, to, 'proximity');
    expect(result).toHaveLength(2);
    // from[0] (10,50) maps to to[1] (15,50)
    expect(result[0].x).toBe(15);
    // from[1] (90,50) maps to to[0] (85,50)
    expect(result[1].x).toBe(85);
  });

  it('preserves array length from source', () => {
    const from: Position[] = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    const to: Position[] = [
      { x: 90, y: 90 },
      { x: 80, y: 80 },
    ];

    const result = morphFormation(from, to, 'index');
    expect(result).toHaveLength(3);
  });
});

// ============================================================================
// generateCounterMarch
// ============================================================================

describe('generateCounterMarch', () => {
  it('reflects positions across the pivot line', () => {
    const positions: Position[] = [
      { x: 50, y: 30 },
      { x: 50, y: 40 },
    ];
    const pivotY = 50;

    const result = generateCounterMarch(positions, pivotY);
    expect(result).toHaveLength(2);
    // y=30 reflected over y=50: 50 + (50-30) = 70
    expect(result[0].y).toBe(70);
    expect(result[0].x).toBe(50); // x unchanged
    // y=40 reflected over y=50: 50 + (50-40) = 60
    expect(result[1].y).toBe(60);
  });

  it('rotates by 180 degrees', () => {
    const positions: Position[] = [{ x: 50, y: 30, rotation: 0 }];
    const result = generateCounterMarch(positions, 50);
    expect(result[0].rotation).toBe(180);
  });

  it('handles rotation wrapping', () => {
    const positions: Position[] = [{ x: 50, y: 30, rotation: 270 }];
    const result = generateCounterMarch(positions, 50);
    expect(result[0].rotation).toBe(90); // (270 + 180) % 360
  });

  it('handles positions already at the pivot line', () => {
    const positions: Position[] = [{ x: 50, y: 50 }];
    const result = generateCounterMarch(positions, 50);
    expect(result[0].y).toBe(50); // stays at pivot
  });

  it('preserves x coordinates', () => {
    const positions: Position[] = [
      { x: 10, y: 20 },
      { x: 90, y: 80 },
    ];
    const result = generateCounterMarch(positions, 50);
    expect(result[0].x).toBe(10);
    expect(result[1].x).toBe(90);
  });

  it('outputs correct count of positions', () => {
    const positions: Position[] = Array.from({ length: 20 }, (_, i) => ({
      x: i * 5,
      y: 30,
    }));
    const result = generateCounterMarch(positions, 50);
    expect(result).toHaveLength(20);
  });
});

// ============================================================================
// generateSpiral
// ============================================================================

describe('generateSpiral', () => {
  it('generates the correct number of positions', () => {
    const result = generateSpiral(10, {
      center: { x: 50, y: 50 },
      turns: 2,
      startRadius: 5,
      endRadius: 30,
      clockwise: true,
    });
    expect(result).toHaveLength(10);
  });

  it('produces positions within 0-100 range', () => {
    const result = generateSpiral(20, {
      center: { x: 50, y: 50 },
      turns: 3,
      startRadius: 5,
      endRadius: 40,
      clockwise: true,
    });
    expect(positionsInRange(result)).toBe(true);
  });

  it('clamps positions that would exceed field bounds', () => {
    // Large radius that would go out of bounds
    const result = generateSpiral(10, {
      center: { x: 90, y: 90 },
      turns: 1,
      startRadius: 5,
      endRadius: 50,
      clockwise: true,
    });
    expect(positionsInRange(result)).toBe(true);
  });

  it('starts near center with small start radius', () => {
    const result = generateSpiral(5, {
      center: { x: 50, y: 50 },
      turns: 1,
      startRadius: 0,
      endRadius: 30,
      clockwise: true,
    });
    // First position should be at center (radius = 0)
    expect(result[0].x).toBeCloseTo(50, 0);
    expect(result[0].y).toBeCloseTo(50, 0);
  });

  it('handles single performer', () => {
    const result = generateSpiral(1, {
      center: { x: 50, y: 50 },
      turns: 1,
      startRadius: 10,
      endRadius: 30,
      clockwise: true,
    });
    expect(result).toHaveLength(1);
  });

  it('reverses direction for counter-clockwise', () => {
    const cw = generateSpiral(10, {
      center: { x: 50, y: 50 },
      turns: 1,
      startRadius: 10,
      endRadius: 30,
      clockwise: true,
    });
    const ccw = generateSpiral(10, {
      center: { x: 50, y: 50 },
      turns: 1,
      startRadius: 10,
      endRadius: 30,
      clockwise: false,
    });
    // Positions should differ (different winding direction)
    // At least some positions should have different y values
    const yDiffs = cw.map((p, i) => Math.abs(p.y - ccw[i].y));
    expect(yDiffs.some((d) => d > 0.1)).toBe(true);
  });
});

// ============================================================================
// generateStagger
// ============================================================================

describe('generateStagger', () => {
  it('returns empty array for empty input', () => {
    const result = generateStagger([], 5, 0);
    expect(result).toHaveLength(0);
  });

  it('offsets alternating rows by the specified amount', () => {
    // Create positions in 2 clear rows (y=30 and y=70)
    const positions: Position[] = [
      { x: 20, y: 30 },
      { x: 40, y: 30 },
      { x: 60, y: 30 },
      { x: 20, y: 70 },
      { x: 40, y: 70 },
      { x: 60, y: 70 },
    ];

    const result = generateStagger(positions, 5, 0, 'row');
    expect(result).toHaveLength(6);

    // First row (band 0, y=30) should NOT be offset
    expect(result[0].x).toBe(20);
    expect(result[1].x).toBe(40);
    expect(result[2].x).toBe(60);

    // Second row (band 1, y=70) SHOULD be offset by +5 in x
    expect(result[3].x).toBe(25);
    expect(result[4].x).toBe(45);
    expect(result[5].x).toBe(65);
  });

  it('offsets alternating columns when alternateBy is "column"', () => {
    // Create positions in 2 clear columns (x=30 and x=70)
    const positions: Position[] = [
      { x: 30, y: 20 },
      { x: 30, y: 40 },
      { x: 70, y: 20 },
      { x: 70, y: 40 },
    ];

    const result = generateStagger(positions, 0, 5, 'column');
    expect(result).toHaveLength(4);

    // First column (band 0, x=30) should NOT be offset
    expect(result[0].y).toBe(20);
    expect(result[1].y).toBe(40);

    // Second column (band 1, x=70) SHOULD be offset by +5 in y
    expect(result[2].y).toBe(25);
    expect(result[3].y).toBe(45);
  });

  it('clamps positions to 0-100 range', () => {
    const positions: Position[] = [
      { x: 98, y: 50 },
      { x: 98, y: 80 }, // alternate row
    ];

    const result = generateStagger(positions, 10, 0, 'row');
    expect(positionsInRange(result)).toBe(true);
  });

  it('preserves rotation', () => {
    const positions: Position[] = [
      { x: 30, y: 30, rotation: 45 },
      { x: 30, y: 70, rotation: 90 },
    ];

    const result = generateStagger(positions, 5, 0, 'row');
    expect(result[0].rotation).toBe(45);
    expect(result[1].rotation).toBe(90);
  });

  it('handles all performers in the same row', () => {
    const positions: Position[] = [
      { x: 20, y: 50 },
      { x: 40, y: 50 },
      { x: 60, y: 50 },
    ];

    const result = generateStagger(positions, 5, 0, 'row');
    // All in same band (0), so no offset
    expect(result[0].x).toBe(20);
    expect(result[1].x).toBe(40);
    expect(result[2].x).toBe(60);
  });
});

// ============================================================================
// generateParadeGate
// ============================================================================

describe('generateParadeGate', () => {
  it('rotates positions around the pivot point', () => {
    const positions: Position[] = [{ x: 60, y: 50 }];
    const pivot: Position = { x: 50, y: 50 };

    const result = generateParadeGate(positions, pivot, 90);
    expect(result).toHaveLength(1);
    // (60,50) rotated 90 deg around (50,50): dx=10, dy=0
    // rotated: x' = 10*cos(90) - 0*sin(90) = 0, y' = 10*sin(90) + 0*cos(90) = 10
    // final: (50+0, 50+10) = (50, 60)
    expect(result[0].x).toBeCloseTo(50, 0);
    expect(result[0].y).toBeCloseTo(60, 0);
  });

  it('clamps to 0-100 range', () => {
    const positions: Position[] = [{ x: 95, y: 95 }];
    const pivot: Position = { x: 50, y: 50 };

    const result = generateParadeGate(positions, pivot, 45);
    expect(positionsInRange(result)).toBe(true);
  });

  it('adds angle to existing rotation', () => {
    const positions: Position[] = [{ x: 60, y: 50, rotation: 30 }];
    const pivot: Position = { x: 50, y: 50 };

    const result = generateParadeGate(positions, pivot, 90);
    expect(result[0].rotation).toBe(120); // 30 + 90
  });
});

// ============================================================================
// generateSequentialPush
// ============================================================================

describe('generateSequentialPush', () => {
  it('generates frames for each count', () => {
    const positions: Position[] = [
      { x: 50, y: 50 },
      { x: 60, y: 50 },
    ];
    const result = generateSequentialPush(
      positions,
      { direction: 0, delayPerPerformer: 2, distance: 10 },
      8,
    );

    // Should have counts 0 through 8
    expect(result.size).toBe(9);
    expect(result.has(0)).toBe(true);
    expect(result.has(8)).toBe(true);
  });

  it('produces positions within 0-100 range', () => {
    const positions: Position[] = [{ x: 50, y: 50 }];
    const result = generateSequentialPush(
      positions,
      { direction: 0, delayPerPerformer: 0, distance: 10 },
      8,
    );

    for (const [, frame] of result) {
      expect(positionsInRange(frame)).toBe(true);
    }
  });

  it('keeps correct performer count per frame', () => {
    const positions: Position[] = [
      { x: 20, y: 50 },
      { x: 40, y: 50 },
      { x: 60, y: 50 },
    ];
    const result = generateSequentialPush(
      positions,
      { direction: 90, delayPerPerformer: 1, distance: 20 },
      12,
    );

    for (const [, frame] of result) {
      expect(frame).toHaveLength(3);
    }
  });
});

// ============================================================================
// generateFaceToPoint
// ============================================================================

describe('generateFaceToPoint', () => {
  it('rotates all performers to face the target', () => {
    const positions: Position[] = [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ];
    const target: Position = { x: 50, y: 50 };

    const result = generateFaceToPoint(positions, target);
    expect(result).toHaveLength(2);
    // from[0] faces right (toward 50,50): rotation should be 0
    expect(result[0].rotation).toBeCloseTo(0, 0);
    // from[1] faces left: rotation should be 180
    expect(result[1].rotation).toBeCloseTo(180, 0);
  });

  it('preserves x and y positions', () => {
    const positions: Position[] = [{ x: 25, y: 75 }];
    const target: Position = { x: 50, y: 50 };

    const result = generateFaceToPoint(positions, target);
    expect(result[0].x).toBe(25);
    expect(result[0].y).toBe(75);
  });
});

// ============================================================================
// generateFollow
// ============================================================================

describe('generateFollow', () => {
  it('generates frames for all counts', () => {
    const leaderPath: Position[] = [
      { x: 20, y: 50 },
      { x: 50, y: 50 },
      { x: 80, y: 50 },
    ];
    const result = generateFollow(leaderPath, 2, 2, 10);
    expect(result.size).toBe(11); // counts 0-10
  });

  it('includes leader + followers in each frame', () => {
    const leaderPath: Position[] = [
      { x: 20, y: 50 },
      { x: 80, y: 50 },
    ];
    const result = generateFollow(leaderPath, 3, 1, 8);

    for (const [, frame] of result) {
      expect(frame).toHaveLength(4); // 1 leader + 3 followers
    }
  });

  it('followers start at leader start position before their delay', () => {
    const leaderPath: Position[] = [
      { x: 20, y: 50 },
      { x: 80, y: 50 },
    ];
    const result = generateFollow(leaderPath, 2, 4, 12);

    // At count 0, all followers should be at leader start
    const frame0 = result.get(0)!;
    expect(frame0[1].x).toBe(20);
    expect(frame0[2].x).toBe(20);
  });
});

// ============================================================================
// interpolatePositions
// ============================================================================

describe('interpolatePositions', () => {
  it('returns from positions at t=0', () => {
    const from: Position[] = [{ x: 10, y: 20 }];
    const to: Position[] = [{ x: 90, y: 80 }];
    const result = interpolatePositions(from, to, 0);
    expect(result[0].x).toBeCloseTo(10);
    expect(result[0].y).toBeCloseTo(20);
  });

  it('returns to positions at t=1', () => {
    const from: Position[] = [{ x: 10, y: 20 }];
    const to: Position[] = [{ x: 90, y: 80 }];
    const result = interpolatePositions(from, to, 1);
    expect(result[0].x).toBeCloseTo(90);
    expect(result[0].y).toBeCloseTo(80);
  });

  it('returns midpoint at t=0.5', () => {
    const from: Position[] = [{ x: 10, y: 20 }];
    const to: Position[] = [{ x: 90, y: 80 }];
    const result = interpolatePositions(from, to, 0.5);
    expect(result[0].x).toBeCloseTo(50);
    expect(result[0].y).toBeCloseTo(50);
  });

  it('interpolates rotation when both are defined', () => {
    const from: Position[] = [{ x: 50, y: 50, rotation: 0 }];
    const to: Position[] = [{ x: 50, y: 50, rotation: 180 }];
    const result = interpolatePositions(from, to, 0.5);
    expect(result[0].rotation).toBeCloseTo(90);
  });

  it('uses min array length', () => {
    const from: Position[] = [{ x: 10, y: 10 }, { x: 20, y: 20 }];
    const to: Position[] = [{ x: 90, y: 90 }];
    const result = interpolatePositions(from, to, 0.5);
    expect(result).toHaveLength(1);
  });
});
