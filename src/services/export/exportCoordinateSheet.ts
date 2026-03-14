/**
 * Production sheet CSV, coordinate sheet CSV, and audio sync file exports.
 */

import type { Formation, DrillSet, FieldConfig, CoordinateEntry } from '../formationTypes';
import type { TempoMap } from '../tempoMap';
import type { ProductionSheet } from '../productionSheet';
import { countToTimeMs, getSegmentAtCount } from '../tempoMap';
import { generateCoordinateSheet, generateAllCoordinateSheets } from '../coordinateSheetGenerator';
import { NCAA_FOOTBALL_FIELD } from '../fieldConfigService';

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
 * Export a coordinate sheet CSV for a single performer.
 * Columns match the PDF coordinate sheet: Set, Counts, S/S, F/B, Step Size,
 * Direction, Difficulty, and optionally Section + Tempo when tempoMap is linked.
 */
export function exportCoordinateSheetCsv(
  formation: Formation,
  performerId: string,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
  tempoMap?: TempoMap,
): string {
  const performer = formation.performers.find((p) => p.id === performerId);
  if (!performer) throw new Error(`Performer ${performerId} not found`);

  const entries = generateCoordinateSheet(formation, performerId, sets, fieldConfig);
  return buildCoordinateSheetCsv(entries, tempoMap);
}

/**
 * Export coordinate sheets for all performers in a single CSV.
 * Includes Performer Name and Drill # columns so all data is in one file.
 */
export function exportAllCoordinateSheetsCsv(
  formation: Formation,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
  tempoMap?: TempoMap,
): string {
  const sheets = generateAllCoordinateSheets(formation, sets, fieldConfig);

  const hasTempoMap = !!tempoMap;
  const headers = [
    'Performer',
    'Drill #',
    'Set',
    'Counts',
    'Side-to-Side',
    'Front-to-Back',
    'Step Size',
    'Direction',
    'Difficulty',
    ...(hasTempoMap ? ['Section', 'Tempo'] : []),
  ];

  const rows: string[] = [headers.join(',')];

  for (const [, { performer, entries }] of sheets) {
    let cumulativeCount = 1;
    for (const entry of entries) {
      const row = buildCoordinateRow(entry, cumulativeCount, tempoMap);
      rows.push(
        [
          csvEscape(performer.name),
          csvEscape(performer.drillNumber ?? performer.label),
          ...row,
        ].join(','),
      );
      cumulativeCount += entry.set.counts;
    }
  }

  return rows.join('\n');
}

/** Build CSV text for a single performer's coordinate entries. */
function buildCoordinateSheetCsv(
  entries: CoordinateEntry[],
  tempoMap?: TempoMap,
): string {
  const hasTempoMap = !!tempoMap;
  const headers = [
    'Set',
    'Counts',
    'Side-to-Side',
    'Front-to-Back',
    'Step Size',
    'Direction',
    'Difficulty',
    ...(hasTempoMap ? ['Section', 'Tempo'] : []),
  ];

  const rows: string[] = [headers.join(',')];
  let cumulativeCount = 1;

  for (const entry of entries) {
    rows.push(buildCoordinateRow(entry, cumulativeCount, tempoMap).join(','));
    cumulativeCount += entry.set.counts;
  }

  return rows.join('\n');
}

/** Build a single CSV row array for a coordinate entry. */
function buildCoordinateRow(
  entry: CoordinateEntry,
  cumulativeCount: number,
  tempoMap?: TempoMap,
): string[] {
  const row = [
    csvEscape(entry.set.name),
    String(entry.set.counts),
    csvEscape(entry.coordinateDetails.sideToSide),
    csvEscape(entry.coordinateDetails.frontToBack),
    csvEscape(entry.stepToNext?.stepSizeLabel ?? '-'),
    csvEscape(entry.stepToNext?.directionLabel ?? '-'),
    csvEscape(entry.stepToNext?.difficulty ?? '-'),
  ];

  if (tempoMap) {
    const segment = getSegmentAtCount(cumulativeCount, tempoMap);
    row.push(csvEscape(segment?.sectionName ?? '-'));
    row.push(segment ? String(Math.round(segment.tempoStart)) : '-');
  }

  return row;
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
