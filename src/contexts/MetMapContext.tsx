/**
 * MetMap Context - FluxStudio
 *
 * Global state management for the MetMap musical timeline tool.
 * Provides song management, section/chord editing, and a playback engine.
 *
 * Features:
 * - Song CRUD with pagination and search
 * - Section management with tempo ramps
 * - Chord progression editing
 * - Timer-based playback engine (no WebAudio)
 * - Practice session tracking
 * - Project linking
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { getApiUrl } from '../utils/apiHelpers';

// ==================== Types ====================

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

// Playback state
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

// ==================== State ====================

interface MetMapState {
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

const initialPlaybackState: PlaybackState = {
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

const initialState: MetMapState = {
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

// ==================== Actions ====================

type MetMapAction =
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

function metmapReducer(state: MetMapState, action: MetMapAction): MetMapState {
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

// ==================== Context ====================

interface MetMapContextValue extends MetMapState {
  // Songs
  loadSongs: () => Promise<void>;
  loadMoreSongs: () => Promise<void>;
  setFilters: (filters: Partial<SongsFilter>) => void;
  createSong: (data: Partial<Song>) => Promise<Song | null>;
  loadSong: (songId: string) => Promise<void>;
  updateSong: (songId: string, changes: Partial<Song>) => Promise<Song | null>;
  deleteSong: (songId: string) => Promise<boolean>;
  closeSong: () => void;

  // Sections
  updateEditedSections: (sections: Section[]) => void;
  saveSections: () => Promise<boolean>;
  addSection: (section: Partial<Section>) => void;
  updateSection: (index: number, changes: Partial<Section>) => void;
  removeSection: (index: number) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;

  // Chords
  updateSectionChords: (sectionIndex: number, chords: Chord[]) => void;
  saveChords: (sectionId: string, chords: Chord[]) => Promise<boolean>;

  // Playback
  play: (options?: { tempoOverride?: number; countoffBars?: number }) => void;
  pause: () => void;
  stop: () => void;
  seekToBar: (bar: number) => void;

  // Practice
  startPracticeSession: (settings?: PracticeSettings) => Promise<PracticeSession | null>;
  endPracticeSession: (notes?: string) => Promise<void>;
  loadPracticeHistory: () => Promise<void>;

  // Stats
  loadStats: () => Promise<void>;
}

const MetMapContext = createContext<MetMapContextValue | undefined>(undefined);

// ==================== Provider ====================

export function MetMapProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(metmapReducer, initialState);
  const { token } = useAuth();
  const { showNotification } = useNotification();

  // Refs for playback
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  // Helper for API calls
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = getApiUrl(endpoint);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }, [token]);

  // ==================== Songs ====================

  const loadSongs = useCallback(async () => {
    if (!token) return;
    dispatch({ type: 'SET_SONGS_LOADING', payload: true });

    try {
      const params = new URLSearchParams();
      if (state.filters.search) params.set('search', state.filters.search);
      if (state.filters.projectId) params.set('projectId', state.filters.projectId);
      params.set('orderBy', state.filters.orderBy);
      params.set('orderDir', state.filters.orderDir);
      params.set('limit', String(state.pagination.limit));
      params.set('offset', '0');

      const data = await apiCall(`/api/metmap/songs?${params}`);
      dispatch({
        type: 'SET_SONGS',
        payload: { songs: data.songs, total: data.total, hasMore: data.hasMore }
      });
      dispatch({ type: 'SET_PAGINATION', payload: { offset: 0 } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load songs';
      dispatch({ type: 'SET_SONGS_ERROR', payload: message });
      showNotification({ type: 'error', title: 'Error', message });
    }
  }, [token, state.filters, state.pagination.limit, apiCall, showNotification]);

  const loadMoreSongs = useCallback(async () => {
    if (!token || !state.pagination.hasMore || state.songsLoading) return;
    dispatch({ type: 'SET_SONGS_LOADING', payload: true });

    try {
      const newOffset = state.pagination.offset + state.pagination.limit;
      const params = new URLSearchParams();
      if (state.filters.search) params.set('search', state.filters.search);
      if (state.filters.projectId) params.set('projectId', state.filters.projectId);
      params.set('orderBy', state.filters.orderBy);
      params.set('orderDir', state.filters.orderDir);
      params.set('limit', String(state.pagination.limit));
      params.set('offset', String(newOffset));

      const data = await apiCall(`/api/metmap/songs?${params}`);
      dispatch({
        type: 'SET_SONGS',
        payload: {
          songs: [...state.songs, ...data.songs],
          total: data.total,
          hasMore: data.hasMore
        }
      });
      dispatch({ type: 'SET_PAGINATION', payload: { offset: newOffset } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more songs';
      dispatch({ type: 'SET_SONGS_ERROR', payload: message });
    }
  }, [token, state.pagination, state.filters, state.songs, state.songsLoading, apiCall]);

  const setFilters = useCallback((filters: Partial<SongsFilter>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const createSong = useCallback(async (data: Partial<Song>): Promise<Song | null> => {
    if (!token) return null;

    try {
      const result = await apiCall('/api/metmap/songs', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      dispatch({ type: 'ADD_SONG', payload: result.song });
      showNotification({ type: 'success', title: 'Success', message: 'Song created' });
      return result.song;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create song';
      showNotification({ type: 'error', title: 'Error', message });
      return null;
    }
  }, [token, apiCall, showNotification]);

  const loadSong = useCallback(async (songId: string) => {
    if (!token) return;
    dispatch({ type: 'SET_CURRENT_SONG_LOADING', payload: true });

    try {
      const data = await apiCall(`/api/metmap/songs/${songId}`);
      dispatch({ type: 'SET_CURRENT_SONG', payload: data.song });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load song';
      dispatch({ type: 'SET_CURRENT_SONG_ERROR', payload: message });
      showNotification({ type: 'error', title: 'Error', message });
    }
  }, [token, apiCall, showNotification]);

  const updateSong = useCallback(async (songId: string, changes: Partial<Song>): Promise<Song | null> => {
    if (!token) return null;

    try {
      const result = await apiCall(`/api/metmap/songs/${songId}`, {
        method: 'PUT',
        body: JSON.stringify(changes)
      });

      dispatch({ type: 'UPDATE_SONG_IN_LIST', payload: result.song });
      if (state.currentSong?.id === songId) {
        dispatch({ type: 'SET_CURRENT_SONG', payload: { ...state.currentSong, ...result.song } });
      }
      return result.song;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update song';
      showNotification({ type: 'error', title: 'Error', message });
      return null;
    }
  }, [token, state.currentSong, apiCall, showNotification]);

  const deleteSong = useCallback(async (songId: string): Promise<boolean> => {
    if (!token) return false;

    try {
      await apiCall(`/api/metmap/songs/${songId}`, { method: 'DELETE' });
      dispatch({ type: 'REMOVE_SONG', payload: songId });
      if (state.currentSong?.id === songId) {
        dispatch({ type: 'SET_CURRENT_SONG', payload: null });
      }
      showNotification({ type: 'success', title: 'Success', message: 'Song deleted' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete song';
      showNotification({ type: 'error', title: 'Error', message });
      return false;
    }
  }, [token, state.currentSong, apiCall, showNotification]);

  const closeSong = useCallback(() => {
    stop(); // Stop playback
    dispatch({ type: 'SET_CURRENT_SONG', payload: null });
  }, []);

  // ==================== Sections ====================

  const updateEditedSections = useCallback((sections: Section[]) => {
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: sections });
  }, []);

  const saveSections = useCallback(async (): Promise<boolean> => {
    if (!token || !state.currentSong) return false;

    try {
      const result = await apiCall(`/api/metmap/songs/${state.currentSong.id}/sections`, {
        method: 'PUT',
        body: JSON.stringify({ sections: state.editedSections })
      });

      // Update current song with new sections
      const updatedSong = { ...state.currentSong, sections: result.sections };
      dispatch({ type: 'SET_CURRENT_SONG', payload: updatedSong });
      dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: false });
      showNotification({ type: 'success', title: 'Success', message: 'Timeline saved' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save sections';
      showNotification({ type: 'error', title: 'Error', message });
      return false;
    }
  }, [token, state.currentSong, state.editedSections, apiCall, showNotification]);

  const addSection = useCallback((section: Partial<Section>) => {
    const newSection: Section = {
      name: section.name || `Section ${state.editedSections.length + 1}`,
      orderIndex: state.editedSections.length,
      startBar: calculateNextStartBar(state.editedSections),
      bars: section.bars || 4,
      timeSignature: section.timeSignature || state.currentSong?.timeSignatureDefault || '4/4',
      tempoStart: section.tempoStart || state.currentSong?.bpmDefault || 120,
      tempoEnd: section.tempoEnd,
      tempoCurve: section.tempoCurve,
      chords: []
    };

    dispatch({ type: 'SET_EDITED_SECTIONS', payload: [...state.editedSections, newSection] });
  }, [state.editedSections, state.currentSong]);

  const updateSection = useCallback((index: number, changes: Partial<Section>) => {
    const updated = state.editedSections.map((s, i) =>
      i === index ? { ...s, ...changes } : s
    );
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: recalculateStartBars(updated) });
  }, [state.editedSections]);

  const removeSection = useCallback((index: number) => {
    const updated = state.editedSections.filter((_, i) => i !== index);
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: recalculateStartBars(updated) });
  }, [state.editedSections]);

  const reorderSections = useCallback((fromIndex: number, toIndex: number) => {
    const sections = [...state.editedSections];
    const [removed] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, removed);

    const reordered = sections.map((s, i) => ({ ...s, orderIndex: i }));
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: recalculateStartBars(reordered) });
  }, [state.editedSections]);

  // ==================== Chords ====================

  const updateSectionChords = useCallback((sectionIndex: number, chords: Chord[]) => {
    const updated = state.editedSections.map((s, i) =>
      i === sectionIndex ? { ...s, chords } : s
    );
    dispatch({ type: 'SET_EDITED_SECTIONS', payload: updated });
  }, [state.editedSections]);

  const saveChords = useCallback(async (sectionId: string, chords: Chord[]): Promise<boolean> => {
    if (!token) return false;

    try {
      await apiCall(`/api/metmap/sections/${sectionId}/chords`, {
        method: 'PUT',
        body: JSON.stringify({ chords })
      });

      showNotification({ type: 'success', title: 'Success', message: 'Chords saved' });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save chords';
      showNotification({ type: 'error', title: 'Error', message });
      return false;
    }
  }, [token, apiCall, showNotification]);

  // ==================== Playback Engine ====================

  const getBeatsPerBar = useCallback((timeSignature: string): number => {
    const [numerator] = timeSignature.split('/').map(Number);
    return numerator || 4;
  }, []);

  const calculateTotalBeats = useCallback((sections: Section[]): number => {
    return sections.reduce((total, section) => {
      const beatsPerBar = getBeatsPerBar(section.timeSignature);
      return total + section.bars * beatsPerBar;
    }, 0);
  }, [getBeatsPerBar]);

  const getTempoAtBeat = useCallback((sections: Section[], globalBeat: number): { tempo: number; sectionIndex: number; sectionId?: string } => {
    let beatCount = 0;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const beatsPerBar = getBeatsPerBar(section.timeSignature);
      const sectionBeats = section.bars * beatsPerBar;

      if (globalBeat < beatCount + sectionBeats) {
        // Within this section
        const beatInSection = globalBeat - beatCount;
        const progress = beatInSection / sectionBeats;

        let tempo = section.tempoStart;
        if (section.tempoEnd && section.tempoEnd !== section.tempoStart) {
          if (section.tempoCurve === 'step') {
            tempo = section.tempoStart; // Step happens at end
          } else if (section.tempoCurve === 'exponential') {
            tempo = section.tempoStart * Math.pow(section.tempoEnd / section.tempoStart, progress);
          } else {
            // Linear (default)
            tempo = section.tempoStart + (section.tempoEnd - section.tempoStart) * progress;
          }
        }

        return { tempo: Math.round(tempo), sectionIndex: i, sectionId: section.id };
      }

      beatCount += sectionBeats;
    }

    // Past end, return last section tempo
    const lastSection = sections[sections.length - 1];
    return {
      tempo: lastSection?.tempoEnd || lastSection?.tempoStart || 120,
      sectionIndex: sections.length - 1,
      sectionId: lastSection?.id
    };
  }, [getBeatsPerBar]);

  const getBarAndBeatAtGlobalBeat = useCallback((sections: Section[], globalBeat: number): { bar: number; beat: number } => {
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

    return { bar: barCount, beat: 1 };
  }, [getBeatsPerBar]);

  const play = useCallback((options?: { tempoOverride?: number; countoffBars?: number; loopSection?: number | null }) => {
    if (state.editedSections.length === 0) {
      showNotification({ type: 'warning', title: 'No Sections', message: 'Add sections to play' });
      return;
    }

    // Stop existing playback
    if (playbackIntervalRef.current) {
      clearTimeout(playbackIntervalRef.current);
    }

    const tempoOverride = options?.tempoOverride;
    const countoffBars = options?.countoffBars || 0;
    const loopSectionIndex = options?.loopSection ?? null;

    // Calculate loop boundaries if looping a section
    let loopStartBeat = 0;
    let loopEndBeat = calculateTotalBeats(state.editedSections);

    if (loopSectionIndex !== null && loopSectionIndex >= 0 && loopSectionIndex < state.editedSections.length) {
      // Calculate start beat of loop section
      for (let i = 0; i < loopSectionIndex; i++) {
        const section = state.editedSections[i];
        const beatsPerBar = getBeatsPerBar(section.timeSignature);
        loopStartBeat += section.bars * beatsPerBar;
      }
      // Calculate end beat of loop section
      const loopSection = state.editedSections[loopSectionIndex];
      const loopBeatsPerBar = getBeatsPerBar(loopSection.timeSignature);
      loopEndBeat = loopStartBeat + loopSection.bars * loopBeatsPerBar;
    }

    const beatsPerBar = getBeatsPerBar(state.editedSections[0]?.timeSignature || '4/4');
    const countoffBeats = countoffBars * beatsPerBar;

    // If looping, start at loop start; otherwise use current position or beginning
    let globalBeat = state.playback.isPaused
      ? calculateGlobalBeat(state.editedSections, state.playback.currentBar, state.playback.currentBeat)
      : (loopSectionIndex !== null ? loopStartBeat : 0);

    let countoffRemaining = state.playback.isPaused ? 0 : countoffBeats;

    playbackStartTimeRef.current = Date.now();

    dispatch({
      type: 'UPDATE_PLAYBACK',
      payload: {
        isPlaying: true,
        isPaused: false,
        countingOff: countoffRemaining > 0,
        countoffBeatsRemaining: countoffRemaining
      }
    });

    // Tick function
    const tick = () => {
      const { tempo, sectionIndex, sectionId } = getTempoAtBeat(state.editedSections, globalBeat);
      const currentTempo = tempoOverride || tempo;
      const msPerBeat = 60000 / currentTempo;

      if (countoffRemaining > 0) {
        countoffRemaining--;
        dispatch({
          type: 'UPDATE_PLAYBACK',
          payload: {
            countingOff: countoffRemaining > 0,
            countoffBeatsRemaining: countoffRemaining,
            currentTempo
          }
        });
      } else {
        const { bar, beat } = getBarAndBeatAtGlobalBeat(state.editedSections, globalBeat);
        dispatch({
          type: 'UPDATE_PLAYBACK',
          payload: {
            currentBar: bar,
            currentBeat: beat,
            currentTempo,
            currentSectionId: sectionId,
            currentSectionIndex: sectionIndex,
            elapsedMs: Date.now() - playbackStartTimeRef.current
          }
        });

        globalBeat++;

        // Check if we've reached the end of loop or song
        if (loopSectionIndex !== null && globalBeat >= loopEndBeat) {
          // Loop back to start of section
          globalBeat = loopStartBeat;
        } else if (globalBeat >= calculateTotalBeats(state.editedSections)) {
          stop();
          return;
        }
      }

      // Schedule next tick
      playbackIntervalRef.current = setTimeout(tick, msPerBeat);
    };

    // Start immediately
    tick();
  }, [state.editedSections, state.playback, getBeatsPerBar, getTempoAtBeat, getBarAndBeatAtGlobalBeat, calculateTotalBeats, showNotification]);

  const pause = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearTimeout(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    dispatch({
      type: 'UPDATE_PLAYBACK',
      payload: { isPlaying: false, isPaused: true }
    });
  }, []);

  const stop = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearTimeout(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    dispatch({ type: 'RESET_PLAYBACK' });
  }, []);

  const seekToBar = useCallback((bar: number) => {
    const wasPlaying = state.playback.isPlaying;
    if (wasPlaying) pause();

    // Find section and beat at this bar
    let currentBar = 1;
    for (let i = 0; i < state.editedSections.length; i++) {
      const section = state.editedSections[i];
      if (bar < currentBar + section.bars) {
        dispatch({
          type: 'UPDATE_PLAYBACK',
          payload: {
            currentBar: bar,
            currentBeat: 1,
            currentSectionIndex: i,
            currentSectionId: section.id,
            currentTempo: section.tempoStart
          }
        });
        break;
      }
      currentBar += section.bars;
    }

    if (wasPlaying) play();
  }, [state.playback.isPlaying, state.editedSections, pause, play]);

  // ==================== Practice ====================

  const startPracticeSession = useCallback(async (settings?: PracticeSettings): Promise<PracticeSession | null> => {
    if (!token || !state.currentSong) return null;

    try {
      const result = await apiCall(`/api/metmap/songs/${state.currentSong.id}/practice`, {
        method: 'POST',
        body: JSON.stringify({ settings: settings || {} })
      });

      dispatch({ type: 'SET_ACTIVE_PRACTICE_SESSION', payload: result.session });
      return result.session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start practice session';
      showNotification({ type: 'error', title: 'Error', message });
      return null;
    }
  }, [token, state.currentSong, apiCall, showNotification]);

  const endPracticeSession = useCallback(async (notes?: string) => {
    if (!token || !state.activePracticeSession) return;

    try {
      await apiCall(`/api/metmap/practice/${state.activePracticeSession.id}/end`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });

      dispatch({ type: 'SET_ACTIVE_PRACTICE_SESSION', payload: null });
      showNotification({ type: 'success', title: 'Practice Complete', message: 'Session recorded' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end practice session';
      showNotification({ type: 'error', title: 'Error', message });
    }
  }, [token, state.activePracticeSession, apiCall, showNotification]);

  const loadPracticeHistory = useCallback(async () => {
    if (!token || !state.currentSong) return;
    dispatch({ type: 'SET_PRACTICE_HISTORY_LOADING', payload: true });

    try {
      const data = await apiCall(`/api/metmap/songs/${state.currentSong.id}/practice-history`);
      dispatch({ type: 'SET_PRACTICE_HISTORY', payload: data.sessions });
    } catch (error) {
      dispatch({ type: 'SET_PRACTICE_HISTORY', payload: [] });
    }
  }, [token, state.currentSong, apiCall]);

  // ==================== Stats ====================

  const loadStats = useCallback(async () => {
    if (!token) return;

    try {
      const stats = await apiCall('/api/metmap/stats');
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch (error) {
      // Silently fail for stats
    }
  }, [token, apiCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearTimeout(playbackIntervalRef.current);
      }
    };
  }, []);

  // Load songs when filters change
  useEffect(() => {
    if (token) {
      const debounceTimer = setTimeout(() => {
        loadSongs();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [token, state.filters.search, state.filters.projectId, state.filters.orderBy, state.filters.orderDir]);

  const contextValue: MetMapContextValue = {
    ...state,
    loadSongs,
    loadMoreSongs,
    setFilters,
    createSong,
    loadSong,
    updateSong,
    deleteSong,
    closeSong,
    updateEditedSections,
    saveSections,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    updateSectionChords,
    saveChords,
    play,
    pause,
    stop,
    seekToBar,
    startPracticeSession,
    endPracticeSession,
    loadPracticeHistory,
    loadStats
  };

  return (
    <MetMapContext.Provider value={contextValue}>
      {children}
    </MetMapContext.Provider>
  );
}

// ==================== Hook ====================

export function useMetMap(): MetMapContextValue {
  const context = useContext(MetMapContext);
  if (context === undefined) {
    throw new Error('useMetMap must be used within a MetMapProvider');
  }
  return context;
}

// ==================== Helpers ====================

function calculateNextStartBar(sections: Section[]): number {
  if (sections.length === 0) return 1;
  const lastSection = sections[sections.length - 1];
  return lastSection.startBar + lastSection.bars;
}

function recalculateStartBars(sections: Section[]): Section[] {
  let startBar = 1;
  return sections.map((section, index) => {
    const updated = { ...section, orderIndex: index, startBar };
    startBar += section.bars;
    return updated;
  });
}

function calculateGlobalBeat(sections: Section[], bar: number, beat: number): number {
  let globalBeat = 0;
  let currentBar = 1;

  for (const section of sections) {
    const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;
    const sectionEndBar = currentBar + section.bars;

    if (bar < sectionEndBar) {
      // Target bar is in this section
      const barsIntoSection = bar - currentBar;
      globalBeat += barsIntoSection * beatsPerBar + (beat - 1);
      break;
    }

    globalBeat += section.bars * beatsPerBar;
    currentBar = sectionEndBar;
  }

  return globalBeat;
}

export default MetMapContext;
