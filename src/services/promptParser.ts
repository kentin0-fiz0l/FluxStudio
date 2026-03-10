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
  | { type: 'instrument'; instrument: string };

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

export type ParsedCommand =
  | { type: 'distribute'; shape: 'line' | 'arc' | 'circle' | 'grid'; performerFilter: PerformerFilter; params: DistributeParams }
  | { type: 'template'; templateName: string; performerFilter: PerformerFilter; params: TemplateParams }
  | { type: 'morph'; targetShape: string; morphFactor: number; performerFilter: PerformerFilter }
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

function detectPerformerFilter(text: string, selectedIds: string[]): { filter: PerformerFilter; remaining: string } {
  const lower = text.toLowerCase();

  // Check for "selected" keyword
  if (lower.includes('selected') && selectedIds.length > 0) {
    return {
      filter: { type: 'selected', ids: selectedIds },
      remaining: lower.replace(/\bselected\b/, '').trim(),
    };
  }

  // Check for section names
  for (const section of KNOWN_SECTIONS) {
    if (lower.includes(section)) {
      return {
        filter: { type: 'section', section },
        remaining: lower.replace(new RegExp(`\\b${section}\\b`, 'i'), '').trim(),
      };
    }
  }

  // Check for instrument names
  for (const instrument of KNOWN_INSTRUMENTS) {
    if (lower.includes(instrument)) {
      return {
        filter: { type: 'instrument', instrument },
        remaining: lower.replace(new RegExp(`\\b${instrument}\\b`, 'i'), '').trim(),
      };
    }
  }

  // Default to all
  return { filter: { type: 'all' }, remaining: lower };
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
  }
}
