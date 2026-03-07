/**
 * useSharedMetronome - Shared metronome click hook
 *
 * Extracted from the MetronomeAudio Web Audio API pattern.
 * Provides a callable `playClick` function for use by any
 * playback system (formation playback, rehearsal mode, etc.).
 */

import { useRef, useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ClickSound = 'classic' | 'wood' | 'digital' | 'soft' | 'cowbell' | 'hi-hat';

export interface SharedMetronomeOptions {
  enabled?: boolean;
  sound?: ClickSound;
  volume?: number; // 0-1, default 0.7
}

export interface SharedMetronomeReturn {
  playClick: (isAccent: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

// ============================================================================
// SOUND CONFIGURATIONS
// (Mirrors SOUND_CONFIGS from MetronomeAudio.tsx)
// ============================================================================

const SOUND_CONFIGS: Record<
  ClickSound,
  { freq: number; freqAccent: number; type: OscillatorType; decay: number }
> = {
  classic:  { freq: 800,  freqAccent: 1200, type: 'sine',     decay: 0.05 },
  wood:     { freq: 600,  freqAccent: 900,  type: 'triangle', decay: 0.03 },
  digital:  { freq: 1000, freqAccent: 1500, type: 'square',   decay: 0.02 },
  soft:     { freq: 500,  freqAccent: 700,  type: 'sine',     decay: 0.1  },
  cowbell:  { freq: 560,  freqAccent: 800,  type: 'triangle', decay: 0.15 },
  'hi-hat': { freq: 300,  freqAccent: 400,  type: 'sawtooth', decay: 0.03 },
};

// Minimum interval between clicks in seconds (50ms debounce)
const MIN_CLICK_INTERVAL = 0.05;

// ============================================================================
// HOOK
// ============================================================================

export function useSharedMetronome(
  options?: SharedMetronomeOptions,
): SharedMetronomeReturn {
  const {
    enabled: initialEnabled = true,
    sound = 'classic',
    volume: initialVolume = 0.7,
  } = options ?? {};

  // State
  const [enabled, setEnabledState] = useState(initialEnabled);
  const [volume, setVolumeState] = useState(initialVolume);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // ---------------------------------------------------------------------------
  // Lazy AudioContext initialization
  // ---------------------------------------------------------------------------
  const getAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    audioContextRef.current = new AudioContextClass();
    return audioContextRef.current;
  }, []);

  // ---------------------------------------------------------------------------
  // playClick
  // ---------------------------------------------------------------------------
  const playClick = useCallback(
    (isAccent: boolean) => {
      if (!enabledRef.current) return;

      const ctx = getAudioContext();
      if (!ctx) return;

      // Resume context if suspended (browsers require user gesture)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Debounce: prevent clicks < 50ms apart
      const now = ctx.currentTime;
      if (now - lastClickTimeRef.current < MIN_CLICK_INTERVAL) return;
      lastClickTimeRef.current = now;

      const config = SOUND_CONFIGS[soundRef.current];
      const freq = isAccent ? config.freqAccent : config.freq;
      const gainValue = volumeRef.current * (isAccent ? 1 : 0.7);

      // Create oscillator
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(freq, now);

      // Slight pitch decay for more natural sound
      oscillator.frequency.exponentialRampToValueAtTime(
        freq * 0.5,
        now + config.decay,
      );

      // Gain envelope
      gainNode.gain.setValueAtTime(gainValue, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.decay);

      // Connect and play
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + config.decay + 0.01);
    },
    [getAudioContext],
  );

  // ---------------------------------------------------------------------------
  // Setters
  // ---------------------------------------------------------------------------
  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);
  }, []);

  // ---------------------------------------------------------------------------
  // Cleanup AudioContext on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Sync ref when state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  return {
    playClick,
    setEnabled,
    setVolume,
  };
}
