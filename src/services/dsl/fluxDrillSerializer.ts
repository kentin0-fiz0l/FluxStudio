/**
 * FluxDrill Serializer
 *
 * Converts a Formation object into the human-readable FluxDrill DSL notation.
 * This is the main entry point for DSL export (Phase 1: serialization only).
 */

import type {
  Formation,
  Performer,
  DrillSet,
  FieldConfig,
  Keyframe,
} from '../formationTypes';
import type {
  DslShow,
  DslSection,
  DslSet,
  DslPlacement,
  DslShape,
  DslFieldPos,
} from './fluxDrillTypes';
import { NCAA_FOOTBALL_FIELD } from '../fieldConfigService';
import { fieldPosToString } from './fieldNotation';
import { detectShape } from './shapeDetector';

// ============================================================================
// Public API
// ============================================================================

/**
 * Serialize a Formation into a FluxDrill DSL string.
 */
export function serializeFormation(formation: Formation): string {
  const fieldConfig = formation.fieldConfig ?? NCAA_FOOTBALL_FIELD;
  const show = buildDslShow(formation, fieldConfig);
  return formatDslShow(show);
}

/**
 * Build the intermediate DslShow AST from a Formation.
 * Exported for testing.
 */
export function buildDslShow(formation: Formation, fieldConfig: FieldConfig): DslShow {
  const sections = buildSections(formation.performers, formation.sectionShapeMap);
  const sets = buildSets(formation, fieldConfig, sections);

  return {
    name: formation.name,
    field: fieldConfig.type,
    bpm: formation.drillSettings?.bpm,
    sections,
    sets,
  };
}

// ============================================================================
// Section detection
// ============================================================================

function buildSections(
  performers: Performer[],
  sectionShapeMap?: Record<string, string>,
): DslSection[] {
  // Group performers by section
  const sectionGroups = new Map<string, Performer[]>();

  for (const p of performers) {
    const section = p.section ?? 'Default';
    const group = sectionGroups.get(section) ?? [];
    group.push(p);
    sectionGroups.set(section, group);
  }

  const sections: DslSection[] = [];

  for (const [sectionName, members] of sectionGroups) {
    // Parse drill numbers to find prefix and range
    const drillNumbers = members
      .map((m) => m.drillNumber)
      .filter((d): d is string => d !== undefined);

    const { prefix, start, end } = parseDrillRange(drillNumbers, sectionName);

    const section: DslSection = {
      name: sectionName,
      rangePrefix: prefix,
      rangeStart: start,
      rangeEnd: end,
    };

    // Attach symbol and color if available
    const symbolShape = sectionShapeMap?.[sectionName] ?? members[0]?.symbolShape;
    if (symbolShape) section.symbol = symbolShape;

    const color = members[0]?.color;
    if (color) section.color = color;

    sections.push(section);
  }

  return sections;
}

function parseDrillRange(
  drillNumbers: string[],
  sectionName: string,
): { prefix: string; start: number; end: number } {
  if (drillNumbers.length === 0) {
    // Fallback: use first letter of section name
    const prefix = sectionName.charAt(0).toUpperCase();
    return { prefix, start: 1, end: 1 };
  }

  // Extract prefix and numeric part from drill numbers like "T1", "T12", "S5"
  const parsed: Array<{ prefix: string; num: number }> = [];
  for (const dn of drillNumbers) {
    const match = dn.match(/^([A-Za-z]+)(\d+)$/);
    if (match) {
      parsed.push({ prefix: match[1], num: parseInt(match[2], 10) });
    }
  }

  if (parsed.length === 0) {
    const prefix = sectionName.charAt(0).toUpperCase();
    return { prefix, start: 1, end: drillNumbers.length };
  }

  // Use the most common prefix
  const prefixCounts = new Map<string, number>();
  for (const p of parsed) {
    prefixCounts.set(p.prefix, (prefixCounts.get(p.prefix) ?? 0) + 1);
  }
  let bestPrefix = parsed[0].prefix;
  let bestCount = 0;
  for (const [prefix, count] of prefixCounts) {
    if (count > bestCount) {
      bestPrefix = prefix;
      bestCount = count;
    }
  }

  const nums = parsed.filter((p) => p.prefix === bestPrefix).map((p) => p.num);
  return {
    prefix: bestPrefix,
    start: Math.min(...nums),
    end: Math.max(...nums),
  };
}

// ============================================================================
// Set building
// ============================================================================

function buildSets(
  formation: Formation,
  fieldConfig: FieldConfig,
  sections: DslSection[],
): DslSet[] {
  const drillSets = formation.sets ?? [];
  const keyframes = formation.keyframes;

  // If we have explicit drill sets, use those
  if (drillSets.length > 0) {
    return drillSets
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ds) => {
        const kf = keyframes.find((k) => k.id === ds.keyframeId);
        return buildDslSet(ds, kf, formation.performers, fieldConfig, sections);
      });
  }

  // Fallback: use keyframes directly
  return keyframes.map((kf, idx) => {
    const syntheticSet: DrillSet = {
      id: kf.id,
      name: `Set ${idx + 1}`,
      counts: kf.duration ?? 8,
      keyframeId: kf.id,
      sortOrder: idx,
    };
    return buildDslSet(syntheticSet, kf, formation.performers, fieldConfig, sections);
  });
}

function buildDslSet(
  drillSet: DrillSet,
  keyframe: Keyframe | undefined,
  performers: Performer[],
  fieldConfig: FieldConfig,
  sections: DslSection[],
): DslSet {
  const placements: DslPlacement[] = [];

  if (keyframe) {
    // Group performers by section
    const sectionPerformers = new Map<string, Performer[]>();
    for (const p of performers) {
      const section = p.section ?? 'Default';
      const group = sectionPerformers.get(section) ?? [];
      group.push(p);
      sectionPerformers.set(section, group);
    }

    for (const section of sections) {
      const members = sectionPerformers.get(section.name) ?? [];
      const memberIds = members.map((m) => m.id);

      if (memberIds.length === 0) continue;

      const shape = detectShape(memberIds, keyframe.positions, fieldConfig);
      placements.push({ target: section.name, shape });
    }
  }

  const dslSet: DslSet = {
    name: drillSet.name,
    counts: drillSet.counts,
    placements,
  };

  if (drillSet.rehearsalMark) dslSet.rehearsalMark = drillSet.rehearsalMark;
  if (drillSet.notes) dslSet.notes = drillSet.notes;

  // Transition from the keyframe
  if (keyframe?.transition) dslSet.transition = keyframe.transition;

  return dslSet;
}

// ============================================================================
// DSL formatting
// ============================================================================

function formatDslShow(show: DslShow): string {
  const lines: string[] = [];

  lines.push(`show "${show.name}" {`);
  lines.push(`  field: ${show.field}`);
  if (show.bpm !== undefined) lines.push(`  bpm: ${show.bpm}`);
  lines.push('');

  // Sections
  for (const section of show.sections) {
    let line = `  section ${section.name} [${section.rangePrefix}${section.rangeStart}..${section.rangePrefix}${section.rangeEnd}]`;
    const attrs: string[] = [];
    if (section.symbol) attrs.push(`symbol: ${section.symbol}`);
    if (section.color) attrs.push(`color: ${section.color}`);
    if (attrs.length > 0) line += ` { ${attrs.join(', ')} }`;
    lines.push(line);
  }

  if (show.sections.length > 0) lines.push('');

  // Sets
  for (const set of show.sets) {
    let setHeader = `  set "${set.name}" (${set.counts} counts)`;
    if (set.rehearsalMark) setHeader += ` @${set.rehearsalMark}`;
    setHeader += ' {';
    lines.push(setHeader);

    if (set.notes) {
      lines.push(`    // ${set.notes}`);
    }

    for (const placement of set.placements) {
      const shapeLine = formatPlacement(placement);
      lines.push(`    ${shapeLine}`);
    }

    if (set.transition && set.transition !== 'linear') {
      lines.push(`    transition: ${set.transition}`);
    }

    lines.push('  }');
    lines.push('');
  }

  lines.push('}');

  return lines.join('\n');
}

function formatPlacement(placement: DslPlacement): string {
  const { target, shape } = placement;

  switch (shape.type) {
    case 'line':
      return formatLineShape(target, shape);
    case 'arc':
      return formatArcShape(target, shape);
    case 'circle':
      return `${target}: circle(center: ${fieldPosToString(shape.center)}, radius: ${shape.radius})`;
    case 'block':
      return `${target}: block(${fieldPosToString(shape.topLeft)} to ${fieldPosToString(shape.bottomRight)}${shape.columns ? `, columns: ${shape.columns}` : ''})`;
    case 'wedge':
      return `${target}: wedge(tip: ${fieldPosToString(shape.tip)}, angle: ${shape.angle}, depth: ${shape.depth})`;
    case 'scatter':
      return `${target}: scatter(center: ${fieldPosToString(shape.center)}, radius: ${shape.radius})`;
    case 'company_front':
      return `${target}: company-front(${shape.yardLine.sideToSide}, ${shape.frontToBack})`;
    case 'explicit':
      return formatExplicitPositions(target, shape.positions);
  }
}

function formatLineShape(
  target: string,
  shape: Extract<DslShape, { type: 'line' }>,
): string {
  const parts = [
    `from: ${fieldPosToString(shape.from)}`,
    `to: ${fieldPosToString(shape.to)}`,
  ];
  if (shape.spacing) parts.push(`spacing: ${shape.spacing}`);
  return `${target}: line(${parts.join(', ')})`;
}

function formatArcShape(
  target: string,
  shape: Extract<DslShape, { type: 'arc' }>,
): string {
  const parts = [
    `center: ${fieldPosToString(shape.center)}`,
    `radius: ${shape.radius}`,
  ];
  if (shape.startAngle !== undefined) parts.push(`start: ${shape.startAngle}`);
  if (shape.endAngle !== undefined) parts.push(`end: ${shape.endAngle}`);
  return `${target}: arc(${parts.join(', ')})`;
}

function formatExplicitPositions(
  target: string,
  positions: Array<{ id: string; pos: DslFieldPos }>,
): string {
  if (positions.length === 0) return `${target}: positions {}`;

  if (positions.length <= 3) {
    // Inline for small sets
    const posStrs = positions.map((p) => `${p.id}: ${fieldPosToString(p.pos)}`);
    return `${target}: positions { ${posStrs.join('; ')} }`;
  }

  // Multi-line for larger sets
  const lines = [`${target}: positions {`];
  for (const p of positions) {
    lines.push(`      ${p.id}: ${fieldPosToString(p.pos)}`);
  }
  lines.push('    }');
  return lines.join('\n');
}
