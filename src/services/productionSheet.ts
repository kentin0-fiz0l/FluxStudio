/**
 * Production Sheet Service - FluxStudio
 *
 * The production sheet maps music structure to drill design:
 * measures -> formations -> timing with variable tempos.
 * Pyware's signature feature, reimplemented with MetMap integration.
 */

import type { DrillSet } from './formationTypes';
import type { Section } from '../contexts/metmap/types';
import type { TempoMap } from './tempoMap';
import { getSegmentAtCount, getTempoAtCount } from './tempoMap';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductionSheetEntry {
  id: string;
  setId: string;
  sectionId?: string;
  sectionName?: string;
  startMeasure: number;
  endMeasure: number;
  counts: number;
  cumulativeCount: number;
  tempo: number;
  rehearsalMark?: string;
  notes?: string;
}

export interface ProductionSheet {
  formationId: string;
  songId?: string;
  entries: ProductionSheetEntry[];
  totalCounts: number;
  totalDurationMs: number;
}

// ============================================================================
// BUILDING A PRODUCTION SHEET
// ============================================================================

/**
 * Build a production sheet from the current sets and tempo map.
 * Each set becomes one entry. Section info is pulled from the tempo map.
 */
export function buildProductionSheet(
  sets: DrillSet[],
  tempoMap: TempoMap,
  formationId: string,
  songId?: string,
  sectionMappings?: Map<string, string>,
): ProductionSheet {
  const sorted = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries: ProductionSheetEntry[] = [];
  let cumulativeCount = 0;
  let currentCount = 1;

  for (const set of sorted) {
    const segment = getSegmentAtCount(currentCount, tempoMap);
    const tempo = getTempoAtCount(currentCount, tempoMap);

    const sectionId = sectionMappings?.get(set.id) ?? segment?.sectionId;
    const sectionName = segment?.sectionName;

    // Calculate measure range from tempo map segment
    const startMeasure = segment
      ? segment.startBar + Math.floor((currentCount - segment.startCount) / segment.beatsPerBar)
      : Math.ceil(currentCount / 4);
    const endCount = currentCount + set.counts - 1;
    const endSegment = getSegmentAtCount(endCount, tempoMap);
    const endMeasure = endSegment
      ? endSegment.startBar + Math.floor((endCount - endSegment.startCount) / endSegment.beatsPerBar)
      : Math.ceil(endCount / 4);

    cumulativeCount += set.counts;

    entries.push({
      id: `ps-${set.id}`,
      setId: set.id,
      sectionId,
      sectionName,
      startMeasure,
      endMeasure,
      counts: set.counts,
      cumulativeCount,
      tempo: Math.round(tempo),
      rehearsalMark: set.rehearsalMark,
      notes: set.notes,
    });

    currentCount += set.counts;
  }

  return {
    formationId,
    songId,
    entries,
    totalCounts: cumulativeCount,
    totalDurationMs: tempoMap.totalDurationMs,
  };
}

// ============================================================================
// EDITING ENTRIES (BIDIRECTIONAL)
// ============================================================================

export interface EntryUpdate {
  counts?: number;
  sectionName?: string;
  sectionId?: string;
  startMeasure?: number;
  endMeasure?: number;
  tempo?: number;
  rehearsalMark?: string;
  notes?: string;
}

export interface EntryUpdateResult {
  sheet: ProductionSheet;
  /** Set updates to propagate (setId -> partial DrillSet) */
  setUpdates: Map<string, Partial<DrillSet>>;
  /** Section tempo updates to propagate (sectionId -> new tempoStart) */
  sectionTempoUpdates: Map<string, number>;
}

/**
 * Update a production sheet entry. Returns the updated sheet plus
 * any changes that should be propagated to DrillSets and MetMap sections.
 */
export function updateProductionSheetEntry(
  sheet: ProductionSheet,
  entryId: string,
  updates: EntryUpdate,
): EntryUpdateResult {
  const setUpdates = new Map<string, Partial<DrillSet>>();
  const sectionTempoUpdates = new Map<string, number>();
  let recalcCumulative = false;

  const updatedEntries = sheet.entries.map(entry => {
    if (entry.id !== entryId) return entry;

    const updated = { ...entry };

    // Counts change -> update DrillSet + recalculate cumulative
    if (updates.counts !== undefined && updates.counts !== entry.counts) {
      updated.counts = updates.counts;
      setUpdates.set(entry.setId, { counts: updates.counts });
      recalcCumulative = true;
    }

    // Tempo change -> update MetMap section
    if (updates.tempo !== undefined && updates.tempo !== entry.tempo) {
      updated.tempo = updates.tempo;
      if (entry.sectionId) {
        sectionTempoUpdates.set(entry.sectionId, updates.tempo);
      }
    }

    // Rehearsal mark -> update DrillSet
    if (updates.rehearsalMark !== undefined) {
      updated.rehearsalMark = updates.rehearsalMark;
      setUpdates.set(entry.setId, {
        ...setUpdates.get(entry.setId),
        rehearsalMark: updates.rehearsalMark,
      });
    }

    // Notes -> update DrillSet
    if (updates.notes !== undefined) {
      updated.notes = updates.notes;
      setUpdates.set(entry.setId, {
        ...setUpdates.get(entry.setId),
        notes: updates.notes,
      });
    }

    if (updates.sectionName !== undefined) updated.sectionName = updates.sectionName;
    if (updates.sectionId !== undefined) updated.sectionId = updates.sectionId;
    if (updates.startMeasure !== undefined) updated.startMeasure = updates.startMeasure;
    if (updates.endMeasure !== undefined) updated.endMeasure = updates.endMeasure;

    return updated;
  });

  // Recalculate cumulative counts if any counts changed
  if (recalcCumulative) {
    let cumulative = 0;
    for (const entry of updatedEntries) {
      cumulative += entry.counts;
      entry.cumulativeCount = cumulative;
    }
  }

  const totalCounts = updatedEntries.reduce((sum, e) => sum + e.counts, 0);

  return {
    sheet: { ...sheet, entries: updatedEntries, totalCounts },
    setUpdates,
    sectionTempoUpdates,
  };
}

// ============================================================================
// AUTO-MAPPING SECTIONS TO SETS
// ============================================================================

/**
 * Heuristic alignment: map MetMap sections to drill sets by measure range overlap.
 */
export function autoMapSectionsToSets(
  sections: Section[],
  sets: DrillSet[],
  tempoMap: TempoMap,
): Map<string, string> {
  const mapping = new Map<string, string>();
  const sorted = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  let currentCount = 1;

  for (const set of sorted) {
    const segment = getSegmentAtCount(currentCount, tempoMap);
    if (segment?.sectionId) {
      const section = sections.find(s => s.id === segment.sectionId);
      if (section?.id) {
        mapping.set(set.id, section.id);
      }
    }
    currentCount += set.counts;
  }

  return mapping;
}

// ============================================================================
// CSV IMPORT / EXPORT
// ============================================================================

/**
 * Import a production sheet from CSV (Pyware-compatible format).
 * Expected columns: Set, Section, Start Measure, End Measure, Counts, Tempo, Rehearsal Mark, Notes
 */
export function importProductionSheetCsv(csv: string, formationId: string): ProductionSheet {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) {
    return { formationId, entries: [], totalCounts: 0, totalDurationMs: 0 };
  }

  const entries: ProductionSheetEntry[] = [];
  let cumulativeCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;

    const counts = parseInt(cols[4]) || 8;
    cumulativeCount += counts;

    entries.push({
      id: `ps-import-${i}`,
      setId: `set-import-${i}`,
      sectionName: cols[1] || undefined,
      startMeasure: parseInt(cols[2]) || 1,
      endMeasure: parseInt(cols[3]) || 1,
      counts,
      cumulativeCount,
      tempo: parseInt(cols[5]) || 120,
      rehearsalMark: cols[6] || undefined,
      notes: cols[7] || undefined,
    });
  }

  return {
    formationId,
    entries,
    totalCounts: cumulativeCount,
    totalDurationMs: 0,
  };
}

/**
 * Export production sheet to CSV string.
 */
export function exportProductionSheetCsv(sheet: ProductionSheet): string {
  const header = 'Set,Section,Start Measure,End Measure,Counts,Cumulative Count,Tempo,Rehearsal Mark,Notes';
  const rows = sheet.entries.map((e, i) =>
    [
      `Set ${i + 1}`,
      escapeCSV(e.sectionName ?? ''),
      e.startMeasure,
      e.endMeasure,
      e.counts,
      e.cumulativeCount,
      e.tempo,
      escapeCSV(e.rehearsalMark ?? ''),
      escapeCSV(e.notes ?? ''),
    ].join(',')
  );

  return [header, ...rows].join('\n');
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}
