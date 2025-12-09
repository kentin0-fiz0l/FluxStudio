/**
 * MetMap Core Data Types
 *
 * These types define the structure for songs, sections, and practice sessions.
 * All data is persisted to localStorage for offline-first mobile use.
 */

import type { ChordEvent } from './song';

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
 * A Section represents a discrete part of a song to practice.
 * Sections have bar counts, labels, and can track practice progress.
 */
export interface Section {
  id: ID;
  /** Display name (e.g., "Verse 1", "Chorus", "Bridge") */
  name: string;
  /** Section type for categorization and color-coding */
  type: SectionType;
  /** Number of bars/counts in this section */
  bars: number;
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
  /** Chord progression for this section */
  chords?: ChordEvent[];
  // Legacy fields for backwards compatibility
  /** @deprecated Use bars instead */
  startTime?: number;
  /** @deprecated Use bars instead */
  endTime?: number;
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
  /** BPM (beats per minute) if known */
  bpm?: number;
  /** Key signature if known (e.g., "Am", "G", "F#m") */
  key?: string;
  /** Time signature (e.g., "4/4", "3/4", "6/8") */
  timeSignature?: string;
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
    sections: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    totalPracticeSessions: 0,
    ...partial,
  };
}

/**
 * Create a new section with defaults
 */
export function createSection(
  partial: Partial<Section> & Pick<Section, 'name' | 'bars'>
): Section {
  return {
    id: generateId(),
    type: 'custom',
    confidence: 3,
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
