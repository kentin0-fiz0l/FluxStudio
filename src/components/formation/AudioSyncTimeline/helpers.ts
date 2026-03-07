/**
 * Shared helpers and constants for AudioSyncTimeline sub-components.
 */

import type { BeatMap } from '../../../contexts/metmap/types';
import type { TempoMap } from '../../../services/tempoMap';
import { countToTimeMs } from '../../../services/tempoMap';

/** Snap-proximity threshold in pixels -- when a keyframe is dragged within
 *  this many pixels of a beat line it magnetically locks. */
export const SNAP_THRESHOLD_PX = 12;

/** Given a snap resolution and bpm, return the effective bpm for snapping.
 *  half-beat doubles bpm, measure divides by beats-per-measure (4). */
export function effectiveBpmForSnap(
  bpm: number,
  resolution: 'beat' | 'half-beat' | 'measure',
): number {
  switch (resolution) {
    case 'half-beat':
      return bpm * 2;
    case 'measure':
      return bpm / 4; // assume 4/4
    default:
      return bpm;
  }
}

/** Get the beat grid timestamps in seconds for the overlay, respecting
 *  snap resolution. */
export function getBeatTimestamps(
  beatMap: BeatMap | null,
  durationMs: number,
  bpm: number,
  resolution: 'beat' | 'half-beat' | 'measure',
): number[] {
  // If we have a real beat map and resolution is 'beat', use detected beats
  if (beatMap && resolution === 'beat') {
    return beatMap.beats; // already in seconds
  }

  // Otherwise generate from bpm
  const effectiveBpm = effectiveBpmForSnap(bpm, resolution);
  if (effectiveBpm <= 0 || durationMs <= 0) return [];
  const intervalSec = 60 / effectiveBpm;
  const durationSec = durationMs / 1000;
  const timestamps: number[] = [];
  for (let t = 0; t < durationSec; t += intervalSec) {
    timestamps.push(t);
  }
  return timestamps;
}

/** Generate beat-level timestamps for beat count labels, always at per-beat
 *  resolution regardless of snap setting. */
export function getBeatLevelTimestamps(
  beatMap: BeatMap | null,
  durationMs: number,
  bpm: number,
): number[] {
  if (beatMap) {
    return beatMap.beats;
  }
  if (bpm <= 0 || durationMs <= 0) return [];
  const intervalSec = 60 / bpm;
  const durationSec = durationMs / 1000;
  const timestamps: number[] = [];
  for (let t = 0; t < durationSec; t += intervalSec) {
    timestamps.push(t);
  }
  return timestamps;
}

/**
 * Walk the tempo map segments and generate a timestamp for each beat,
 * respecting variable tempo and beatsPerBar.
 *
 * Returns an array of beat entries with time (ms), downbeat flag,
 * beat-in-bar position, and bar number.
 */
export function getBeatTimestampsFromTempoMap(
  tempoMap: TempoMap,
  durationMs: number,
): { time: number; isDownbeat: boolean; beatInBar: number; barNumber: number }[] {
  if (tempoMap.segments.length === 0 || durationMs <= 0) return [];

  const result: { time: number; isDownbeat: boolean; beatInBar: number; barNumber: number }[] = [];

  for (const seg of tempoMap.segments) {
    const segBeats = seg.endCount - seg.startCount + 1;

    for (let b = 0; b < segBeats; b++) {
      const count = seg.startCount + b;
      const timeMs = countToTimeMs(count, tempoMap);

      // Stop if we've exceeded the audio duration
      if (timeMs > durationMs) break;

      const beatInBar = (b % seg.beatsPerBar) + 1;
      const barOffset = Math.floor(b / seg.beatsPerBar);
      const barNumber = seg.startBar + barOffset;
      const isDownbeat = beatInBar === 1;

      result.push({ time: timeMs, isDownbeat, beatInBar, barNumber });
    }
  }

  return result;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}
