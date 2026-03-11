/**
 * Canvas Effects - Shared utility functions for visual effects
 */

import type { Position } from '../../../services/formationTypes';

// ============================================================================
// Heat Map Computations
// ============================================================================

/**
 * Compute a step density heat map from multiple keyframe positions.
 * For each grid cell, count how many performer paths pass through it.
 * Returns a 2D array of density values normalized to 0-1.
 */
export function computeStepDensityHeatMap(
  positions: Map<string, Position>[],
  canvasWidth: number,
  canvasHeight: number,
  resolution: number,
): number[][] {
  const cols = Math.ceil(canvasWidth / resolution);
  const rows = Math.ceil(canvasHeight / resolution);
  const grid: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  let maxCount = 0;

  for (const posMap of positions) {
    for (const pos of posMap.values()) {
      const px = (pos.x / 100) * canvasWidth;
      const py = (pos.y / 100) * canvasHeight;
      const col = Math.floor(px / resolution);
      const row = Math.floor(py / resolution);
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        grid[row][col]++;
        if (grid[row][col] > maxCount) maxCount = grid[row][col];
      }
    }
  }

  // Normalize to 0-1
  if (maxCount > 0) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c] /= maxCount;
      }
    }
  }

  return grid;
}

/**
 * Compute a collision risk heat map from a single set of positions.
 * Hot spots indicate areas where performers are closer than minDistance.
 */
export function computeCollisionRiskHeatMap(
  positions: Map<string, Position>,
  minDistance: number,
  canvasWidth: number,
  canvasHeight: number,
  resolution: number,
): number[][] {
  const cols = Math.ceil(canvasWidth / resolution);
  const rows = Math.ceil(canvasHeight / resolution);
  const grid: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  const posArray = Array.from(positions.values());
  let maxRisk = 0;

  for (let i = 0; i < posArray.length; i++) {
    for (let j = i + 1; j < posArray.length; j++) {
      const a = posArray[i];
      const b = posArray[j];
      const dx = ((a.x - b.x) / 100) * canvasWidth;
      const dy = ((a.y - b.y) / 100) * canvasHeight;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance) {
        const risk = 1 - dist / minDistance;
        // Mark the midpoint cell
        const mx = (((a.x + b.x) / 2) / 100) * canvasWidth;
        const my = (((a.y + b.y) / 2) / 100) * canvasHeight;
        const col = Math.floor(mx / resolution);
        const row = Math.floor(my / resolution);
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
          grid[row][col] += risk;
          if (grid[row][col] > maxRisk) maxRisk = grid[row][col];
        }
      }
    }
  }

  // Normalize
  if (maxRisk > 0) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c] = Math.min(1, grid[r][c] / maxRisk);
      }
    }
  }

  return grid;
}

// ============================================================================
// Section Colors
// ============================================================================

const SECTION_COLORS: Record<string, string> = {
  Brass: '#f59e0b',
  Woodwinds: '#3b82f6',
  Percussion: '#ef4444',
  'Color Guard': '#a855f7',
  Strings: '#10b981',
  Vocals: '#ec4899',
};

const FALLBACK_COLORS = [
  '#06b6d4', '#84cc16', '#f97316', '#8b5cf6',
  '#14b8a6', '#e11d48', '#eab308', '#6366f1',
];

/**
 * Return a consistent color for a section name.
 */
export function getSectionColor(section: string): string {
  if (SECTION_COLORS[section]) return SECTION_COLORS[section];
  // Deterministic hash-based fallback
  let hash = 0;
  for (let i = 0; i < section.length; i++) {
    hash = ((hash << 5) - hash + section.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

// ============================================================================
// Speed Computation
// ============================================================================

/**
 * Compute speed at each point along a performer's path.
 * Returns array of { t, speed } where speed is in percentage-units per second.
 */
export function computeSpeedAlongPath(
  path: Array<{ time: number; position: Position }>,
): Array<{ t: number; speed: number }> {
  if (path.length < 2) return path.map((p) => ({ t: p.time, speed: 0 }));

  const result: Array<{ t: number; speed: number }> = [{ t: path[0].time, speed: 0 }];

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const dt = curr.time - prev.time;
    if (dt <= 0) {
      result.push({ t: curr.time, speed: 0 });
      continue;
    }
    const dx = curr.position.x - prev.position.x;
    const dy = curr.position.y - prev.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    result.push({ t: curr.time, speed: dist / dt });
  }

  return result;
}

// ============================================================================
// Color Interpolation for Heat Maps
// ============================================================================

/**
 * Interpolate heat map value (0-1) to an RGBA color string.
 * Blue (cold) -> Green -> Yellow -> Red (hot).
 */
export function heatMapColor(value: number): string {
  const v = Math.max(0, Math.min(1, value));
  let r: number, g: number, b: number;

  if (v < 0.25) {
    const t = v / 0.25;
    r = 0;
    g = Math.round(t * 255);
    b = Math.round((1 - t) * 255);
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    r = 0;
    g = 255;
    b = Math.round((1 - t) * 128);
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    r = Math.round(t * 255);
    g = 255;
    b = 0;
  } else {
    const t = (v - 0.75) / 0.25;
    r = 255;
    g = Math.round((1 - t) * 255);
    b = 0;
  }

  return `rgba(${r},${g},${b},1)`;
}

/**
 * Interpolate speed value to a color: green (slow) -> yellow -> red (fast).
 */
export function speedColor(normalizedSpeed: number): string {
  const v = Math.max(0, Math.min(1, normalizedSpeed));
  let r: number, g: number;

  if (v < 0.5) {
    const t = v / 0.5;
    r = Math.round(t * 255);
    g = 255;
  } else {
    const t = (v - 0.5) / 0.5;
    r = 255;
    g = Math.round((1 - t) * 255);
  }

  return `rgb(${r},${g},0)`;
}
