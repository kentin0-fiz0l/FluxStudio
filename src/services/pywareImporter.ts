/**
 * Pyware Import Service - FluxStudio
 *
 * Parse Pyware .3dz drill files (ZIP archives containing XML drill data)
 * and convert to FluxStudio formation data.
 *
 * Pyware uses an 84-step wide x 52-step deep grid (NCAA football field).
 * Coordinates are normalized to FluxStudio's 0-100 range.
 */

import JSZip from 'jszip';
import type { Position, Performer, DrillSet, Keyframe, Formation } from './formationTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface PywarePerformer {
  label: string;
  x: number;
  y: number;
  instrument?: string;
}

export interface PywareSet {
  name: string;
  counts: number;
  positions: Map<string, Position>;
}

export interface PywareImportResult {
  performers: PywarePerformer[];
  sets: PywareSet[];
  fieldSize: { width: number; height: number };
  metadata: {
    title?: string;
    composer?: string;
    totalSets: number;
    totalPerformers: number;
  };
}

// ============================================================================
// PYWARE COORDINATE CONVERSION
// ============================================================================

/** Standard Pyware NCAA field dimensions in steps */
const PYWARE_FIELD_WIDTH = 84;  // steps (sideline to sideline, 8 steps per 5 yards, 160 feet)
const PYWARE_FIELD_DEPTH = 52;  // steps (back sideline to front sideline)

/**
 * Convert Pyware step coordinates to FluxStudio normalized 0-100 coordinates.
 */
function pywareToNormalized(px: number, py: number): Position {
  return {
    x: (px / PYWARE_FIELD_WIDTH) * 100,
    y: (py / PYWARE_FIELD_DEPTH) * 100,
  };
}

// ============================================================================
// XML PARSING HELPERS
// ============================================================================

function getElementText(parent: Element, tagName: string): string | undefined {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || undefined;
}

function getElementNumber(parent: Element, tagName: string): number | undefined {
  const text = getElementText(parent, tagName);
  if (text === undefined) return undefined;
  const num = parseFloat(text);
  return isNaN(num) ? undefined : num;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a Pyware .3dz file (ZIP archive with XML drill data).
 */
export async function parsePywareFile(file: File): Promise<PywareImportResult> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // Find XML files in the archive
  const xmlFiles: string[] = [];
  zip.forEach((relativePath, entry) => {
    if (!entry.dir && /\.(xml|drill|dat)$/i.test(relativePath)) {
      xmlFiles.push(relativePath);
    }
  });

  if (xmlFiles.length === 0) {
    // Try to find any text-based file that might contain XML
    const allFiles: string[] = [];
    zip.forEach((relativePath, entry) => {
      if (!entry.dir) allFiles.push(relativePath);
    });

    // Try each file to see if it's XML
    for (const fname of allFiles) {
      const content = await zip.file(fname)!.async('text');
      if (content.trim().startsWith('<?xml') || content.includes('<drill') || content.includes('<show')) {
        xmlFiles.push(fname);
      }
    }
  }

  if (xmlFiles.length === 0) {
    throw new Error('No drill data found in the .3dz archive. Expected XML files containing drill data.');
  }

  // Parse the first XML file found (primary drill data)
  const xmlContent = await zip.file(xmlFiles[0])!.async('text');
  return parsePywareXml(xmlContent);
}

/**
 * Parse raw Pyware XML drill data.
 * Supports both direct XML files and extracted XML from .3dz archives.
 */
export function parsePywareXml(xmlString: string): PywareImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid XML in drill file: ${parseError.textContent?.slice(0, 100)}`);
  }

  // Extract metadata
  const root = doc.documentElement;
  const title = getElementText(root, 'title') ?? getElementText(root, 'showName') ?? getElementText(root, 'name');
  const composer = getElementText(root, 'composer') ?? getElementText(root, 'arranger');

  // Extract performers
  const performerElements = root.getElementsByTagName('performer');
  const memberElements = root.getElementsByTagName('member');
  const marchElements = root.getElementsByTagName('marcher');
  const performerSource = performerElements.length > 0
    ? performerElements
    : memberElements.length > 0
      ? memberElements
      : marchElements;

  const performers: PywarePerformer[] = [];
  const performerLabels: string[] = [];

  for (let i = 0; i < performerSource.length; i++) {
    const el = performerSource[i];
    const label = el.getAttribute('label')
      ?? el.getAttribute('id')
      ?? getElementText(el, 'label')
      ?? getElementText(el, 'name')
      ?? `P${i + 1}`;

    const instrument = el.getAttribute('instrument')
      ?? getElementText(el, 'instrument')
      ?? getElementText(el, 'section');

    // Initial position (may be overridden by set data)
    const x = getElementNumber(el, 'x') ?? (parseFloat(el.getAttribute('x') ?? '0') || 0);
    const y = getElementNumber(el, 'y') ?? (parseFloat(el.getAttribute('y') ?? '0') || 0);

    performers.push({ label, x, y, instrument: instrument || undefined });
    performerLabels.push(label);
  }

  // Extract sets (drill positions)
  const setElements = root.getElementsByTagName('set');
  const pageElements = root.getElementsByTagName('page');
  const setSource = setElements.length > 0 ? setElements : pageElements;

  const sets: PywareSet[] = [];

  for (let i = 0; i < setSource.length; i++) {
    const setEl = setSource[i];
    const name = setEl.getAttribute('name')
      ?? getElementText(setEl, 'name')
      ?? `Set ${i + 1}`;

    const counts = getElementNumber(setEl, 'counts')
      ?? (parseFloat(setEl.getAttribute('counts') ?? '8') || 8);

    // Extract positions for each performer in this set
    const positions = new Map<string, Position>();
    const posElements = setEl.getElementsByTagName('position');
    const dotElements = setEl.getElementsByTagName('dot');
    const posSource = posElements.length > 0 ? posElements : dotElements;

    for (let j = 0; j < posSource.length; j++) {
      const posEl = posSource[j];
      const performerRef = posEl.getAttribute('performer')
        ?? posEl.getAttribute('member')
        ?? posEl.getAttribute('marcher')
        ?? posEl.getAttribute('label')
        ?? performerLabels[j];

      if (!performerRef) continue;

      const rawX = getElementNumber(posEl, 'x')
        ?? (parseFloat(posEl.getAttribute('x') ?? '0') || 0);
      const rawY = getElementNumber(posEl, 'y')
        ?? (parseFloat(posEl.getAttribute('y') ?? '0') || 0);

      positions.set(performerRef, pywareToNormalized(rawX, rawY));
    }

    sets.push({ name, counts, positions });
  }

  // If no explicit performer elements but we have position data in sets,
  // derive performers from position keys
  if (performers.length === 0 && sets.length > 0) {
    const allLabels = new Set<string>();
    for (const set of sets) {
      for (const label of set.positions.keys()) {
        allLabels.add(label);
      }
    }
    for (const label of allLabels) {
      const firstPos = sets[0]?.positions.get(label);
      performers.push({
        label,
        x: firstPos?.x ?? 0,
        y: firstPos?.y ?? 0,
      });
    }
  }

  // Update performer initial positions from first set if available
  if (sets.length > 0) {
    for (const performer of performers) {
      const firstSetPos = sets[0].positions.get(performer.label);
      if (firstSetPos) {
        performer.x = firstSetPos.x;
        performer.y = firstSetPos.y;
      }
    }
  }

  return {
    performers,
    sets,
    fieldSize: { width: PYWARE_FIELD_WIDTH, height: PYWARE_FIELD_DEPTH },
    metadata: {
      title,
      composer,
      totalSets: sets.length,
      totalPerformers: performers.length,
    },
  };
}

// ============================================================================
// CONVERSION TO FORMATION
// ============================================================================

/**
 * Convert a PywareImportResult to Formation-compatible data.
 *
 * @param importResult - Parsed Pyware data
 * @param labelMapping - Optional mapping from Pyware labels to FluxStudio performer names
 */
export function pywareToFormation(
  importResult: PywareImportResult,
  labelMapping?: Map<string, string>,
): Partial<Formation> {
  const { performers: pywarePerformers, sets: pywareSets, metadata } = importResult;

  // Create Performers
  const performers: Performer[] = pywarePerformers.map((p, i) => {
    const mappedName = labelMapping?.get(p.label) ?? p.label;
    return {
      id: `performer-${i}`,
      name: mappedName,
      label: p.label,
      color: getPerformerColor(i),
      instrument: p.instrument,
      section: p.instrument,
      drillNumber: p.label,
    };
  });

  // Build label-to-id map for position lookups
  const labelToId = new Map<string, string>();
  for (const p of performers) {
    labelToId.set(p.label, p.id);
  }

  // Create Keyframes from sets
  let cumulativeTimeMs = 0;
  const defaultBpm = 120;
  const msPerCount = 60000 / defaultBpm;

  const keyframes: Keyframe[] = [];
  const drillSets: DrillSet[] = [];

  for (let i = 0; i < pywareSets.length; i++) {
    const pywareSet = pywareSets[i];
    const keyframeId = `keyframe-${i}`;

    // Build positions map with FluxStudio performer IDs
    const positions = new Map<string, Position>();
    for (const [label, pos] of pywareSet.positions) {
      const performerId = labelToId.get(label);
      if (performerId) {
        positions.set(performerId, pos);
      }
    }

    // For performers without positions in this set, use previous set's position
    if (i > 0) {
      for (const performer of performers) {
        if (!positions.has(performer.id)) {
          const prevPositions = keyframes[i - 1]?.positions;
          const prevPos = prevPositions?.get(performer.id);
          if (prevPos) {
            positions.set(performer.id, prevPos);
          }
        }
      }
    }

    keyframes.push({
      id: keyframeId,
      timestamp: cumulativeTimeMs,
      positions,
      transition: 'linear',
      duration: pywareSet.counts * msPerCount,
    });

    drillSets.push({
      id: `set-${i}`,
      name: pywareSet.name,
      counts: pywareSet.counts,
      keyframeId,
      sortOrder: i,
    });

    cumulativeTimeMs += pywareSet.counts * msPerCount;
  }

  return {
    name: metadata.title ?? 'Imported Drill',
    description: metadata.composer ? `Composer: ${metadata.composer}` : undefined,
    performers,
    keyframes,
    sets: drillSets,
    stageWidth: 100,
    stageHeight: 100,
    gridSize: 10,
    fieldConfig: {
      type: 'ncaa_football',
      name: 'NCAA Football Field',
      width: 100,
      height: 53.33,
      yardLineInterval: 5,
      hashMarks: { front: 20, back: 20 },
      endZoneDepth: 10,
      unit: 'yards',
    },
    drillSettings: {
      bpm: defaultBpm,
      countsPerPhrase: 8,
      startOffset: 0,
      fieldOverlay: true,
      snapToGrid: true,
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

const PERFORMER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#e11d48', '#84cc16', '#0ea5e9', '#d946ef', '#22c55e',
];

function getPerformerColor(index: number): string {
  return PERFORMER_COLORS[index % PERFORMER_COLORS.length];
}
