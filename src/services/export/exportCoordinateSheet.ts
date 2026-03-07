/**
 * Production sheet CSV and audio sync file exports.
 */

import type { Formation } from '../formationTypes';
import type { TempoMap } from '../tempoMap';
import type { ProductionSheet } from '../productionSheet';
import { countToTimeMs } from '../tempoMap';

/**
 * Export production sheet as CSV.
 */
export function exportProductionSheetCsv(sheet: ProductionSheet): string {
  const headers = [
    'Set',
    'Section',
    'Start Measure',
    'End Measure',
    'Counts',
    'Cumulative Count',
    'Tempo',
    'Rehearsal Mark',
    'Notes',
  ];

  const rows: string[] = [headers.join(',')];

  for (const entry of sheet.entries) {
    const row = [
      csvEscape(entry.setId),
      csvEscape(entry.sectionName ?? ''),
      String(entry.startMeasure),
      String(entry.endMeasure),
      String(entry.counts),
      String(entry.cumulativeCount),
      String(Math.round(entry.tempo)),
      csvEscape(entry.rehearsalMark ?? ''),
      csvEscape(entry.notes ?? ''),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/** Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines). */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export audio sync file as JSON timing data.
 * Uses the .fxs (FluxStudio Sync) extension convention.
 */
export function exportAudioSyncFile(formation: Formation, tempoMap: TempoMap): string {
  // Build set timestamps from formation sets
  const setTimestamps: Record<string, { startTimeMs: number; endTimeMs: number; counts: number }> = {};
  const sets = formation.sets ?? [];
  let cumulativeCount = 1;

  for (const set of sets) {
    const startTimeMs = countToTimeMs(cumulativeCount, tempoMap);
    const endCount = cumulativeCount + set.counts - 1;
    const endTimeMs = countToTimeMs(endCount + 1, tempoMap);

    setTimestamps[set.id] = {
      startTimeMs: Math.round(startTimeMs),
      endTimeMs: Math.round(endTimeMs),
      counts: set.counts,
    };

    cumulativeCount += set.counts;
  }

  // Build section mappings from tempo map segments
  const sectionMappings: Record<string, { name: string; startCount: number; endCount: number }> = {};
  for (const segment of tempoMap.segments) {
    if (segment.sectionId) {
      sectionMappings[segment.sectionId] = {
        name: segment.sectionName ?? '',
        startCount: segment.startCount,
        endCount: segment.endCount,
      };
    }
  }

  const syncData = {
    version: 1,
    tempoMap: tempoMap.segments.map((seg) => ({
      startCount: seg.startCount,
      endCount: seg.endCount,
      tempoStart: seg.tempoStart,
      tempoEnd: seg.tempoEnd,
      tempoCurve: seg.tempoCurve,
      beatsPerBar: seg.beatsPerBar,
      startBar: seg.startBar,
      bars: seg.bars,
      sectionName: seg.sectionName,
      sectionId: seg.sectionId,
    })),
    setTimestamps,
    sectionMappings,
  };

  return JSON.stringify(syncData, null, 2);
}
