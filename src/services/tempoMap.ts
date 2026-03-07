/**
 * TempoMap Service - FluxStudio
 *
 * Bridge between MetMap sections (variable tempo, ramps, time signatures)
 * and Formation count/time math. Replaces constant-BPM assumptions with
 * tempo-map-aware conversions.
 *
 * Algorithm adapted from secondsToGlobalBeat() / globalBeatToSeconds()
 * in contexts/metmap/types.ts, converted to milliseconds and 1-based counts.
 */

import type { Section } from '../contexts/metmap/types';
import type { CountMarker } from '../utils/drillGeometry';

// ============================================================================
// TYPES
// ============================================================================

export interface TempoMapSegment {
  /** First count in this segment (1-based, inclusive) */
  startCount: number;
  /** Last count in this segment (1-based, inclusive) */
  endCount: number;
  /** Tempo at segment start (BPM) */
  tempoStart: number;
  /** Tempo at segment end (BPM) — equals tempoStart if no ramp */
  tempoEnd: number;
  /** Tempo interpolation curve */
  tempoCurve: 'linear' | 'exponential' | 'step';
  /** Beats per bar (numerator of time signature) */
  beatsPerBar: number;
  /** Starting bar number (1-based, from MetMap section) */
  startBar: number;
  /** Number of bars in this segment */
  bars: number;
  /** MetMap section name (if linked) */
  sectionName?: string;
  /** MetMap section ID (if linked) */
  sectionId?: string;
}

export interface TempoMap {
  segments: TempoMapSegment[];
  totalCounts: number;
  totalDurationMs: number;
}

// ============================================================================
// BUILDING TEMPO MAPS
// ============================================================================

/**
 * Build a TempoMap from MetMap sections.
 * Walks sections in order, assigning count ranges and preserving tempo ramps.
 */
export function buildTempoMapFromSections(sections: Section[]): TempoMap {
  if (sections.length === 0) {
    return { segments: [], totalCounts: 0, totalDurationMs: 0 };
  }

  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const segments: TempoMapSegment[] = [];
  let currentCount = 1;

  for (const section of sorted) {
    const beatsPerBar = getBeatsPerBarFromTimeSignature(section.timeSignature);
    const sectionBeats = section.bars * beatsPerBar;

    if (sectionBeats <= 0) continue;

    segments.push({
      startCount: currentCount,
      endCount: currentCount + sectionBeats - 1,
      tempoStart: section.tempoStart,
      tempoEnd: section.tempoEnd ?? section.tempoStart,
      tempoCurve: section.tempoCurve ?? 'linear',
      beatsPerBar,
      startBar: section.startBar,
      bars: section.bars,
      sectionName: section.name,
      sectionId: section.id,
    });

    currentCount += sectionBeats;
  }

  const totalCounts = currentCount - 1;
  const totalDurationMs = totalCounts > 0
    ? countToTimeMs(totalCounts + 1, { segments, totalCounts, totalDurationMs: 0 }) // bootstrap
    : 0;

  const tempoMap: TempoMap = { segments, totalCounts, totalDurationMs };
  // Recalculate totalDurationMs now that we have the full map
  tempoMap.totalDurationMs = totalCounts > 0
    ? computeTotalDurationMs(tempoMap)
    : 0;

  return tempoMap;
}

/**
 * Build a constant-tempo TempoMap for backward compatibility.
 * Creates a single segment covering all counts at a fixed BPM.
 */
export function buildConstantTempoMap(
  bpm: number,
  totalCounts: number,
  countsPerPhrase: number = 8,
): TempoMap {
  if (totalCounts <= 0 || bpm <= 0) {
    return { segments: [], totalCounts: 0, totalDurationMs: 0 };
  }

  const msPerBeat = 60000 / bpm;
  const totalDurationMs = totalCounts * msPerBeat;

  return {
    segments: [{
      startCount: 1,
      endCount: totalCounts,
      tempoStart: bpm,
      tempoEnd: bpm,
      tempoCurve: 'linear',
      beatsPerBar: countsPerPhrase > 0 ? countsPerPhrase : 4,
      startBar: 1,
      bars: Math.ceil(totalCounts / (countsPerPhrase > 0 ? countsPerPhrase : 4)),
    }],
    totalCounts,
    totalDurationMs,
  };
}

// ============================================================================
// COUNT / TIME CONVERSION (VARIABLE TEMPO)
// ============================================================================

/**
 * Convert a count (1-based) to elapsed time in milliseconds.
 * Walks the tempo map beat by beat, accumulating duration per beat
 * at the interpolated tempo. Supports fractional counts.
 */
export function countToTimeMs(count: number, tempoMap: TempoMap): number {
  if (tempoMap.segments.length === 0 || count <= 1) return 0;

  let elapsedMs = 0;
  let currentCount = 1;

  for (const seg of tempoMap.segments) {
    const segBeats = seg.endCount - seg.startCount + 1;

    for (let b = 0; b < segBeats; b++) {
      if (currentCount >= count) {
        // Handle fractional count
        const fraction = count - Math.floor(count);
        if (fraction > 0) {
          elapsedMs += (60000 / getTempoInSegment(seg, b, segBeats)) * fraction;
        }
        return elapsedMs;
      }

      elapsedMs += 60000 / getTempoInSegment(seg, b, segBeats);
      currentCount++;
    }
  }

  return elapsedMs;
}

/**
 * Convert elapsed time in milliseconds to a count (1-based).
 * Walks the tempo map beat by beat. Returns fractional count.
 */
export function timeMsToCount(timeMs: number, tempoMap: TempoMap): number {
  if (tempoMap.segments.length === 0 || timeMs <= 0) return 1;

  let elapsedMs = 0;
  let currentCount = 1;

  for (const seg of tempoMap.segments) {
    const segBeats = seg.endCount - seg.startCount + 1;

    for (let b = 0; b < segBeats; b++) {
      const tempo = getTempoInSegment(seg, b, segBeats);
      const beatDurationMs = 60000 / tempo;

      if (elapsedMs + beatDurationMs > timeMs) {
        // Fractional count within this beat
        const fraction = (timeMs - elapsedMs) / beatDurationMs;
        return currentCount + fraction;
      }

      elapsedMs += beatDurationMs;
      currentCount++;
    }
  }

  return currentCount;
}

/**
 * Snap a time value to the nearest count boundary.
 * Returns the snapped time in milliseconds.
 */
export function snapToCountTM(timeMs: number, tempoMap: TempoMap): number {
  const count = timeMsToCount(timeMs, tempoMap);
  const roundedCount = Math.round(count);
  const clampedCount = Math.max(1, Math.min(roundedCount, tempoMap.totalCounts));
  return countToTimeMs(clampedCount, tempoMap);
}

/**
 * Get the instantaneous BPM at a given count position.
 */
export function getTempoAtCount(count: number, tempoMap: TempoMap): number {
  const seg = getSegmentAtCount(count, tempoMap);
  if (!seg) {
    // Fallback: use last segment's end tempo or 120
    const lastSeg = tempoMap.segments[tempoMap.segments.length - 1];
    return lastSeg ? lastSeg.tempoEnd : 120;
  }

  const segBeats = seg.endCount - seg.startCount + 1;
  const beatIndex = count - seg.startCount;
  return getTempoInSegment(seg, beatIndex, segBeats);
}

/**
 * Generate count markers for a timeline ruler using variable tempo.
 */
export function generateCountMarkersTM(tempoMap: TempoMap): CountMarker[] {
  const markers: CountMarker[] = [];

  for (const seg of tempoMap.segments) {
    const segBeats = seg.endCount - seg.startCount + 1;

    for (let b = 0; b < segBeats; b++) {
      const count = seg.startCount + b;
      const timeMs = countToTimeMs(count, tempoMap);
      const beatInBar = (b % seg.beatsPerBar) + 1;
      const phrase = Math.ceil(count / seg.beatsPerBar);
      const isPhraseBoundary = beatInBar === 1;

      markers.push({
        timeMs,
        count,
        phrase,
        beatInPhrase: beatInBar,
        isPhraseBoundary,
      });
    }
  }

  return markers;
}

/**
 * Find the segment containing a given count.
 */
export function getSegmentAtCount(
  count: number,
  tempoMap: TempoMap,
): TempoMapSegment | undefined {
  for (const seg of tempoMap.segments) {
    if (count >= seg.startCount && count <= seg.endCount) {
      return seg;
    }
  }
  return undefined;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get the interpolated tempo at a beat position within a segment.
 * Mirrors the interpolation logic from MetMap's secondsToGlobalBeat().
 */
function getTempoInSegment(
  seg: TempoMapSegment,
  beatIndex: number,
  totalBeats: number,
): number {
  if (seg.tempoEnd === seg.tempoStart) return seg.tempoStart;

  const progress = totalBeats > 1 ? beatIndex / totalBeats : 0;

  switch (seg.tempoCurve) {
    case 'step':
      return seg.tempoStart;
    case 'exponential':
      return seg.tempoStart * Math.pow(seg.tempoEnd / seg.tempoStart, progress);
    case 'linear':
    default:
      return seg.tempoStart + (seg.tempoEnd - seg.tempoStart) * progress;
  }
}

/**
 * Parse beats-per-bar from a time signature string (e.g., "4/4" -> 4, "3/4" -> 3).
 */
function getBeatsPerBarFromTimeSignature(timeSignature: string): number {
  const [numerator] = timeSignature.split('/').map(Number);
  return numerator || 4;
}

/**
 * Compute total duration by walking the entire tempo map.
 */
function computeTotalDurationMs(tempoMap: TempoMap): number {
  let totalMs = 0;

  for (const seg of tempoMap.segments) {
    const segBeats = seg.endCount - seg.startCount + 1;

    for (let b = 0; b < segBeats; b++) {
      const tempo = getTempoInSegment(seg, b, segBeats);
      totalMs += 60000 / tempo;
    }
  }

  return totalMs;
}
