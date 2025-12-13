/**
 * TapTempo Component
 *
 * Calculates BPM from tap intervals. Users tap a button rhythmically
 * and the component calculates the average tempo.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface TapTempoProps {
  onTempoDetected: (bpm: number) => void;
  className?: string;
}

const TAP_TIMEOUT_MS = 2000; // Reset if no tap for 2 seconds
const MIN_TAPS = 3; // Minimum taps needed to calculate BPM
const MAX_TAPS = 8; // Maximum taps to consider (moving average)

export function TapTempo({ onTempoDetected, className = '' }: TapTempoProps) {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate BPM from tap intervals
  const calculateBpm = useCallback((times: number[]): number | null => {
    if (times.length < MIN_TAPS) return null;

    // Calculate intervals between taps
    const intervals: number[] = [];
    for (let i = 1; i < times.length; i++) {
      intervals.push(times[i] - times[i - 1]);
    }

    // Average interval in milliseconds
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Convert to BPM (60000ms per minute)
    const bpm = Math.round(60000 / avgInterval);

    // Clamp to reasonable range
    return Math.max(20, Math.min(300, bpm));
  }, []);

  // Handle tap
  const handleTap = useCallback(() => {
    const now = Date.now();

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setTapTimes((prev) => {
      // If too long since last tap, reset
      if (prev.length > 0 && now - prev[prev.length - 1] > TAP_TIMEOUT_MS) {
        return [now];
      }

      // Add new tap, keeping only last MAX_TAPS
      const newTaps = [...prev, now].slice(-MAX_TAPS);

      // Calculate and update BPM
      const bpm = calculateBpm(newTaps);
      if (bpm !== null) {
        setCurrentBpm(bpm);
        onTempoDetected(bpm);
      }

      return newTaps;
    });

    setIsActive(true);

    // Set timeout to reset
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setTapTimes([]);
      setCurrentBpm(null);
    }, TAP_TIMEOUT_MS);
  }, [calculateBpm, onTempoDetected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset function
  const handleReset = () => {
    setTapTimes([]);
    setCurrentBpm(null);
    setIsActive(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleTap}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          isActive
            ? 'bg-indigo-600 text-white scale-95'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-label="Tap to set tempo"
      >
        {currentBpm ? `${currentBpm} BPM` : 'Tap Tempo'}
      </button>
      {tapTimes.length > 0 && (
        <span className="text-xs text-gray-500">
          {tapTimes.length} tap{tapTimes.length !== 1 ? 's' : ''}
        </span>
      )}
      {currentBpm && (
        <button
          onClick={handleReset}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label="Reset tap tempo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default TapTempo;
