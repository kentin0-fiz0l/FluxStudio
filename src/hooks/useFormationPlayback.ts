/**
 * useFormationPlayback - Variable-tempo playback hook
 *
 * Drives playback through a TempoMap using requestAnimationFrame,
 * replacing constant-BPM tick assumptions. Supports optional audio
 * element sync and drill set change notifications.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TempoMap } from '../services/tempoMap';
import {
  countToTimeMs,
  timeMsToCount,
  getTempoAtCount,
  getSegmentAtCount,
} from '../services/tempoMap';
import type { DrillSet } from '../services/formationTypes';
import { getSetAtCount } from '../services/drillSetService';

// ============================================================================
// TYPES
// ============================================================================

export interface FormationPlaybackOptions {
  audioElement?: HTMLAudioElement | null;
  sets?: DrillSet[];
  onCountChange?: (count: number) => void;
  onSetChange?: (setId: string) => void;
}

export interface FormationPlaybackReturn {
  isPlaying: boolean;
  currentCount: number;
  currentTimeMs: number;
  currentTempo: number;
  currentMeasure: number;
  currentBeat: number;
  currentSectionName: string | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekToCount: (count: number) => void;
  seekToTimeMs: (timeMs: number) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormationPlayback(
  tempoMap: TempoMap,
  options?: FormationPlaybackOptions,
): FormationPlaybackReturn {
  const {
    audioElement = null,
    sets,
    onCountChange,
    onSetChange,
  } = options ?? {};

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  // Refs for the rAF loop (avoid stale closure issues)
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const elapsedMsRef = useRef<number>(0);
  const prevIntCountRef = useRef<number>(1);
  const prevSetIdRef = useRef<string | null>(null);

  // Keep callback refs fresh without re-creating the loop
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;
  const onSetChangeRef = useRef(onSetChange);
  onSetChangeRef.current = onSetChange;
  const setsRef = useRef(sets);
  setsRef.current = sets;
  const tempoMapRef = useRef(tempoMap);
  tempoMapRef.current = tempoMap;
  const audioElementRef = useRef(audioElement);
  audioElementRef.current = audioElement;

  // ---------------------------------------------------------------------------
  // Derived values (computed from currentTimeMs on each render)
  // ---------------------------------------------------------------------------
  const currentCount = tempoMap.segments.length > 0
    ? timeMsToCount(currentTimeMs, tempoMap)
    : 1;

  const currentTempo = tempoMap.segments.length > 0
    ? getTempoAtCount(Math.max(1, Math.floor(currentCount)), tempoMap)
    : 120;

  const segment = tempoMap.segments.length > 0
    ? getSegmentAtCount(Math.max(1, Math.floor(currentCount)), tempoMap)
    : undefined;

  const currentSectionName = segment?.sectionName ?? null;

  // Compute measure and beat within the current segment
  let currentMeasure = 1;
  let currentBeat = 1;
  if (segment) {
    const beatInSegment = Math.max(0, Math.floor(currentCount) - segment.startCount);
    const barInSegment = Math.floor(beatInSegment / segment.beatsPerBar);
    currentMeasure = segment.startBar + barInSegment;
    currentBeat = (beatInSegment % segment.beatsPerBar) + 1;
  }

  // ---------------------------------------------------------------------------
  // Playback loop
  // ---------------------------------------------------------------------------
  const tick = useCallback((frameTime: number) => {
    const map = tempoMapRef.current;
    const audio = audioElementRef.current;

    let timeMs: number;

    if (audio) {
      // Audio-synced mode: read position from the audio element
      timeMs = audio.currentTime * 1000;
    } else {
      // Manual accumulation mode
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = frameTime;
      }
      const delta = frameTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = frameTime;
      elapsedMsRef.current += delta;
      timeMs = elapsedMsRef.current;
    }

    // Clamp to total duration
    if (map.totalDurationMs > 0 && timeMs >= map.totalDurationMs) {
      timeMs = map.totalDurationMs;
      setCurrentTimeMs(timeMs);
      // Playback reached the end — stop
      setIsPlaying(false);
      rafIdRef.current = null;
      if (audio) {
        audio.pause();
      }
      return;
    }

    setCurrentTimeMs(timeMs);

    // Compute integer count for change detection
    const count = map.segments.length > 0
      ? timeMsToCount(timeMs, map)
      : 1;
    const intCount = Math.floor(count);

    // Notify on integer count change
    if (intCount !== prevIntCountRef.current) {
      prevIntCountRef.current = intCount;
      onCountChangeRef.current?.(intCount);

      // Check for set change
      const currentSets = setsRef.current;
      if (currentSets && currentSets.length > 0) {
        const set = getSetAtCount(currentSets, intCount);
        if (set && set.id !== prevSetIdRef.current) {
          prevSetIdRef.current = set.id;
          onSetChangeRef.current?.(set.id);
        }
      }
    }

    // Schedule next frame
    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------
  const play = useCallback(() => {
    if (rafIdRef.current !== null) return; // already playing

    const audio = audioElementRef.current;
    if (audio) {
      audio.play().catch(() => {
        // Autoplay may be blocked; ignore gracefully
      });
    } else {
      // Reset frame timestamp so delta starts from zero on resume
      lastFrameTimeRef.current = 0;
    }

    setIsPlaying(true);
    rafIdRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
    }

    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    elapsedMsRef.current = 0;
    lastFrameTimeRef.current = 0;
    prevIntCountRef.current = 1;
    prevSetIdRef.current = null;
    setCurrentTimeMs(0);
    setIsPlaying(false);
  }, []);

  const seekToCount = useCallback((count: number) => {
    const map = tempoMapRef.current;
    const timeMs = countToTimeMs(Math.max(1, count), map);

    elapsedMsRef.current = timeMs;
    lastFrameTimeRef.current = 0;
    setCurrentTimeMs(timeMs);

    const audio = audioElementRef.current;
    if (audio) {
      audio.currentTime = timeMs / 1000;
    }

    // Update change-tracking refs
    prevIntCountRef.current = Math.floor(count);
    const currentSets = setsRef.current;
    if (currentSets && currentSets.length > 0) {
      const set = getSetAtCount(currentSets, Math.floor(count));
      prevSetIdRef.current = set?.id ?? null;
    }
  }, []);

  const seekToTimeMs = useCallback((timeMs: number) => {
    const clampedTime = Math.max(0, timeMs);
    elapsedMsRef.current = clampedTime;
    lastFrameTimeRef.current = 0;
    setCurrentTimeMs(clampedTime);

    const audio = audioElementRef.current;
    if (audio) {
      audio.currentTime = clampedTime / 1000;
    }

    // Update change-tracking refs
    const map = tempoMapRef.current;
    const count = map.segments.length > 0
      ? timeMsToCount(clampedTime, map)
      : 1;
    prevIntCountRef.current = Math.floor(count);
    const currentSets = setsRef.current;
    if (currentSets && currentSets.length > 0) {
      const set = getSetAtCount(currentSets, Math.floor(count));
      prevSetIdRef.current = set?.id ?? null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    isPlaying,
    currentCount: Math.max(1, Math.floor(currentCount)),
    currentTimeMs,
    currentTempo: Math.round(currentTempo * 10) / 10,
    currentMeasure,
    currentBeat,
    currentSectionName,
    play,
    pause,
    stop,
    seekToCount,
    seekToTimeMs,
  };
}
