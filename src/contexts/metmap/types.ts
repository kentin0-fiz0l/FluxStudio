/**
 * MetMap Context Types - FluxStudio
 *
 * Shared type definitions for the MetMap musical timeline tool.
 */

import * as React from 'react';

// ==================== Core Types ====================

export interface Song {
  id: string;
  userId: string;
  projectId?: string;
  projectName?: string;
  title: string;
  description?: string;
  bpmDefault: number;
  timeSignatureDefault: string;
  sectionCount: number;
  totalBars: number;
  practiceCount: number;
  sections?: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id?: string;
  songId?: string;
  name: string;
  orderIndex: number;
  startBar: number;
  bars: number;
  timeSignature: string;
  tempoStart: number;
  tempoEnd?: number;
  tempoCurve?: 'linear' | 'exponential' | 'step';
  chords?: Chord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Chord {
  id?: string;
  sectionId?: string;
  sectionName?: string;
  sectionOrder?: number;
  bar: number;
  beat: number;
  symbol: string;
  durationBeats: number;
  voicing?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PracticeSession {
  id: string;
  songId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
  settings: PracticeSettings;
  createdAt: string;
}

export interface PracticeSettings {
  useClick?: boolean;
  subdivision?: number;
  countoffBars?: number;
  tempoOverride?: number;
}

export interface MetMapStats {
  songCount: number;
  practiceCount: number;
  totalPracticeMinutes: number;
}

export interface SongsFilter {
  search: string;
  projectId?: string;
  orderBy: 'updated_at' | 'created_at' | 'title' | 'bpm_default';
  orderDir: 'ASC' | 'DESC';
}

export interface SongsPagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

// ==================== Playback State ====================

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentBar: number;
  currentBeat: number;
  currentTempo: number;
  currentSectionId?: string;
  currentSectionIndex: number;
  elapsedMs: number;
  countingOff: boolean;
  countoffBeatsRemaining: number;
}

export const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentBar: 1,
  currentBeat: 1,
  currentTempo: 120,
  currentSectionId: undefined,
  currentSectionIndex: 0,
  elapsedMs: 0,
  countingOff: false,
  countoffBeatsRemaining: 0
};

// ==================== State Types ====================

export interface MetMapState {
  // Songs list
  songs: Song[];
  songsLoading: boolean;
  songsError: string | null;
  filters: SongsFilter;
  pagination: SongsPagination;

  // Current song being edited
  currentSong: Song | null;
  currentSongLoading: boolean;
  currentSongError: string | null;

  // Editing state (local changes before saving)
  editedSections: Section[];
  hasUnsavedChanges: boolean;

  // Playback
  playback: PlaybackState;

  // Practice
  activePracticeSession: PracticeSession | null;
  practiceHistory: PracticeSession[];
  practiceHistoryLoading: boolean;

  // Stats
  stats: MetMapStats | null;
}

export const initialMetMapState: MetMapState = {
  songs: [],
  songsLoading: false,
  songsError: null,
  filters: {
    search: '',
    projectId: undefined,
    orderBy: 'updated_at',
    orderDir: 'DESC'
  },
  pagination: {
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false
  },
  currentSong: null,
  currentSongLoading: false,
  currentSongError: null,
  editedSections: [],
  hasUnsavedChanges: false,
  playback: initialPlaybackState,
  activePracticeSession: null,
  practiceHistory: [],
  practiceHistoryLoading: false,
  stats: null
};

// ==================== Action Types ====================

export type MetMapAction =
  | { type: 'SET_SONGS_LOADING'; payload: boolean }
  | { type: 'SET_SONGS'; payload: { songs: Song[]; total: number; hasMore: boolean } }
  | { type: 'SET_SONGS_ERROR'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<SongsFilter> }
  | { type: 'SET_PAGINATION'; payload: Partial<SongsPagination> }
  | { type: 'ADD_SONG'; payload: Song }
  | { type: 'UPDATE_SONG_IN_LIST'; payload: Song }
  | { type: 'REMOVE_SONG'; payload: string }
  | { type: 'SET_CURRENT_SONG_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_SONG'; payload: Song | null }
  | { type: 'SET_CURRENT_SONG_ERROR'; payload: string }
  | { type: 'SET_EDITED_SECTIONS'; payload: Section[] }
  | { type: 'SET_HAS_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'UPDATE_PLAYBACK'; payload: Partial<PlaybackState> }
  | { type: 'RESET_PLAYBACK' }
  | { type: 'SET_ACTIVE_PRACTICE_SESSION'; payload: PracticeSession | null }
  | { type: 'SET_PRACTICE_HISTORY_LOADING'; payload: boolean }
  | { type: 'SET_PRACTICE_HISTORY'; payload: PracticeSession[] }
  | { type: 'SET_STATS'; payload: MetMapStats };

// ==================== Reducer ====================

export function metmapReducer(state: MetMapState, action: MetMapAction): MetMapState {
  switch (action.type) {
    case 'SET_SONGS_LOADING':
      return { ...state, songsLoading: action.payload, songsError: null };
    case 'SET_SONGS':
      return {
        ...state,
        songs: action.payload.songs,
        pagination: {
          ...state.pagination,
          total: action.payload.total,
          hasMore: action.payload.hasMore
        },
        songsLoading: false
      };
    case 'SET_SONGS_ERROR':
      return { ...state, songsError: action.payload, songsLoading: false };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_PAGINATION':
      return { ...state, pagination: { ...state.pagination, ...action.payload } };
    case 'ADD_SONG':
      return { ...state, songs: [action.payload, ...state.songs] };
    case 'UPDATE_SONG_IN_LIST':
      return {
        ...state,
        songs: state.songs.map(s => s.id === action.payload.id ? action.payload : s)
      };
    case 'REMOVE_SONG':
      return { ...state, songs: state.songs.filter(s => s.id !== action.payload) };
    case 'SET_CURRENT_SONG_LOADING':
      return { ...state, currentSongLoading: action.payload, currentSongError: null };
    case 'SET_CURRENT_SONG':
      return {
        ...state,
        currentSong: action.payload,
        editedSections: action.payload?.sections || [],
        hasUnsavedChanges: false,
        currentSongLoading: false,
        playback: initialPlaybackState
      };
    case 'SET_CURRENT_SONG_ERROR':
      return { ...state, currentSongError: action.payload, currentSongLoading: false };
    case 'SET_EDITED_SECTIONS':
      return { ...state, editedSections: action.payload, hasUnsavedChanges: true };
    case 'SET_HAS_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload };
    case 'UPDATE_PLAYBACK':
      return { ...state, playback: { ...state.playback, ...action.payload } };
    case 'RESET_PLAYBACK':
      return { ...state, playback: initialPlaybackState };
    case 'SET_ACTIVE_PRACTICE_SESSION':
      return { ...state, activePracticeSession: action.payload };
    case 'SET_PRACTICE_HISTORY_LOADING':
      return { ...state, practiceHistoryLoading: action.payload };
    case 'SET_PRACTICE_HISTORY':
      return { ...state, practiceHistory: action.payload, practiceHistoryLoading: false };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    default:
      return state;
  }
}

// ==================== Context Value Interfaces ====================

export interface MetMapCoreContextValue {
  state: MetMapState;
  dispatch: React.Dispatch<MetMapAction>;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export interface SongListContextValue {
  loadSongs: () => Promise<void>;
  loadMoreSongs: () => Promise<void>;
  setFilters: (filters: Partial<SongsFilter>) => void;
  createSong: (data: Partial<Song>) => Promise<Song | null>;
  loadSong: (songId: string) => Promise<void>;
  updateSong: (songId: string, changes: Partial<Song>) => Promise<Song | null>;
  deleteSong: (songId: string) => Promise<boolean>;
  closeSong: () => void;
}

export interface SectionEditorContextValue {
  updateEditedSections: (sections: Section[]) => void;
  saveSections: () => Promise<boolean>;
  addSection: (section: Partial<Section>) => void;
  updateSection: (index: number, changes: Partial<Section>) => void;
  removeSection: (index: number) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  updateSectionChords: (sectionIndex: number, chords: Chord[]) => void;
  saveChords: (sectionId: string, chords: Chord[]) => Promise<boolean>;
}

export interface PlaybackContextValue {
  play: (options?: { tempoOverride?: number; countoffBars?: number; loopSection?: number | null }) => void;
  pause: () => void;
  stop: () => void;
  seekToBar: (bar: number) => void;
}

export interface PracticeContextValue {
  startPracticeSession: (settings?: PracticeSettings) => Promise<PracticeSession | null>;
  endPracticeSession: (notes?: string) => Promise<void>;
  loadPracticeHistory: () => Promise<void>;
  loadStats: () => Promise<void>;
}

// ==================== Helper Functions ====================

export function calculateNextStartBar(sections: Section[]): number {
  if (sections.length === 0) return 1;
  const lastSection = sections[sections.length - 1];
  return lastSection.startBar + lastSection.bars;
}

export function recalculateStartBars(sections: Section[]): Section[] {
  let startBar = 1;
  return sections.map((section, index) => {
    const updated = { ...section, orderIndex: index, startBar };
    startBar += section.bars;
    return updated;
  });
}

export function calculateGlobalBeat(sections: Section[], bar: number, beat: number): number {
  let globalBeat = 0;
  let currentBar = 1;

  for (const section of sections) {
    const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;
    const sectionEndBar = currentBar + section.bars;

    if (bar < sectionEndBar) {
      const barsIntoSection = bar - currentBar;
      globalBeat += barsIntoSection * beatsPerBar + (beat - 1);
      break;
    }

    globalBeat += section.bars * beatsPerBar;
    currentBar = sectionEndBar;
  }

  return globalBeat;
}

export function getBeatsPerBar(timeSignature: string): number {
  const [numerator] = timeSignature.split('/').map(Number);
  return numerator || 4;
}
