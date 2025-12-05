'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getMetronome,
  MetronomeConfig,
  MetronomeState,
  SOUND_PRESETS,
} from '@/lib/metronome';
import { getDefaultAccentPattern } from '@/lib/accentPatterns';

export type SoundPreset = keyof typeof SOUND_PRESETS;

export interface UseMetronomeOptions {
  initialTempo?: number;
  initialTimeSignature?: string;
  soundPreset?: SoundPreset;
  autoSave?: boolean;
}

export interface UseMetronomeReturn {
  // State
  isPlaying: boolean;
  tempo: number;
  timeSignature: string;
  beatsPerMeasure: number;
  beatUnit: number;
  currentBeat: number;
  currentSubdivision: number;
  soundPreset: SoundPreset;
  subdivisions: number;
  accentPattern: number[];

  // Visual sync
  beatPulse: boolean;
  isDownbeat: boolean;

  // Actions
  start: () => boolean;
  stop: () => void;
  toggle: () => boolean;
  setTempo: (bpm: number) => void;
  setTimeSignature: (signature: string) => void;
  setSoundPreset: (preset: SoundPreset) => void;
  setSubdivisions: (subdivisions: number) => void;
  setAccentPattern: (pattern: number[]) => void;
  tap: () => number | null;

  // Config
  config: MetronomeConfig;
}

const STORAGE_KEY = 'metmap-metronome-prefs';

interface StoredPrefs {
  tempo: number;
  timeSignature: string;
  soundPreset: SoundPreset;
  subdivisions: number;
}

function loadPrefs(): Partial<StoredPrefs> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: StoredPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function useMetronome(options: UseMetronomeOptions = {}): UseMetronomeReturn {
  const {
    initialTempo = 120,
    initialTimeSignature = '4/4',
    soundPreset: initialSoundPreset = 'classic',
    autoSave = true,
  } = options;

  // Load saved preferences
  const savedPrefs = useRef(loadPrefs());

  // Parse time signature
  const parseTimeSignature = (sig: string): { beats: number; unit: number } => {
    const [beats, unit] = sig.split('/').map(Number);
    return { beats: beats || 4, unit: unit || 4 };
  };

  const initSig = parseTimeSignature(savedPrefs.current.timeSignature || initialTimeSignature);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempoState] = useState(savedPrefs.current.tempo || initialTempo);
  const [timeSignature, setTimeSignatureState] = useState(
    savedPrefs.current.timeSignature || initialTimeSignature
  );
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(initSig.beats);
  const [beatUnit, setBeatUnit] = useState(initSig.unit);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubdivision, setCurrentSubdivision] = useState(0);
  const [soundPreset, setSoundPresetState] = useState<SoundPreset>(
    savedPrefs.current.soundPreset || initialSoundPreset
  );
  const [subdivisions, setSubdivisionsState] = useState(savedPrefs.current.subdivisions || 1);
  const [accentPattern, setAccentPatternState] = useState<number[]>(
    getDefaultAccentPattern(savedPrefs.current.timeSignature || initialTimeSignature)
  );

  // Visual sync state
  const [beatPulse, setBeatPulse] = useState(false);
  const [isDownbeat, setIsDownbeat] = useState(false);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get metronome instance
  const metronome = useRef(getMetronome());

  // Initialize metronome config
  useEffect(() => {
    const m = metronome.current;
    const sounds = SOUND_PRESETS[soundPreset];

    m.setConfig({
      tempo,
      beatsPerMeasure,
      beatUnit,
      accentPattern,
      subdivisions,
      clickSound: sounds.click,
      accentSound: sounds.accent,
    });

    // Set up beat callback for visual sync
    m.onBeat((state: MetronomeState) => {
      setIsPlaying(state.isPlaying);
      setCurrentBeat(state.currentBeat);
      setCurrentSubdivision(state.currentSubdivision);

      if (state.isPlaying && state.visualBeatTime !== null) {
        // Trigger visual pulse
        setIsDownbeat(state.currentBeat === 0 && state.currentSubdivision === 0);
        setBeatPulse(true);

        // Clear previous timeout
        if (pulseTimeoutRef.current) {
          clearTimeout(pulseTimeoutRef.current);
        }

        // Reset pulse after short duration
        pulseTimeoutRef.current = setTimeout(() => {
          setBeatPulse(false);
        }, 100);
      }
    });

    return () => {
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, [tempo, beatsPerMeasure, beatUnit, accentPattern, subdivisions, soundPreset]);

  // Save preferences when they change
  useEffect(() => {
    if (autoSave) {
      savePrefs({
        tempo,
        timeSignature,
        soundPreset,
        subdivisions,
      });
    }
  }, [tempo, timeSignature, soundPreset, subdivisions, autoSave]);

  // Actions
  const start = useCallback(() => {
    return metronome.current.start();
  }, []);

  const stop = useCallback(() => {
    metronome.current.stop();
    setBeatPulse(false);
    setIsDownbeat(false);
  }, []);

  const toggle = useCallback(() => {
    const playing = metronome.current.toggle();
    if (!playing) {
      setBeatPulse(false);
      setIsDownbeat(false);
    }
    return playing;
  }, []);

  const setTempo = useCallback((bpm: number) => {
    const clamped = Math.min(400, Math.max(20, bpm));
    setTempoState(clamped);
    metronome.current.setTempo(clamped);
  }, []);

  const setTimeSignature = useCallback((signature: string) => {
    const { beats, unit } = parseTimeSignature(signature);
    const pattern = getDefaultAccentPattern(signature);

    setTimeSignatureState(signature);
    setBeatsPerMeasure(beats);
    setBeatUnit(unit);
    setAccentPatternState(pattern);

    metronome.current.setConfig({
      beatsPerMeasure: beats,
      beatUnit: unit,
      accentPattern: pattern,
    });
  }, []);

  const setSoundPreset = useCallback((preset: SoundPreset) => {
    setSoundPresetState(preset);
    metronome.current.setSound(preset);
  }, []);

  const setSubdivisions = useCallback((subs: number) => {
    const clamped = Math.min(4, Math.max(1, subs));
    setSubdivisionsState(clamped);
    metronome.current.setSubdivisions(clamped);
  }, []);

  const setAccentPattern = useCallback((pattern: number[]) => {
    setAccentPatternState(pattern);
    metronome.current.setAccentPattern(pattern);
  }, []);

  const tap = useCallback(() => {
    const bpm = metronome.current.tap();
    if (bpm !== null) {
      setTempoState(bpm);
    }
    return bpm;
  }, []);

  return {
    // State
    isPlaying,
    tempo,
    timeSignature,
    beatsPerMeasure,
    beatUnit,
    currentBeat,
    currentSubdivision,
    soundPreset,
    subdivisions,
    accentPattern,

    // Visual sync
    beatPulse,
    isDownbeat,

    // Actions
    start,
    stop,
    toggle,
    setTempo,
    setTimeSignature,
    setSoundPreset,
    setSubdivisions,
    setAccentPattern,
    tap,

    // Config
    config: metronome.current.getConfig(),
  };
}
