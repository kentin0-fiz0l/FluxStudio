/**
 * Field Notation - FluxDrill DSL
 *
 * Converts normalized coordinates (0-100) to standard drill field notation
 * (e.g., "R35, front-hash") and provides step/yard conversion helpers.
 */

import type { FieldConfig } from '../formationTypes';
import type { DslFieldPos } from './fluxDrillTypes';

// ============================================================================
// Constants
// ============================================================================

/** 8-to-5 marching: 1 step = 5/8 yard */
const STEP_YARDS = 5 / 8;

/** Yard line interval for football fields */
const YARD_LINE_INTERVAL = 5;

// ============================================================================
// Step / Yard helpers
// ============================================================================

/** Convert steps to yards (8-to-5 standard). */
export function stepsToYards(steps: number): number {
  return steps * STEP_YARDS;
}

/** Convert yards to steps (8-to-5 standard). */
export function yardsToSteps(yards: number): number {
  return yards / STEP_YARDS;
}

// ============================================================================
// Normalized → Field notation
// ============================================================================

/**
 * Convert a normalized position (0-100) to standard drill field notation.
 *
 * Coordinate mapping for football fields:
 *   x: 0 → back of left end zone, 50 → 50 yard line, 100 → back of right end zone
 *   y: 0 → home (front) sideline, 100 → visitor (back) sideline
 */
export function normalizedToFieldNotation(
  x: number,
  y: number,
  fieldConfig: FieldConfig,
): DslFieldPos {
  return {
    sideToSide: normalizedXToSideToSide(x, fieldConfig),
    frontToBack: normalizedYToFrontToBack(y, fieldConfig),
  };
}

/** Format a DslFieldPos as a readable string (e.g., "R35, front-hash"). */
export function fieldPosToString(pos: DslFieldPos): string {
  return `${pos.sideToSide}, ${pos.frontToBack}`;
}

// ============================================================================
// Side-to-side (x-axis)
// ============================================================================

function normalizedXToSideToSide(x: number, fieldConfig: FieldConfig): string {
  const { width, endZoneDepth } = fieldConfig;

  // Convert normalized x to field yards from left edge
  const yardsFromLeft = (x / 100) * width;

  // Subtract end zone to get playing-field yards (0 at left goal line)
  const fieldYards = yardsFromLeft - endZoneDepth;
  const playingFieldLength = width - endZoneDepth * 2;

  // Clamp to playing field boundaries
  if (fieldYards <= 0) return 'L0';
  if (fieldYards >= playingFieldLength) return 'R0';

  // Determine side and yard line number
  const halfField = playingFieldLength / 2;
  let side: string;
  let yardLine: number;

  if (fieldYards <= halfField) {
    side = 'L';
    yardLine = fieldYards;
  } else {
    side = 'R';
    yardLine = playingFieldLength - fieldYards;
  }

  // Round to nearest step
  const stepsFromYardLine = yardsToSteps(yardLine);
  const roundedSteps = Math.round(stepsFromYardLine);
  const roundedYards = stepsToYards(roundedSteps);

  // Find nearest yard line
  const nearestYardLine = Math.round(roundedYards / YARD_LINE_INTERVAL) * YARD_LINE_INTERVAL;
  const stepsOffset = yardsToSteps(roundedYards - nearestYardLine);
  const roundedOffset = Math.round(stepsOffset);

  // On the 50 yard line
  if (nearestYardLine === halfField) {
    if (roundedOffset === 0) return '50';
    const direction = side === 'L' ? 'inside' : 'outside';
    return `${Math.abs(roundedOffset)} ${direction} 50`;
  }

  // Determine yard line label for the side
  const yardLineLabel = `${side}${nearestYardLine}`;

  if (roundedOffset === 0) {
    return `on ${yardLineLabel}`;
  }

  // "inside" = toward 50, "outside" = toward sideline
  const direction = roundedOffset > 0 ? 'inside' : 'outside';
  return `${Math.abs(roundedOffset)} ${direction} ${yardLineLabel}`;
}

// ============================================================================
// Front-to-back (y-axis)
// ============================================================================

function normalizedYToFrontToBack(y: number, fieldConfig: FieldConfig): string {
  const { height, hashMarks } = fieldConfig;

  // Convert normalized y to field units
  const yardsFromFront = (y / 100) * height;

  // Reference lines from front (home) sideline
  const frontSideline = 0;
  const frontHash = hashMarks.front;
  const backHash = height - hashMarks.back;
  const backSideline = height;

  // Snap to nearest step
  const stepsFromFront = yardsToSteps(yardsFromFront);
  const roundedSteps = Math.round(stepsFromFront);
  const roundedYards = stepsToYards(roundedSteps);

  // Check proximity to each reference line
  const refs: Array<{ name: string; pos: number; behind: string; inFront: string }> = [
    { name: 'front-sideline', pos: frontSideline, behind: 'behind', inFront: 'in front of' },
    { name: 'front-hash', pos: frontHash, behind: 'behind', inFront: 'in front of' },
    { name: 'back-hash', pos: backHash, behind: 'behind', inFront: 'in front of' },
    { name: 'back-sideline', pos: backSideline, behind: 'behind', inFront: 'in front of' },
  ];

  // Find closest reference line
  let closest = refs[0];
  let closestDist = Math.abs(roundedYards - refs[0].pos);

  for (let i = 1; i < refs.length; i++) {
    const dist = Math.abs(roundedYards - refs[i].pos);
    if (dist < closestDist) {
      closest = refs[i];
      closestDist = dist;
    }
  }

  const stepsFromRef = yardsToSteps(roundedYards - closest.pos);
  const roundedRefSteps = Math.round(stepsFromRef);

  if (roundedRefSteps === 0) {
    return closest.name;
  }

  if (roundedRefSteps > 0) {
    return `${Math.abs(roundedRefSteps)} ${closest.behind} ${closest.name}`;
  }

  return `${Math.abs(roundedRefSteps)} ${closest.inFront} ${closest.name}`;
}
