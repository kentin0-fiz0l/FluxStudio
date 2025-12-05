'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MetronomeEngine,
  MetronomeState,
  TapTempo,
} from '@/lib/metronome';
import { Song, DEFAULT_TIME_SIGNATURE, DEFAULT_BPM } from '@/types/metmap';

/** Storage key for metronome state persistence */
const STORAGE_KEY = 'metmap-metronome-state';

export interface UseMetronomeOptions {
  /** The song to use for tempo map */
  song?: Song | null;
  /** Count-in beats before starting (0 = none, 4 = one measure of 4/4) */
  countInBeats?: number;
  /** Volume (0-1) */
  volume?: number;
  /** Visual-only mode (no audio clicks) */
  visualOnly?: boolean;
  /** Callback on each beat */
  onBeat?: (beat: number, measure: number, isDownbeat: boolean) => void;
  /** Enable state persistence */
  persistState?: boolean;
}

export interface UseMetronomeReturn {
  /** Current metronome state */
  state: MetronomeState;
  /** Whether the metronome is currently playing */
  isPlaying: boolean;
  /** Whether audio is available */
  isAudioAvailable: boolean;
  /** Start the metronome */
  start: (fromTime?: number) => Promise<void>;
  /** Stop the metronome */
  stop: () => void;
  /** Toggle play/pause */
  toggle: () => Promise<void>;
  /** Seek to a specific time */
  seek: (time: number) => void;
  /** Set loop boundaries */
  setLoop: (start: number | null, end: number | null) => void;
  /** Set volume */
  setVolume: (volume: number) => void;
  /** Set visual-only mode */
  setVisualOnly: (visualOnly: boolean) => void;
  /** Tap for tap tempo - returns calculated BPM or null */
  tap: () => number | null;
  /** Reset tap tempo */
  resetTap: () => void;
}

const initialState: MetronomeState = {
  isPlaying: false,
  currentBpm: DEFAULT_BPM,
  currentTimeSignature: DEFAULT_TIME_SIGNATURE,
  currentBeat: 1,
  currentMeasure: 1,
  currentTime: 0,
};

interface PersistedState {
  songId?: string;
  position: number;
  loopStart: number | null;
  loopEnd: number | null;
  volume: number;
  visualOnly: boolean;
}

/**
 * Load persisted state from localStorage
 */
function loadPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Save state to localStorage
 */
function savePersistedState(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for using the metronome in React components
 */
export function useMetronome(options: UseMetronomeOptions = {}): UseMetronomeReturn {
  const {
    song,
    countInBeats = 0,
    volume = 0.7,
    visualOnly = false,
    onBeat,
    persistState = false,
  } = options;

  const [state, setState] = useState<MetronomeState>(initialState);
  const [isAudioAvailable, setIsAudioAvailable] = useState(true);
  const metronomeRef = useRef<MetronomeEngine | null>(null);
  const tapTempoRef = useRef<TapTempo>(new TapTempo());
  const onBeatRef = useRef(onBeat);
  const loopRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });

  // Keep onBeat callback reference updated
  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  // Initialize metronome
  useEffect(() => {
    const metronome = new MetronomeEngine({
      volume,
      visualOnly,
      onStateChange: (newState) => {
        setState(newState);
        // Persist position on state changes (but not playing state)
        if (persistState && song) {
          savePersistedState({
            songId: song.id,
            position: newState.currentTime,
            loopStart: loopRef.current.start,
            loopEnd: loopRef.current.end,
            volume,
            visualOnly,
          });
        }
      },
      onBeat: (beat, measure, isDownbeat) => {
        onBeatRef.current?.(beat, measure, isDownbeat);
      },
    });

    metronomeRef.current = metronome;

    // Check audio availability after a brief delay
    metronome.init().then((available) => {
      setIsAudioAvailable(available);
    });

    // Restore persisted state if enabled
    if (persistState && song) {
      const persisted = loadPersistedState();
      if (persisted && persisted.songId === song.id) {
        // Restore position (but don't auto-play)
        metronome.seek(persisted.position);
        if (persisted.loopStart !== null && persisted.loopEnd !== null) {
          metronome.setLoop(persisted.loopStart, persisted.loopEnd);
          loopRef.current = { start: persisted.loopStart, end: persisted.loopEnd };
        }
        if (persisted.visualOnly !== undefined) {
          metronome.setVisualOnly(persisted.visualOnly);
        }
      }
    }

    return () => {
      metronome.destroy();
      metronomeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependencies are handled by separate useEffects
  }, []); // Only run once on mount

  // Update song when it changes
  useEffect(() => {
    if (metronomeRef.current && song) {
      metronomeRef.current.setSong(song);
    }
  }, [song]);

  // Update count-in when it changes
  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setCountIn(countInBeats);
    }
  }, [countInBeats]);

  // Update volume when it changes
  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setVolume(volume);
    }
  }, [volume]);

  // Update visual-only mode when it changes
  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setVisualOnly(visualOnly);
    }
  }, [visualOnly]);

  const start = useCallback(async (fromTime = 0) => {
    await metronomeRef.current?.start(fromTime);
  }, []);

  const stop = useCallback(() => {
    metronomeRef.current?.stop();
  }, []);

  const toggle = useCallback(async () => {
    await metronomeRef.current?.toggle();
  }, []);

  const seek = useCallback((time: number) => {
    metronomeRef.current?.seek(time);
  }, []);

  const setLoop = useCallback((loopStart: number | null, loopEnd: number | null) => {
    metronomeRef.current?.setLoop(loopStart, loopEnd);
    loopRef.current = { start: loopStart, end: loopEnd };
  }, []);

  const setVolumeCallback = useCallback((vol: number) => {
    metronomeRef.current?.setVolume(vol);
  }, []);

  const setVisualOnlyCallback = useCallback((vo: boolean) => {
    metronomeRef.current?.setVisualOnly(vo);
  }, []);

  const tap = useCallback(() => {
    return tapTempoRef.current.tap();
  }, []);

  const resetTap = useCallback(() => {
    tapTempoRef.current.reset();
  }, []);

  return {
    state,
    isPlaying: state.isPlaying,
    isAudioAvailable,
    start,
    stop,
    toggle,
    seek,
    setLoop,
    setVolume: setVolumeCallback,
    setVisualOnly: setVisualOnlyCallback,
    tap,
    resetTap,
  };
}
