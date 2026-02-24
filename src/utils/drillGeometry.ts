/**
 * Drill Geometry Utilities - FluxStudio Drill Writer
 *
 * Pure math functions for snap-to-grid, count/time conversion,
 * shape generation, alignment, and distribution.
 */

import type { Position } from '../services/formationTypes';

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
 * Convert a time in milliseconds to a count number (1-based).
 */
export function timeToCount(timeMs: number, settings: CountSettings): number {
  const msPerBeat = 60000 / settings.bpm;
  return Math.floor((timeMs - settings.startOffset) / msPerBeat) + 1;
}

/**
 * Convert a count number (1-based) to time in milliseconds.
 */
export function countToTime(count: number, settings: CountSettings): number {
  const msPerBeat = 60000 / settings.bpm;
  return settings.startOffset + (count - 1) * msPerBeat;
}

/**
 * Snap a time value to the nearest beat boundary.
 */
export function snapToCount(timeMs: number, settings: CountSettings): number {
  const msPerBeat = 60000 / settings.bpm;
  const beatsFromStart = (timeMs - settings.startOffset) / msPerBeat;
  const snappedBeat = Math.round(beatsFromStart);
  return settings.startOffset + snappedBeat * msPerBeat;
}

/**
 * Generate count markers for a timeline ruler.
 */
export function generateCountMarkers(
  duration: number,
  settings: CountSettings
): CountMarker[] {
  const markers: CountMarker[] = [];
  const msPerBeat = 60000 / settings.bpm;
  let count = 1;

  for (
    let time = settings.startOffset;
    time <= duration;
    time += msPerBeat, count++
  ) {
    const phrase = Math.ceil(count / settings.countsPerPhrase);
    const beatInPhrase = ((count - 1) % settings.countsPerPhrase) + 1;
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
