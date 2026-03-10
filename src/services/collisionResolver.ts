/**
 * Collision Resolver - Computes minimal position adjustments to resolve collisions
 *
 * Two modes:
 * - Static: Push apart performers along collision vector (for keyframe positions)
 * - Transition: Offset Bezier control points to avoid mid-path collisions
 */

import type { Position, PathCurve } from './formationTypes';
import type { CollisionPair } from '../utils/drillGeometry';
import {
  detectCollisions,
  evaluateCubicBezier,
  defaultCurveControlPoints,
} from '../utils/drillGeometry';

// ============================================================================
// Types
// ============================================================================

export interface CollisionFix {
  performerAdjustments: Map<string, Position>;
  curveAdjustments?: Map<string, PathCurve>;
  resolvedCount: number;
  maxDisplacement: number;
}

// ============================================================================
// Static Collision Resolution
// ============================================================================

/**
 * Resolve static collisions by iteratively pushing performers apart.
 * Uses the collision vector to push each pair away from each other,
 * clamped to 0-100 bounds.
 */
export function resolveStaticCollisions(
  positions: Map<string, Position>,
  collisionPairs: CollisionPair[],
  minDistance: number = 2,
): CollisionFix {
  // Clone positions for adjustment
  const adjusted = new Map<string, Position>();
  for (const [id, pos] of positions) {
    adjusted.set(id, { x: pos.x, y: pos.y });
  }

  let maxDisplacement = 0;
  const iterations = 5;

  for (let iter = 0; iter < iterations; iter++) {
    const currentCollisions = iter === 0
      ? collisionPairs
      : detectCollisions(adjusted, minDistance);

    if (currentCollisions.length === 0) break;

    for (const pair of currentCollisions) {
      const pos1 = adjusted.get(pair.id1);
      const pos2 = adjusted.get(pair.id2);
      if (!pos1 || !pos2) continue;

      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.01) {
        // Overlapping: push apart in arbitrary direction
        const offset = minDistance / 2;
        pos1.x = clamp(pos1.x - offset, 0, 100);
        pos2.x = clamp(pos2.x + offset, 0, 100);
        maxDisplacement = Math.max(maxDisplacement, offset);
        continue;
      }

      // Push apart along collision vector
      const overlap = minDistance - dist;
      if (overlap <= 0) continue;

      const pushX = (dx / dist) * (overlap / 2);
      const pushY = (dy / dist) * (overlap / 2);

      pos1.x = clamp(pos1.x - pushX, 0, 100);
      pos1.y = clamp(pos1.y - pushY, 0, 100);
      pos2.x = clamp(pos2.x + pushX, 0, 100);
      pos2.y = clamp(pos2.y + pushY, 0, 100);

      const displacement = Math.sqrt(pushX * pushX + pushY * pushY);
      maxDisplacement = Math.max(maxDisplacement, displacement);
    }
  }

  // Count how many of the original collisions were resolved
  const remainingCollisions = detectCollisions(adjusted, minDistance);
  const resolvedCount = collisionPairs.length - remainingCollisions.length;

  return {
    performerAdjustments: adjusted,
    resolvedCount,
    maxDisplacement,
  };
}

// ============================================================================
// Transition Collision Resolution
// ============================================================================

/**
 * Resolve transition collisions by offsetting Bezier control points
 * perpendicular to the collision vector at sampled midpoints.
 */
export function resolveTransitionCollisions(
  fromPositions: Map<string, Position>,
  toPositions: Map<string, Position>,
  pathCurves: Map<string, PathCurve>,
  collisionPairs: CollisionPair[],
  minDistance: number = 2,
): CollisionFix {
  // Clone existing curves (or create defaults)
  const adjustedCurves = new Map<string, PathCurve>();
  const allIds = new Set([...fromPositions.keys(), ...toPositions.keys()]);

  for (const id of allIds) {
    const existing = pathCurves.get(id);
    const from = fromPositions.get(id);
    const to = toPositions.get(id);
    if (from && to) {
      if (existing) {
        adjustedCurves.set(id, {
          cp1: { ...existing.cp1 },
          cp2: { ...existing.cp2 },
        });
      } else {
        adjustedCurves.set(id, defaultCurveControlPoints(from, to));
      }
    }
  }

  let maxDisplacement = 0;
  const samplePoints = [0.25, 0.5, 0.75];

  // For each collision pair, find which sample point has the closest approach
  // and offset control points perpendicular to the collision vector
  for (const pair of collisionPairs) {
    const from1 = fromPositions.get(pair.id1);
    const from2 = fromPositions.get(pair.id2);
    const to1 = toPositions.get(pair.id1);
    const to2 = toPositions.get(pair.id2);
    const curve1 = adjustedCurves.get(pair.id1);
    const curve2 = adjustedCurves.get(pair.id2);

    if (!from1 || !from2 || !to1 || !to2 || !curve1 || !curve2) continue;

    // Find the sample point with smallest distance
    let worstT = 0.5;
    let worstDist = Infinity;

    for (const t of samplePoints) {
      const p1 = evaluateCubicBezier(t, from1, curve1.cp1, curve1.cp2, to1);
      const p2 = evaluateCubicBezier(t, from2, curve2.cp1, curve2.cp2, to2);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < worstDist) {
        worstDist = dist;
        worstT = t;
      }
    }

    if (worstDist >= minDistance) continue;

    // Compute collision vector at worst point
    const p1 = evaluateCubicBezier(worstT, from1, curve1.cp1, curve1.cp2, to1);
    const p2 = evaluateCubicBezier(worstT, from2, curve2.cp1, curve2.cp2, to2);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Perpendicular offset
    const overlap = minDistance - dist;
    const offsetMagnitude = overlap * 0.6; // slightly more than needed for margin

    if (dist < 0.01) {
      // Overlapping: offset in perpendicular to path direction
      const pathDx = to1.x - from1.x;
      const pathDy = to1.y - from1.y;
      const pathLen = Math.sqrt(pathDx * pathDx + pathDy * pathDy);
      if (pathLen > 0.01) {
        const perpX = -pathDy / pathLen * offsetMagnitude;
        const perpY = pathDx / pathLen * offsetMagnitude;
        offsetControlPoints(curve1, -perpX, -perpY);
        offsetControlPoints(curve2, perpX, perpY);
      }
    } else {
      // Perpendicular to collision vector
      const nx = -dy / dist;
      const ny = dx / dist;
      const perpX = nx * offsetMagnitude;
      const perpY = ny * offsetMagnitude;
      offsetControlPoints(curve1, -perpX, -perpY);
      offsetControlPoints(curve2, perpX, perpY);
    }

    maxDisplacement = Math.max(maxDisplacement, offsetMagnitude);
  }

  // Count resolved collisions by re-sampling
  let resolvedCount = 0;
  for (const pair of collisionPairs) {
    const from1 = fromPositions.get(pair.id1);
    const from2 = fromPositions.get(pair.id2);
    const to1 = toPositions.get(pair.id1);
    const to2 = toPositions.get(pair.id2);
    const curve1 = adjustedCurves.get(pair.id1);
    const curve2 = adjustedCurves.get(pair.id2);

    if (!from1 || !from2 || !to1 || !to2 || !curve1 || !curve2) continue;

    let stillColliding = false;
    for (const t of samplePoints) {
      const p1 = evaluateCubicBezier(t, from1, curve1.cp1, curve1.cp2, to1);
      const p2 = evaluateCubicBezier(t, from2, curve2.cp1, curve2.cp2, to2);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
        stillColliding = true;
        break;
      }
    }
    if (!stillColliding) resolvedCount++;
  }

  return {
    performerAdjustments: toPositions, // Transition fixes don't change endpoint positions
    curveAdjustments: adjustedCurves,
    resolvedCount,
    maxDisplacement,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function offsetControlPoints(curve: PathCurve, dx: number, dy: number): void {
  curve.cp1.x = clamp(curve.cp1.x + dx, 0, 100);
  curve.cp1.y = clamp(curve.cp1.y + dy, 0, 100);
  curve.cp2.x = clamp(curve.cp2.x + dx, 0, 100);
  curve.cp2.y = clamp(curve.cp2.y + dy, 0, 100);
}
