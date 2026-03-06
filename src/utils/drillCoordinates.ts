/**
 * Drill Coordinate System - FluxStudio Drill Writer
 *
 * Provides the coordinate notation system used by marching band drill writers.
 * Converts between normalized stage positions (0-100) and standard drill notation
 * (e.g., "4 steps outside R35, 12 behind front hash").
 *
 * Supports multiple field types: NCAA football, NFL football, indoor WGI, and stage.
 */

import type { Position, FieldConfig, StepInfo } from '../services/formationTypes';

// ============================================================================
// FIELD CONFIGURATIONS
// ============================================================================

export const NCAA_FOOTBALL_FIELD: FieldConfig = {
  type: 'ncaa_football',
  name: 'NCAA Football Field',
  width: 120, // 100 yards + 2x10 end zones
  height: 53.33, // 160 feet = 53.33 yards
  yardLineInterval: 5,
  hashMarks: { front: 20, back: 20 }, // 60 feet = 20 yards from each sideline
  endZoneDepth: 10,
  unit: 'yards',
};

export const NFL_FOOTBALL_FIELD: FieldConfig = {
  type: 'nfl_football',
  name: 'NFL Football Field',
  width: 120,
  height: 53.33,
  yardLineInterval: 5,
  hashMarks: { front: 23.58, back: 23.58 }, // 70 feet 9 inches from sideline
  endZoneDepth: 10,
  unit: 'yards',
};

export const INDOOR_WGI_FIELD: FieldConfig = {
  type: 'indoor_wgi',
  name: 'Indoor WGI Floor',
  width: 30, // 90 feet = 30 yards
  height: 20, // 60 feet = 20 yards
  yardLineInterval: 5,
  hashMarks: { front: 6.67, back: 6.67 }, // roughly 1/3 from each side
  endZoneDepth: 0,
  unit: 'feet',
};

export const STAGE_FIELD: FieldConfig = {
  type: 'stage',
  name: 'Stage',
  width: 40, // 40 feet
  height: 30, // 30 feet
  yardLineInterval: 5,
  hashMarks: { front: 10, back: 10 },
  endZoneDepth: 0,
  unit: 'feet',
};

// ============================================================================
// COORDINATE CONVERSION
// ============================================================================

/**
 * Convert a normalized position (0-100) to standard drill coordinate notation.
 *
 * For football fields:
 * - Side-to-side: "X steps inside/outside [L|R] [yardline]"
 *   The playing field runs from endZoneDepth to (width - endZoneDepth).
 *   Left (L) half = the left side when facing the press box (x < 50% of playing field).
 *   Right (R) half = the right side.
 *   Yard lines are labeled 0, 5, 10, ... 50, ... 10, 5, 0 from each end zone.
 *
 * - Front-to-back: "X steps behind/in front of [reference]"
 *   References: front sideline, front hash, back hash, back sideline
 *
 * Step calculations use 8-to-5 (8 steps per 5 yards).
 */
export function positionToCoordinate(
  pos: Position,
  fieldConfig: FieldConfig
): { sideToSide: string; frontToBack: string } {
  const playingFieldWidth = fieldConfig.width - 2 * fieldConfig.endZoneDepth;
  const stepsPerFiveYards = 8;

  // --- Side-to-side ---
  // Convert normalized x (0-100) to position in yards from the left end zone line (yard line 0)
  const xYards = (pos.x / 100) * fieldConfig.width;
  // Position within the playing field (0 = left goal line, playingFieldWidth = right goal line)
  const playingX = xYards - fieldConfig.endZoneDepth;
  // Clamp to playing field bounds
  const clampedX = Math.max(0, Math.min(playingFieldWidth, playingX));

  // Determine which side of the 50 we are on
  const midfield = playingFieldWidth / 2;
  const isRightSide = clampedX > midfield;

  // Yard line values go 0, 5, 10, ... 50 from each end
  // Distance from the nearest goal line (in yards)
  const distFromNearGoal = isRightSide ? playingFieldWidth - clampedX : clampedX;

  // Nearest yard line (in increments of 5)
  const nearestYardLineValue = Math.round(distFromNearGoal / fieldConfig.yardLineInterval) * fieldConfig.yardLineInterval;
  // Clamp to valid range (0 to 50)
  const clampedYardLine = Math.min(50, Math.max(0, nearestYardLineValue));

  // Distance from the nearest yard line in yards
  const yardLineDistYards = distFromNearGoal - clampedYardLine;

  // Convert to steps (8 steps per 5 yards)
  const stepsFromYardLine = Math.abs(yardLineDistYards) * (stepsPerFiveYards / 5);
  const roundedSteps = Math.round(stepsFromYardLine * 4) / 4; // round to nearest quarter step

  const side = isRightSide ? 'R' : 'L';

  let sideToSide: string;
  if (roundedSteps < 0.25) {
    sideToSide = `On ${side} ${clampedYardLine}`;
  } else {
    // "inside" means toward the 50, "outside" means toward the goal line
    const isInside = yardLineDistYards > 0;
    const direction = isInside ? 'inside' : 'outside';
    sideToSide = `${roundedSteps} ${direction} ${side} ${clampedYardLine}`;
  }

  // --- Front-to-back ---
  // Convert normalized y (0-100) to yards from front sideline
  // In our coordinate system, y=0 is the top (front sideline), y=100 is the bottom (back sideline)
  const yYards = (pos.y / 100) * fieldConfig.height;

  // Reference lines (in yards from front sideline)
  const references = [
    { name: 'front sideline', position: 0 },
    { name: 'front hash', position: fieldConfig.hashMarks.front },
    { name: 'back hash', position: fieldConfig.height - fieldConfig.hashMarks.back },
    { name: 'back sideline', position: fieldConfig.height },
  ];

  // Find nearest reference
  let nearestRef = references[0];
  let minDist = Math.abs(yYards - references[0].position);
  for (let i = 1; i < references.length; i++) {
    const dist = Math.abs(yYards - references[i].position);
    if (dist < minDist) {
      minDist = dist;
      nearestRef = references[i];
    }
  }

  const fbDistYards = yYards - nearestRef.position;
  const fbSteps = Math.abs(fbDistYards) * (stepsPerFiveYards / 5);
  const roundedFbSteps = Math.round(fbSteps * 4) / 4;

  let frontToBack: string;
  if (roundedFbSteps < 0.25) {
    frontToBack = `On ${nearestRef.name}`;
  } else {
    // Positive fbDistYards means the performer is further from front sideline (behind the reference)
    const direction = fbDistYards > 0 ? 'behind' : 'in front of';
    frontToBack = `${roundedFbSteps} ${direction} ${nearestRef.name}`;
  }

  return { sideToSide, frontToBack };
}

/**
 * Parse standard drill notation back to a normalized position (0-100).
 *
 * Supported side-to-side formats:
 *   "On R 35", "4 outside R35", "2.5 inside L 40"
 *
 * Supported front-to-back formats:
 *   "On front hash", "12 behind front hash", "8 in front of back hash"
 */
export function coordinateToPosition(
  sideToSide: string,
  frontToBack: string,
  fieldConfig: FieldConfig
): Position {
  const playingFieldWidth = fieldConfig.width - 2 * fieldConfig.endZoneDepth;
  const stepsPerFiveYards = 8;

  // --- Parse side-to-side ---
  const normalizedSS = sideToSide.trim().toLowerCase();
  let xYards: number;

  // Match "on [L|R] [yardline]"
  const onMatch = normalizedSS.match(/^on\s+([lr])\s*(\d+)$/);
  // Match "[steps] [inside|outside] [L|R] [yardline]"
  const stepsMatch = normalizedSS.match(/^([\d.]+)\s+(inside|outside)\s+([lr])\s*(\d+)$/);

  if (onMatch) {
    const side = onMatch[1];
    const yardLine = parseInt(onMatch[2], 10);
    const distFromGoal = yardLine;
    xYards = side === 'l'
      ? fieldConfig.endZoneDepth + distFromGoal
      : fieldConfig.endZoneDepth + playingFieldWidth - distFromGoal;
  } else if (stepsMatch) {
    const steps = parseFloat(stepsMatch[1]);
    const direction = stepsMatch[2]; // inside or outside
    const side = stepsMatch[3];
    const yardLine = parseInt(stepsMatch[4], 10);

    // Convert steps to yards
    const offsetYards = steps * (5 / stepsPerFiveYards);
    // inside = toward 50, outside = toward goal line
    const distFromGoal = direction === 'inside'
      ? yardLine + offsetYards
      : yardLine - offsetYards;

    xYards = side === 'l'
      ? fieldConfig.endZoneDepth + distFromGoal
      : fieldConfig.endZoneDepth + playingFieldWidth - distFromGoal;
  } else {
    // Default to center if unparseable
    xYards = fieldConfig.width / 2;
  }

  // --- Parse front-to-back ---
  const normalizedFB = frontToBack.trim().toLowerCase();
  let yYards: number;

  const references: Record<string, number> = {
    'front sideline': 0,
    'front hash': fieldConfig.hashMarks.front,
    'back hash': fieldConfig.height - fieldConfig.hashMarks.back,
    'back sideline': fieldConfig.height,
  };

  // Match "on [reference]"
  const onFBMatch = normalizedFB.match(/^on\s+(.+)$/);
  // Match "[steps] [behind|in front of] [reference]"
  const stepsFBMatch = normalizedFB.match(/^([\d.]+)\s+(behind|in front of)\s+(.+)$/);

  if (onFBMatch) {
    const refName = onFBMatch[1].trim();
    yYards = references[refName] ?? fieldConfig.height / 2;
  } else if (stepsFBMatch) {
    const steps = parseFloat(stepsFBMatch[1]);
    const direction = stepsFBMatch[2];
    const refName = stepsFBMatch[3].trim();

    const refPos = references[refName] ?? fieldConfig.height / 2;
    const offsetYards = steps * (5 / stepsPerFiveYards);

    // "behind" = further from front sideline (positive y direction)
    // "in front of" = closer to front sideline (negative y direction)
    yYards = direction === 'behind' ? refPos + offsetYards : refPos - offsetYards;
  } else {
    yYards = fieldConfig.height / 2;
  }

  // Convert yards back to normalized (0-100)
  const x = Math.max(0, Math.min(100, (xYards / fieldConfig.width) * 100));
  const y = Math.max(0, Math.min(100, (yYards / fieldConfig.height) * 100));

  return { x, y };
}

// ============================================================================
// STEP CALCULATIONS
// ============================================================================

/**
 * Calculate step information between two positions for a given number of counts.
 *
 * Returns distance, step size in "X-to-5" notation, direction, and difficulty.
 *
 * Step size formula:
 *   steps taken = counts (one step per count)
 *   stepSize = (counts * 5) / distanceInYards
 *   This gives the "X to 5" value. E.g., 8 counts over 5 yards = "8 to 5".
 *   If distance is 0, the performer is marking time.
 */
export function calculateStepInfo(
  fromPos: Position,
  toPos: Position,
  counts: number,
  fieldConfig: FieldConfig
): StepInfo {
  // Calculate distance in normalized units
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const normalizedDistance = Math.sqrt(dx * dx + dy * dy);

  // Convert normalized distance to yards
  // The normalized coordinate (0-100) maps to field dimensions
  const dxYards = (dx / 100) * fieldConfig.width;
  const dyYards = (dy / 100) * fieldConfig.height;
  const distanceYards = Math.sqrt(dxYards * dxYards + dyYards * dyYards);

  // Step size in "X to 5" notation
  let stepSize: number;
  let stepSizeLabel: string;

  if (distanceYards < 0.01) {
    stepSize = 0;
    stepSizeLabel = 'Mark Time';
  } else {
    stepSize = (counts * 5) / distanceYards;
    stepSizeLabel = formatStepSize(stepSize);
  }

  // Direction in degrees (0 = right, 90 = down/toward back sideline)
  const direction = angleBetweenPositions(fromPos, toPos);
  const directionLabel = getDirectionLabel(direction);

  // Difficulty based on step size
  let difficulty: 'easy' | 'moderate' | 'hard';
  if (stepSize === 0) {
    difficulty = 'easy'; // mark time
  } else if (stepSize >= 8) {
    difficulty = 'easy';
  } else if (stepSize >= 6) {
    difficulty = 'moderate';
  } else {
    difficulty = 'hard';
  }

  return {
    distance: normalizedDistance,
    distanceYards,
    stepSize,
    stepSizeLabel,
    direction,
    directionLabel,
    difficulty,
    counts,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format coordinate details into a single display string.
 * e.g., "4 outside R35, 12 behind front hash"
 */
export function formatCoordinate(details: { sideToSide: string; frontToBack: string }): string {
  return `${details.sideToSide}, ${details.frontToBack}`;
}

/**
 * Format a step size number into "X to 5" notation.
 * Rounds to nearest half step for readability.
 * Returns "Mark Time" if step size is effectively zero.
 */
export function formatStepSize(stepSize: number): string {
  if (stepSize < 0.1) {
    return 'Mark Time';
  }
  // Round to nearest 0.5
  const rounded = Math.round(stepSize * 2) / 2;
  return `${rounded} to 5`;
}

/**
 * Convert a direction angle in degrees to a human-readable label.
 *
 * Uses 8 compass directions mapped to marching band terminology:
 *   0 degrees   = to the right
 *   45 degrees  = downfield right
 *   90 degrees  = downfield (toward back sideline)
 *   135 degrees = downfield left
 *   180 degrees = to the left
 *   225 degrees = upfield left
 *   270 degrees = upfield (toward front sideline)
 *   315 degrees = upfield right
 */
export function getDirectionLabel(degrees: number): string {
  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;

  if (normalized < 22.5 || normalized >= 337.5) return 'to the right';
  if (normalized < 67.5) return 'downfield right';
  if (normalized < 112.5) return 'downfield';
  if (normalized < 157.5) return 'downfield left';
  if (normalized < 202.5) return 'to the left';
  if (normalized < 247.5) return 'upfield left';
  if (normalized < 292.5) return 'upfield';
  return 'upfield right';
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Calculate angle in degrees between two positions.
 * 0 = right, 90 = down (toward back sideline).
 */
function angleBetweenPositions(from: Position, to: Position): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const radians = Math.atan2(dy, dx);
  const degrees = (radians * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}
