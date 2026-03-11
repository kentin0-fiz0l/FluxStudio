/**
 * CountOverlay - Large count number overlay showing current beat within measure
 *
 * Displays the current beat number (1-4) in a corner of the canvas with:
 * - Downbeat pulse animation on beat 1
 * - Beat indicator dots
 * - Optional metronome click using Web Audio API
 */

import { useEffect, useRef, useCallback, memo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface CountOverlayProps {
  /** 1-based beat within measure (1, 2, 3, 4) */
  currentBeat: number;
  /** Current measure number */
  currentMeasure: number;
  /** Time signature numerator (usually 4) */
  beatsPerMeasure: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Enable metronome click sound */
  showMetronome?: boolean;
  /** Corner position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// ============================================================================
// Metronome Audio Engine
// ============================================================================

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playClick(isDownbeat: boolean) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = isDownbeat ? 1000 : 800;
    osc.type = 'sine';

    const now = ctx.currentTime;
    const duration = isDownbeat ? 0.05 : 0.03;

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Silently fail if audio is not available
  }
}

// ============================================================================
// Position styles
// ============================================================================

const POSITION_CLASSES: Record<NonNullable<CountOverlayProps['position']>, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

// ============================================================================
// Component
// ============================================================================

export const CountOverlay = memo(function CountOverlay({
  currentBeat,
  currentMeasure,
  beatsPerMeasure,
  isPlaying,
  showMetronome = false,
  position = 'top-right',
}: CountOverlayProps) {
  const prevBeatRef = useRef(currentBeat);

  // Play metronome click when beat changes
  const handleMetronome = useCallback((beat: number) => {
    if (showMetronome) {
      playClick(beat === 1);
    }
  }, [showMetronome]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentBeat !== prevBeatRef.current) {
      handleMetronome(currentBeat);
      prevBeatRef.current = currentBeat;
    }
  }, [currentBeat, isPlaying, handleMetronome]);

  if (!isPlaying) return null;

  const isDownbeat = currentBeat === 1;
  const positionClass = POSITION_CLASSES[position];

  return (
    <div
      className={`absolute ${positionClass} z-50 pointer-events-none select-none`}
      aria-live="off"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[64px]">
        {/* Large beat number */}
        <span
          className={`text-4xl font-bold tabular-nums leading-none transition-transform duration-100 ${
            isDownbeat
              ? 'text-yellow-300 scale-110'
              : 'text-white scale-100'
          }`}
        >
          {currentBeat}
        </span>

        {/* Measure number */}
        <span className="text-xs text-gray-300 font-medium tabular-nums">
          m. {currentMeasure}
        </span>

        {/* Beat indicator dots */}
        <div className="flex items-center gap-1.5 mt-1">
          {Array.from({ length: beatsPerMeasure }, (_, i) => {
            const beatNum = i + 1;
            const isCurrent = beatNum === currentBeat;
            return (
              <span
                key={beatNum}
                className={`w-2 h-2 rounded-full transition-colors duration-75 ${
                  isCurrent
                    ? beatNum === 1
                      ? 'bg-yellow-300'
                      : 'bg-white'
                    : 'bg-gray-500'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});
