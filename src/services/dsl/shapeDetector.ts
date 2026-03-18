/**
 * Shape Detector - FluxDrill DSL
 *
 * Analyzes a set of performer positions and detects the best-matching
 * geometric shape (line, arc, circle, block, wedge, company front).
 * Falls back to 'scatter' when no shape matches well.
 */

import type { Position, FieldConfig } from '../formationTypes';
import type { DslShape } from './fluxDrillTypes';
import { normalizedToFieldNotation, yardsToSteps } from './fieldNotation';

// ============================================================================
// Thresholds
// ============================================================================

const LINE_R2_THRESHOLD = 0.95;
const CIRCLE_FIT_THRESHOLD = 0.05;
const GRID_TOLERANCE_STEPS = 1.5;
const COMPANY_FRONT_Y_TOLERANCE = 2;
const SCATTER_R2_THRESHOLD = 0.7;

// ============================================================================
// Public API
// ============================================================================

/**
 * Analyze positions and detect the best matching shape.
 * Tries shapes in order of specificity and returns the first good match.
 */
export function detectShape(
  performerIds: string[],
  positions: Map<string, Position>,
  fieldConfig: FieldConfig,
): DslShape {
  const pts = performerIds
    .map((id) => ({ id, pos: positions.get(id) }))
    .filter((p): p is { id: string; pos: Position } => p.pos !== undefined);

  if (pts.length === 0) {
    return { type: 'explicit', positions: [] };
  }

  if (pts.length === 1) {
    const pos = normalizedToFieldNotation(pts[0].pos.x, pts[0].pos.y, fieldConfig);
    return { type: 'explicit', positions: [{ id: pts[0].id, pos }] };
  }

  const coords = pts.map((p) => p.pos);

  // Try detection in order of specificity
  const companyFront = tryCompanyFront(coords, fieldConfig);
  if (companyFront) return companyFront;

  const circle = tryCircle(coords, fieldConfig);
  if (circle) return circle;

  const line = tryLine(coords, fieldConfig);
  if (line) return line;

  const block = tryBlock(coords, fieldConfig);
  if (block) return block;

  const wedge = tryWedge(coords, fieldConfig);
  if (wedge) return wedge;

  // Fallback: if linear regression has moderate fit, still call it a scatter
  const { r2 } = linearRegression(coords.map((c) => c.x), coords.map((c) => c.y));
  if (r2 < SCATTER_R2_THRESHOLD) {
    const cx = mean(coords.map((c) => c.x));
    const cy = mean(coords.map((c) => c.y));
    const maxDist = Math.max(...coords.map((c) => dist(c, { x: cx, y: cy })));
    const radiusSteps = Math.round(yardsToSteps((maxDist / 100) * fieldConfig.width));
    return {
      type: 'scatter',
      center: normalizedToFieldNotation(cx, cy, fieldConfig),
      radius: radiusSteps,
    };
  }

  // Fallback to explicit
  return {
    type: 'explicit',
    positions: pts.map((p) => ({
      id: p.id,
      pos: normalizedToFieldNotation(p.pos.x, p.pos.y, fieldConfig),
    })),
  };
}

// ============================================================================
// Shape detection: Company Front
// ============================================================================

function tryCompanyFront(coords: Position[], fieldConfig: FieldConfig): DslShape | null {
  if (coords.length < 3) return null;

  // Company front: horizontal line — all y values very close
  const ys = coords.map((c) => c.y);
  const yRange = Math.max(...ys) - Math.min(...ys);
  const yRangeSteps = yardsToSteps((yRange / 100) * fieldConfig.height);

  if (yRangeSteps > COMPANY_FRONT_Y_TOLERANCE) return null;

  // Also need the x values to be roughly evenly spaced
  const xs = coords.map((c) => c.x).sort((a, b) => a - b);
  const avgY = mean(ys);
  const midX = mean(xs);

  const center = normalizedToFieldNotation(midX, avgY, fieldConfig);
  return {
    type: 'company_front',
    yardLine: center,
    frontToBack: center.frontToBack,
  };
}

// ============================================================================
// Shape detection: Circle / Arc
// ============================================================================

function tryCircle(coords: Position[], fieldConfig: FieldConfig): DslShape | null {
  if (coords.length < 4) return null;

  const fit = fitCircle(coords);
  if (!fit) return null;

  const { cx, cy, r } = fit;

  // Check all points are within threshold of radius
  const maxDeviation = Math.max(
    ...coords.map((c) => Math.abs(dist(c, { x: cx, y: cy }) - r) / r),
  );
  if (maxDeviation > CIRCLE_FIT_THRESHOLD) return null;

  // Determine arc coverage
  const angles = coords.map((c) => Math.atan2(c.y - cy, c.x - cx));
  const sortedAngles = [...angles].sort((a, b) => a - b);

  // Calculate angular coverage
  let _totalArc = 0;
  for (let i = 1; i < sortedAngles.length; i++) {
    _totalArc += sortedAngles[i] - sortedAngles[i - 1];
  }
  // Add the wrap-around gap
  const wrapGap = (2 * Math.PI) - (sortedAngles[sortedAngles.length - 1] - sortedAngles[0]);
  const maxGap = Math.max(wrapGap, ...gapsBetween(sortedAngles));

  const radiusSteps = Math.round(yardsToSteps((r / 100) * fieldConfig.width));
  const center = normalizedToFieldNotation(cx, cy, fieldConfig);

  // Full circle: max gap < 90 degrees
  if (maxGap < Math.PI / 2) {
    return { type: 'circle', center, radius: radiusSteps };
  }

  // Arc: coverage > 90 degrees
  const coverage = (2 * Math.PI) - maxGap;
  if (coverage > Math.PI / 2) {
    const startAngle = Math.round((sortedAngles[0] * 180) / Math.PI);
    const endAngle = Math.round((sortedAngles[sortedAngles.length - 1] * 180) / Math.PI);
    return { type: 'arc', center, radius: radiusSteps, startAngle, endAngle };
  }

  return null;
}

function fitCircle(pts: Position[]): { cx: number; cy: number; r: number } | null {
  // Algebraic circle fit using least squares (Kasa method)
  const n = pts.length;
  if (n < 3) return null;

  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
  let sumX3 = 0, sumY3 = 0, sumX2Y = 0, sumXY2 = 0;

  for (const p of pts) {
    const x2 = p.x * p.x;
    const y2 = p.y * p.y;
    sumX += p.x;
    sumY += p.y;
    sumX2 += x2;
    sumY2 += y2;
    sumXY += p.x * p.y;
    sumX3 += x2 * p.x;
    sumY3 += y2 * p.y;
    sumX2Y += x2 * p.y;
    sumXY2 += p.x * y2;
  }

  const A = n * sumX2 - sumX * sumX;
  const B = n * sumXY - sumX * sumY;
  const C = n * sumY2 - sumY * sumY;
  const D = 0.5 * (n * sumX3 + n * sumXY2 - sumX * sumX2 - sumX * sumY2);
  const E = 0.5 * (n * sumX2Y + n * sumY3 - sumY * sumX2 - sumY * sumY2);

  const denom = A * C - B * B;
  if (Math.abs(denom) < 1e-10) return null;

  const cx = (D * C - B * E) / denom;
  const cy = (A * E - B * D) / denom;
  const r = Math.sqrt(
    (sumX2 - 2 * cx * sumX + n * cx * cx + sumY2 - 2 * cy * sumY + n * cy * cy) / n,
  );

  if (r < 1) return null;
  return { cx, cy, r };
}

function gapsBetween(sorted: number[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  return gaps;
}

// ============================================================================
// Shape detection: Line
// ============================================================================

function tryLine(coords: Position[], fieldConfig: FieldConfig): DslShape | null {
  if (coords.length < 3) return null;

  const xs = coords.map((c) => c.x);
  const ys = coords.map((c) => c.y);

  // Try both regressions and pick the better one
  const regXY = linearRegression(xs, ys);
  const regYX = linearRegression(ys, xs);
  const bestR2 = Math.max(regXY.r2, regYX.r2);

  if (bestR2 < LINE_R2_THRESHOLD) return null;

  // Find endpoints: sort along the principal axis
  let sorted: Position[];
  if (regXY.r2 >= regYX.r2) {
    sorted = [...coords].sort((a, b) => a.x - b.x);
  } else {
    sorted = [...coords].sort((a, b) => a.y - b.y);
  }

  const from = normalizedToFieldNotation(sorted[0].x, sorted[0].y, fieldConfig);
  const to = normalizedToFieldNotation(
    sorted[sorted.length - 1].x,
    sorted[sorted.length - 1].y,
    fieldConfig,
  );

  // Calculate average spacing in steps
  let totalDist = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalDist += dist(sorted[i], sorted[i - 1]);
  }
  const avgDistNorm = totalDist / (sorted.length - 1);
  const avgDistYards = (avgDistNorm / 100) * fieldConfig.width;
  const avgSteps = Math.round(yardsToSteps(avgDistYards));
  const spacing = avgSteps > 0 ? `${avgSteps}-to-5` : undefined;

  return { type: 'line', from, to, spacing };
}

// ============================================================================
// Shape detection: Block / Grid
// ============================================================================

function tryBlock(coords: Position[], fieldConfig: FieldConfig): DslShape | null {
  if (coords.length < 4) return null;

  // Find distinct rows and columns by clustering y and x values
  const xVals = coords.map((c) => c.x).sort((a, b) => a - b);
  const yVals = coords.map((c) => c.y).sort((a, b) => a - b);

  const xClusters = clusterValues(xVals, (GRID_TOLERANCE_STEPS * 0.625 / fieldConfig.width) * 100);
  const yClusters = clusterValues(yVals, (GRID_TOLERANCE_STEPS * 0.625 / fieldConfig.height) * 100);

  if (xClusters.length < 2 || yClusters.length < 2) return null;

  // Check grid completeness: at least 60% of cells filled
  const expectedCells = xClusters.length * yClusters.length;
  const filledCells = coords.length;
  if (filledCells / expectedCells < 0.6) return null;

  const minX = Math.min(...coords.map((c) => c.x));
  const minY = Math.min(...coords.map((c) => c.y));
  const maxX = Math.max(...coords.map((c) => c.x));
  const maxY = Math.max(...coords.map((c) => c.y));

  const topLeft = normalizedToFieldNotation(minX, minY, fieldConfig);
  const bottomRight = normalizedToFieldNotation(maxX, maxY, fieldConfig);

  return { type: 'block', topLeft, bottomRight, columns: xClusters.length };
}

function clusterValues(sorted: number[], tolerance: number): number[][] {
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const lastCluster = clusters[clusters.length - 1];
    if (sorted[i] - lastCluster[lastCluster.length - 1] <= tolerance) {
      lastCluster.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }
  return clusters;
}

// ============================================================================
// Shape detection: Wedge
// ============================================================================

function tryWedge(coords: Position[], fieldConfig: FieldConfig): DslShape | null {
  if (coords.length < 5) return null;

  // Find the point that is most "extreme" — the tip of the V
  // Try each point as a potential tip
  let bestTip: Position | null = null;
  let bestScore = -Infinity;

  for (const candidate of coords) {
    const others = coords.filter((c) => c !== candidate);
    // Sort others by angle from candidate
    const angles = others.map((o) => Math.atan2(o.y - candidate.y, o.x - candidate.x));
    const sortedAngles = [...angles].sort((a, b) => a - b);

    // The tip should have points spread in a V shape — two groups
    if (sortedAngles.length < 4) continue;

    const midIdx = Math.floor(sortedAngles.length / 2);
    const leftGroup = sortedAngles.slice(0, midIdx);
    const rightGroup = sortedAngles.slice(midIdx);

    // Check if each group forms a line from the tip
    const leftMean = mean(leftGroup);
    const rightMean = mean(rightGroup);
    const wedgeAngle = Math.abs(rightMean - leftMean);

    // Wedge should have angle between 20 and 120 degrees
    if (wedgeAngle > (20 * Math.PI) / 180 && wedgeAngle < (120 * Math.PI) / 180) {
      // Score by how tight the grouping is
      const leftVar = variance(leftGroup);
      const rightVar = variance(rightGroup);
      const score = 1 / (1 + leftVar + rightVar);
      if (score > bestScore) {
        bestScore = score;
        bestTip = candidate;
      }
    }
  }

  if (!bestTip || bestScore < 0.5) return null;

  const others = coords.filter((c) => c !== bestTip);
  const maxDist = Math.max(...others.map((o) => dist(o, bestTip!)));
  const depthSteps = Math.round(yardsToSteps((maxDist / 100) * fieldConfig.width));

  // Calculate angle of the wedge opening
  const angles = others.map((o) => Math.atan2(o.y - bestTip!.y, o.x - bestTip!.x));
  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);
  const openingAngle = Math.round(((maxAngle - minAngle) * 180) / Math.PI);

  const tip = normalizedToFieldNotation(bestTip.x, bestTip.y, fieldConfig);
  return { type: 'wedge', tip, angle: openingAngle, depth: depthSteps };
}

// ============================================================================
// Math helpers
// ============================================================================

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const mx = mean(xs);
  const my = mean(ys);

  let ssXX = 0, ssYY = 0, ssXY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    ssXX += dx * dx;
    ssYY += dy * dy;
    ssXY += dx * dy;
  }

  if (ssXX === 0) return { slope: 0, intercept: my, r2: ssYY === 0 ? 1 : 0 };

  const slope = ssXY / ssXX;
  const intercept = my - slope * mx;
  const r2 = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY);

  return { slope, intercept, r2 };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
}

function dist(a: Position, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
