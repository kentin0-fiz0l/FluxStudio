/**
 * useSyncedPlayback Hook - FluxStudio
 *
 * Drift-free synchronized playback that ties audio to formation animation
 * using AudioContext.currentTime (hardware clock) as the single source of truth.
 *
 * Unlike useAudioPlayback (which wraps HTMLAudioElement), this hook uses
 * AudioContext + AudioBufferSourceNode for sample-accurate timing and drives
 * a requestAnimationFrame loop that derives formation time from the audio clock.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Keyframe, Position, TransitionType } from '../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface SyncedPlaybackOptions {
  audioUrl?: string;
  keyframes: Keyframe[];
  duration: number; // ms
  loop?: boolean;
  speed?: number;
  onTimeUpdate?: (timeMs: number) => void;
  onPositionsUpdate?: (positions: Map<string, Position>) => void;
  onComplete?: () => void;
}

export interface SyncedPlaybackResult {
  // State
  currentTime: number; // ms
  isPlaying: boolean;
  isPaused: boolean;
  duration: number;
  positions: Map<string, Position>;

  // Controls
  play: (startTimeMs?: number) => void;
  pause: () => void;
  stop: () => void;
  seek: (timeMs: number) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
}

// ============================================================================
// Interpolation helpers (mirrored from FormationService to avoid coupling)
// ============================================================================

function applyEasing(t: number, easing: TransitionType): number {
  switch (easing) {
    case 'ease':
      return t * t * (3 - 2 * t);
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'linear':
    default:
      return t;
  }
}

function interpolateRotation(from: number, to: number, t: number): number {
  let diff = to - from;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (from + diff * t + 360) % 360;
}

function getPositionsAtTime(
  keyframes: Keyframe[],
  timeMs: number,
): Map<string, Position> {
  if (keyframes.length === 0) return new Map();

  let prevKeyframe = keyframes[0];
  let nextKeyframe = keyframes[0];

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].timestamp <= timeMs) {
      prevKeyframe = keyframes[i];
    }
    if (keyframes[i].timestamp >= timeMs) {
      nextKeyframe = keyframes[i];
      break;
    }
  }

  // Exact hit or single keyframe
  if (prevKeyframe.id === nextKeyframe.id || prevKeyframe.timestamp === timeMs) {
    return new Map(prevKeyframe.positions);
  }

  const progress =
    (timeMs - prevKeyframe.timestamp) /
    (nextKeyframe.timestamp - prevKeyframe.timestamp);
  const easedProgress = applyEasing(
    progress,
    nextKeyframe.transition ?? 'linear',
  );

  const interpolated = new Map<string, Position>();
  const performerIds = new Set([
    ...prevKeyframe.positions.keys(),
    ...nextKeyframe.positions.keys(),
  ]);

  for (const performerId of performerIds) {
    const prevPos = prevKeyframe.positions.get(performerId);
    const nextPos = nextKeyframe.positions.get(performerId);

    if (prevPos && nextPos) {
      interpolated.set(performerId, {
        x: prevPos.x + (nextPos.x - prevPos.x) * easedProgress,
        y: prevPos.y + (nextPos.y - prevPos.y) * easedProgress,
        rotation: interpolateRotation(
          prevPos.rotation ?? 0,
          nextPos.rotation ?? 0,
          easedProgress,
        ),
      });
    } else if (prevPos) {
      interpolated.set(performerId, { ...prevPos });
    } else if (nextPos) {
      interpolated.set(performerId, { ...nextPos });
    }
  }

  return interpolated;
}

// ============================================================================
// Hook
// ============================================================================

export function useSyncedPlayback(options: SyncedPlaybackOptions): SyncedPlaybackResult {
  const {
    audioUrl,
    keyframes,
    duration,
    loop: initialLoop = false,
    speed: initialSpeed = 1,
    onTimeUpdate,
    onPositionsUpdate,
    onComplete,
  } = options;

  // --- React state exposed to consumers ---
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  // --- Mutable refs for the rAF loop (no re-renders) ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const rafIdRef = useRef<number>(0);

  // Playback bookkeeping
  const startAudioTimeRef = useRef(0); // audioContext.currentTime when playback began
  const startOffsetRef = useRef(0); // formation offset (seconds) at play start
  const speedRef = useRef(initialSpeed);
  const loopRef = useRef(initialLoop);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Keep latest callbacks in refs so the rAF closure always calls the newest version
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onPositionsUpdateRef = useRef(onPositionsUpdate);
  onPositionsUpdateRef.current = onPositionsUpdate;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Keep latest keyframes in a ref so the rAF loop reads fresh data
  const keyframesRef = useRef(keyframes);
  keyframesRef.current = keyframes;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  // ------------------------------------------------------------------
  // Lazy AudioContext creation (satisfies browser autoplay policy)
  // ------------------------------------------------------------------
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // ------------------------------------------------------------------
  // Audio buffer loading
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!audioUrl) {
      audioBufferRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const ctx = getAudioContext();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;
        audioBufferRef.current = decoded;
      } catch (err) {
        console.error('[useSyncedPlayback] Failed to load audio:', err);
        audioBufferRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioUrl, getAudioContext]);

  // ------------------------------------------------------------------
  // Stop current AudioBufferSourceNode (helper)
  // ------------------------------------------------------------------
  const stopSourceNode = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      } catch {
        // Already stopped — ignore
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Create and start a new AudioBufferSourceNode at a given offset
  // ------------------------------------------------------------------
  const startSourceNode = useCallback(
    (offsetSec: number) => {
      const ctx = audioCtxRef.current;
      const buffer = audioBufferRef.current;
      if (!ctx || !buffer) return;

      stopSourceNode();

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = speedRef.current;
      source.connect(ctx.destination);

      // Clamp offset into valid range
      const clampedOffset = Math.max(0, Math.min(offsetSec, buffer.duration));
      source.start(0, clampedOffset);
      sourceNodeRef.current = source;
    },
    [stopSourceNode],
  );

  // ------------------------------------------------------------------
  // requestAnimationFrame loop
  // ------------------------------------------------------------------
  const tick = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !isPlayingRef.current) return;

    const elapsed =
      (ctx.currentTime - startAudioTimeRef.current) * speedRef.current;
    let timeMs = startOffsetRef.current * 1000 + elapsed * 1000;
    const dur = durationRef.current;

    // End / loop detection
    if (timeMs >= dur) {
      if (loopRef.current) {
        // Wrap around
        timeMs = timeMs % dur;
        // Reset clock baseline so elapsed starts fresh from the wrapped time
        startAudioTimeRef.current = ctx.currentTime;
        startOffsetRef.current = timeMs / 1000;

        // Restart audio from beginning if we have a buffer
        if (audioBufferRef.current) {
          startSourceNode(timeMs / 1000);
        }
      } else {
        timeMs = dur;
        // Playback complete
        isPlayingRef.current = false;
        isPausedRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTime(dur);
        stopSourceNode();

        const finalPositions = getPositionsAtTime(keyframesRef.current, dur);
        setPositions(finalPositions);
        onPositionsUpdateRef.current?.(finalPositions);
        onTimeUpdateRef.current?.(dur);
        onCompleteRef.current?.();
        return; // Don't schedule another frame
      }
    }

    // Update state
    setCurrentTime(timeMs);
    onTimeUpdateRef.current?.(timeMs);

    const interpolated = getPositionsAtTime(keyframesRef.current, timeMs);
    setPositions(interpolated);
    onPositionsUpdateRef.current?.(interpolated);

    rafIdRef.current = requestAnimationFrame(tick);
  }, [stopSourceNode, startSourceNode]);

  // ------------------------------------------------------------------
  // play()
  // ------------------------------------------------------------------
  const play = useCallback(
    (startTimeMs?: number) => {
      const ctx = getAudioContext();
      const dur = durationRef.current;
      if (dur <= 0) return;

      // Resume AudioContext if suspended (browser autoplay policy or previous pause)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const offsetMs =
        startTimeMs !== undefined
          ? Math.max(0, Math.min(startTimeMs, dur))
          : isPausedRef.current
            ? currentTime
            : 0;

      const offsetSec = offsetMs / 1000;

      startAudioTimeRef.current = ctx.currentTime;
      startOffsetRef.current = offsetSec;
      isPlayingRef.current = true;
      isPausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);

      // Start audio if available
      if (audioBufferRef.current) {
        startSourceNode(offsetSec);
      }

      // Kick off rAF loop
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(tick);
    },
    [getAudioContext, startSourceNode, tick, currentTime],
  );

  // ------------------------------------------------------------------
  // pause()
  // ------------------------------------------------------------------
  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;

    isPlayingRef.current = false;
    isPausedRef.current = true;
    setIsPlaying(false);
    setIsPaused(true);

    cancelAnimationFrame(rafIdRef.current);
    stopSourceNode();

    // Suspend AudioContext — this freezes the hardware clock
    audioCtxRef.current?.suspend();
  }, [stopSourceNode]);

  // ------------------------------------------------------------------
  // stop()
  // ------------------------------------------------------------------
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);

    cancelAnimationFrame(rafIdRef.current);
    stopSourceNode();

    const initialPositions = getPositionsAtTime(keyframesRef.current, 0);
    setPositions(initialPositions);
    onPositionsUpdateRef.current?.(initialPositions);
    onTimeUpdateRef.current?.(0);
  }, [stopSourceNode]);

  // ------------------------------------------------------------------
  // seek()
  // ------------------------------------------------------------------
  const seek = useCallback(
    (timeMs: number) => {
      const dur = durationRef.current;
      const clamped = Math.max(0, Math.min(timeMs, dur));

      setCurrentTime(clamped);
      onTimeUpdateRef.current?.(clamped);

      const interpolated = getPositionsAtTime(keyframesRef.current, clamped);
      setPositions(interpolated);
      onPositionsUpdateRef.current?.(interpolated);

      if (isPlayingRef.current) {
        // Restart playback from the new position
        const ctx = audioCtxRef.current;
        if (ctx) {
          startAudioTimeRef.current = ctx.currentTime;
          startOffsetRef.current = clamped / 1000;
        }

        if (audioBufferRef.current) {
          startSourceNode(clamped / 1000);
        }
      } else {
        // If paused, just update the offset so play() resumes from here
        startOffsetRef.current = clamped / 1000;
      }
    },
    [startSourceNode],
  );

  // ------------------------------------------------------------------
  // setSpeed()
  // ------------------------------------------------------------------
  const setSpeed = useCallback(
    (speed: number) => {
      const clamped = Math.max(0.25, Math.min(4, speed));
      speedRef.current = clamped;

      // If currently playing, re-anchor the clock so elapsed calculation stays correct
      if (isPlayingRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        const elapsedSinceStart =
          (ctx.currentTime - startAudioTimeRef.current) * speedRef.current;
        const currentOffsetSec = startOffsetRef.current + elapsedSinceStart;

        startAudioTimeRef.current = ctx.currentTime;
        startOffsetRef.current = currentOffsetSec;

        // Update source node playback rate
        if (sourceNodeRef.current) {
          sourceNodeRef.current.playbackRate.value = clamped;
        }
      }
    },
    [],
  );

  // ------------------------------------------------------------------
  // setLoop()
  // ------------------------------------------------------------------
  const setLoop = useCallback((loop: boolean) => {
    loopRef.current = loop;
  }, []);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null;
          sourceNodeRef.current.stop();
        } catch {
          // ignore
        }
        sourceNodeRef.current.disconnect();
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // ------------------------------------------------------------------
  // Compute initial positions when keyframes change while stopped
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isPlayingRef.current && !isPausedRef.current) {
      const initial = getPositionsAtTime(keyframes, 0);
      setPositions(initial);
    }
  }, [keyframes]);

  return {
    currentTime,
    isPlaying,
    isPaused,
    duration,
    positions,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    setLoop,
  };
}

export default useSyncedPlayback;
