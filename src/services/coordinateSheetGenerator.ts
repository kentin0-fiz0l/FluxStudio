/**
 * Coordinate Sheet Generator - FluxStudio
 *
 * Generates coordinate sheets and drill book data for export.
 * The #1 deliverable drill writers produce.
 */

import type {
  Formation,
  Performer,
  DrillSet,
  CoordinateEntry,
  FieldConfig,
  StepInfo,
  Position,
} from './formationTypes';
import { NCAA_FOOTBALL_FIELD } from './fieldConfigService';

// ============================================================================
// COORDINATE CALCULATION
// ============================================================================

/**
 * Convert a normalized position (0-100) to drill coordinate notation.
 */
function positionToCoordinateDetails(
  pos: Position,
  fieldConfig: FieldConfig,
): { sideToSide: string; frontToBack: string } {
  const { width, height, endZoneDepth } = fieldConfig;

  // Playing field width (exclude end zones)
  const playingWidth = width - 2 * endZoneDepth;
  // Map x from 0-100 to field yards (within playing area)
  const fieldX = (pos.x / 100) * playingWidth; // yards from left goal line
  const fieldY = (pos.y / 100) * height; // yards from front sideline

  // --- Side-to-side ---
  // Determine nearest yard line (in 5-yard increments)
  const nearestYardLine = Math.round(fieldX / 5) * 5;
  const distFromYardLine = fieldX - nearestYardLine;
  const stepsFromYardLine = Math.round(Math.abs(distFromYardLine) * (8 / 5)); // 8-to-5

  // Determine left/right half
  const midfield = playingWidth / 2; // 50 yard line
  const side = fieldX <= midfield ? 'L' : 'R';
  // Yard line number (mirrors at 50)
  const yardLineNum = nearestYardLine <= 50 ? nearestYardLine : 100 - nearestYardLine;

  let sideToSide: string;
  if (stepsFromYardLine === 0) {
    sideToSide = `On ${side}${yardLineNum}`;
  } else {
    // Adjust direction based on which side of 50
    const adjustedDirection = fieldX <= midfield
      ? (distFromYardLine > 0 ? 'outside' : 'inside')
      : (distFromYardLine > 0 ? 'inside' : 'outside');
    sideToSide = `${stepsFromYardLine} ${adjustedDirection} ${side}${yardLineNum}`;
  }

  // --- Front-to-back ---
  const frontHash = fieldConfig.hashMarks.front;
  const backHash = height - fieldConfig.hashMarks.back;

  // Determine nearest reference line and distance
  const references: { name: string; yardPos: number }[] = [
    { name: 'front sideline', yardPos: 0 },
    { name: 'front hash', yardPos: frontHash },
    { name: 'back hash', yardPos: backHash },
    { name: 'back sideline', yardPos: height },
  ];

  let nearestRef = references[0];
  let minDist = Math.abs(fieldY - references[0].yardPos);
  for (const ref of references) {
    const d = Math.abs(fieldY - ref.yardPos);
    if (d < minDist) {
      minDist = d;
      nearestRef = ref;
    }
  }

  const stepsFromRef = Math.round(minDist * (8 / 5));
  let frontToBack: string;
  if (stepsFromRef === 0) {
    frontToBack = `On ${nearestRef.name}`;
  } else {
    const behindOrInFront = fieldY > nearestRef.yardPos ? 'behind' : 'in front of';
    frontToBack = `${stepsFromRef} ${behindOrInFront} ${nearestRef.name}`;
  }

  return { sideToSide, frontToBack };
}

/**
 * Calculate step info between two positions.
 */
function calculateStepInfoBetween(
  from: Position,
  to: Position,
  counts: number,
  fieldConfig: FieldConfig,
): StepInfo {
  const { width, height, endZoneDepth } = fieldConfig;
  const playingWidth = width - 2 * endZoneDepth;

  const dx = ((to.x - from.x) / 100) * playingWidth;
  const dy = ((to.y - from.y) / 100) * height;
  const distYards = Math.sqrt(dx * dx + dy * dy);
  const distNormalized = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);

  // Step size calculation
  let stepSize: number;
  let stepSizeLabel: string;
  let difficulty: StepInfo['difficulty'];

  if (distYards < 0.1) {
    stepSize = 0;
    stepSizeLabel = 'Mark Time';
    difficulty = 'easy';
  } else {
    stepSize = (counts * 5) / distYards;
    stepSizeLabel = stepSize >= 16 ? 'Mark Time' : `${stepSize.toFixed(1)} to 5`;
    difficulty = stepSize >= 8 ? 'easy' : stepSize >= 6 ? 'moderate' : 'hard';
  }

  // Direction
  const dirDegrees = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  const dirLabel = getDirectionLabel(dirDegrees);

  return {
    distance: distNormalized,
    distanceYards: distYards,
    stepSize,
    stepSizeLabel,
    direction: dirDegrees,
    directionLabel: dirLabel,
    difficulty,
    counts,
  };
}

function getDirectionLabel(degrees: number): string {
  const n = ((degrees % 360) + 360) % 360;
  if (n >= 337.5 || n < 22.5) return 'to the right';
  if (n < 67.5) return 'downfield-right';
  if (n < 112.5) return 'downfield';
  if (n < 157.5) return 'downfield-left';
  if (n < 202.5) return 'to the left';
  if (n < 247.5) return 'upfield-left';
  if (n < 292.5) return 'upfield';
  return 'upfield-right';
}

// ============================================================================
// COORDINATE SHEET GENERATION
// ============================================================================

/**
 * Generate a coordinate sheet for a single performer.
 * Returns an array of coordinate entries, one per set.
 */
export function generateCoordinateSheet(
  formation: Formation,
  performerId: string,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
): CoordinateEntry[] {
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries: CoordinateEntry[] = [];

  for (let i = 0; i < sortedSets.length; i++) {
    const set = sortedSets[i];
    const kf = formation.keyframes.find((k) => k.id === set.keyframeId);
    if (!kf) continue;

    const pos = kf.positions.get(performerId);
    if (!pos) continue;

    const coordinateDetails = positionToCoordinateDetails(pos, fieldConfig);
    const coordinate = `${coordinateDetails.sideToSide}, ${coordinateDetails.frontToBack}`;

    // Step info to next
    let stepToNext: StepInfo | null = null;
    if (i < sortedSets.length - 1) {
      const nextSet = sortedSets[i + 1];
      const nextKf = formation.keyframes.find((k) => k.id === nextSet.keyframeId);
      const nextPos = nextKf?.positions.get(performerId);
      if (nextPos) {
        stepToNext = calculateStepInfoBetween(pos, nextPos, set.counts, fieldConfig);
      }
    }

    // Step info from prev
    let stepFromPrev: StepInfo | null = null;
    if (i > 0) {
      const prevSet = sortedSets[i - 1];
      const prevKf = formation.keyframes.find((k) => k.id === prevSet.keyframeId);
      const prevPos = prevKf?.positions.get(performerId);
      if (prevPos) {
        stepFromPrev = calculateStepInfoBetween(prevPos, pos, prevSet.counts, fieldConfig);
      }
    }

    entries.push({
      set,
      coordinate,
      coordinateDetails,
      stepToNext,
      stepFromPrev,
    });
  }

  return entries;
}

/**
 * Generate coordinate sheets for all performers.
 */
export function generateAllCoordinateSheets(
  formation: Formation,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
): Map<string, { performer: Performer; entries: CoordinateEntry[] }> {
  const sheets = new Map<string, { performer: Performer; entries: CoordinateEntry[] }>();

  for (const performer of formation.performers) {
    const entries = generateCoordinateSheet(formation, performer.id, sets, fieldConfig);
    sheets.set(performer.id, { performer, entries });
  }

  return sheets;
}

// ============================================================================
// DRILL BOOK DATA
// ============================================================================

export interface DrillBookPage {
  type: 'cover' | 'chart' | 'coordinates' | 'summary';
  performerId?: string;
  performerName?: string;
  setId?: string;
  setName?: string;
  data: Record<string, unknown>;
}

/**
 * Generate drill book page data for a single performer.
 */
export function generateDrillBookPages(
  formation: Formation,
  performerId: string,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
): DrillBookPage[] {
  const performer = formation.performers.find((p) => p.id === performerId);
  if (!performer) return [];

  const entries = generateCoordinateSheet(formation, performerId, sets, fieldConfig);
  const pages: DrillBookPage[] = [];

  // Cover page
  pages.push({
    type: 'cover',
    performerId,
    performerName: performer.name,
    data: {
      showName: formation.name,
      performerName: performer.name,
      drillNumber: performer.drillNumber ?? performer.label,
      instrument: performer.instrument,
      section: performer.section,
      totalSets: sets.length,
    },
  });

  // Field chart per set (overhead view with "you are here" marker)
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const set of sortedSets) {
    const kf = formation.keyframes.find((k) => k.id === set.keyframeId);
    if (!kf) continue;

    pages.push({
      type: 'chart',
      performerId,
      performerName: performer.name,
      setId: set.id,
      setName: set.name,
      data: {
        positions: Object.fromEntries(kf.positions),
        highlightPerformerId: performerId,
        set,
        fieldConfig,
      },
    });
  }

  // Coordinate sheet table
  pages.push({
    type: 'coordinates',
    performerId,
    performerName: performer.name,
    data: {
      entries,
      fieldConfig,
    },
  });

  // Step size summary
  const hardSteps = entries.filter((e) => e.stepToNext?.difficulty === 'hard');
  const moderateSteps = entries.filter((e) => e.stepToNext?.difficulty === 'moderate');
  const totalDistance = entries.reduce(
    (sum, e) => sum + (e.stepToNext?.distanceYards ?? 0),
    0,
  );

  pages.push({
    type: 'summary',
    performerId,
    performerName: performer.name,
    data: {
      totalSets: sets.length,
      totalDistance: totalDistance.toFixed(1),
      hardSteps: hardSteps.length,
      moderateSteps: moderateSteps.length,
      easySteps: entries.length - hardSteps.length - moderateSteps.length,
      worstStep: hardSteps.length > 0
        ? {
            setName: hardSteps[0].set.name,
            stepSize: hardSteps[0].stepToNext?.stepSizeLabel,
          }
        : null,
    },
  });

  return pages;
}
