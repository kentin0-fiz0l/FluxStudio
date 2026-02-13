/**
 * Unit Tests for useAudioPlayback Hook
 * @file src/hooks/__tests__/useAudioPlayback.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayback } from '../useAudioPlayback';

// Mock Audio element
class MockAudio {
  src = '';
  currentTime = 0;
  duration = 120;
  volume = 1;
  playbackRate = 1;
  paused = true;
  private listeners: Record<string, Function[]> = {};

  addEventListener(event: string, handler: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }

  triggerEvent(event: string) {
    this.listeners[event]?.forEach(h => h());
  }

  load() {
    // Simulate loadedmetadata after load
    setTimeout(() => this.triggerEvent('loadedmetadata'), 0);
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

let mockAudioInstance: MockAudio;

describe('useAudioPlayback', () => {
  beforeEach(() => {
    mockAudioInstance = new MockAudio();
    vi.spyOn(global, 'Audio').mockImplementation(() => mockAudioInstance as unknown as HTMLAudioElement);
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 0; });
    vi.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useAudioPlayback());

      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isPaused).toBe(false);
      expect(result.current.state.currentTime).toBe(0);
      expect(result.current.state.duration).toBe(0);
      expect(result.current.state.volume).toBe(1);
      expect(result.current.state.playbackRate).toBe(1);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isLoaded).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Volume Control', () => {
    it('should set volume', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setVolume(0.5);
      });

      expect(result.current.state.volume).toBe(0.5);
    });

    it('should clamp volume to 0-1', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setVolume(1.5);
      });
      expect(result.current.state.volume).toBe(1);

      act(() => {
        result.current.setVolume(-0.5);
      });
      expect(result.current.state.volume).toBe(0);
    });
  });

  describe('Playback Rate', () => {
    it('should set playback rate', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setPlaybackRate(2);
      });

      expect(result.current.state.playbackRate).toBe(2);
    });

    it('should clamp playback rate to 0.25-4', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setPlaybackRate(10);
      });
      expect(result.current.state.playbackRate).toBe(4);

      act(() => {
        result.current.setPlaybackRate(0.1);
      });
      expect(result.current.state.playbackRate).toBe(0.25);
    });
  });

  describe('Unload', () => {
    it('should reset state on unload', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setVolume(0.5);
      });

      act(() => {
        result.current.unloadAudio();
      });

      expect(result.current.state.volume).toBe(1); // Reset to default
      expect(result.current.state.isLoaded).toBe(false);
    });
  });

  describe('Play/Pause/Stop', () => {
    it('should not play when not loaded', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.play();
      });

      expect(result.current.state.isPlaying).toBe(false);
    });

    it('should not change state when pausing without loaded audio', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.pause();
      });

      // pause() early-returns when no audio is loaded
      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isPaused).toBe(false);
    });

    it('should stop audio and reset time', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.stop();
      });

      expect(result.current.state.isPlaying).toBe(false);
      expect(result.current.state.isPaused).toBe(false);
      expect(result.current.state.currentTime).toBe(0);
    });
  });

  describe('Auto-load from audioTrack', () => {
    it('should load audio when audioTrack is provided', () => {
      renderHook(() =>
        useAudioPlayback({
          audioTrack: { url: 'http://example.com/audio.mp3', filename: 'Test', id: '1', duration: 120 },
        })
      );

      expect(mockAudioInstance.src).toBe('http://example.com/audio.mp3');
    });
  });
});
