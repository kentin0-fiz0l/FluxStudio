/**
 * Transition Generator - Generates transition path variants between keyframes
 *
 * Creates 3 transition variants (direct, smooth, sweeping) with different
 * Bezier control point offsets. Estimates collision count at sampled midpoints
 * to help designers choose the safest path.
 */

import type { Position, PathCurve } from './formationTypes';
import {
  defaultCurveControlPoints,
  evaluateCubicBezier,
  detectCollisions,
} from '../utils/drillGeometry';

// ============================================================================
// Types
// ============================================================================

export interface TransitionVariant {
  style: 'direct' | 'smooth' | 'sweeping';
  label: string;
  pathCurves: Map<string, PathCurve>;
  estimatedCollisions: number;
}

// ============================================================================
// Control Point Generation
// ============================================================================

/**
 * Generate control points with perpendicular offset from the straight line.
 * offsetFactor: 0 = straight line, 0.15 = smooth curve, 0.35 = sweeping curve.
 */
function generateOffsetControlPoints(
  p0: Position,
  p1: Position,
  offsetFactor: number,
): PathCurve {
  if (offsetFactor === 0) {
    return defaultCurveControlPoints(p0, p1);
  }

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length < 0.01) {
    return defaultCurveControlPoints(p0, p1);
  }

  // Perpendicular vector (normalized, then scaled by offset)
  const perpX = -dy / length * offsetFactor * length;
  const perpY = dx / length * offsetFactor * length;

  return {
    cp1: {
      x: Math.max(0, Math.min(100, p0.x + dx / 3 + perpX)),
      y: Math.max(0, Math.min(100, p0.y + dy / 3 + perpY)),
    },
    cp2: {
      x: Math.max(0, Math.min(100, p0.x + dx * 2 / 3 + perpX)),
      y: Math.max(0, Math.min(100, p0.y + dy * 2 / 3 + perpY)),
    },
  };
}

// ============================================================================
// Collision Estimation
// ============================================================================

/**
 * Sample positions along Bezier paths at t=0.25, 0.5, 0.75 and count collisions.
 */
function estimateCollisions(
  fromPositions: Map<string, Position>,
  toPositions: Map<string, Position>,
  pathCurves: Map<string, PathCurve>,
  performerIds: string[],
  minDistance: number = 2,
): number {
  const samplePoints = [0.25, 0.5, 0.75];
  let totalCollisions = 0;

  for (const t of samplePoints) {
    const sampledPositions = new Map<string, Position>();

    for (const id of performerIds) {
      const from = fromPositions.get(id);
      const to = toPositions.get(id);
      const curve = pathCurves.get(id);

      if (from && to) {
        if (curve) {
          sampledPositions.set(id, evaluateCubicBezier(t, from, curve.cp1, curve.cp2, to));
        } else {
          // Linear interpolation
          sampledPositions.set(id, {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
          });
        }
      }
    }

    const collisions = detectCollisions(sampledPositions, minDistance);
    totalCollisions += collisions.length;
  }

  return totalCollisions;
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate 3 transition variants between two sets of positions.
 * Each variant has a different curve style and estimated collision count.
 */
export function generateTransitionVariants(
  fromPositions: Map<string, Position>,
  toPositions: Map<string, Position>,
  performerIds: string[],
): TransitionVariant[] {
  const variants: TransitionVariant[] = [];

  const styles: Array<{ style: TransitionVariant['style']; label: string; offsetFactor: number }> = [
    { style: 'direct', label: 'Direct (straight paths)', offsetFactor: 0 },
    { style: 'smooth', label: 'Smooth (gentle curves)', offsetFactor: 0.15 },
    { style: 'sweeping', label: 'Sweeping (wide arcs)', offsetFactor: 0.35 },
  ];

  for (const { style, label, offsetFactor } of styles) {
    const pathCurves = new Map<string, PathCurve>();

    for (const id of performerIds) {
      const from = fromPositions.get(id);
      const to = toPositions.get(id);
      if (from && to) {
        pathCurves.set(id, generateOffsetControlPoints(from, to, offsetFactor));
      }
    }

    const estimatedCollisions = estimateCollisions(
      fromPositions,
      toPositions,
      pathCurves,
      performerIds,
    );

    variants.push({ style, label, pathCurves, estimatedCollisions });
  }

  return variants;
}
