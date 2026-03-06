/**
 * Movement Tools Service - FluxStudio
 *
 * Advanced movement tools for drill writing productivity.
 * Provides morph, sequential push, counter march, parade gate,
 * spiral, stagger, face-to-point, and follow-the-leader operations.
 */

import type { Position } from './formationTypes';

// ============================================================================
// TYPES
// ============================================================================

export type MorphMethod = 'proximity' | 'index' | 'manual';

export interface MorphMapping {
  fromIndex: number;
  toIndex: number;
}

export interface SequentialPushOptions {
  direction: number; // degrees
  delayPerPerformer: number; // counts between each performer starting
  distance: number; // normalized distance to move
}

export interface SpiralOptions {
  center: Position;
  turns: number;
  startRadius: number;
  endRadius: number;
  clockwise: boolean;
}

// ============================================================================
// FORMATION MORPH
// ============================================================================

/**
 * Map performers from one formation to another using the specified method.
 * Returns the mapping (source index -> target index).
 */
export function calculateMorphMapping(
  fromPositions: Position[],
  toPositions: Position[],
  method: MorphMethod,
  manualMapping?: MorphMapping[],
): MorphMapping[] {
  const count = Math.min(fromPositions.length, toPositions.length);

  switch (method) {
    case 'index':
      return Array.from({ length: count }, (_, i) => ({ fromIndex: i, toIndex: i }));

    case 'manual':
      return manualMapping ?? [];

    case 'proximity':
    default:
      return proximityMatch(fromPositions, toPositions);
  }
}

/**
 * Match performers from source to target by closest proximity (greedy).
 */
function proximityMatch(from: Position[], to: Position[]): MorphMapping[] {
  const count = Math.min(from.length, to.length);
  const usedTargets = new Set<number>();
  const mappings: MorphMapping[] = [];

  // Build distance matrix
  const distances: { fromIdx: number; toIdx: number; dist: number }[] = [];
  for (let i = 0; i < from.length; i++) {
    for (let j = 0; j < to.length; j++) {
      const dx = from[i].x - to[j].x;
      const dy = from[i].y - to[j].y;
      distances.push({ fromIdx: i, toIdx: j, dist: Math.sqrt(dx * dx + dy * dy) });
    }
  }

  // Sort by distance (greedy nearest-first)
  distances.sort((a, b) => a.dist - b.dist);

  const usedSources = new Set<number>();
  for (const d of distances) {
    if (mappings.length >= count) break;
    if (usedSources.has(d.fromIdx) || usedTargets.has(d.toIdx)) continue;

    mappings.push({ fromIndex: d.fromIdx, toIndex: d.toIdx });
    usedSources.add(d.fromIdx);
    usedTargets.add(d.toIdx);
  }

  return mappings;
}

/**
 * Apply a morph mapping to generate target positions for source performers.
 */
export function morphFormation(
  fromPositions: Position[],
  toPositions: Position[],
  method: MorphMethod,
  manualMapping?: MorphMapping[],
): Position[] {
  const mapping = calculateMorphMapping(fromPositions, toPositions, method, manualMapping);
  const result = [...fromPositions];

  for (const { fromIndex, toIndex } of mapping) {
    if (fromIndex < result.length && toIndex < toPositions.length) {
      result[fromIndex] = { ...toPositions[toIndex] };
    }
  }

  return result;
}

// ============================================================================
// SEQUENTIAL PUSH
// ============================================================================

/**
 * Generate a sequential push: performers move one by one in order.
 * Returns an array of position arrays, one per count/frame.
 * Each performer starts moving `delay` counts after the previous.
 */
export function generateSequentialPush(
  positions: Position[],
  options: SequentialPushOptions,
  totalCounts: number,
): Map<number, Position[]> {
  const { direction, delayPerPerformer, distance } = options;
  const dirRad = (direction * Math.PI) / 180;
  const dx = Math.cos(dirRad) * distance;
  const dy = Math.sin(dirRad) * distance;
  const result = new Map<number, Position[]>();

  for (let count = 0; count <= totalCounts; count++) {
    const frame: Position[] = positions.map((pos, i) => {
      const startCount = i * delayPerPerformer;
      const moveDuration = totalCounts - positions.length * delayPerPerformer;
      const effectiveDuration = Math.max(1, moveDuration);

      if (count < startCount) {
        return { ...pos };
      }

      const progress = Math.min(1, (count - startCount) / effectiveDuration);
      return {
        x: Math.max(0, Math.min(100, pos.x + dx * progress)),
        y: Math.max(0, Math.min(100, pos.y + dy * progress)),
        rotation: pos.rotation,
      };
    });

    result.set(count, frame);
  }

  return result;
}

// ============================================================================
// COUNTER MARCH
// ============================================================================

/**
 * Generate a counter march: performers reverse direction at a pivot line.
 * The pivot line is defined by a y-position (horizontal line).
 */
export function generateCounterMarch(
  positions: Position[],
  pivotLineY: number,
): Position[] {
  return positions.map((pos) => ({
    x: pos.x,
    y: pivotLineY + (pivotLineY - pos.y),
    rotation: pos.rotation !== undefined ? (pos.rotation + 180) % 360 : undefined,
  }));
}

// ============================================================================
// PARADE GATE
// ============================================================================

/**
 * Generate a parade gate turn: performers pivot around a point.
 * @param positions - Current positions
 * @param pivot - Pivot point
 * @param angle - Rotation angle in degrees
 */
export function generateParadeGate(
  positions: Position[],
  pivot: Position,
  angle: number,
): Position[] {
  const radians = (angle * Math.PI) / 180;

  return positions.map((pos) => {
    const dx = pos.x - pivot.x;
    const dy = pos.y - pivot.y;
    const rotatedX = dx * Math.cos(radians) - dy * Math.sin(radians);
    const rotatedY = dx * Math.sin(radians) + dy * Math.cos(radians);

    return {
      x: Math.max(0, Math.min(100, pivot.x + rotatedX)),
      y: Math.max(0, Math.min(100, pivot.y + rotatedY)),
      rotation: pos.rotation !== undefined ? (pos.rotation + angle + 360) % 360 : undefined,
    };
  });
}

// ============================================================================
// SPIRAL
// ============================================================================

/**
 * Generate positions in a spiral pattern.
 */
export function generateSpiral(
  count: number,
  options: SpiralOptions,
): Position[] {
  const { center, turns, startRadius, endRadius, clockwise } = options;
  const totalAngle = turns * 2 * Math.PI;

  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1);
    const angle = t * totalAngle * (clockwise ? 1 : -1);
    const radius = startRadius + (endRadius - startRadius) * t;

    return {
      x: Math.max(0, Math.min(100, center.x + Math.cos(angle) * radius)),
      y: Math.max(0, Math.min(100, center.y + Math.sin(angle) * radius)),
    };
  });
}

// ============================================================================
// STAGGER
// ============================================================================

/**
 * Apply a stagger offset to alternating rows or columns.
 * Detects approximate rows/columns from positions.
 */
export function generateStagger(
  positions: Position[],
  offsetX: number,
  offsetY: number,
  alternateBy: 'row' | 'column' = 'row',
): Position[] {
  if (positions.length === 0) return [];

  // Detect rows or columns by clustering Y (for rows) or X (for columns)
  const tolerance = 3; // normalized units
  const axis = alternateBy === 'row' ? 'y' : 'x';

  // Sort by axis and group into bands
  const sorted = positions.map((p, i) => ({ ...p, _idx: i })).sort((a, b) => a[axis] - b[axis]);
  let bandIndex = 0;
  const bands = new Map<number, number>(); // original index -> band index
  let lastValue = sorted[0][axis];
  bands.set(sorted[0]._idx, 0);

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i][axis] - lastValue) > tolerance) {
      bandIndex++;
      lastValue = sorted[i][axis];
    }
    bands.set(sorted[i]._idx, bandIndex);
  }

  return positions.map((pos, i) => {
    const band = bands.get(i) ?? 0;
    const isAlternate = band % 2 === 1;

    return {
      x: Math.max(0, Math.min(100, pos.x + (isAlternate ? offsetX : 0))),
      y: Math.max(0, Math.min(100, pos.y + (isAlternate ? offsetY : 0))),
      rotation: pos.rotation,
    };
  });
}

// ============================================================================
// FACE TO POINT
// ============================================================================

/**
 * Rotate all performers to face a target point.
 */
export function generateFaceToPoint(
  positions: Position[],
  target: Position,
): Position[] {
  return positions.map((pos) => {
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Normalize to 0-360
    const rotation = ((angle % 360) + 360) % 360;

    return { ...pos, rotation };
  });
}

// ============================================================================
// FOLLOW THE LEADER
// ============================================================================

/**
 * Generate follow-the-leader positions: followers trace the leader's path
 * with a delay.
 * @param leaderPath - Array of positions the leader takes over time
 * @param followerCount - Number of followers
 * @param delayPerFollower - Counts of delay between each follower
 * @param totalCounts - Total counts in the transition
 * @returns Map of count -> array of all positions (leader + followers)
 */
export function generateFollow(
  leaderPath: Position[],
  followerCount: number,
  delayPerFollower: number,
  totalCounts: number,
): Map<number, Position[]> {
  const result = new Map<number, Position[]>();

  for (let count = 0; count <= totalCounts; count++) {
    const frame: Position[] = [];

    // Leader position at this count
    const leaderT = Math.min(1, count / Math.max(1, totalCounts));
    const leaderIdx = Math.min(leaderPath.length - 1, Math.floor(leaderT * (leaderPath.length - 1)));
    frame.push({ ...leaderPath[leaderIdx] });

    // Each follower follows the leader's path with a delay
    for (let f = 0; f < followerCount; f++) {
      const followerCount_val = count - (f + 1) * delayPerFollower;

      if (followerCount_val <= 0) {
        // Follower hasn't started yet, stays at leader's start position
        frame.push({ ...leaderPath[0] });
      } else {
        const followerT = Math.min(1, followerCount_val / Math.max(1, totalCounts));
        const followerIdx = Math.min(leaderPath.length - 1, Math.floor(followerT * (leaderPath.length - 1)));
        frame.push({ ...leaderPath[followerIdx] });
      }
    }

    result.set(count, frame);
  }

  return result;
}

// ============================================================================
// UTILITY: INTERPOLATE POSITIONS
// ============================================================================

/**
 * Generate intermediate positions between two position arrays.
 * Useful for previewing transitions.
 */
export function interpolatePositions(
  from: Position[],
  to: Position[],
  t: number,
): Position[] {
  const count = Math.min(from.length, to.length);
  return Array.from({ length: count }, (_, i) => ({
    x: from[i].x + (to[i].x - from[i].x) * t,
    y: from[i].y + (to[i].y - from[i].y) * t,
    rotation: from[i].rotation !== undefined && to[i].rotation !== undefined
      ? from[i].rotation! + (to[i].rotation! - from[i].rotation!) * t
      : to[i].rotation ?? from[i].rotation,
  }));
}
