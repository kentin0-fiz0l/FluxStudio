/**
 * Prompt Parser - Parses natural language formation commands into structured operations
 *
 * Pattern-matches user input to determine the type of operation and extract parameters.
 * Falls back to basic_formation (existing generator) for unrecognized patterns.
 */

import type { Performer } from './formationTypes';

// ============================================================================
// Types
// ============================================================================

export type PerformerFilter =
  | { type: 'all' }
  | { type: 'selected'; ids: string[] }
  | { type: 'section'; section: string }
  | { type: 'instrument'; instrument: string }
  | { type: 'conditional'; base: PerformerFilter; except: string[] };

export interface DistributeParams {
  /** Start position (normalized 0-100) */
  start?: { x: number; y: number };
  /** End position (normalized 0-100) */
  end?: { x: number; y: number };
  /** Center for arc/circle */
  center?: { x: number; y: number };
  /** Radius for arc/circle */
  radius?: number;
  /** Start angle in radians for arc */
  startAngle?: number;
  /** End angle in radians for arc */
  endAngle?: number;
}

export interface TemplateParams {
  templateName: string;
}

export interface RelativeMoveParams {
  dx: number;
  dy: number;
  /** Rotation in degrees */
  rotation?: number;
}

export type ParsedCommand =
  | { type: 'distribute'; shape: 'line' | 'arc' | 'circle' | 'grid'; performerFilter: PerformerFilter; params: DistributeParams }
  | { type: 'template'; templateName: string; performerFilter: PerformerFilter; params: TemplateParams }
  | { type: 'morph'; targetShape: string; morphFactor: number; performerFilter: PerformerFilter }
  | { type: 'relative-move'; performerFilter: PerformerFilter; params: RelativeMoveParams }
  | { type: 'basic_formation'; description: string; performerFilter: PerformerFilter };

// ============================================================================
// Section/Instrument Detection
// ============================================================================

const KNOWN_SECTIONS = ['brass', 'woodwinds', 'percussion', 'color guard', 'drum major', 'front ensemble'];
const KNOWN_INSTRUMENTS = [
  'trumpet', 'trumpets', 'trombone', 'trombones', 'tuba', 'tubas', 'baritone', 'baritones',
  'mellophone', 'mellophones', 'sousaphone', 'sousaphones',
  'flute', 'flutes', 'clarinet', 'clarinets', 'saxophone', 'saxophones', 'sax',
  'oboe', 'oboes', 'bassoon', 'bassoons', 'piccolo', 'piccolos',
  'snare', 'snares', 'bass drum', 'bass drums', 'tenor', 'tenors', 'quads',
  'cymbal', 'cymbals', 'pit', 'marimba', 'vibraphone', 'xylophone',
  'guard', 'rifle', 'rifles', 'flag', 'flags', 'sabre', 'sabres',
];

// ============================================================================
// Field Notation Parsing (4F)
// ============================================================================

/**
 * Resolve field notation to normalized x position (0-100).
 * Supports "yard 40", "on the 35", "the 50", "between 40 and 45", "R30", "L45".
 */
export function resolveYardLineToX(text: string): number | null {
  // "yard 40" or "the 40" or "on the 40"
  const yardMatch = text.match(/(?:yard|the|on\s+the)\s+(\d+)/i);
  if (yardMatch) {
    const yardLine = parseInt(yardMatch[1], 10);
    // NCAA field: 0-100 normalized. Yard line 0 = left end zone, 50 = midfield, 100 = right end zone
    // Offset by 10 for end zones: yard 0 = x=10, yard 50 = x=60, yard 100 = x=110 (but clamped)
    return Math.min(100, Math.max(0, 10 + yardLine * 0.8));
  }

  // "R30" or "L45" (Right/Left side of field)
  const sideMatch = text.match(/\b([RL])(\d+)\b/i);
  if (sideMatch) {
    const side = sideMatch[1].toUpperCase();
    const yardLine = parseInt(sideMatch[2], 10);
    // R30 = right of center at 30 yard line
    const centerX = 50;
    const offset = yardLine * 0.8;
    return side === 'R' ? centerX + offset / 2 : centerX - offset / 2;
  }

  return null;
}

/**
 * Parse a range in field notation: "from 30 to 30", "between 40 and 45".
 */
export function parseFieldRange(text: string): { startX: number; endX: number } | null {
  // "from 30 to 30" or "from yard 30 to yard 30"
  const rangeMatch = text.match(/from\s+(?:yard\s+)?(\d+)\s+to\s+(?:yard\s+)?(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    return {
      startX: 10 + start * 0.8,
      endX: 10 + end * 0.8,
    };
  }

  // "between 40 and 45"
  const betweenMatch = text.match(/between\s+(?:yard\s+)?(\d+)\s+and\s+(?:yard\s+)?(\d+)/i);
  if (betweenMatch) {
    const start = parseInt(betweenMatch[1], 10);
    const end = parseInt(betweenMatch[2], 10);
    return {
      startX: 10 + start * 0.8,
      endX: 10 + end * 0.8,
    };
  }

  return null;
}

// ============================================================================
// Relative Move Parsing (4F)
// ============================================================================

/**
 * Parse relative movement commands.
 * "shift 4 steps left", "move forward 2 steps", "rotate 45 degrees"
 */
function parseRelativeMove(text: string): RelativeMoveParams | null {
  // Step size: 1 step ~= 1.25 normalized units (8-to-5 = 5 yards / 8 steps ≈ 0.625 yards per step)
  const STEP_TO_NORMALIZED = 1.25;

  let dx = 0;
  let dy = 0;
  let rotation: number | undefined;

  // "shift N steps left/right"
  const shiftMatch = text.match(/shift\s+(\d+)\s+steps?\s+(left|right)/i);
  if (shiftMatch) {
    const steps = parseInt(shiftMatch[1], 10);
    const dir = shiftMatch[2].toLowerCase();
    dx = dir === 'right' ? steps * STEP_TO_NORMALIZED : -steps * STEP_TO_NORMALIZED;
    return { dx, dy };
  }

  // "move forward/backward N steps"
  const moveMatch = text.match(/move\s+(forward|backward|back|up|down)\s+(\d+)\s+steps?/i);
  if (moveMatch) {
    const steps = parseInt(moveMatch[2], 10);
    const dir = moveMatch[1].toLowerCase();
    if (dir === 'forward' || dir === 'up') {
      dy = -steps * STEP_TO_NORMALIZED; // forward = toward front sideline = lower y
    } else {
      dy = steps * STEP_TO_NORMALIZED;
    }
    return { dx, dy };
  }

  // "rotate N degrees"
  const rotateMatch = text.match(/rotate\s+(\d+)\s+degrees?/i);
  if (rotateMatch) {
    rotation = parseInt(rotateMatch[1], 10);
    return { dx: 0, dy: 0, rotation };
  }

  return null;
}

// ============================================================================
// Conditional Filter Detection (4F)
// ============================================================================

function detectPerformerFilter(text: string, selectedIds: string[]): { filter: PerformerFilter; remaining: string } {
  const lower = text.toLowerCase();

  // Check for "except" conditional patterns first: "all trumpets except T1"
  const exceptMatch = lower.match(/\b(.*?)\s+except\s+(.+)/i);
  let exceptIds: string[] = [];
  let baseText = lower;
  if (exceptMatch) {
    baseText = exceptMatch[1].trim();
    // Parse the except list: "T1, T2" or "T1 and T2" or just "T1"
    exceptIds = exceptMatch[2]
      .split(/[,\s]+(?:and\s+)?/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Check for "selected" keyword
  if (baseText.includes('selected') && selectedIds.length > 0) {
    const filter: PerformerFilter = exceptIds.length > 0
      ? { type: 'conditional', base: { type: 'selected', ids: selectedIds }, except: exceptIds }
      : { type: 'selected', ids: selectedIds };
    return {
      filter,
      remaining: baseText.replace(/\bselected\b/, '').trim(),
    };
  }

  // Check for section names
  for (const section of KNOWN_SECTIONS) {
    if (baseText.includes(section)) {
      const baseFilter: PerformerFilter = { type: 'section', section };
      const filter: PerformerFilter = exceptIds.length > 0
        ? { type: 'conditional', base: baseFilter, except: exceptIds }
        : baseFilter;
      return {
        filter,
        remaining: baseText.replace(new RegExp(`\\b${section}\\b`, 'i'), '').trim(),
      };
    }
  }

  // Check for instrument names
  for (const instrument of KNOWN_INSTRUMENTS) {
    if (baseText.includes(instrument)) {
      const baseFilter: PerformerFilter = { type: 'instrument', instrument };
      const filter: PerformerFilter = exceptIds.length > 0
        ? { type: 'conditional', base: baseFilter, except: exceptIds }
        : baseFilter;
      return {
        filter,
        remaining: baseText.replace(new RegExp(`\\b${instrument}\\b`, 'i'), '').trim(),
      };
    }
  }

  // Default to all
  const filter: PerformerFilter = exceptIds.length > 0
    ? { type: 'conditional', base: { type: 'all' }, except: exceptIds }
    : { type: 'all' };
  return { filter, remaining: baseText };
}

// ============================================================================
// Range Parsing (e.g. "from R30 to R50", "from 20 to 80")
// ============================================================================

function parseRange(text: string): { start: number; end: number } | null {
  // "from R30 to R50" or "from 30 to 50"
  const rangeMatch = text.match(/from\s+r?(\d+)\s+to\s+r?(\d+)/i);
  if (rangeMatch) {
    return { start: parseInt(rangeMatch[1], 10), end: parseInt(rangeMatch[2], 10) };
  }
  return null;
}

// ============================================================================
// Main Parser
// ============================================================================

export function parsePrompt(
  input: string,
  selectedPerformerIds: string[],
): ParsedCommand {
  const { filter, remaining } = detectPerformerFilter(input, selectedPerformerIds);

  // Pattern: relative move commands (4F)
  const relativeMove = parseRelativeMove(remaining);
  if (relativeMove) {
    return { type: 'relative-move', performerFilter: filter, params: relativeMove };
  }

  // Pattern: "spread ... in arc" / "arrange ... in circle" / "distribute ... in line/grid"
  const distributeMatch = remaining.match(
    /(?:spread|arrange|distribute|place|put)\s+(?:.*?\s+)?(?:in(?:to)?|as)\s+(?:an?\s+)?(line|arc|circle|grid|block|row|column)/i
  );
  if (distributeMatch) {
    const rawShape = distributeMatch[1].toLowerCase();
    const shape = rawShape === 'row' || rawShape === 'column' ? 'line'
      : rawShape === 'block' ? 'grid'
      : rawShape as 'line' | 'arc' | 'circle' | 'grid';

    const range = parseRange(remaining);
    const params: DistributeParams = {};

    if (shape === 'line' || shape === 'grid') {
      params.start = { x: range?.start ?? 10, y: 50 };
      params.end = { x: range?.end ?? 90, y: shape === 'grid' ? 80 : 50 };
    } else if (shape === 'arc') {
      params.center = { x: 50, y: 50 };
      params.radius = 30;
      params.startAngle = -Math.PI * 0.75;
      params.endAngle = -Math.PI * 0.25;
    } else if (shape === 'circle') {
      params.center = { x: 50, y: 50 };
      params.radius = 30;
    }

    return { type: 'distribute', shape, performerFilter: filter, params };
  }

  // Pattern: "... in a circle" / "... in an arc" (simpler form without "spread")
  const simpleShapeMatch = remaining.match(
    /\b(?:in(?:to)?|as)\s+(?:an?\s+)?(line|arc|circle|grid|block|row)\b/i
  );
  if (simpleShapeMatch) {
    const rawShape = simpleShapeMatch[1].toLowerCase();
    const shape = rawShape === 'row' ? 'line'
      : rawShape === 'block' ? 'grid'
      : rawShape as 'line' | 'arc' | 'circle' | 'grid';

    const params: DistributeParams = {};
    if (shape === 'arc') {
      params.center = { x: 50, y: 50 };
      params.radius = 30;
      params.startAngle = -Math.PI * 0.75;
      params.endAngle = -Math.PI * 0.25;
    } else if (shape === 'circle') {
      params.center = { x: 50, y: 50 };
      params.radius = 30;
    } else {
      params.start = { x: 10, y: 50 };
      params.end = { x: 90, y: shape === 'grid' ? 80 : 50 };
    }

    return { type: 'distribute', shape, performerFilter: filter, params };
  }

  // Pattern: "apply <template>" / "use <template>"
  const templateMatch = remaining.match(
    /(?:apply|use)\s+(.+?)(?:\s+(?:to|for|on)\b|$)/i
  );
  if (templateMatch) {
    const templateName = templateMatch[1].trim();
    return {
      type: 'template',
      templateName,
      performerFilter: filter,
      params: { templateName },
    };
  }

  // Pattern: "morph toward <shape> <percentage>%"
  const morphMatch = remaining.match(
    /morph\s+(?:toward|towards|to)\s+(.+?)\s+(\d+)%/i
  );
  if (morphMatch) {
    return {
      type: 'morph',
      targetShape: morphMatch[1].trim(),
      morphFactor: parseInt(morphMatch[2], 10) / 100,
      performerFilter: filter,
    };
  }

  // Fallback: basic_formation (uses existing generateFormationFromDescription)
  return {
    type: 'basic_formation',
    description: input.trim(),
    performerFilter: filter,
  };
}

// ============================================================================
// Filter Application
// ============================================================================

/**
 * Resolve a PerformerFilter to a concrete list of performer IDs.
 */
export function resolvePerformerFilter(
  filter: PerformerFilter,
  performers: Performer[],
): string[] {
  switch (filter.type) {
    case 'all':
      return performers.map(p => p.id);
    case 'selected':
      return filter.ids;
    case 'section':
      return performers
        .filter(p => p.section?.toLowerCase() === filter.section)
        .map(p => p.id);
    case 'instrument':
      return performers
        .filter(p => p.instrument?.toLowerCase().includes(filter.instrument))
        .map(p => p.id);
    case 'conditional': {
      const baseIds = resolvePerformerFilter(filter.base, performers);
      const exceptSet = new Set(filter.except.map(e => e.toLowerCase()));
      // Match except by ID, drillNumber, or name
      return baseIds.filter(id => {
        const p = performers.find(perf => perf.id === id);
        if (!p) return true;
        return !exceptSet.has(p.id.toLowerCase())
          && !exceptSet.has(p.drillNumber?.toLowerCase() || '')
          && !exceptSet.has(p.name.toLowerCase());
      });
    }
  }
}
