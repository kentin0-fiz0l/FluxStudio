/**
 * useAudioPlayback Hook - FluxStudio Drill Writer
 *
 * Provides audio playback functionality synchronized with formation animations.
 * Uses Web Audio API for precise timing and playback control.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioTrack } from '../services/formationService';

export interface AudioPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

export interface UseAudioPlaybackOptions {
  audioTrack?: AudioTrack | null;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  autoSync?: boolean; // Whether to auto-sync with formation playback
}

export interface UseAudioPlaybackResult {
  state: AudioPlaybackState;
  play: (startTime?: number) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  syncWithFormation: (time: number, isPlaying: boolean, speed: number) => void;
  loadAudio: (url: string) => Promise<void>;
  unloadAudio: () => void;
}

const initialState: AudioPlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isLoading: false,
  isLoaded: false,
  error: null,
};

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}): UseAudioPlaybackResult {
  const { audioTrack, onTimeUpdate, onEnded, onError, autoSync: _autoSync = true } = options;

  const [state, setState] = useState<AudioPlaybackState>(initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // Time update loop
  const updateTime = useCallback(() => {
    if (audioRef.current && state.isPlaying) {
      const currentTime = audioRef.current.currentTime * 1000; // Convert to ms
      setState(prev => ({ ...prev, currentTime }));
      onTimeUpdate?.(currentTime);
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
  }, [state.isPlaying, onTimeUpdate]);

  // Start time update loop when playing
  useEffect(() => {
    if (state.isPlaying && audioRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, updateTime]);

  const loadAudio = useCallback(async (url: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Clean up existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration * 1000, // Convert to ms
          isLoading: false,
          isLoaded: true,
        }));
      });

      audio.addEventListener('ended', () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        }));
        onEnded?.();
      });

      audio.addEventListener('error', () => {
        const errorMessage = 'Failed to load audio file';
        setState(prev => ({
          ...prev,
          isLoading: false,
          isLoaded: false,
          error: errorMessage,
        }));
        onError?.(errorMessage);
      });

      // Load the audio
      audio.src = url;
      audio.load();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [onEnded, onError]);

  const unloadAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    setState(initialState);
  }, []);

  // Create or update audio element when track changes
  useEffect(() => {
    if (audioTrack?.url) {
      loadAudio(audioTrack.url);
    } else {
      unloadAudio();
    }

    return () => {
      unloadAudio();
    };
  }, [audioTrack?.url, loadAudio, unloadAudio]);

  const play = useCallback((startTime?: number) => {
    if (!audioRef.current || !state.isLoaded) return;

    try {
      // Handle browser autoplay restrictions
      const playPromise = audioRef.current.play();

      if (startTime !== undefined) {
        audioRef.current.currentTime = startTime / 1000; // Convert from ms
      }

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setState(prev => ({
              ...prev,
              isPlaying: true,
              isPaused: false,
            }));
          })
          .catch((err) => {
            // Handle autoplay restrictions
            if (err.name === 'NotAllowedError') {
              setState(prev => ({
                ...prev,
                error: 'Click to enable audio playback',
              }));
            }
          });
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Failed to play audio');
    }
  }, [state.isLoaded, onError]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
    }));
  }, []);

  const seek = useCallback((time: number) => {
    if (!audioRef.current || !state.isLoaded) return;

    const timeInSeconds = Math.max(0, Math.min(time / 1000, audioRef.current.duration));
    audioRef.current.currentTime = timeInSeconds;
    setState(prev => ({ ...prev, currentTime: time }));
  }, [state.isLoaded]);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.25, Math.min(4, rate));

    if (audioRef.current) {
      audioRef.current.playbackRate = clampedRate;
    }

    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  const syncWithFormation = useCallback((time: number, isPlaying: boolean, speed: number) => {
    if (!audioRef.current || !state.isLoaded) return;

    // Update playback rate to match formation speed
    if (audioRef.current.playbackRate !== speed) {
      audioRef.current.playbackRate = speed;
      setState(prev => ({ ...prev, playbackRate: speed }));
    }

    // Sync time if difference is significant (more than 100ms)
    const currentAudioTime = audioRef.current.currentTime * 1000;
    const timeDiff = Math.abs(currentAudioTime - time);

    if (timeDiff > 100 || Math.abs(time - lastSyncTimeRef.current) > 500) {
      audioRef.current.currentTime = time / 1000;
      lastSyncTimeRef.current = time;
    }

    // Sync play/pause state
    if (isPlaying && audioRef.current.paused) {
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors during sync
      });
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
    } else if (!isPlaying && !audioRef.current.paused) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
    }
  }, [state.isLoaded]);

  return {
    state,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    syncWithFormation,
    loadAudio,
    unloadAudio,
  };
}

export default useAudioPlayback;
