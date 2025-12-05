'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Hand,
  Timer,
} from 'lucide-react';
import { useMetronome } from '@/hooks/useMetronome';
import { Song, formatTimeSignature, DEFAULT_TIME_SIGNATURE } from '@/types/metmap';
import { clsx } from 'clsx';

interface MetronomeControlsProps {
  song: Song | null;
  /** When looping a section, pass start/end times */
  loopStart?: number | null;
  loopEnd?: number | null;
  /** Count-in bars (0 = none) */
  countInBars?: number;
  /** Called when tap tempo detects a new BPM */
  onTapBpm?: (bpm: number) => void;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function MetronomeControls({
  song,
  loopStart = null,
  loopEnd = null,
  countInBars = 0,
  onTapBpm,
  compact = false,
}: MetronomeControlsProps) {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [tapBpm, setTapBpm] = useState<number | null>(null);
  const [beatFlash, setBeatFlash] = useState(false);

  // Calculate count-in beats based on time signature
  const countInBeats = countInBars > 0
    ? countInBars * (song?.defaultTimeSignature?.beats || 4)
    : 0;

  const handleBeat = useCallback(() => {
    // Flash effect on beat
    setBeatFlash(true);
    setTimeout(() => setBeatFlash(false), 100);
  }, []);

  const {
    state,
    isPlaying,
    stop,
    toggle,
    setLoop,
    setVolume: setMetronomeVolume,
    tap,
  } = useMetronome({
    song,
    countInBeats,
    volume: isMuted ? 0 : volume,
    onBeat: handleBeat,
  });

  // Update loop when props change
  useEffect(() => {
    setLoop(loopStart, loopEnd);
  }, [loopStart, loopEnd, setLoop]);

  // Update volume
  useEffect(() => {
    setMetronomeVolume(isMuted ? 0 : volume);
  }, [volume, isMuted, setMetronomeVolume]);

  const handleTap = () => {
    const bpm = tap();
    if (bpm) {
      setTapBpm(bpm);
      onTapBpm?.(bpm);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const currentBpm = Math.round(state.currentBpm);
  const currentTs = state.currentTimeSignature || DEFAULT_TIME_SIGNATURE;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={toggle}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            isPlaying
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-metmap-500 hover:bg-metmap-600',
            beatFlash && isPlaying && 'scale-110'
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* BPM Display */}
        <div className="text-center min-w-[60px]">
          <div className="text-lg font-bold text-white">{currentBpm}</div>
          <div className="text-xs text-gray-400">BPM</div>
        </div>

        {/* Beat indicator */}
        <div className="flex items-center gap-1">
          {Array.from({ length: currentTs.beats }, (_, i) => (
            <div
              key={i}
              className={clsx(
                'w-2 h-2 rounded-full transition-all',
                state.currentBeat === i + 1 && isPlaying
                  ? i === 0
                    ? 'bg-metmap-400 scale-125'
                    : 'bg-white scale-110'
                  : 'bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Tap tempo */}
        <button
          onClick={handleTap}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          title="Tap tempo"
        >
          <Hand className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-xl">
      {/* Top row: BPM and Time Signature */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <div
            className={clsx(
              'text-4xl font-bold text-white transition-transform',
              beatFlash && isPlaying && 'scale-105'
            )}
          >
            {currentBpm}
          </div>
          <div className="text-sm text-gray-400">BPM</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Beat visualization */}
          <div className="flex items-center gap-2">
            {Array.from({ length: currentTs.beats }, (_, i) => (
              <div
                key={i}
                className={clsx(
                  'w-4 h-4 rounded-full transition-all duration-75',
                  state.currentBeat === i + 1 && isPlaying
                    ? i === 0
                      ? 'bg-metmap-400 scale-125 shadow-lg shadow-metmap-400/50'
                      : 'bg-white scale-110'
                    : 'bg-gray-600'
                )}
              />
            ))}
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {formatTimeSignature(currentTs)}
            </div>
            <div className="text-sm text-gray-400">Time</div>
          </div>
        </div>

        {/* Measure counter */}
        {isPlaying && state.currentMeasure > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-300">
              {state.currentMeasure}
            </div>
            <div className="text-sm text-gray-400">Measure</div>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Count-in indicator */}
        {countInBars > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 rounded-lg">
            <Timer className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">{countInBars} bar count-in</span>
          </div>
        )}

        {/* Tap tempo button */}
        <button
          onClick={handleTap}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Hand className="w-5 h-5 text-gray-300" />
          <span className="text-sm text-gray-300">
            {tapBpm ? `${tapBpm} BPM` : 'Tap'}
          </span>
        </button>

        {/* Play/Pause button */}
        <button
          onClick={toggle}
          className={clsx(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all tap-target',
            isPlaying
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-metmap-500 hover:bg-metmap-600',
            beatFlash && isPlaying && 'scale-105'
          )}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>

        {/* Stop button */}
        {isPlaying && (
          <button
            onClick={stop}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg"
          >
            Stop
          </button>
        )}
      </div>

      {/* Volume control */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMute}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-metmap-500"
        />
        <span className="text-sm text-gray-400 w-12 text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Minimal metronome toggle for inline use
 */
export function MetronomeToggle({
  song,
  className,
}: {
  song: Song | null;
  className?: string;
}) {
  const [beatFlash, setBeatFlash] = useState(false);

  const handleBeat = useCallback(() => {
    setBeatFlash(true);
    setTimeout(() => setBeatFlash(false), 100);
  }, []);

  const { isPlaying, toggle, state } = useMetronome({
    song,
    onBeat: handleBeat,
  });

  return (
    <button
      onClick={toggle}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
        isPlaying
          ? 'bg-metmap-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
        beatFlash && isPlaying && 'scale-105',
        className
      )}
    >
      {isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {Math.round(state.currentBpm)} BPM
      </span>
    </button>
  );
}
