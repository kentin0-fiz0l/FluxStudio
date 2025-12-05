/**
 * MetMap Core Data Types
 *
 * These types define the structure for songs, sections, and practice sessions.
 * All data is persisted to localStorage for offline-first mobile use.
 */

/** Unique identifier type */
export type ID = string;

/** Section type representing different parts of a song */
export type SectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'solo'
  | 'breakdown'
  | 'outro'
  | 'custom';

/** Confidence level for a section (how well you know it) */
export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Tempo change type - how the tempo transitions to the new value
 */
export type TempoChangeType =
  | 'instant'  // Jump immediately to new tempo
  | 'ramp'     // Linear interpolation over rampDuration
  | 'step'     // Step-wise change (useful for accelerando markings)
  | 'swing';   // Apply swing feel (shuffled eighth notes)

/**
 * Time signature representation
 */
export interface TimeSignature {
  /** Beats per measure (numerator) */
  beats: number;
  /** Note value that gets one beat (denominator): 4 = quarter, 8 = eighth */
  noteValue: number;
}

/**
 * A TempoEvent represents a tempo/meter change at a specific time.
 * Used to build tempo maps for songs with varying tempo or time signatures.
 */
export interface TempoEvent {
  id: ID;
  /** Time in seconds where this tempo event occurs */
  time: number;
  /** Beats per minute at this point */
  bpm: number;
  /** Time signature at this point */
  timeSignature: TimeSignature;
  /** How the tempo changes to this value */
  changeType: TempoChangeType;
  /** Duration in seconds for ramp transitions (only used when changeType is 'ramp') */
  rampDuration?: number;
  /** Swing percentage (0-100) - only used when changeType is 'swing' */
  swingPercent?: number;
  /** Optional label (e.g., "Accelerando", "A Tempo", "Ritardando") */
  label?: string;
}

/**
 * A Section represents a discrete part of a song to practice.
 * Sections have timestamps, labels, and can track practice progress.
 */
export interface Section {
  id: ID;
  /** Display name (e.g., "Verse 1", "Chorus", "Bridge") */
  name: string;
  /** Section type for categorization and color-coding */
  type: SectionType;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Optional notes about this section (techniques, challenges, etc.) */
  notes?: string;
  /** Current confidence level (1-5) */
  confidence: ConfidenceLevel;
  /** Number of times this section has been practiced */
  practiceCount: number;
  /** Last practiced timestamp (ISO string) */
  lastPracticed?: string;
  /** Color override (defaults based on type) */
  color?: string;
}

/**
 * A Song represents a complete piece of music to learn.
 * Songs contain multiple sections and track overall progress.
 */
export interface Song {
  id: ID;
  /** Song title */
  title: string;
  /** Artist/composer name */
  artist: string;
  /** Optional album name */
  album?: string;
  /** Total duration in seconds */
  duration: number;
  /** Default starting BPM (used if no tempo events defined) */
  bpm?: number;
  /** Key signature if known (e.g., "Am", "G", "F#m") */
  key?: string;
  /** Default starting time signature */
  defaultTimeSignature: TimeSignature;
  /** Tempo map: ordered array of tempo/meter changes throughout the song */
  tempoEvents: TempoEvent[];
  /** All sections in this song, ordered by startTime */
  sections: Section[];
  /** Overall notes about the song */
  notes?: string;
  /** Created timestamp (ISO string) */
  createdAt: string;
  /** Last modified timestamp (ISO string) */
  updatedAt: string;
  /** Last practiced timestamp (ISO string) */
  lastPracticed?: string;
  /** Total practice sessions for this song */
  totalPracticeSessions: number;
  /** Tags for organization (e.g., ["jazz", "difficult", "gig-ready"]) */
  tags: string[];
}

/**
 * A PracticeSession records a single practice session with a song.
 */
export interface PracticeSession {
  id: ID;
  /** Reference to the song practiced */
  songId: ID;
  /** When the session started (ISO string) */
  startedAt: string;
  /** When the session ended (ISO string) */
  endedAt?: string;
  /** Total duration in seconds */
  duration: number;
  /** Which sections were practiced (section IDs) */
  sectionsPracticed: ID[];
  /** Notes taken during practice */
  notes?: string;
  /** Overall feeling/rating for the session (1-5) */
  rating?: ConfidenceLevel;
}

/**
 * User preferences for MetMap
 */
export interface MetMapPreferences {
  /** Default playback speed (0.5 - 2.0) */
  defaultPlaybackSpeed: number;
  /** Seconds to add before section start for context */
  prerollSeconds: number;
  /** Seconds to add after section end for context */
  postrollSeconds: number;
  /** Auto-loop sections during practice */
  autoLoop: boolean;
  /** Show section timestamps in mm:ss format */
  showTimestamps: boolean;
  /** Theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Count-in beats before section starts (0 = off) */
  countInBeats: number;
}

/**
 * Complete MetMap store state
 */
export interface MetMapState {
  songs: Song[];
  sessions: PracticeSession[];
  preferences: MetMapPreferences;
}

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: MetMapPreferences = {
  defaultPlaybackSpeed: 1.0,
  prerollSeconds: 2,
  postrollSeconds: 1,
  autoLoop: true,
  showTimestamps: true,
  theme: 'system',
  countInBeats: 0,
};

/**
 * Default time signature (4/4)
 */
export const DEFAULT_TIME_SIGNATURE: TimeSignature = {
  beats: 4,
  noteValue: 4,
};

/**
 * Default starting BPM
 */
export const DEFAULT_BPM = 120;

/**
 * Section type to color mapping
 */
export const SECTION_COLORS: Record<SectionType, string> = {
  intro: '#06b6d4',      // cyan
  verse: '#22c55e',      // green
  'pre-chorus': '#84cc16', // lime
  chorus: '#eab308',     // yellow
  bridge: '#8b5cf6',     // purple
  solo: '#f97316',       // orange
  breakdown: '#ef4444',  // red
  outro: '#64748b',      // slate
  custom: '#6b7280',     // gray
};

/**
 * Generate a unique ID
 */
export function generateId(): ID {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new song with defaults
 */
export function createSong(partial: Partial<Song> & Pick<Song, 'title' | 'artist'>): Song {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    duration: 0,
    bpm: DEFAULT_BPM,
    defaultTimeSignature: { ...DEFAULT_TIME_SIGNATURE },
    tempoEvents: [],
    sections: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    totalPracticeSessions: 0,
    ...partial,
  };
}

/**
 * Create a new tempo event with defaults
 */
export function createTempoEvent(
  partial: Partial<TempoEvent> & Pick<TempoEvent, 'time' | 'bpm'>
): TempoEvent {
  return {
    id: generateId(),
    timeSignature: { ...DEFAULT_TIME_SIGNATURE },
    changeType: 'instant',
    ...partial,
  };
}

/**
 * Create a new section with defaults
 */
export function createSection(
  partial: Partial<Section> & Pick<Section, 'name' | 'startTime' | 'endTime'>
): Section {
  return {
    id: generateId(),
    type: 'custom',
    confidence: 1,
    practiceCount: 0,
    ...partial,
  };
}

/**
 * Format seconds to mm:ss display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse mm:ss string to seconds
 */
export function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseInt(timeStr, 10) || 0;
}

/**
 * Calculate average confidence for a song
 */
export function getSongConfidence(song: Song): number {
  if (song.sections.length === 0) return 0;
  const total = song.sections.reduce((sum, s) => sum + s.confidence, 0);
  return total / song.sections.length;
}

/**
 * Get sections that need the most practice (lowest confidence)
 */
export function getSectionsNeedingPractice(song: Song, limit = 3): Section[] {
  return [...song.sections]
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, limit);
}

/**
 * Format a time signature for display (e.g., "4/4", "7/8")
 */
export function formatTimeSignature(ts: TimeSignature): string {
  return `${ts.beats}/${ts.noteValue}`;
}

/**
 * Parse a time signature string (e.g., "4/4") to TimeSignature object
 */
export function parseTimeSignature(str: string): TimeSignature {
  const parts = str.split('/');
  if (parts.length === 2) {
    return {
      beats: parseInt(parts[0], 10) || 4,
      noteValue: parseInt(parts[1], 10) || 4,
    };
  }
  return { ...DEFAULT_TIME_SIGNATURE };
}

/**
 * Get the tempo at a specific time in the song, accounting for tempo events and ramps
 */
export function getTempoAtTime(song: Song, time: number): { bpm: number; timeSignature: TimeSignature } {
  const events = [...song.tempoEvents].sort((a, b) => a.time - b.time);

  // Start with song defaults
  let currentBpm = song.bpm || DEFAULT_BPM;
  let currentTs = song.defaultTimeSignature || DEFAULT_TIME_SIGNATURE;

  if (events.length === 0) {
    return { bpm: currentBpm, timeSignature: currentTs };
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const nextEvent = events[i + 1];

    if (event.time > time) {
      // Haven't reached this event yet
      break;
    }

    // Check if we're in a ramp transition
    if (event.changeType === 'ramp' && event.rampDuration && event.rampDuration > 0) {
      const rampEnd = event.time + event.rampDuration;
      if (time >= event.time && time < rampEnd) {
        // We're in the middle of a ramp
        const progress = (time - event.time) / event.rampDuration;
        // Previous tempo is what we had before this event
        const prevBpm = i > 0 ? events[i - 1].bpm : (song.bpm || DEFAULT_BPM);
        currentBpm = prevBpm + (event.bpm - prevBpm) * progress;
        currentTs = event.timeSignature;
        return { bpm: currentBpm, timeSignature: currentTs };
      }
    }

    // Past this event, apply its values
    currentBpm = event.bpm;
    currentTs = event.timeSignature;

    // If there's a next event and we're past the current event's ramp (if any)
    if (nextEvent && time >= (event.time + (event.rampDuration || 0))) {
      continue;
    }
  }

  return { bpm: currentBpm, timeSignature: currentTs };
}

/**
 * Calculate the beat duration in seconds for a given BPM
 */
export function beatDuration(bpm: number): number {
  return 60 / bpm;
}

/**
 * Calculate measure duration in seconds
 */
export function measureDuration(bpm: number, timeSignature: TimeSignature): number {
  const beatDur = beatDuration(bpm);
  // Adjust for note value (quarter = 1, eighth = 0.5, half = 2)
  const beatMultiplier = 4 / timeSignature.noteValue;
  return beatDur * timeSignature.beats * beatMultiplier;
}

/**
 * Get all tempo events within a time range (useful for looped sections)
 */
export function getTempoEventsInRange(
  song: Song,
  startTime: number,
  endTime: number
): TempoEvent[] {
  return song.tempoEvents.filter(
    (event) => event.time >= startTime && event.time <= endTime
  );
}
