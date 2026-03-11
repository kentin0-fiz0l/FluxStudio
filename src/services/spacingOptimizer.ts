/**
 * Smart Spacing Optimizer - One-click even spacing within a formation
 *
 * Detects formation shape (line, arc, circle, block), then redistributes
 * performers evenly while preserving the overall shape.
 */

import type { Position } from './formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface SpacingOptions {
  /** Keep convex hull vertices fixed */
  preserveOuterShape: boolean;
  /** Minimum distance in normalized units (default: 2) */
  minimumSpacing: number;
  /** Maximum any performer can move (default: 15) */
  maxDisplacement: number;
}

type ShapeClassification = 'line' | 'arc' | 'circle' | 'block';

interface PCAResult {
  majorAxis: [number, number];
  minorAxis: [number, number];
  aspectRatio: number;
  centroid: Position;
}

// ============================================================================
// Convex Hull (Andrew's monotone chain)
// ============================================================================

function cross(o: Position, a: Position, b: Position): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function computeConvexHull(points: Position[]): Position[] {
  if (points.length <= 2) return [...points];

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const n = sorted.length;
  const hull: Position[] = [];

  // Lower hull
  for (let i = 0; i < n; i++) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], sorted[i]) <= 0) {
      hull.pop();
    }
    hull.push(sorted[i]);
  }

  // Upper hull
  const lowerLen = hull.length + 1;
  for (let i = n - 2; i >= 0; i--) {
    while (hull.length >= lowerLen && cross(hull[hull.length - 2], hull[hull.length - 1], sorted[i]) <= 0) {
      hull.pop();
    }
    hull.push(sorted[i]);
  }

  hull.pop(); // Remove last point (duplicate of first)
  return hull;
}

// ============================================================================
// Principal Component Analysis (2D)
// ============================================================================

export function principalComponentAnalysis(points: Position[]): PCAResult {
  const n = points.length;
  if (n === 0) {
    return {
      majorAxis: [1, 0],
      minorAxis: [0, 1],
      aspectRatio: 1,
      centroid: { x: 50, y: 50 },
    };
  }

  // Centroid
  const cx = points.reduce((s, p) => s + p.x, 0) / n;
  const cy = points.reduce((s, p) => s + p.y, 0) / n;

  // Covariance matrix
  let cxx = 0, cxy = 0, cyy = 0;
  for (const p of points) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    cxx += dx * dx;
    cxy += dx * dy;
    cyy += dy * dy;
  }
  cxx /= n;
  cxy /= n;
  cyy /= n;

  // Eigenvalues via quadratic formula
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const eigenvalue1 = trace / 2 + disc;
  const eigenvalue2 = trace / 2 - disc;

  // Major eigenvector
  let mx: number, my: number;
  if (Math.abs(cxy) > 1e-10) {
    mx = eigenvalue1 - cyy;
    my = cxy;
  } else if (cxx >= cyy) {
    mx = 1;
    my = 0;
  } else {
    mx = 0;
    my = 1;
  }
  const mLen = Math.sqrt(mx * mx + my * my) || 1;
  mx /= mLen;
  my /= mLen;

  const aspectRatio = eigenvalue2 > 1e-10 ? eigenvalue1 / eigenvalue2 : 100;

  return {
    majorAxis: [mx, my],
    minorAxis: [-my, mx],
    aspectRatio,
    centroid: { x: cx, y: cy },
  };
}

// ============================================================================
// Shape Classification
// ============================================================================

function classifyShape(points: Position[], pca: PCAResult): ShapeClassification {
  if (points.length <= 2) return 'line';

  // High aspect ratio => line
  if (pca.aspectRatio > 5) return 'line';

  // Check for arc/circle: fit a circle and measure residuals
  const { cx, cy, r } = fitCircle(points);
  const residuals = points.map((p) => {
    const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
    return Math.abs(d - r);
  });
  const meanResidual = residuals.reduce((s, v) => s + v, 0) / residuals.length;
  const relativeResidual = r > 0 ? meanResidual / r : Infinity;

  if (relativeResidual < 0.15) {
    // Good circle fit. Check angular spread for arc vs circle.
    const angles = points.map((p) => Math.atan2(p.y - cy, p.x - cx));
    const sortedAngles = [...angles].sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 1; i < sortedAngles.length; i++) {
      maxGap = Math.max(maxGap, sortedAngles[i] - sortedAngles[i - 1]);
    }
    // Wrap-around gap
    maxGap = Math.max(maxGap, (sortedAngles[0] + 2 * Math.PI) - sortedAngles[sortedAngles.length - 1]);

    // If the largest gap > 60 degrees, it's an arc; otherwise circle
    return maxGap > Math.PI / 3 ? 'arc' : 'circle';
  }

  return 'block';
}

// ============================================================================
// Circle Fitting (algebraic least-squares)
// ============================================================================

function fitCircle(points: Position[]): { cx: number; cy: number; r: number } {
  const n = points.length;
  if (n < 3) {
    const cx = points.reduce((s, p) => s + p.x, 0) / (n || 1);
    const cy = points.reduce((s, p) => s + p.y, 0) / (n || 1);
    return { cx, cy, r: 0 };
  }

  let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
  let sumXXX = 0, sumYYY = 0, sumXXY = 0, sumXYY = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXX += p.x * p.x;
    sumYY += p.y * p.y;
    sumXY += p.x * p.y;
    sumXXX += p.x * p.x * p.x;
    sumYYY += p.y * p.y * p.y;
    sumXXY += p.x * p.x * p.y;
    sumXYY += p.x * p.y * p.y;
  }

  const A = n * sumXX - sumX * sumX;
  const B = n * sumXY - sumX * sumY;
  const C = n * sumYY - sumY * sumY;
  const D = 0.5 * (n * (sumXXX + sumXYY) - sumX * (sumXX + sumYY));
  const E = 0.5 * (n * (sumXXY + sumYYY) - sumY * (sumXX + sumYY));

  const denom = A * C - B * B;
  if (Math.abs(denom) < 1e-10) {
    const cx = sumX / n;
    const cy = sumY / n;
    return { cx, cy, r: 0 };
  }

  const cx = (D * C - E * B) / denom;
  const cy = (A * E - B * D) / denom;
  const r = Math.sqrt(
    points.reduce((s, p) => s + (p.x - cx) ** 2 + (p.y - cy) ** 2, 0) / n,
  );

  return { cx, cy, r };
}

// ============================================================================
// Shape-Specific Redistributors
// ============================================================================

function redistributeLine(
  points: Position[],
  ids: string[],
  pca: PCAResult,
): Map<string, Position> {
  const [mx, my] = pca.majorAxis;
  const { centroid } = pca;

  // Project onto major axis
  const projected = ids.map((id, i) => {
    const p = points[i];
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const major = dx * mx + dy * my;
    const minor = dx * (-my) + dy * mx;
    return { id, major, minor };
  });

  // Sort by major axis projection
  projected.sort((a, b) => a.major - b.major);

  // Redistribute evenly along major axis, preserve minor offsets
  const minMajor = projected[0].major;
  const maxMajor = projected[projected.length - 1].major;
  const result = new Map<string, Position>();

  projected.forEach((p, i) => {
    const t = projected.length > 1 ? i / (projected.length - 1) : 0.5;
    const newMajor = minMajor + (maxMajor - minMajor) * t;

    result.set(p.id, {
      x: centroid.x + newMajor * mx + p.minor * (-my),
      y: centroid.y + newMajor * my + p.minor * mx,
    });
  });

  return result;
}

function redistributeBlock(
  points: Position[],
  ids: string[],
): Map<string, Position> {
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const width = maxX - minX;
  const height = maxY - minY;
  const aspect = width / (height || 1);
  const n = ids.length;

  let cols = Math.max(1, Math.round(Math.sqrt(n * aspect)));
  const rows = Math.max(1, Math.ceil(n / cols));
  while (cols * rows < n) cols++;

  // Create grid points
  const gridPoints: Position[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (gridPoints.length >= n) break;
      gridPoints.push({
        x: minX + (cols > 1 ? (c / (cols - 1)) * width : width / 2),
        y: minY + (rows > 1 ? (r / (rows - 1)) * height : height / 2),
      });
    }
  }

  // Greedy nearest-neighbor assignment
  const used = new Set<number>();
  const assignments: { id: string; gridIdx: number }[] = [];

  // Create distance pairs and sort
  const pairs: { idIdx: number; gridIdx: number; dist: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let g = 0; g < gridPoints.length; g++) {
      const dx = points[i].x - gridPoints[g].x;
      const dy = points[i].y - gridPoints[g].y;
      pairs.push({ idIdx: i, gridIdx: g, dist: Math.sqrt(dx * dx + dy * dy) });
    }
  }
  pairs.sort((a, b) => a.dist - b.dist);

  const assignedIds = new Set<number>();
  for (const pair of pairs) {
    if (assignedIds.has(pair.idIdx) || used.has(pair.gridIdx)) continue;
    assignments.push({ id: ids[pair.idIdx], gridIdx: pair.gridIdx });
    assignedIds.add(pair.idIdx);
    used.add(pair.gridIdx);
    if (assignments.length === n) break;
  }

  const result = new Map<string, Position>();
  for (const a of assignments) {
    result.set(a.id, gridPoints[a.gridIdx]);
  }

  return result;
}

function redistributeArcOrCircle(
  points: Position[],
  ids: string[],
  isCircle: boolean,
): Map<string, Position> {
  const { cx, cy, r } = fitCircle(points);

  // Calculate angles for each point
  const withAngle = ids.map((id, i) => ({
    id,
    angle: Math.atan2(points[i].y - cy, points[i].x - cx),
  }));
  withAngle.sort((a, b) => a.angle - b.angle);

  let startAngle: number;
  let endAngle: number;

  if (isCircle) {
    startAngle = withAngle[0].angle;
    endAngle = startAngle + 2 * Math.PI * ((ids.length - 1) / ids.length);
  } else {
    startAngle = withAngle[0].angle;
    endAngle = withAngle[withAngle.length - 1].angle;
    // Ensure we go the short way
    if (endAngle - startAngle > Math.PI) {
      startAngle += 2 * Math.PI;
      const tmp = startAngle;
      startAngle = endAngle;
      endAngle = tmp;
    }
  }

  const result = new Map<string, Position>();
  withAngle.forEach((p, i) => {
    const t = withAngle.length > 1 ? i / (withAngle.length - 1) : 0;
    const angle = startAngle + (endAngle - startAngle) * t;
    result.set(p.id, {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  });

  return result;
}

// ============================================================================
// Main Export
// ============================================================================

const DEFAULT_OPTIONS: SpacingOptions = {
  preserveOuterShape: true,
  minimumSpacing: 2,
  maxDisplacement: 15,
};

export function optimizeSpacing(
  positions: Map<string, Position>,
  performerIds: string[],
  options?: Partial<SpacingOptions>,
): Map<string, Position> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (performerIds.length < 2) return new Map(positions);

  // Gather positions for selected performers
  const points: Position[] = [];
  const validIds: string[] = [];
  for (const id of performerIds) {
    const pos = positions.get(id);
    if (pos) {
      points.push(pos);
      validIds.push(id);
    }
  }

  if (validIds.length < 2) return new Map(positions);

  // Classify shape
  const pca = principalComponentAnalysis(points);
  const shape = classifyShape(points, pca);

  // Redistribute based on shape
  let optimized: Map<string, Position>;

  switch (shape) {
    case 'line':
      optimized = redistributeLine(points, validIds, pca);
      break;
    case 'block':
      optimized = redistributeBlock(points, validIds);
      break;
    case 'arc':
      optimized = redistributeArcOrCircle(points, validIds, false);
      break;
    case 'circle':
      optimized = redistributeArcOrCircle(points, validIds, true);
      break;
  }

  // Build full result, merging with original positions
  const result = new Map(positions);

  for (const [id, newPos] of optimized) {
    const original = positions.get(id);
    if (!original) continue;

    // Clamp displacement
    const dx = newPos.x - original.x;
    const dy = newPos.y - original.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let finalPos: Position;
    if (dist > opts.maxDisplacement) {
      const scale = opts.maxDisplacement / dist;
      finalPos = {
        x: original.x + dx * scale,
        y: original.y + dy * scale,
        rotation: original.rotation,
      };
    } else {
      finalPos = { ...newPos, rotation: original.rotation };
    }

    // Clamp to stage bounds
    finalPos.x = Math.max(0, Math.min(100, finalPos.x));
    finalPos.y = Math.max(0, Math.min(100, finalPos.y));

    result.set(id, finalPos);
  }

  // Enforce minimum spacing (push overlapping pairs apart)
  enforceMinimumSpacing(result, validIds, opts.minimumSpacing);

  return result;
}

function enforceMinimumSpacing(
  positions: Map<string, Position>,
  ids: string[],
  minSpacing: number,
): void {
  // Simple iterative repulsion (3 passes)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions.get(ids[i])!;
        const b = positions.get(ids[j])!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minSpacing && dist > 0) {
          const push = (minSpacing - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          positions.set(ids[i], {
            x: Math.max(0, Math.min(100, a.x - nx * push)),
            y: Math.max(0, Math.min(100, a.y - ny * push)),
            rotation: a.rotation,
          });
          positions.set(ids[j], {
            x: Math.max(0, Math.min(100, b.x + nx * push)),
            y: Math.max(0, Math.min(100, b.y + ny * push)),
            rotation: b.rotation,
          });
        }
      }
    }
  }
}
