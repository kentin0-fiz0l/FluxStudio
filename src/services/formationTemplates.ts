/**
 * Formation Templates - Library of snap-to-formation templates with generators
 *
 * Provides ~15 formation templates across basic/advanced/specialty categories.
 * Each template has a generator function that produces positions for N performers
 * within given bounds. Includes a greedy nearest-assignment snap function.
 */

import type { Position } from './formationTypes';
import {
  generateLinePositions,
  generateArcPositions,
  generateBlockPositions,
} from '../utils/drillGeometry';

// ============================================================================
// Types
// ============================================================================

export interface FormationTemplate {
  id: string;
  name: string;
  category: 'basic' | 'advanced' | 'specialty';
  generator: (count: number, bounds: Bounds) => Position[];
  /** SVG path data for thumbnail preview (viewBox 0 0 40 40) */
  thumbnail: string;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// ============================================================================
// Default bounds (centered in 0-100 space with padding)
// ============================================================================

const DEFAULT_BOUNDS: Bounds = { minX: 15, minY: 15, maxX: 85, maxY: 85 };

function resolveBounds(bounds?: Bounds): Bounds {
  return bounds ?? DEFAULT_BOUNDS;
}

// ============================================================================
// Generator Helpers
// ============================================================================

function centerOf(b: Bounds): Position {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

function widthOf(b: Bounds): number {
  return b.maxX - b.minX;
}

function heightOf(b: Bounds): number {
  return b.maxY - b.minY;
}

// ============================================================================
// Template Generators
// ============================================================================

/** Single horizontal line (company front) */
function genCompanyFront(count: number, bounds: Bounds): Position[] {
  const cy = (bounds.minY + bounds.maxY) / 2;
  return generateLinePositions(
    { x: bounds.minX, y: cy },
    { x: bounds.maxX, y: cy },
    count,
  );
}

/** Grid block formation */
function genBlock(count: number, bounds: Bounds): Position[] {
  return generateBlockPositions(
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    count,
  );
}

/** Diagonal line from top-left to bottom-right */
function genDiagonal(count: number, bounds: Bounds): Position[] {
  return generateLinePositions(
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    count,
  );
}

/** Staggered lines: alternating offset horizontal rows */
function genStaggeredLines(count: number, bounds: Bounds): Position[] {
  const rows = Math.max(2, Math.ceil(Math.sqrt(count * 0.6)));
  const cols = Math.ceil(count / rows);
  const positions: Position[] = [];
  const rowSpacing = heightOf(bounds) / (rows - 1 || 1);
  const colSpacing = widthOf(bounds) / (cols - 1 || 1);

  for (let r = 0; r < rows && positions.length < count; r++) {
    const offsetX = r % 2 === 1 ? colSpacing * 0.5 : 0;
    const y = bounds.minY + r * rowSpacing;
    for (let c = 0; c < cols && positions.length < count; c++) {
      const x = bounds.minX + c * colSpacing + offsetX;
      if (x <= bounds.maxX + 1) {
        positions.push({ x: Math.min(x, bounds.maxX), y });
      }
    }
  }
  return positions;
}

/** Wedge (V shape) - two lines meeting at a forward point */
function genWedge(count: number, bounds: Bounds): Position[] {
  const tip = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY };
  const leftBase = { x: bounds.minX, y: bounds.maxY };
  const rightBase = { x: bounds.maxX, y: bounds.maxY };

  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;

  const leftLine = generateLinePositions(tip, leftBase, leftCount);
  const rightLine = generateLinePositions(tip, rightBase, rightCount + 1).slice(1); // skip tip duplicate

  return [...leftLine, ...rightLine];
}

/** Diamond shape - 4 lines forming a diamond */
function genDiamond(count: number, bounds: Bounds): Position[] {
  const center = centerOf(bounds);
  const top = { x: center.x, y: bounds.minY };
  const right = { x: bounds.maxX, y: center.y };
  const bottom = { x: center.x, y: bounds.maxY };
  const left = { x: bounds.minX, y: center.y };

  const perSide = Math.ceil(count / 4);
  const positions: Position[] = [];

  const sides: [Position, Position][] = [
    [top, right],
    [right, bottom],
    [bottom, left],
    [left, top],
  ];

  for (const [start, end] of sides) {
    const pts = generateLinePositions(start, end, perSide + 1);
    // Skip last point (it's the start of next side) except for the final side
    positions.push(...pts.slice(0, perSide));
  }

  return positions.slice(0, count);
}

/** Chevron - like wedge but with parallel offset rows */
function genChevron(count: number, bounds: Bounds): Position[] {
  const rows = Math.max(2, Math.ceil(count / 6));
  const perRow = Math.ceil(count / rows);
  const positions: Position[] = [];
  const rowSpacing = heightOf(bounds) * 0.15;

  for (let r = 0; r < rows && positions.length < count; r++) {
    const yOffset = r * rowSpacing;
    const tipY = bounds.minY + yOffset;
    const baseY = bounds.maxY;
    const spread = widthOf(bounds) * (0.3 + r * 0.2);
    const cx = (bounds.minX + bounds.maxX) / 2;

    const remaining = count - positions.length;
    const thisRow = Math.min(perRow, remaining);

    for (let i = 0; i < thisRow; i++) {
      const t = thisRow > 1 ? i / (thisRow - 1) : 0.5;
      const x = cx - spread / 2 + t * spread;
      const y = tipY + Math.abs(t - 0.5) * 2 * (baseY - tipY) * 0.3;
      positions.push({ x: Math.max(bounds.minX, Math.min(bounds.maxX, x)), y: Math.min(bounds.maxY, y) });
    }
  }

  return positions.slice(0, count);
}

/** Concentric circles - multiple rings */
function genConcentricCircles(count: number, bounds: Bounds): Position[] {
  const center = centerOf(bounds);
  const maxRadius = Math.min(widthOf(bounds), heightOf(bounds)) / 2;
  const rings = Math.max(1, Math.ceil(Math.sqrt(count / 6)));
  const positions: Position[] = [];

  // Distribute performers across rings proportionally to circumference
  let remaining = count;
  for (let r = 0; r < rings && remaining > 0; r++) {
    const radius = maxRadius * ((r + 1) / rings);
    const circumference = 2 * Math.PI * radius;
    const spacing = 4; // min spacing in normalized units
    const maxForRing = Math.floor(circumference / spacing);
    const ringCount = r === rings - 1 ? remaining : Math.min(remaining, maxForRing);

    const ringPositions = generateArcPositions(center, radius, 0, 2 * Math.PI * (1 - 1 / ringCount), ringCount);
    positions.push(...ringPositions);
    remaining -= ringCount;
  }

  return positions.slice(0, count);
}

/** Starburst - lines radiating from center */
function genStarburst(count: number, bounds: Bounds): Position[] {
  const center = centerOf(bounds);
  const radius = Math.min(widthOf(bounds), heightOf(bounds)) / 2;
  const arms = Math.max(3, Math.ceil(count / 4));
  const positions: Position[] = [center];
  let placed = 1;

  for (let a = 0; a < arms && placed < count; a++) {
    const angle = (a / arms) * 2 * Math.PI - Math.PI / 2;
    const perArm = Math.ceil((count - 1) / arms);

    for (let i = 1; i <= perArm && placed < count; i++) {
      const t = i / perArm;
      positions.push({
        x: Math.max(bounds.minX, Math.min(bounds.maxX, center.x + Math.cos(angle) * radius * t)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, center.y + Math.sin(angle) * radius * t)),
      });
      placed++;
    }
  }

  return positions.slice(0, count);
}

/** Double line - two parallel horizontal lines */
function genDoubleLine(count: number, bounds: Bounds): Position[] {
  const cy = (bounds.minY + bounds.maxY) / 2;
  const gap = heightOf(bounds) * 0.2;
  const topCount = Math.ceil(count / 2);
  const bottomCount = count - topCount;

  const top = generateLinePositions(
    { x: bounds.minX, y: cy - gap },
    { x: bounds.maxX, y: cy - gap },
    topCount,
  );
  const bottom = generateLinePositions(
    { x: bounds.minX, y: cy + gap },
    { x: bounds.maxX, y: cy + gap },
    bottomCount,
  );

  return [...top, ...bottom];
}

/** Offset block - grid with alternating row offsets */
function genOffsetBlock(count: number, bounds: Bounds): Position[] {
  return genStaggeredLines(count, bounds);
}

/** Curved wedge - V shape with curved arms */
function genCurvedWedge(count: number, bounds: Bounds): Position[] {
  const center = centerOf(bounds);
  const radius = heightOf(bounds) / 2;
  const leftCount = Math.ceil(count / 2);
  const rightCount = count - leftCount;

  const left = generateArcPositions(
    { x: center.x + radius * 0.3, y: bounds.minY },
    radius,
    Math.PI * 0.6,
    Math.PI * 0.9,
    leftCount,
  );
  const right = generateArcPositions(
    { x: center.x - radius * 0.3, y: bounds.minY },
    radius,
    Math.PI * 0.1,
    Math.PI * 0.4,
    rightCount,
  );

  return [...left, ...right];
}

/** Pinwheel - spiral-like pattern with rotation */
function genPinwheel(count: number, bounds: Bounds): Position[] {
  const center = centerOf(bounds);
  const maxRadius = Math.min(widthOf(bounds), heightOf(bounds)) / 2;
  const positions: Position[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * 4 * Math.PI; // 2 full rotations
    const radius = maxRadius * (0.2 + t * 0.8);
    positions.push({
      x: Math.max(bounds.minX, Math.min(bounds.maxX, center.x + Math.cos(angle) * radius)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, center.y + Math.sin(angle) * radius)),
    });
  }

  return positions;
}

/** Scatter - random but evenly distributed positions */
function genScatter(count: number, bounds: Bounds): Position[] {
  const positions: Position[] = [];
  // Use a deterministic quasi-random distribution (Halton sequence)
  for (let i = 0; i < count; i++) {
    const hx = halton(i + 1, 2);
    const hy = halton(i + 1, 3);
    positions.push({
      x: bounds.minX + hx * widthOf(bounds),
      y: bounds.minY + hy * heightOf(bounds),
    });
  }
  return positions;
}

/** Halton sequence for quasi-random distribution */
function halton(index: number, base: number): number {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

/** Tunnel - two lines converging toward a vanishing point */
function genTunnel(count: number, bounds: Bounds): Position[] {
  const vanish = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY };
  const rows = Math.max(2, Math.ceil(count / 4));
  const perRow = Math.ceil(count / rows);
  const positions: Position[] = [];

  for (let r = 0; r < rows && positions.length < count; r++) {
    const t = (r + 1) / rows;
    const y = bounds.minY + t * heightOf(bounds);
    const halfWidth = (widthOf(bounds) / 2) * t;
    const cx = vanish.x;
    const remaining = Math.min(perRow, count - positions.length);

    for (let c = 0; c < remaining; c++) {
      const ct = remaining > 1 ? c / (remaining - 1) : 0.5;
      positions.push({
        x: cx - halfWidth + ct * halfWidth * 2,
        y,
      });
    }
  }

  return positions.slice(0, count);
}

// ============================================================================
// Template Definitions
// ============================================================================

export const FORMATION_TEMPLATES: FormationTemplate[] = [
  // Basic
  {
    id: 'company_front',
    name: 'Company Front',
    category: 'basic',
    generator: genCompanyFront,
    thumbnail: 'M 5 20 L 35 20',
  },
  {
    id: 'block',
    name: 'Block',
    category: 'basic',
    generator: genBlock,
    thumbnail: 'M 8 8 H 32 V 32 H 8 Z',
  },
  {
    id: 'diagonal',
    name: 'Diagonal',
    category: 'basic',
    generator: genDiagonal,
    thumbnail: 'M 5 5 L 35 35',
  },
  {
    id: 'staggered_lines',
    name: 'Staggered Lines',
    category: 'basic',
    generator: genStaggeredLines,
    thumbnail: 'M 5 10 H 35 M 10 20 H 35 M 5 30 H 35',
  },

  // Advanced
  {
    id: 'wedge',
    name: 'Wedge',
    category: 'advanced',
    generator: genWedge,
    thumbnail: 'M 20 5 L 5 35 M 20 5 L 35 35',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'advanced',
    generator: genDiamond,
    thumbnail: 'M 20 5 L 35 20 L 20 35 L 5 20 Z',
  },
  {
    id: 'chevron',
    name: 'Chevron',
    category: 'advanced',
    generator: genChevron,
    thumbnail: 'M 5 25 L 20 10 L 35 25 M 5 30 L 20 15 L 35 30',
  },
  {
    id: 'concentric_circles',
    name: 'Concentric Circles',
    category: 'advanced',
    generator: genConcentricCircles,
    thumbnail: 'M 20 5 A 15 15 0 1 1 20 35 A 15 15 0 1 1 20 5 M 20 12 A 8 8 0 1 1 20 28 A 8 8 0 1 1 20 12',
  },
  {
    id: 'starburst',
    name: 'Starburst',
    category: 'advanced',
    generator: genStarburst,
    thumbnail: 'M 20 20 L 20 3 M 20 20 L 35 10 M 20 20 L 35 30 M 20 20 L 20 37 M 20 20 L 5 30 M 20 20 L 5 10',
  },

  // Specialty
  {
    id: 'double_line',
    name: 'Double Line',
    category: 'specialty',
    generator: genDoubleLine,
    thumbnail: 'M 5 15 H 35 M 5 25 H 35',
  },
  {
    id: 'offset_block',
    name: 'Offset Block',
    category: 'specialty',
    generator: genOffsetBlock,
    thumbnail: 'M 5 10 H 30 M 10 20 H 35 M 5 30 H 30',
  },
  {
    id: 'curved_wedge',
    name: 'Curved Wedge',
    category: 'specialty',
    generator: genCurvedWedge,
    thumbnail: 'M 5 35 Q 15 5 20 15 M 35 35 Q 25 5 20 15',
  },
  {
    id: 'pinwheel',
    name: 'Pinwheel',
    category: 'specialty',
    generator: genPinwheel,
    thumbnail: 'M 20 20 Q 30 10 35 20 Q 30 30 20 35 Q 10 30 5 20 Q 10 10 20 5',
  },
  {
    id: 'scatter',
    name: 'Scatter',
    category: 'specialty',
    generator: genScatter,
    thumbnail: 'M 10 8 L 10.5 8.5 M 25 12 L 25.5 12.5 M 8 22 L 8.5 22.5 M 30 18 L 30.5 18.5 M 15 30 L 15.5 30.5 M 32 28 L 32.5 28.5 M 20 25 L 20.5 25.5',
  },
  {
    id: 'tunnel',
    name: 'Tunnel',
    category: 'specialty',
    generator: genTunnel,
    thumbnail: 'M 18 8 H 22 M 14 16 H 26 M 8 24 H 32 M 4 32 H 36',
  },
];

// ============================================================================
// Snap-to-Template Function
// ============================================================================

/**
 * Apply a formation template to existing performers using greedy
 * nearest-assignment to minimize total movement.
 *
 * @param currentPositions Current performer positions
 * @param performerIds Ordered list of performer IDs to assign
 * @param template Formation template to snap to
 * @param bounds Optional bounding box (defaults to 15-85 range)
 * @returns New position map with performers snapped to template slots
 */
export function snapToTemplate(
  currentPositions: Map<string, Position>,
  performerIds: string[],
  template: FormationTemplate,
  bounds?: Bounds,
): Map<string, Position> {
  const resolvedBounds = resolveBounds(bounds);
  const templatePositions = template.generator(performerIds.length, resolvedBounds);

  // Greedy nearest-assignment: for each template slot, find the closest
  // unassigned performer and assign it there.
  const result = new Map(currentPositions);
  const availableSlots = templatePositions.map((pos, i) => ({ pos, index: i }));
  const unassigned = new Set(performerIds);

  for (const slot of availableSlots) {
    if (unassigned.size === 0) break;

    let bestId = '';
    let bestDist = Infinity;

    for (const id of unassigned) {
      const current = currentPositions.get(id);
      if (!current) continue;

      const dx = current.x - slot.pos.x;
      const dy = current.y - slot.pos.y;
      const dist = dx * dx + dy * dy;

      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    }

    if (bestId) {
      result.set(bestId, { x: slot.pos.x, y: slot.pos.y });
      unassigned.delete(bestId);
    }
  }

  return result;
}

// ============================================================================
// Category Helper
// ============================================================================

/**
 * Group templates by category for UI display.
 */
export function getTemplatesByCategory(): Map<string, FormationTemplate[]> {
  const map = new Map<string, FormationTemplate[]>();
  for (const template of FORMATION_TEMPLATES) {
    const group = map.get(template.category) ?? [];
    group.push(template);
    map.set(template.category, group);
  }
  return map;
}
