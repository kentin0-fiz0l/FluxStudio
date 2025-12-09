/**
 * Song and Chord Data Types for ChordTimeline
 *
 * These types define the structure for chord progressions and musical sections
 * with bar/beat precision for timeline visualization and editing.
 */

/**
 * Time signature representation (e.g., 4/4, 3/4, 6/8)
 */
export type TimeSignature = {
  numerator: number;   // Beats per bar (e.g., 4 in 4/4)
  denominator: number; // Beat unit (e.g., 4 for quarter note)
};

/**
 * A single chord event positioned in time
 */
export type ChordEvent = {
  id: string;
  bar: number;           // 1-indexed bar number
  beat: number;          // 1-indexed beat within the bar
  durationBeats: number; // Duration in beats (can span multiple bars)
  root: string;          // "C", "C#", "Db", etc.
  quality: string;       // "maj", "min", "7", "maj7", "dim", "sus2", "sus4", etc.
  extensions?: string[]; // Optional extensions like "9", "11", "13"
  inversion?: number;    // 0 = root position, 1 = first inversion, etc.
};

/**
 * A musical section with chord progression data
 * Note: This extends the concept of Section from metmap.ts with chord data
 */
export type ChordSection = {
  id: string;
  name: string;
  order: number;
  bars: number;                        // Total bars in this section
  localBpm?: number | null;            // Section-specific BPM override
  localTimeSignature?: TimeSignature | null; // Section-specific time sig override
  chords: ChordEvent[];
};

// ============================================================================
// Constants
// ============================================================================

/**
 * All chromatic note roots
 */
export const NOTE_ROOTS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
] as const;

/**
 * Common chord qualities for the editor
 */
export const CHORD_QUALITIES = [
  'maj',
  'min',
  '7',
  'maj7',
  'min7',
  'dim',
  'dim7',
  'aug',
  'sus2',
  'sus4',
  '6',
  'min6',
  '9',
  'add9',
] as const;

/**
 * Simplified roots (no enharmonic duplicates) for the UI
 */
export const SIMPLE_ROOTS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
] as const;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a unique ID for chord events
 */
export function generateChordId(): string {
  return crypto.randomUUID();
}

/**
 * Format a chord event as a display string (e.g., "Cmaj7", "Am", "G7")
 */
export function formatChordSymbol(chord: ChordEvent): string {
  const { root, quality, extensions } = chord;

  // Handle common quality display conventions
  let qualityDisplay = quality;
  if (quality === 'maj') {
    qualityDisplay = ''; // Major chords often omit the 'maj'
  } else if (quality === 'min') {
    qualityDisplay = 'm';
  }

  const extStr = extensions?.length ? extensions.join('') : '';
  return `${root}${qualityDisplay}${extStr}`;
}

/**
 * Create a new chord event with defaults
 */
export function createChordEvent(
  bar: number,
  beat: number,
  root: string = 'C',
  quality: string = 'maj',
  durationBeats: number = 1
): ChordEvent {
  return {
    id: generateChordId(),
    bar,
    beat,
    durationBeats,
    root,
    quality,
  };
}

/**
 * Calculate the absolute beat position of a chord event
 * (useful for sorting and overlap detection)
 */
export function getAbsoluteBeat(
  chord: ChordEvent,
  beatsPerBar: number
): number {
  return (chord.bar - 1) * beatsPerBar + (chord.beat - 1);
}

/**
 * Create a default time signature (4/4)
 */
export function defaultTimeSignature(): TimeSignature {
  return { numerator: 4, denominator: 4 };
}

/**
 * Create an empty chord section
 */
export function createChordSection(
  name: string,
  bars: number = 4,
  order: number = 0
): ChordSection {
  return {
    id: generateChordId(),
    name,
    order,
    bars,
    chords: [],
  };
}
