/**
 * Snap-to-beat utilities for chord placement.
 *
 * Given a time position (in seconds), snap to the nearest detected beat
 * or musical grid position. Used when placing chords via timeline click
 * or drag operations.
 */

import type { BeatMap, Section } from '../contexts/metmap/types';
import { secondsToGlobalBeat, getBeatsPerBar } from '../contexts/metmap/types';

export interface SnapResult {
  /** Snapped time in seconds */
  time: number;
  /** Bar number (1-indexed) */
  bar: number;
  /** Beat number within bar (1-indexed) */
  beat: number;
  /** Whether the snap actually moved the position */
  didSnap: boolean;
  /** Type of snap target */
  snapType: 'beat' | 'grid' | 'free';
}

/**
 * Find the nearest detected beat to a given time.
 *
 * @param time - Position in seconds
 * @param beatMap - Detected beat positions
 * @param thresholdMs - Maximum snap distance in milliseconds (default 50ms)
 * @returns Snapped time, or null if no beat within threshold
 */
export function nearestBeat(
  time: number,
  beatMap: BeatMap,
  thresholdMs = 50,
): number | null {
  const thresholdSec = thresholdMs / 1000;
  let closest: number | null = null;
  let closestDist = Infinity;

  for (const beat of beatMap.beats) {
    const dist = Math.abs(beat - time);
    if (dist < closestDist && dist <= thresholdSec) {
      closestDist = dist;
      closest = beat;
    }
    // Early exit since beats are sorted
    if (beat > time + thresholdSec) break;
  }

  return closest;
}

/**
 * Snap a time position to the nearest detected beat, then convert to bar/beat.
 *
 * If no detected beat is within threshold, snaps to the nearest musical grid
 * position (bar + beat) based on the tempo map.
 *
 * @param time - Position in seconds
 * @param sections - Song sections with tempo map
 * @param beatMap - Detected beats (optional; if null, uses grid only)
 * @param thresholdMs - Snap distance in ms
 */
export function snapToNearestBeat(
  time: number,
  sections: Section[],
  beatMap: BeatMap | null | undefined,
  thresholdMs = 50,
): SnapResult {
  // Try detected beat snap first
  if (beatMap) {
    const snapped = nearestBeat(time, beatMap, thresholdMs);
    if (snapped !== null) {
      const { bar, beat } = timeToBarBeat(snapped, sections);
      return { time: snapped, bar, beat, didSnap: true, snapType: 'beat' };
    }
  }

  // Fall back to musical grid snap
  const globalBeat = Math.round(secondsToGlobalBeat(sections, time));
  const { bar, beat } = globalBeatToBarBeat(sections, globalBeat);
  return { time, bar, beat, didSnap: false, snapType: 'grid' };
}

/**
 * Convert a time in seconds to bar/beat using the section layout.
 */
function timeToBarBeat(
  time: number,
  sections: Section[],
): { bar: number; beat: number } {
  const globalBeat = Math.round(secondsToGlobalBeat(sections, time));
  return globalBeatToBarBeat(sections, globalBeat);
}

function globalBeatToBarBeat(
  sections: Section[],
  globalBeat: number,
): { bar: number; beat: number } {
  let beatCount = 0;
  let barCount = 0;

  for (const section of sections) {
    const beatsPerBar = getBeatsPerBar(section.timeSignature);
    const sectionBeats = section.bars * beatsPerBar;

    if (globalBeat < beatCount + sectionBeats) {
      const beatInSection = globalBeat - beatCount;
      const barInSection = Math.floor(beatInSection / beatsPerBar);
      const beat = (beatInSection % beatsPerBar) + 1;
      return { bar: barCount + barInSection + 1, beat };
    }

    beatCount += sectionBeats;
    barCount += section.bars;
  }

  return { bar: barCount || 1, beat: 1 };
}
