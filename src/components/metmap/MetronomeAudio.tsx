/* eslint-disable react-refresh/only-export-components */
/**
 * MetronomeAudio Component
 *
 * Audio engine for metronome clicks with different sound options.
 * Uses Web Audio API for precise timing.
 */

import { useEffect, useRef, useCallback } from 'react';

export type ClickSound = 'classic' | 'wood' | 'digital' | 'soft' | 'cowbell' | 'hi-hat';

// Sound configurations
const SOUND_CONFIGS: Record<ClickSound, { name: string; freq: number; freqAccent: number; type: OscillatorType; decay: number }> = {
  classic: { name: 'Classic', freq: 800, freqAccent: 1200, type: 'sine', decay: 0.05 },
  wood: { name: 'Wood Block', freq: 600, freqAccent: 900, type: 'triangle', decay: 0.03 },
  digital: { name: 'Digital', freq: 1000, freqAccent: 1500, type: 'square', decay: 0.02 },
  soft: { name: 'Soft', freq: 500, freqAccent: 700, type: 'sine', decay: 0.1 },
  cowbell: { name: 'Cowbell', freq: 560, freqAccent: 800, type: 'triangle', decay: 0.15 },
  'hi-hat': { name: 'Hi-Hat', freq: 300, freqAccent: 400, type: 'sawtooth', decay: 0.03 },
};

// Sound selector component
interface SoundSelectorProps {
  value: ClickSound;
  onChange: (sound: ClickSound) => void;
  className?: string;
}

export function SoundSelector({ value, onChange, className = '' }: SoundSelectorProps) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1">Click Sound</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ClickSound)}
        className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
      >
        {Object.entries(SOUND_CONFIGS).map(([key, config]) => (
          <option key={key} value={key}>
            {config.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Volume control component
interface VolumeControlProps {
  value: number;
  onChange: (volume: number) => void;
  className?: string;
}

export function VolumeControl({ value, onChange, className = '' }: VolumeControlProps) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1">Volume</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
        <span className="text-xs text-gray-400 w-8">{value}%</span>
      </div>
    </div>
  );
}

// Main audio engine hook
export function useMetronomeAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = AudioContextClass ? new AudioContextClass() : null;
    }
    return audioContextRef.current;
  }, []);

  // Play a click sound
  const playClick = useCallback((
    isAccent: boolean,
    sound: ClickSound,
    volume: number
  ) => {
    const ctx = initAudio();
    if (!ctx) return;

    // Prevent clicks that are too close together
    const now = ctx.currentTime;
    if (now - lastTickTimeRef.current < 0.05) return;
    lastTickTimeRef.current = now;

    const config = SOUND_CONFIGS[sound];
    const freq = isAccent ? config.freqAccent : config.freq;
    const gainValue = (volume / 100) * (isAccent ? 1 : 0.7);

    // Create oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(freq, now);

    // Add slight pitch decay for more natural sound
    oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, now + config.decay);

    // Envelope
    gainNode.gain.setValueAtTime(gainValue, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.decay);

    // Connect and play
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + config.decay + 0.01);
  }, [initAudio]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playClick, initAudio };
}

// Combined controls component
interface MetronomeControlsProps {
  sound: ClickSound;
  onSoundChange: (sound: ClickSound) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  accentFirstBeat: boolean;
  onAccentChange: (accent: boolean) => void;
  className?: string;
}

export function MetronomeControls({
  sound,
  onSoundChange,
  volume,
  onVolumeChange,
  accentFirstBeat,
  onAccentChange,
  className = ''
}: MetronomeControlsProps) {
  const { playClick } = useMetronomeAudio();

  // Preview sound
  const handlePreview = () => {
    playClick(true, sound, volume);
    setTimeout(() => playClick(false, sound, volume), 300);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        <SoundSelector value={sound} onChange={onSoundChange} />
        <VolumeControl value={volume} onChange={onVolumeChange} />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={accentFirstBeat}
            onChange={(e) => onAccentChange(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800 text-indigo-600"
          />
          Accent first beat
        </label>
        <button
          onClick={handlePreview}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
        >
          Preview
        </button>
      </div>
    </div>
  );
}

export default MetronomeControls;
