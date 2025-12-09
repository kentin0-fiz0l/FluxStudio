'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PlaybackPosition } from '@/components/ChordTimeline';

export interface UseTimelinePlaybackOptions {
  /** Total number of bars in the section */
  totalBars: number;
  /** Beats per bar (time signature numerator) */
  beatsPerBar: number;
  /** BPM (beats per minute) */
  bpm?: number;
  /** Whether to loop playback */
  loop?: boolean;
  /** Callback when playback position changes */
  onPositionChange?: (position: PlaybackPosition) => void;
  /** Callback when playback completes (at end of section) */
  onComplete?: () => void;
}

export interface UseTimelinePlaybackReturn {
  /** Current playback position */
  position: PlaybackPosition;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Start playback */
  play: () => void;
  /** Stop playback */
  stop: () => void;
  /** Toggle play/stop */
  toggle: () => void;
  /** Jump to a specific position */
  seek: (position: PlaybackPosition) => void;
  /** Reset to beginning */
  reset: () => void;
  /** Set BPM */
  setBpm: (bpm: number) => void;
  /** Current BPM */
  bpm: number;
}

/**
 * Hook for timeline playback synchronized to BPM
 *
 * Provides a way to animate a playhead through bars/beats at a given tempo,
 * independent of the metronome audio. Can be used to sync ChordTimeline
 * visualization with metronome playback.
 *
 * @example
 * ```tsx
 * const { position, isPlaying, toggle } = useTimelinePlayback({
 *   totalBars: 8,
 *   beatsPerBar: 4,
 *   bpm: 120,
 * });
 *
 * return (
 *   <ChordTimeline
 *     playbackPosition={position}
 *     isPlaying={isPlaying}
 *     {...otherProps}
 *   />
 * );
 * ```
 */
export function useTimelinePlayback(
  options: UseTimelinePlaybackOptions
): UseTimelinePlaybackReturn {
  const {
    totalBars,
    beatsPerBar,
    bpm: initialBpm = 120,
    loop = true,
    onPositionChange,
    onComplete,
  } = options;

  const [position, setPosition] = useState<PlaybackPosition>({ bar: 1, beat: 1 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(initialBpm);

  // Track animation frame and timing
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const beatAccumulatorRef = useRef<number>(0);

  // Calculate milliseconds per beat
  const msPerBeat = (60 / bpm) * 1000;

  // Advance position by one beat
  const advanceBeat = useCallback(() => {
    setPosition((prev) => {
      let nextBeat = prev.beat + 1;
      let nextBar = prev.bar;

      // Check if we need to advance to next bar
      if (nextBeat > beatsPerBar) {
        nextBeat = 1;
        nextBar += 1;
      }

      // Check if we've reached the end
      if (nextBar > totalBars) {
        if (loop) {
          // Loop back to beginning
          return { bar: 1, beat: 1 };
        } else {
          // Stop at end
          onComplete?.();
          return prev;
        }
      }

      const newPosition = { bar: nextBar, beat: nextBeat };
      onPositionChange?.(newPosition);
      return newPosition;
    });
  }, [beatsPerBar, totalBars, loop, onPositionChange, onComplete]);

  // Animation loop
  const tick = useCallback(
    (timestamp: number) => {
      if (lastTickRef.current === 0) {
        lastTickRef.current = timestamp;
      }

      const delta = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;

      beatAccumulatorRef.current += delta;

      // Check if we should advance a beat
      while (beatAccumulatorRef.current >= msPerBeat) {
        beatAccumulatorRef.current -= msPerBeat;
        advanceBeat();
      }

      // Continue animation if still playing
      animationRef.current = requestAnimationFrame(tick);
    },
    [msPerBeat, advanceBeat]
  );

  // Start playback
  const play = useCallback(() => {
    if (isPlaying) return;

    setIsPlaying(true);
    lastTickRef.current = 0;
    beatAccumulatorRef.current = 0;
    animationRef.current = requestAnimationFrame(tick);
  }, [isPlaying, tick]);

  // Stop playback
  const stop = useCallback(() => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastTickRef.current = 0;
    beatAccumulatorRef.current = 0;
  }, []);

  // Toggle play/stop
  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      play();
    }
  }, [isPlaying, play, stop]);

  // Seek to position
  const seek = useCallback((newPosition: PlaybackPosition) => {
    setPosition({
      bar: Math.max(1, Math.min(totalBars, newPosition.bar)),
      beat: Math.max(1, Math.min(beatsPerBar, newPosition.beat)),
    });
    onPositionChange?.(newPosition);
  }, [totalBars, beatsPerBar, onPositionChange]);

  // Reset to beginning
  const reset = useCallback(() => {
    stop();
    setPosition({ bar: 1, beat: 1 });
    onPositionChange?.({ bar: 1, beat: 1 });
  }, [stop, onPositionChange]);

  // Set BPM
  const setBpm = useCallback((newBpm: number) => {
    setBpmState(Math.max(20, Math.min(400, newBpm)));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Update animation when tick function changes (due to BPM change)
  useEffect(() => {
    if (isPlaying && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(tick);
    }
  }, [tick, isPlaying]);

  return {
    position,
    isPlaying,
    play,
    stop,
    toggle,
    seek,
    reset,
    setBpm,
    bpm,
  };
}

export default useTimelinePlayback;
