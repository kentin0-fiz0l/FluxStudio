/**
 * Drill Geometry Utilities - FluxStudio Drill Writer
 *
 * Pure math functions for snap-to-grid, count/time conversion,
 * shape generation, alignment, and distribution.
 */

import type { Position, FieldConfig, PathCurve, GroupTransform } from '../services/formationTypes';
import type { TempoMap } from '../services/tempoMap';
import {
  countToTimeMs,
  timeMsToCount,
  snapToCountTM,
  generateCountMarkersTM,
} from '../services/tempoMap';

// ============================================================================
// TYPES
// ============================================================================

export interface CountSettings {
  bpm: number;
  countsPerPhrase: number; // typically 8
  startOffset: number; // ms offset before first beat
}

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionType = 'horizontal' | 'vertical' | 'equal';

export interface FieldOverlayConfig {
  /** Total width in yards */
  width: number;
  /** Total height in yards (sideline to sideline) */
  height: number;
  /** Yard line interval */
  yardLineInterval: number;
  /** Hash mark positions from sideline (in yards) */
  hashMarks: { college: number; nfl: number };
  /** End zone depth in yards */
  endZoneDepth: number;
  /** Number markings (yard numbers to display) */
  yardNumbers: number[];
}

export interface DrillSettings {
  bpm: number;
  countsPerPhrase: number;
  startOffset: number;
  fieldOverlay: boolean;
  snapToGrid: boolean;
}

export interface CountMarker {
  timeMs: number;
  count: number;
  phrase: number;
  beatInPhrase: number;
  isPhraseBoundary: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const STANDARD_FOOTBALL_FIELD: FieldOverlayConfig = {
  width: 120, // 100 yards + 2x 10-yard end zones
  height: 53.33, // 160 feet = 53.33 yards
  yardLineInterval: 5,
  hashMarks: {
    college: 20, // 60 feet from sideline
    nfl: 23.58, // 70 feet 9 inches from sideline
  },
  endZoneDepth: 10,
  yardNumbers: [10, 20, 30, 40, 50, 40, 30, 20, 10],
};

export const DEFAULT_DRILL_SETTINGS: DrillSettings = {
  bpm: 120,
  countsPerPhrase: 8,
  startOffset: 0,
  fieldOverlay: false,
  snapToGrid: false,
};

// ============================================================================
// SNAP-TO-GRID
// ============================================================================

/**
 * Snap a position to the nearest grid intersection.
 * All coordinates are in the 0-100 normalized stage space.
 */
export function snapToGrid(
  position: Position,
  gridSize: number,
  stageWidth: number,
  stageHeight: number
): Position {
  // Convert normalized (0-100) to stage units
  const stageX = (position.x / 100) * stageWidth;
  const stageY = (position.y / 100) * stageHeight;

  // Snap to nearest grid intersection
  const snappedX = Math.round(stageX / gridSize) * gridSize;
  const snappedY = Math.round(stageY / gridSize) * gridSize;

  // Convert back to normalized (0-100)
  return {
    x: Math.max(0, Math.min(100, (snappedX / stageWidth) * 100)),
    y: Math.max(0, Math.min(100, (snappedY / stageHeight) * 100)),
    rotation: position.rotation,
  };
}

// ============================================================================
// COUNT / TIME CONVERSION
// ============================================================================

/**
 * Type guard: check if the timing parameter is a TempoMap (has segments)
 * vs. a CountSettings (has bpm).
 */
function isTempoMap(timing: CountSettings | TempoMap): timing is TempoMap {
  return 'segments' in timing;
}

/**
 * Convert a time in milliseconds to a count number (1-based).
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function timeToCount(timeMs: number, timing: CountSettings | TempoMap): number {
  if (isTempoMap(timing)) {
    return Math.floor(timeMsToCount(timeMs, timing));
  }
  const msPerBeat = 60000 / timing.bpm;
  return Math.floor((timeMs - timing.startOffset) / msPerBeat) + 1;
}

/**
 * Convert a count number (1-based) to time in milliseconds.
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function countToTime(count: number, timing: CountSettings | TempoMap): number {
  if (isTempoMap(timing)) {
    return countToTimeMs(count, timing);
  }
  const msPerBeat = 60000 / timing.bpm;
  return timing.startOffset + (count - 1) * msPerBeat;
}

/**
 * Snap a time value to the nearest beat boundary.
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function snapToCount(timeMs: number, timing: CountSettings | TempoMap): number {
  if (isTempoMap(timing)) {
    return snapToCountTM(timeMs, timing);
  }
  const msPerBeat = 60000 / timing.bpm;
  const beatsFromStart = (timeMs - timing.startOffset) / msPerBeat;
  const snappedBeat = Math.round(beatsFromStart);
  return timing.startOffset + snappedBeat * msPerBeat;
}

/**
 * Generate count markers for a timeline ruler.
 * Accepts either CountSettings (constant BPM) or TempoMap (variable tempo).
 */
export function generateCountMarkers(
  duration: number,
  timing: CountSettings | TempoMap
): CountMarker[] {
  if (isTempoMap(timing)) {
    return generateCountMarkersTM(timing).filter(m => m.timeMs <= duration);
  }

  const markers: CountMarker[] = [];
  const msPerBeat = 60000 / timing.bpm;
  let count = 1;

  for (
    let time = timing.startOffset;
    time <= duration;
    time += msPerBeat, count++
  ) {
    const phrase = Math.ceil(count / timing.countsPerPhrase);
    const beatInPhrase = ((count - 1) % timing.countsPerPhrase) + 1;
    const isPhraseBoundary = beatInPhrase === 1;

    markers.push({
      timeMs: time,
      count,
      phrase,
      beatInPhrase,
      isPhraseBoundary,
    });
  }

  return markers;
}

// ============================================================================
// SHAPE GENERATION
// ============================================================================

/**
 * Distribute positions evenly along a straight line from start to end.
 */
export function generateLinePositions(
  start: Position,
  end: Position,
  count: number
): Position[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }];

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };
  });
}

/**
 * Distribute positions evenly along an arc.
 * Angles in radians. Center and radius in 0-100 stage coordinates.
 */
export function generateArcPositions(
  center: Position,
  radius: number,
  startAngle: number,
  endAngle: number,
  count: number
): Position[] {
  if (count <= 0) return [];
  if (count === 1) {
    const midAngle = (startAngle + endAngle) / 2;
    return [{ x: center.x + Math.cos(midAngle) * radius, y: center.y + Math.sin(midAngle) * radius }];
  }

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const angle = startAngle + (endAngle - startAngle) * t;
    return {
      x: Math.max(0, Math.min(100, center.x + Math.cos(angle) * radius)),
      y: Math.max(0, Math.min(100, center.y + Math.sin(angle) * radius)),
    };
  });
}

/**
 * Distribute positions in a grid pattern within a rectangle.
 * Fills row-by-row, distributing as evenly as possible.
 */
export function generateBlockPositions(
  topLeft: Position,
  bottomRight: Position,
  count: number
): Position[] {
  if (count <= 0) return [];
  if (count === 1) {
    return [{ x: (topLeft.x + bottomRight.x) / 2, y: (topLeft.y + bottomRight.y) / 2 }];
  }

  // Calculate grid dimensions that best fit the rectangle aspect ratio
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  const aspect = width / (height || 1);

  let cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
  const rows = Math.max(1, Math.ceil(count / cols));

  // Ensure we have enough cells
  while (cols * rows < count) {
    cols++;
  }

  const positions: Position[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    positions.push({
      x: topLeft.x + (cols > 1 ? (col / (cols - 1)) * width : width / 2),
      y: topLeft.y + (rows > 1 ? (row / (rows - 1)) * height : height / 2),
    });
  }

  return positions;
}

// ============================================================================
// ALIGNMENT
// ============================================================================

/**
 * Align a set of positions along a given axis.
 * Returns new positions with the aligned coordinate changed.
 */
export function alignPositions(
  positions: Position[],
  type: AlignmentType
): Position[] {
  if (positions.length === 0) return [];

  switch (type) {
    case 'left': {
      const minX = Math.min(...positions.map((p) => p.x));
      return positions.map((p) => ({ ...p, x: minX }));
    }
    case 'center': {
      const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
      return positions.map((p) => ({ ...p, x: avgX }));
    }
    case 'right': {
      const maxX = Math.max(...positions.map((p) => p.x));
      return positions.map((p) => ({ ...p, x: maxX }));
    }
    case 'top': {
      const minY = Math.min(...positions.map((p) => p.y));
      return positions.map((p) => ({ ...p, y: minY }));
    }
    case 'middle': {
      const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
      return positions.map((p) => ({ ...p, y: avgY }));
    }
    case 'bottom': {
      const maxY = Math.max(...positions.map((p) => p.y));
      return positions.map((p) => ({ ...p, y: maxY }));
    }
  }
}

// ============================================================================
// DISTRIBUTION
// ============================================================================

/**
 * Distribute positions evenly along an axis.
 * Requires 3+ positions to be meaningful.
 */
export function distributePositions(
  positions: Position[],
  type: DistributionType
): Position[] {
  if (positions.length < 3) return positions;

  // Create indexed array to preserve original ordering
  const indexed = positions.map((p, i) => ({ ...p, _idx: i }));

  switch (type) {
    case 'horizontal': {
      const sorted = [...indexed].sort((a, b) => a.x - b.x);
      const minX = sorted[0].x;
      const maxX = sorted[sorted.length - 1].x;
      const step = (maxX - minX) / (sorted.length - 1);
      sorted.forEach((p, i) => { p.x = minX + step * i; });
      // Restore original order
      const result = new Array<Position>(positions.length);
      sorted.forEach((p) => { result[p._idx] = { x: p.x, y: p.y, rotation: p.rotation }; });
      return result;
    }
    case 'vertical': {
      const sorted = [...indexed].sort((a, b) => a.y - b.y);
      const minY = sorted[0].y;
      const maxY = sorted[sorted.length - 1].y;
      const step = (maxY - minY) / (sorted.length - 1);
      sorted.forEach((p, i) => { p.y = minY + step * i; });
      const result = new Array<Position>(positions.length);
      sorted.forEach((p) => { result[p._idx] = { x: p.x, y: p.y, rotation: p.rotation }; });
      return result;
    }
    case 'equal': {
      // Distribute with equal spacing between all performers based on centroid distance
      const sorted = [...indexed].sort((a, b) => {
        const distA = Math.sqrt(a.x * a.x + a.y * a.y);
        const distB = Math.sqrt(b.x * b.x + b.y * b.y);
        return distA - distB;
      });

      // Calculate total path length
      let totalLength = 0;
      for (let i = 1; i < sorted.length; i++) {
        const dx = sorted[i].x - sorted[i - 1].x;
        const dy = sorted[i].y - sorted[i - 1].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
      }

      const segmentLength = totalLength / (sorted.length - 1);
      const result = new Array<Position>(positions.length);
      // First and last stay in place
      result[sorted[0]._idx] = { x: sorted[0].x, y: sorted[0].y, rotation: sorted[0].rotation };
      result[sorted[sorted.length - 1]._idx] = {
        x: sorted[sorted.length - 1].x,
        y: sorted[sorted.length - 1].y,
        rotation: sorted[sorted.length - 1].rotation,
      };

      // Redistribute intermediate points
      let accumulated = 0;
      let segIdx = 0;
      for (let i = 1; i < sorted.length - 1; i++) {
        const targetDist = segmentLength * i;
        // Walk along the sorted path to find the right position
        while (segIdx < sorted.length - 2) {
          const dx = sorted[segIdx + 1].x - sorted[segIdx].x;
          const dy = sorted[segIdx + 1].y - sorted[segIdx].y;
          const segLen = Math.sqrt(dx * dx + dy * dy);
          if (accumulated + segLen >= targetDist) {
            const t = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
            result[sorted[i]._idx] = {
              x: sorted[segIdx].x + dx * t,
              y: sorted[segIdx].y + dy * t,
              rotation: sorted[i].rotation,
            };
            break;
          }
          accumulated += segLen;
          segIdx++;
        }
        if (!result[sorted[i]._idx]) {
          result[sorted[i]._idx] = { x: sorted[i].x, y: sorted[i].y, rotation: sorted[i].rotation };
        }
      }

      return result;
    }
  }
}

// ============================================================================
// UNIT CONVERSION
// ============================================================================

/**
 * Convert a distance in yards to steps.
 * Default is 8-to-5 (8 steps per 5 yards), which is the marching band standard.
 */
export function yardsToSteps(yards: number, stepsPerFiveYards: number = 8): number {
  return yards * (stepsPerFiveYards / 5);
}

/**
 * Convert a distance in steps to yards.
 * Default is 8-to-5 (8 steps per 5 yards).
 */
export function stepsToYards(steps: number, stepsPerFiveYards: number = 8): number {
  return steps * (5 / stepsPerFiveYards);
}

// ============================================================================
// DISTANCE & ANGLE
// ============================================================================

/**
 * Calculate the Euclidean distance between two positions in normalized (0-100) units.
 * The stageWidth and stageHeight parameters allow compensating for non-square
 * aspect ratios if needed, but the result is still in normalized units.
 */
export function calculateDistance(
  from: Position,
  to: Position,
  _stageWidth: number,
  _stageHeight: number
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Convert a normalized (0-100) distance to yards using a field configuration.
 *
 * Because x and y may map to different physical dimensions (e.g., a football
 * field is 120 yards wide but 53.33 yards tall), this function uses the
 * average scale factor. For axis-specific conversion, compute each axis
 * separately: xYards = (dx / 100) * fieldConfig.width.
 */
export function normalizedToYards(
  normalizedDistance: number,
  fieldConfig: FieldConfig
): number {
  // Use the average of width and height scale factors for a scalar distance
  const avgScale = (fieldConfig.width + fieldConfig.height) / 2;
  return (normalizedDistance / 100) * avgScale;
}

/**
 * Calculate the angle in degrees from one position to another.
 * 0 = right (positive x), 90 = down (positive y, toward back sideline).
 * Result is always in the range [0, 360).
 */
export function angleBetween(from: Position, to: Position): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const radians = Math.atan2(dy, dx);
  const degrees = (radians * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}

// ============================================================================
// CUBIC BEZIER EVALUATION
// ============================================================================

/**
 * Evaluate a cubic Bezier curve at parameter t (0–1).
 * Returns the interpolated position between p0 and p1
 * with control points cp1 and cp2.
 */
export function evaluateCubicBezier(
  t: number,
  p0: Position,
  cp1: Position,
  cp2: Position,
  p1: Position,
): Position {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return {
    x: mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p1.x,
    y: mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p1.y,
  };
}

/**
 * Generate default control points for a cubic Bezier curve between two positions.
 * Places control points at 1/3 and 2/3 of the segment (producing a straight line).
 */
export function defaultCurveControlPoints(
  p0: Position,
  p1: Position,
): PathCurve {
  return {
    cp1: { x: p0.x + (p1.x - p0.x) / 3, y: p0.y + (p1.y - p0.y) / 3 },
    cp2: { x: p0.x + (p1.x - p0.x) * 2 / 3, y: p0.y + (p1.y - p0.y) * 2 / 3 },
  };
}

// ============================================================================
// SNAP GUIDES
// ============================================================================

export interface SnapGuide {
  type: 'x' | 'y';
  /** Position in normalized coordinates (0-100) */
  value: number;
  /** What this guide is snapping to */
  source: 'yard-line' | 'hash-mark' | 'performer' | 'center';
}

/**
 * Find snap targets for a position being dragged.
 * Returns guide lines that the position should snap to.
 */
export function findSnapTargets(
  position: Position,
  allPositions: Map<string, Position>,
  excludeId: string | null,
  fieldConfig: FieldConfig | undefined,
  threshold: number = 1.5,
): SnapGuide[] {
  const guides: SnapGuide[] = [];

  // Snap to field center
  if (Math.abs(position.x - 50) < threshold) {
    guides.push({ type: 'x', value: 50, source: 'center' });
  }
  if (Math.abs(position.y - 50) < threshold) {
    guides.push({ type: 'y', value: 50, source: 'center' });
  }

  // Snap to yard lines (if field config available)
  if (fieldConfig && fieldConfig.yardLineInterval > 0) {
    for (let pos = 0; pos <= fieldConfig.width; pos += fieldConfig.yardLineInterval) {
      const normalizedX = (pos / fieldConfig.width) * 100;
      if (Math.abs(position.x - normalizedX) < threshold) {
        guides.push({ type: 'x', value: normalizedX, source: 'yard-line' });
      }
    }
    // Hash marks
    const frontHashY = (fieldConfig.hashMarks.front / fieldConfig.height) * 100;
    const backHashY = 100 - (fieldConfig.hashMarks.back / fieldConfig.height) * 100;
    if (Math.abs(position.y - frontHashY) < threshold) {
      guides.push({ type: 'y', value: frontHashY, source: 'hash-mark' });
    }
    if (Math.abs(position.y - backHashY) < threshold) {
      guides.push({ type: 'y', value: backHashY, source: 'hash-mark' });
    }
  }

  // Snap to other performer positions (alignment)
  for (const [id, pos] of allPositions) {
    if (id === excludeId) continue;
    if (Math.abs(position.x - pos.x) < threshold) {
      guides.push({ type: 'x', value: pos.x, source: 'performer' });
    }
    if (Math.abs(position.y - pos.y) < threshold) {
      guides.push({ type: 'y', value: pos.y, source: 'performer' });
    }
  }

  return guides;
}

/**
 * Apply snap guides to a position, returning the snapped position.
 */
export function applySnapGuides(
  position: Position,
  guides: SnapGuide[],
): Position {
  let x = position.x;
  let y = position.y;

  for (const guide of guides) {
    if (guide.type === 'x') x = guide.value;
    if (guide.type === 'y') y = guide.value;
  }

  return { x, y, rotation: position.rotation };
}

// ============================================================================
// STEP DISTANCE MEASUREMENT
// ============================================================================

export interface StepMeasurement {
  /** Euclidean distance in normalized units */
  normalizedDistance: number;
  /** Distance in yards */
  yards: number;
  /** Distance in steps (at given step size) */
  steps: number;
  /** Step size label (e.g., "8 to 5") */
  stepSizeLabel: string;
  /** Angle between positions in degrees */
  angle: number;
}

/**
 * Calculate the step distance between two positions.
 * Supports configurable step sizes: 8-to-5 (standard), 6-to-5 (large), etc.
 */
export function calculateStepDistance(
  from: Position,
  to: Position,
  fieldConfig: FieldConfig,
  stepsPerFiveYards: number = 8,
): StepMeasurement {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const normalizedDistance = Math.sqrt(dx * dx + dy * dy);
  const yards = normalizedToYards(normalizedDistance, fieldConfig);
  const steps = yardsToSteps(yards, stepsPerFiveYards);
  const angle = angleBetween(from, to);

  return {
    normalizedDistance,
    yards,
    steps,
    stepSizeLabel: `${stepsPerFiveYards} to 5`,
    angle,
  };
}

// ============================================================================
// GROUP TRANSFORMS
// ============================================================================

/**
 * Apply a group transform to a set of positions.
 * Returns new positions (non-destructive).
 */
export function applyGroupTransform(
  positions: Map<string, Position>,
  performerIds: string[],
  transform: GroupTransform,
): Map<string, Position> {
  const result = new Map(positions);
  const { origin } = transform;

  for (const id of performerIds) {
    const pos = positions.get(id);
    if (!pos) continue;

    let newX = pos.x;
    let newY = pos.y;

    // Translate to origin-relative coordinates
    const dx = pos.x - origin.x;
    const dy = pos.y - origin.y;

    switch (transform.type) {
      case 'rotate': {
        const rad = ((transform.angle ?? 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        newX = origin.x + dx * cos - dy * sin;
        newY = origin.y + dx * sin + dy * cos;
        break;
      }
      case 'scale': {
        const factor = transform.scaleFactor ?? 1;
        const axis = transform.scaleAxis ?? 'uniform';
        newX = origin.x + dx * (axis === 'y' ? 1 : factor);
        newY = origin.y + dy * (axis === 'x' ? 1 : factor);
        break;
      }
      case 'mirror': {
        if (transform.mirrorAxis === 'x') {
          newX = origin.x - dx;
          newY = pos.y;
        } else {
          newX = pos.x;
          newY = origin.y - dy;
        }
        break;
      }
    }

    result.set(id, {
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
      rotation: pos.rotation,
    });
  }

  return result;
}

/**
 * Calculate the centroid of a set of positions.
 */
export function calculateCentroid(
  positions: Map<string, Position>,
  performerIds: string[],
): Position {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const id of performerIds) {
    const pos = positions.get(id);
    if (pos) {
      sumX += pos.x;
      sumY += pos.y;
      count++;
    }
  }

  if (count === 0) return { x: 50, y: 50 };
  return { x: sumX / count, y: sumY / count };
}

/**
 * Calculate bounding box for a set of positions.
 */
export function calculateBoundingBox(
  positions: Map<string, Position>,
  performerIds: string[],
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of performerIds) {
    const pos = positions.get(id);
    if (pos) {
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y > maxY) maxY = pos.y;
    }
  }

  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

export interface CollisionPair {
  id1: string;
  id2: string;
  distance: number;
}

/**
 * Detect performers that are too close together.
 * Returns pairs of performers within the minimum distance threshold.
 */
export function detectCollisions(
  positions: Map<string, Position>,
  minDistanceNormalized: number = 2,
): CollisionPair[] {
  const collisions: CollisionPair[] = [];
  const entries = Array.from(positions.entries());

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [id1, pos1] = entries[i];
      const [id2, pos2] = entries[j];
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistanceNormalized) {
        collisions.push({ id1, id2, distance });
      }
    }
  }

  return collisions;
}
