/**
 * Mobile Playback Controls - MetMap
 *
 * Touch-optimized playback controls for MetMap on mobile devices.
 * Features large touch targets and swipe gestures.
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';

interface MobilePlaybackControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  currentBar: number;
  currentBeat: number;
  currentTempo: number;
  totalBars: number;
  countingOff: boolean;
  countoffBeatsRemaining: number;
  onPlay: (options?: { tempoOverride?: number; countoffBars?: number }) => void;
  onPause: () => void;
  onStop: () => void;
  onSeekToBar: (bar: number) => void;
  defaultTempo?: number;
}

export function MobilePlaybackControls({
  isPlaying,
  isPaused: _isPaused,
  currentBar,
  currentBeat,
  totalBars,
  currentTempo,
  countingOff,
  countoffBeatsRemaining,
  onPlay,
  onPause,
  onStop,
  onSeekToBar,
  defaultTempo = 120
}: MobilePlaybackControlsProps) {
  const [tempoOverride, setTempoOverride] = useState<number | null>(null);
  const [countoffBars, setCountoffBars] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tapTempo, setTapTempo] = useState<number[]>([]);

  const progressRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Calculate progress percentage
  const progress = totalBars > 0 ? ((currentBar - 1) / totalBars) * 100 : 0;

  // Handle tap tempo
  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const newTaps = [...tapTempo.filter(t => now - t < 3000), now].slice(-4);
    setTapTempo(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 20 && bpm <= 300) {
        setTempoOverride(bpm);
      }
    }
  }, [tapTempo]);

  // Handle progress bar touch
  const handleProgressTouch = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!progressRef.current || totalBars === 0) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetBar = Math.max(1, Math.ceil(percent * totalBars));

    onSeekToBar(targetBar);
  }, [totalBars, onSeekToBar]);

  // Swipe gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detect swipe (fast horizontal movement)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50 && deltaTime < 300) {
      if (deltaX > 0) {
        // Swipe right - next section/forward
        onSeekToBar(Math.min(totalBars, currentBar + 4));
      } else {
        // Swipe left - previous section/back
        onSeekToBar(Math.max(1, currentBar - 4));
      }
    }

    touchStartRef.current = null;
  }, [currentBar, totalBars, onSeekToBar]);

  const handlePlay = () => {
    onPlay({
      tempoOverride: tempoOverride || undefined,
      countoffBars
    });
  };

  // Vibrate on beat (if supported)
  useEffect(() => {
    if (isPlaying && !countingOff && 'vibrate' in navigator) {
      // Short vibration on beat 1
      if (currentBeat === 1) {
        navigator.vibrate(50);
      }
    }
  }, [isPlaying, countingOff, currentBeat]);

  return (
    <div
      className="bg-neutral-900 rounded-2xl p-4 select-none touch-manipulation"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Position Display */}
      <div className="text-center mb-4">
        {countingOff ? (
          <div className="text-5xl font-mono font-bold text-yellow-400">
            {countoffBeatsRemaining}
          </div>
        ) : (
          <div className="text-5xl font-mono font-bold text-white">
            <span className="text-indigo-400">{currentBar}</span>
            <span className="text-neutral-500 mx-1">.</span>
            <span>{currentBeat}</span>
          </div>
        )}
        <div className="text-sm text-neutral-400 mt-1">
          {tempoOverride || currentTempo} BPM
        </div>
      </div>

      {/* Progress Bar */}
      <div
        ref={progressRef}
        className="h-3 bg-neutral-700 rounded-full mb-6 cursor-pointer touch-none"
        onClick={handleProgressTouch}
        onTouchStart={handleProgressTouch}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onSeekToBar(Math.min(totalBars, currentBar + 1)); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onSeekToBar(Math.max(1, currentBar - 1)); }
          else if (e.key === 'Home') { e.preventDefault(); onSeekToBar(1); }
          else if (e.key === 'End') { e.preventDefault(); onSeekToBar(totalBars); }
        }}
        role="slider"
        aria-label="Playback progress"
        aria-valuemin={1}
        aria-valuemax={totalBars}
        aria-valuenow={currentBar}
        tabIndex={0}
      >
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Stop */}
        <button
          onClick={onStop}
          className="w-14 h-14 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 rounded-full flex items-center justify-center transition-colors"
          aria-label="Stop"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>

        {/* Play/Pause - Large */}
        {isPlaying ? (
          <button
            onClick={onPause}
            className="w-20 h-20 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
            aria-label="Pause"
          >
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handlePlay}
            className="w-20 h-20 bg-green-500 hover:bg-green-400 active:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
            aria-label="Play"
          >
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* Tap Tempo */}
        <button
          onClick={handleTapTempo}
          className="w-14 h-14 bg-neutral-700 hover:bg-neutral-600 active:bg-indigo-600 rounded-full flex items-center justify-center transition-colors"
          aria-label="Tap tempo"
        >
          <span className="text-white text-sm font-medium">TAP</span>
        </button>
      </div>

      {/* Quick Settings */}
      <div className="flex items-center justify-between gap-2">
        {/* Count-off */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Count-off:</span>
          <div className="flex bg-neutral-800 rounded-lg overflow-hidden">
            {[0, 1, 2, 4].map((bars) => (
              <button
                key={bars}
                onClick={() => setCountoffBars(bars)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  countoffBars === bars
                    ? 'bg-indigo-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {bars === 0 ? 'Off' : bars}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
          }`}
          aria-label="Settings"
          aria-expanded={showSettings}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Expanded Settings */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-neutral-700 space-y-4">
          {/* Tempo Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-neutral-400">Tempo Override</label>
              <button
                onClick={() => setTempoOverride(null)}
                className={`text-xs ${tempoOverride ? 'text-indigo-400' : 'text-neutral-600'}`}
                disabled={!tempoOverride}
              >
                Reset
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTempoOverride((prev) => Math.max(20, (prev || defaultTempo) - 5))}
                className="w-10 h-10 bg-neutral-700 rounded-lg text-white font-bold hover:bg-neutral-600 active:bg-neutral-500"
              >
                -
              </button>
              <input
                type="range"
                min={20}
                max={300}
                value={tempoOverride || defaultTempo}
                onChange={(e) => setTempoOverride(parseInt(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <button
                onClick={() => setTempoOverride((prev) => Math.min(300, (prev || defaultTempo) + 5))}
                className="w-10 h-10 bg-neutral-700 rounded-lg text-white font-bold hover:bg-neutral-600 active:bg-neutral-500"
              >
                +
              </button>
              <span className="w-12 text-right text-white font-mono">
                {tempoOverride || defaultTempo}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Swipe Hint */}
      <div className="text-center text-xs text-neutral-600 mt-4">
        Swipe left/right to skip bars
      </div>
    </div>
  );
}

export default MobilePlaybackControls;
