'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Hand,
  Timer,
  Eye,
  Square,
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
  /** Enable state persistence across page reloads */
  persistState?: boolean;
}

export function MetronomeControls({
  song,
  loopStart = null,
  loopEnd = null,
  countInBars = 0,
  onTapBpm,
  compact = false,
  persistState = false,
}: MetronomeControlsProps) {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [visualOnly, setVisualOnly] = useState(false);
  const [tapBpm, setTapBpm] = useState<number | null>(null);
  const [beatFlash, setBeatFlash] = useState(false);
  const [isDownbeat, setIsDownbeat] = useState(false);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate count-in beats based on time signature
  const countInBeats = countInBars > 0
    ? countInBars * (song?.defaultTimeSignature?.beats || 4)
    : 0;

  const handleBeat = useCallback((_beat: number, _measure: number, downbeat: boolean) => {
    // Clear any existing timeout
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    // Flash effect on beat - stronger for downbeat
    setBeatFlash(true);
    setIsDownbeat(downbeat);

    // Longer flash for downbeat
    flashTimeoutRef.current = setTimeout(() => {
      setBeatFlash(false);
      setIsDownbeat(false);
    }, downbeat ? 150 : 80);
  }, []);

  const {
    state,
    isPlaying,
    isAudioAvailable,
    stop,
    toggle,
    setLoop,
    setVolume: setMetronomeVolume,
    setVisualOnly: setMetronomeVisualOnly,
    tap,
  } = useMetronome({
    song,
    countInBeats,
    volume: isMuted ? 0 : volume,
    visualOnly,
    onBeat: handleBeat,
    persistState,
  });

  // Update loop when props change
  useEffect(() => {
    setLoop(loopStart, loopEnd);
  }, [loopStart, loopEnd, setLoop]);

  // Update volume
  useEffect(() => {
    setMetronomeVolume(isMuted ? 0 : volume);
  }, [volume, isMuted, setMetronomeVolume]);

  // Update visual-only mode
  useEffect(() => {
    setMetronomeVisualOnly(visualOnly);
  }, [visualOnly, setMetronomeVisualOnly]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

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

  const toggleVisualOnly = () => {
    setVisualOnly(!visualOnly);
  };

  const currentBpm = Math.round(state.currentBpm);
  const currentTs = state.currentTimeSignature || DEFAULT_TIME_SIGNATURE;
  const effectiveVolume = isMuted || visualOnly ? 0 : volume;

  // Compact mode for inline/toolbar use
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Play/Pause - larger touch target */}
        <button
          onClick={toggle}
          className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95',
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
              : 'bg-metmap-500 hover:bg-metmap-600 active:bg-metmap-700',
            beatFlash && isPlaying && (isDownbeat ? 'scale-115 ring-4 ring-metmap-400/50' : 'scale-110')
          )}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>

        {/* BPM Display */}
        <div className="text-center min-w-[60px]">
          <div
            className={clsx(
              'text-xl font-bold text-white transition-all',
              beatFlash && isPlaying && isDownbeat && 'scale-110 text-metmap-300'
            )}
          >
            {currentBpm}
          </div>
          <div className="text-xs text-gray-400">BPM</div>
        </div>

        {/* Beat indicator - larger dots for mobile */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.min(currentTs.beats, 8) }, (_, i) => (
            <div
              key={i}
              className={clsx(
                'w-3 h-3 rounded-full transition-all duration-75',
                state.currentBeat === i + 1 && isPlaying
                  ? i === 0
                    ? 'bg-metmap-400 scale-150 shadow-lg shadow-metmap-400/60'
                    : 'bg-white scale-125'
                  : 'bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Visual-only indicator */}
        {visualOnly && (
          <span title="Visual-only mode">
            <Eye className="w-4 h-4 text-yellow-400" />
          </span>
        )}

        {/* Tap tempo - larger touch target */}
        <button
          onClick={handleTap}
          className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 active:bg-gray-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Tap tempo"
        >
          <Hand className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Full controls mode
  return (
    <div className="p-4 bg-gray-800 rounded-xl">
      {/* Audio unavailable warning */}
      {!isAudioAvailable && !visualOnly && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            Audio not available. Enable visual-only mode for silent practice.
          </p>
        </div>
      )}

      {/* Top row: BPM and Time Signature - simplified during playback */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <div
            className={clsx(
              'text-5xl font-bold text-white transition-all duration-75',
              beatFlash && isPlaying && isDownbeat && 'scale-110 text-metmap-300',
              beatFlash && isPlaying && !isDownbeat && 'scale-105'
            )}
          >
            {currentBpm}
          </div>
          <div className="text-sm text-gray-400">BPM</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Beat visualization - larger for mobile, with stronger downbeat */}
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(currentTs.beats, 12) }, (_, i) => (
              <div
                key={i}
                className={clsx(
                  'w-5 h-5 rounded-full transition-all duration-75',
                  state.currentBeat === i + 1 && isPlaying
                    ? i === 0
                      ? 'bg-metmap-400 scale-150 shadow-xl shadow-metmap-400/70 ring-2 ring-metmap-300/50'
                      : 'bg-white scale-125 shadow-md'
                    : 'bg-gray-600'
                )}
              />
            ))}
          </div>

          {/* Time signature - hide during playback for cleaner UI */}
          {!isPlaying && (
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {formatTimeSignature(currentTs)}
              </div>
              <div className="text-sm text-gray-400">Time</div>
            </div>
          )}
        </div>

        {/* Measure counter - show during playback */}
        {isPlaying && state.currentMeasure > 0 && (
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-300">
              {state.currentMeasure}
            </div>
            <div className="text-sm text-gray-400">Measure</div>
          </div>
        )}
      </div>

      {/* Control buttons - larger touch targets */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {/* Count-in indicator */}
        {countInBars > 0 && !isPlaying && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 rounded-lg">
            <Timer className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">{countInBars} bar count-in</span>
          </div>
        )}

        {/* Tap tempo button - larger touch target */}
        <button
          onClick={handleTap}
          className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg transition-colors min-h-[48px]"
        >
          <Hand className="w-5 h-5 text-gray-300" />
          <span className="text-sm text-gray-300 font-medium">
            {tapBpm ? `${tapBpm} BPM` : 'Tap'}
          </span>
        </button>

        {/* Play/Pause button - extra large for primary action */}
        <button
          onClick={toggle}
          className={clsx(
            'w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95',
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
              : 'bg-metmap-500 hover:bg-metmap-600 active:bg-metmap-700',
            beatFlash && isPlaying && isDownbeat && 'scale-110 ring-4 ring-metmap-400/50',
            beatFlash && isPlaying && !isDownbeat && 'scale-105'
          )}
        >
          {isPlaying ? (
            <Pause className="w-10 h-10 text-white" />
          ) : (
            <Play className="w-10 h-10 text-white ml-1" />
          )}
        </button>

        {/* Stop button - larger touch target */}
        {isPlaying && (
          <button
            onClick={stop}
            className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300 rounded-lg min-h-[48px]"
          >
            <Square className="w-5 h-5" />
            <span className="text-sm font-medium">Stop</span>
          </button>
        )}
      </div>

      {/* Bottom controls row */}
      <div className="flex items-center gap-4">
        {/* Visual-only mode toggle */}
        <button
          onClick={toggleVisualOnly}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors min-h-[44px]',
            visualOnly
              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          )}
          title={visualOnly ? 'Audio disabled (visual only)' : 'Enable visual-only mode'}
        >
          <Eye className="w-5 h-5" />
          <span className="text-sm">{visualOnly ? 'Visual Only' : 'Silent'}</span>
        </button>

        {/* Volume control */}
        <div className="flex-1 flex items-center gap-3">
          <button
            onClick={toggleMute}
            disabled={visualOnly}
            className={clsx(
              'p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center',
              visualOnly
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
          >
            {effectiveVolume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={effectiveVolume}
            onChange={handleVolumeChange}
            disabled={visualOnly}
            className={clsx(
              'flex-1 h-3 bg-gray-700 rounded-full appearance-none cursor-pointer accent-metmap-500',
              visualOnly && 'opacity-50 cursor-not-allowed'
            )}
          />
          <span className="text-sm text-gray-400 w-12 text-right tabular-nums">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>
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
  const [isDownbeat, setIsDownbeat] = useState(false);

  const handleBeat = useCallback((_beat: number, _measure: number, downbeat: boolean) => {
    setBeatFlash(true);
    setIsDownbeat(downbeat);
    setTimeout(() => {
      setBeatFlash(false);
      setIsDownbeat(false);
    }, downbeat ? 120 : 80);
  }, []);

  const { isPlaying, toggle, state } = useMetronome({
    song,
    onBeat: handleBeat,
  });

  return (
    <button
      onClick={toggle}
      className={clsx(
        'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all min-h-[44px]',
        isPlaying
          ? 'bg-metmap-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
        beatFlash && isPlaying && isDownbeat && 'scale-105 ring-2 ring-metmap-400/50',
        beatFlash && isPlaying && !isDownbeat && 'scale-102',
        className
      )}
    >
      {isPlaying ? (
        <Pause className="w-4 h-4" />
      ) : (
        <Play className="w-4 h-4" />
      )}
      <span className="text-sm font-medium tabular-nums">
        {Math.round(state.currentBpm)} BPM
      </span>
    </button>
  );
}
