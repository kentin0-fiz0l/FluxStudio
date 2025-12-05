'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MetronomeEngine,
  MetronomeState,
  TapTempo,
} from '@/lib/metronome';
import { Song, DEFAULT_TIME_SIGNATURE, DEFAULT_BPM } from '@/types/metmap';

export interface UseMetronomeOptions {
  /** The song to use for tempo map */
  song?: Song | null;
  /** Count-in beats before starting (0 = none, 4 = one measure of 4/4) */
  countInBeats?: number;
  /** Volume (0-1) */
  volume?: number;
  /** Callback on each beat */
  onBeat?: (beat: number, measure: number, isDownbeat: boolean) => void;
}

export interface UseMetronomeReturn {
  /** Current metronome state */
  state: MetronomeState;
  /** Whether the metronome is currently playing */
  isPlaying: boolean;
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

/**
 * Hook for using the metronome in React components
 */
export function useMetronome(options: UseMetronomeOptions = {}): UseMetronomeReturn {
  const { song, countInBeats = 0, volume = 0.7, onBeat } = options;

  const [state, setState] = useState<MetronomeState>(initialState);
  const metronomeRef = useRef<MetronomeEngine | null>(null);
  const tapTempoRef = useRef<TapTempo>(new TapTempo());
  const onBeatRef = useRef(onBeat);

  // Keep onBeat callback reference updated
  useEffect(() => {
    onBeatRef.current = onBeat;
  }, [onBeat]);

  // Initialize metronome
  useEffect(() => {
    const metronome = new MetronomeEngine({
      volume,
      onStateChange: setState,
      onBeat: (beat, measure, isDownbeat) => {
        onBeatRef.current?.(beat, measure, isDownbeat);
      },
    });

    metronomeRef.current = metronome;

    return () => {
      metronome.destroy();
      metronomeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- volume is handled by separate useEffect
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
  }, []);

  const setVolumeCallback = useCallback((vol: number) => {
    metronomeRef.current?.setVolume(vol);
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
    start,
    stop,
    toggle,
    seek,
    setLoop,
    setVolume: setVolumeCallback,
    tap,
    resetTap,
  };
}
