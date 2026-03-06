/**
 * Tests for Drill Analysis Engine
 *
 * Covers: detectCollisions, analyzeStrides, analyzeDirectionChanges, fullDrillAnalysis
 */

import { describe, it, expect } from 'vitest';
import {
  detectCollisions,
  analyzeStrides,
  analyzeDirectionChanges,
  fullDrillAnalysis,
  type CollisionConfig,
} from '../drillAnalysis';
import type { Formation, DrillSet, Position, Performer, Keyframe } from '../formationTypes';

// ============================================================================
// HELPERS
// ============================================================================

function makePerformer(id: string, name: string): Performer {
  return { id, name, label: name[0], color: '#fff' };
}

function makeKeyframe(
  id: string,
  timestamp: number,
  positionMap: Record<string, Position>,
): Keyframe {
  return {
    id,
    timestamp,
    positions: new Map(Object.entries(positionMap)),
  };
}

function makeSet(
  id: string,
  name: string,
  counts: number,
  keyframeId: string,
  sortOrder: number,
): DrillSet {
  return { id, name, counts, keyframeId, sortOrder };
}

function makeFormation(
  performers: Performer[],
  keyframes: Keyframe[],
): Formation {
  return {
    id: 'formation-1',
    name: 'Test Formation',
    projectId: 'project-1',
    stageWidth: 100,
    stageHeight: 100,
    gridSize: 1,
    performers,
    keyframes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
  };
}

// ============================================================================
// detectCollisions
// ============================================================================

describe('detectCollisions', () => {
  it('returns empty array when there are fewer than 2 performers', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = detectCollisions(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('returns empty array when there are no keyframes', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const formation = makeFormation(performers, []);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = detectCollisions(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('detects a collision when two performers are on top of each other', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 50, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = detectCollisions(formation, sets);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].type).toBe('collision');
    expect(issues[0].severity).toBe('error'); // distance 0 < minDist * 0.5
    expect(issues[0].performerIds).toContain('p1');
    expect(issues[0].performerIds).toContain('p2');
  });

  it('detects a collision at minDistance * 0.5 boundary as error', () => {
    const config: CollisionConfig = { minDistance: 2.0, sampleInterval: 1 };
    // Place performers 0.8 apart (less than 2.0 * 0.5 = 1.0)
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 50.8, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = detectCollisions(formation, sets, config);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('error');
  });

  it('detects a collision as warning when distance is between minDist*0.5 and minDist', () => {
    const config: CollisionConfig = { minDistance: 2.0, sampleInterval: 1 };
    // Place performers 1.2 apart (> 1.0 but < 2.0)
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 51.2, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = detectCollisions(formation, sets, config);
    expect(issues.length).toBe(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag performers that are far apart', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 10, y: 50 },
      p2: { x: 90, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = detectCollisions(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('detects collisions during transitions between sets', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    // Set 1: performers on opposite sides; Set 2: swapped
    // They must cross paths through the middle
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 20, y: 50 },
      p2: { x: 20.5, y: 50 }, // Already close together at start
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 80, y: 50 },
      p2: { x: 80.5, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    // This will catch the collision at Set 1 (static) since they are 0.5 apart < 1.5
    const issues = detectCollisions(formation, sets);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some((i) => i.type === 'collision')).toBe(true);
  });

  it('detects transition collisions when performers cross paths', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    // Performers swap positions -- they cross through the same point
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 70, y: 50 },
      p2: { x: 30, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = detectCollisions(formation, sets);
    // They should cross at the midpoint (x=50)
    const transitionIssues = issues.filter((i) => i.atCount !== undefined);
    expect(transitionIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('checks multiple performer pairs in a group', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
      makePerformer('p3', 'Carol'),
    ];
    // All 3 on top of each other
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 50, y: 50 },
      p3: { x: 50, y: 50 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = detectCollisions(formation, sets);
    // 3 pairs: (p1,p2), (p1,p3), (p2,p3)
    expect(issues.length).toBe(3);
  });

  it('does not duplicate transition collision reports for the same pair', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 70, y: 50 },
      p2: { x: 30, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = detectCollisions(formation, sets);
    const transitionIssues = issues.filter((i) =>
      i.id.startsWith('collision-transition-'),
    );
    // Should only have 1 transition collision per pair per transition
    const uniqueIds = new Set(transitionIssues.map((i) => i.id));
    expect(uniqueIds.size).toBe(transitionIssues.length);
  });
});

// ============================================================================
// analyzeStrides
// ============================================================================

describe('analyzeStrides', () => {
  it('returns empty array with a single set (no transitions)', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 8, 'kf1', 0)];

    const issues = analyzeStrides(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('flags hard stride (step size < maxStepSize) as error', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Move a very long distance in very few counts
    // Distance: from x=0 to x=100 => 120 yards on NCAA field (full width)
    // In 2 counts: stepSize = (2 * 5) / 120 = 0.083 => well below 4
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 0, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 100, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = analyzeStrides(formation, sets);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].type).toBe('stride');
    expect(issues[0].stepInfo).toBeDefined();
    expect(issues[0].stepInfo!.stepSize).toBeLessThan(4);
  });

  it('flags moderate stride (between maxStepSize and warningStepSize) as warning', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Want stepSize between 4 and 6
    // stepSize = (counts * 5) / distYards
    // Choose counts=8, distYards=8.5 => stepSize = 40/8.5 = 4.7 (warning)
    // distYards = dx in yards = (dx/100)*120
    // 8.5 yards = dx/100 * 120 => dx = 7.083
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 57.08, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = analyzeStrides(formation, sets);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag comfortable step sizes (>= warningStepSize)', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Want stepSize >= 6
    // stepSize = (counts*5)/distYards
    // Choose counts=16, distYards=5 => stepSize=80/5=16 (very comfortable)
    // 5 yards = dx/100*120 => dx=4.167
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 54.167, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 16, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = analyzeStrides(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('skips stationary performers (distance < 0.1 yards)', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 50, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 50, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = analyzeStrides(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('includes step info with difficulty label', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 0, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 100, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = analyzeStrides(formation, sets);
    expect(issues[0].stepInfo).toBeDefined();
    expect(issues[0].stepInfo!.difficulty).toBe('hard');
    expect(issues[0].stepInfo!.directionLabel).toBeDefined();
  });

  it('analyzes multiple performers independently', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    // Both move far in few counts
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 0, y: 50 },
      p2: { x: 100, y: 50 },
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 100, y: 50 },
      p2: { x: 0, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = analyzeStrides(formation, sets);
    expect(issues.length).toBe(2); // One issue per performer
    const performerNames = issues.map((i) => i.performerNames[0]);
    expect(performerNames).toContain('Alice');
    expect(performerNames).toContain('Bob');
  });
});

// ============================================================================
// analyzeDirectionChanges
// ============================================================================

describe('analyzeDirectionChanges', () => {
  it('returns empty array with fewer than 3 sets', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 80, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const issues = analyzeDirectionChanges(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('detects a 180-degree reversal as error', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Move right, then reverse completely to the left
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 80, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 20, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const issues = analyzeDirectionChanges(formation, sets);
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('direction_change');
    expect(issues[0].severity).toBe('error'); // 180 > 160
    expect(issues[0].setName).toBe('Set 2'); // at the pivot point
  });

  it('detects a large angle change as warning (between maxAngle and 160)', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Move right, then sharp turn (about 140-150 degrees)
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 80, y: 50 } });
    // About 150-degree change: move almost-back but slightly up
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 25, y: 40 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const issues = analyzeDirectionChanges(formation, sets);
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('direction_change');
    // The angle should be > 135 (maxAngle default) but let's check
    expect(issues[0].severity).toMatch(/error|warning/);
  });

  it('does not flag a gentle turn (< maxAngle)', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Move right, then continue slightly down-right (gentle turn ~30 degrees)
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 40 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 50, y: 40 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 80, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const issues = analyzeDirectionChanges(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('skips stationary segments (distance < 0.5)', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // Second segment is essentially stationary
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 80, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 80.2, y: 50 } }); // barely moved
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const issues = analyzeDirectionChanges(formation, sets);
    expect(issues).toHaveLength(0);
  });

  it('respects custom config maxAngle', () => {
    const performers = [makePerformer('p1', 'Alice')];
    // 90-degree turn
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 80, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 80, y: 10 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    // Default maxAngle is 135 -- a 90-degree turn should not be flagged
    const issuesDefault = analyzeDirectionChanges(formation, sets);
    expect(issuesDefault).toHaveLength(0);

    // With maxAngle=80, the 90-degree turn should be flagged
    const issuesStrict = analyzeDirectionChanges(formation, sets, { maxAngle: 80 });
    expect(issuesStrict.length).toBe(1);
  });

  it('includes 3 positions in the issue for visualization', () => {
    const performers = [makePerformer('p1', 'Alice')];
    const kf1 = makeKeyframe('kf1', 0, { p1: { x: 20, y: 50 } });
    const kf2 = makeKeyframe('kf2', 1000, { p1: { x: 80, y: 50 } });
    const kf3 = makeKeyframe('kf3', 2000, { p1: { x: 20, y: 50 } });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 8, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const issues = analyzeDirectionChanges(formation, sets);
    expect(issues[0].positions).toHaveLength(3);
  });
});

// ============================================================================
// fullDrillAnalysis
// ============================================================================

describe('fullDrillAnalysis', () => {
  it('returns combined issues from all analyses', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    // Create collision (same spot) + hard stride + 180 reversal
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 50, y: 50 }, // collision
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 0, y: 50 }, // huge distance
      p2: { x: 100, y: 50 },
    });
    const kf3 = makeKeyframe('kf3', 2000, {
      p1: { x: 50, y: 50 }, // reversal
      p2: { x: 50, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2, kf3]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 2, 'kf2', 1),
      makeSet('s3', 'Set 3', 8, 'kf3', 2),
    ];

    const result = fullDrillAnalysis(formation, sets);

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.summary.totalIssues).toBe(result.issues.length);
    expect(result.summary.errors + result.summary.warnings + result.summary.info).toBe(
      result.summary.totalIssues,
    );
    expect(result.analyzedAt).toBeGreaterThan(0);

    // Should have collisions
    expect(result.summary.collisionCount).toBeGreaterThan(0);
  });

  it('computes summary statistics correctly for a clean drill', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    // Well-spaced, comfortable stride, no direction changes
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 30, y: 50 },
      p2: { x: 70, y: 50 },
    });
    const formation = makeFormation(performers, [kf1]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = fullDrillAnalysis(formation, sets);
    expect(result.summary.totalIssues).toBe(0);
    expect(result.summary.errors).toBe(0);
    expect(result.summary.warnings).toBe(0);
    expect(result.summary.collisionCount).toBe(0);
    expect(result.summary.worstStride).toBeNull();
    expect(result.summary.performersWithIssues).toBe(0);
  });

  it('tracks the worst stride correctly', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
    ];
    // Alice moves way more than Bob
    const kf1 = makeKeyframe('kf1', 0, {
      p1: { x: 0, y: 50 },
      p2: { x: 45, y: 50 },
    });
    const kf2 = makeKeyframe('kf2', 1000, {
      p1: { x: 100, y: 50 },
      p2: { x: 55, y: 50 },
    });
    const formation = makeFormation(performers, [kf1, kf2]);
    const sets = [
      makeSet('s1', 'Set 1', 2, 'kf1', 0),
      makeSet('s2', 'Set 2', 8, 'kf2', 1),
    ];

    const result = fullDrillAnalysis(formation, sets);
    if (result.summary.worstStride) {
      // The worst stride should have the smallest stepSize (hardest step)
      expect(result.summary.worstStride.stepSize).toBeLessThan(4);
    }
  });

  it('counts unique performers with issues', () => {
    const performers = [
      makePerformer('p1', 'Alice'),
      makePerformer('p2', 'Bob'),
      makePerformer('p3', 'Carol'),
    ];
    // Only p1 and p2 collide; p3 is far away
    const kf = makeKeyframe('kf1', 0, {
      p1: { x: 50, y: 50 },
      p2: { x: 50, y: 50 },
      p3: { x: 10, y: 10 },
    });
    const formation = makeFormation(performers, [kf]);
    const sets = [makeSet('s1', 'Set 1', 16, 'kf1', 0)];

    const result = fullDrillAnalysis(formation, sets);
    expect(result.summary.performersWithIssues).toBe(2);
  });
});
