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
  audioFileUrl?: string;
  audioDurationSeconds?: number;
  detectedBpm?: number;
  beatMap?: BeatMap;
  createdAt: string;
  updatedAt: string;
}

export interface BeatMap {
  bpm: number;
  beats: number[];       // timestamps in seconds
  onsets: number[];       // onset timestamps in seconds
  confidence: number;     // 0-1 detection confidence
}

export type PlaybackMode = 'metronome' | 'audio' | 'both';

/** Real-time collaboration status */
export type CollaborationStatus = 'disconnected' | 'connecting' | 'synced';

// ==================== Keyframe / Animation Types ====================

export type AnimatableProperty = 'tempo' | 'volume' | 'pan' | 'emphasis';
export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'step' | 'bezier';

export interface BezierHandles {
  cp1x: number; // 0-1 normalized time offset
  cp1y: number; // 0-1 normalized value offset
  cp2x: number;
  cp2y: number;
}

export interface Keyframe {
  id: string;
  /** Time position in seconds (relative to section start) */
  time: number;
  /** Property value at this keyframe */
  value: number;
  /** Easing curve applied from this keyframe to the next */
  easing: EasingType;
  /** Custom bezier control points (used when easing === 'bezier') */
  bezierHandles?: BezierHandles;
}

export interface Animation {
  id: string;
  property: AnimatableProperty;
  keyframes: Keyframe[];
  enabled: boolean;
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
  animations?: Animation[];
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
  loopedSectionName?: string;
  autoRampEnabled?: boolean;
  startTempoPercent?: number;
  endTempoPercent?: number;
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
  playbackMode: PlaybackMode;
  currentTimeSeconds: number;
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
  countoffBeatsRemaining: 0,
  playbackMode: 'metronome',
  currentTimeSeconds: 0,
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

  // Audio
  audioLoading: boolean;
  audioError: string | null;
  beatDetectionLoading: boolean;
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
  stats: null,
  audioLoading: false,
  audioError: null,
  beatDetectionLoading: false,
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
  | { type: 'SET_STATS'; payload: MetMapStats }
  | { type: 'SET_AUDIO_LOADING'; payload: boolean }
  | { type: 'SET_AUDIO_ERROR'; payload: string | null }
  | { type: 'SET_BEAT_DETECTION_LOADING'; payload: boolean }
  | { type: 'SET_SONG_AUDIO'; payload: { songId: string; audioFileUrl: string; audioDurationSeconds: number } }
  | { type: 'SET_SONG_BEAT_MAP'; payload: { songId: string; beatMap: BeatMap; detectedBpm: number } }
  | { type: 'CLEAR_SONG_AUDIO'; payload: string };

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
    case 'SET_AUDIO_LOADING':
      return { ...state, audioLoading: action.payload, audioError: null };
    case 'SET_AUDIO_ERROR':
      return { ...state, audioError: action.payload, audioLoading: false };
    case 'SET_BEAT_DETECTION_LOADING':
      return { ...state, beatDetectionLoading: action.payload };
    case 'SET_SONG_AUDIO': {
      const { songId, audioFileUrl, audioDurationSeconds } = action.payload;
      const updatedSong = state.currentSong?.id === songId
        ? { ...state.currentSong, audioFileUrl, audioDurationSeconds }
        : state.currentSong;
      return {
        ...state,
        currentSong: updatedSong,
        songs: state.songs.map(s => s.id === songId ? { ...s, audioFileUrl, audioDurationSeconds } : s),
        audioLoading: false,
      };
    }
    case 'SET_SONG_BEAT_MAP': {
      const { songId, beatMap, detectedBpm } = action.payload;
      const updatedSong2 = state.currentSong?.id === songId
        ? { ...state.currentSong, beatMap, detectedBpm }
        : state.currentSong;
      return {
        ...state,
        currentSong: updatedSong2,
        songs: state.songs.map(s => s.id === songId ? { ...s, beatMap, detectedBpm } : s),
        beatDetectionLoading: false,
      };
    }
    case 'CLEAR_SONG_AUDIO': {
      const clearedSong = state.currentSong?.id === action.payload
        ? { ...state.currentSong, audioFileUrl: undefined, audioDurationSeconds: undefined, beatMap: undefined, detectedBpm: undefined }
        : state.currentSong;
      return {
        ...state,
        currentSong: clearedSong,
        songs: state.songs.map(s => s.id === action.payload
          ? { ...s, audioFileUrl: undefined, audioDurationSeconds: undefined, beatMap: undefined, detectedBpm: undefined }
          : s),
      };
    }
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
  seekToTime: (seconds: number) => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
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

/**
 * Convert elapsed seconds to global beat position using tempo map.
 * Walks through sections, accumulating time per beat at each section's tempo.
 */
export function secondsToGlobalBeat(sections: Section[], seconds: number): number {
  let elapsedSeconds = 0;
  let globalBeat = 0;

  for (const section of sections) {
    const beatsPerBar = getBeatsPerBar(section.timeSignature);
    const sectionBeats = section.bars * beatsPerBar;
    const tempoStart = section.tempoStart;
    const tempoEnd = section.tempoEnd ?? tempoStart;
    const hasRamp = tempoEnd !== tempoStart;

    for (let b = 0; b < sectionBeats; b++) {
      const progress = sectionBeats > 1 ? b / sectionBeats : 0;
      let tempo: number;
      if (!hasRamp) {
        tempo = tempoStart;
      } else if (section.tempoCurve === 'step') {
        tempo = tempoStart;
      } else if (section.tempoCurve === 'exponential') {
        tempo = tempoStart * Math.pow(tempoEnd / tempoStart, progress);
      } else {
        tempo = tempoStart + (tempoEnd - tempoStart) * progress;
      }

      const beatDuration = 60 / tempo;
      if (elapsedSeconds + beatDuration > seconds) {
        // Fractional beat
        const fraction = (seconds - elapsedSeconds) / beatDuration;
        return globalBeat + fraction;
      }
      elapsedSeconds += beatDuration;
      globalBeat++;
    }
  }

  return globalBeat;
}

/**
 * Convert global beat position to elapsed seconds using tempo map.
 */
export function globalBeatToSeconds(sections: Section[], targetBeat: number): number {
  let elapsedSeconds = 0;
  let globalBeat = 0;

  for (const section of sections) {
    const beatsPerBar = getBeatsPerBar(section.timeSignature);
    const sectionBeats = section.bars * beatsPerBar;
    const tempoStart = section.tempoStart;
    const tempoEnd = section.tempoEnd ?? tempoStart;
    const hasRamp = tempoEnd !== tempoStart;

    for (let b = 0; b < sectionBeats; b++) {
      if (globalBeat >= targetBeat) return elapsedSeconds;
      const progress = sectionBeats > 1 ? b / sectionBeats : 0;
      let tempo: number;
      if (!hasRamp) {
        tempo = tempoStart;
      } else if (section.tempoCurve === 'step') {
        tempo = tempoStart;
      } else if (section.tempoCurve === 'exponential') {
        tempo = tempoStart * Math.pow(tempoEnd / tempoStart, progress);
      } else {
        tempo = tempoStart + (tempoEnd - tempoStart) * progress;
      }
      elapsedSeconds += 60 / tempo;
      globalBeat++;
    }
  }

  return elapsedSeconds;
}
