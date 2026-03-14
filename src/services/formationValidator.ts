/**
 * Formation Feasibility Validator
 *
 * Pure validation functions that check formation positions for spacing violations,
 * step size issues, and transition collisions. Returns structured warnings
 * that can be displayed in the UI.
 */

import type { Position } from './formationTypes';

export interface FormationWarning {
  severity: 'info' | 'warning' | 'error';
  message: string;
  performerIds: string[];
}

// ============================================================================
// Helpers
// ============================================================================

/** Convert Map or Record to entries array */
function toEntries(positions: Map<string, Position> | Record<string, Position>): [string, Position][] {
  if (positions instanceof Map) {
    return Array.from(positions.entries());
  }
  return Object.entries(positions);
}

/** Euclidean distance between two positions */
function distance(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Linearly interpolate between two positions at parameter t (0..1) */
function lerp(a: Position, b: Position, t: number): Position {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ============================================================================
// Spacing Validation
// ============================================================================

/**
 * Check Euclidean distance between all performer pairs.
 * Warn if any pair is < minSpacing units apart.
 * Positions are in normalized 0-100 field coordinates (1 unit ~ 1 yard).
 */
export function validateSpacing(
  positions: Map<string, Position> | Record<string, Position>,
  minSpacing = 2,
): FormationWarning[] {
  const entries = toEntries(positions);
  const warnings: FormationWarning[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [idA, posA] = entries[i];
      const [idB, posB] = entries[j];
      const dist = distance(posA, posB);

      if (dist < minSpacing) {
        warnings.push({
          severity: dist < minSpacing * 0.5 ? 'error' : 'warning',
          message: `Performers ${idA} and ${idB} are only ${dist.toFixed(1)} yards apart (min ${minSpacing})`,
          performerIds: [idA, idB],
        });
      }
    }
  }

  return warnings;
}

// ============================================================================
// Step Size Validation
// ============================================================================

/**
 * Check if a movement distance over given counts at given tempo exceeds
 * the sprinting threshold.
 *
 * Standard: 8-to-5 step = 22.5 inches per count at 120 BPM.
 * On a 100-unit field (100 yards), 22.5 inches = 22.5/36 yards = 0.625 units.
 * The threshold scales inversely with tempo (faster tempo = smaller steps).
 */
export function validateStepSize(
  dist: number,
  counts: number,
  tempo = 120,
): FormationWarning[] {
  if (counts <= 0) return [];

  const distPerCount = dist / counts;
  // 0.625 units/count at 120 BPM is the standard 8-to-5 step
  const sprintThreshold = 0.625 * (120 / tempo);

  const warnings: FormationWarning[] = [];

  if (distPerCount > sprintThreshold * 2) {
    warnings.push({
      severity: 'error',
      message: `Step size ${distPerCount.toFixed(2)} units/count far exceeds standard (${sprintThreshold.toFixed(2)}). Physically impossible.`,
      performerIds: [],
    });
  } else if (distPerCount > sprintThreshold) {
    warnings.push({
      severity: 'warning',
      message: `Step size ${distPerCount.toFixed(2)} units/count exceeds standard 8-to-5 (${sprintThreshold.toFixed(2)}). Requires sprinting.`,
      performerIds: [],
    });
  }

  return warnings;
}

// ============================================================================
// Transition Validation
// ============================================================================

/**
 * Validate transitions between two keyframes.
 * Checks for:
 * - Path collisions (performers crossing each other during transition)
 * - Step size violations per performer
 */
export function validateTransitions(
  keyframeA: Map<string, Position> | Record<string, Position>,
  keyframeB: Map<string, Position> | Record<string, Position>,
  counts: number,
  tempo = 120,
): FormationWarning[] {
  const entriesA = toEntries(keyframeA);
  const mapB = keyframeB instanceof Map ? keyframeB : new Map(Object.entries(keyframeB));
  const warnings: FormationWarning[] = [];

  // Check step sizes for each performer
  for (const [id, posA] of entriesA) {
    const posB = mapB.get(id);
    if (!posB) continue;

    const dist = distance(posA, posB);
    const stepWarnings = validateStepSize(dist, counts, tempo);
    for (const w of stepWarnings) {
      warnings.push({
        ...w,
        message: `${id}: ${w.message}`,
        performerIds: [id],
      });
    }
  }

  // Check for path crossings by sampling positions at intervals
  const samples = 10;
  const performerPairs: [string, Position, Position][] = entriesA
    .filter(([id]) => mapB.has(id))
    .map(([id, posA]) => [id, posA, mapB.get(id)!]);

  for (let step = 1; step < samples; step++) {
    const t = step / samples;

    for (let i = 0; i < performerPairs.length; i++) {
      const [idA, startA, endA] = performerPairs[i];
      const interpA = lerp(startA, endA, t);

      for (let j = i + 1; j < performerPairs.length; j++) {
        const [idB, startB, endB] = performerPairs[j];
        const interpB = lerp(startB, endB, t);

        if (distance(interpA, interpB) < 1.5) {
          warnings.push({
            severity: 'warning',
            message: `${idA} and ${idB} paths cross near ${Math.round(t * 100)}% of transition`,
            performerIds: [idA, idB],
          });
          // Only report first crossing per pair
          break;
        }
      }
    }
  }

  // Deduplicate path crossing warnings per pair
  const seenPairs = new Set<string>();
  return warnings.filter(w => {
    if (w.performerIds.length === 2) {
      const key = w.performerIds.sort().join(':');
      if (seenPairs.has(key) && w.message.includes('paths cross')) return false;
      seenPairs.add(key);
    }
    return true;
  });
}

// ============================================================================
// Combined Validation
// ============================================================================

/**
 * Run all validations on a set of positions and optional transitions.
 */
export function validateFormation(
  positions: Map<string, Position> | Record<string, Position>,
  nextPositions?: Map<string, Position> | Record<string, Position>,
  counts?: number,
  tempo?: number,
): FormationWarning[] {
  const warnings: FormationWarning[] = [];

  // Static spacing check
  warnings.push(...validateSpacing(positions));

  // Transition checks
  if (nextPositions && counts && counts > 0) {
    warnings.push(...validateTransitions(positions, nextPositions, counts, tempo));
  }

  return warnings;
}
