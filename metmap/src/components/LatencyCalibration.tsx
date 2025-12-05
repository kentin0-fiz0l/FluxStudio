'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, RefreshCw, Check, Volume2 } from 'lucide-react';
import { clsx } from 'clsx';
import {
  CalibrationState,
  createCalibrationState,
  recordCalibrationTap,
  getCalibrationProgress,
  formatOffset,
  saveLatencyOffset,
  loadLatencyOffset,
  clearLatencyOffset,
} from '@/lib/latencyCalibration';
import { MetronomeEngine } from '@/lib/metronome';
import { DEFAULT_TIME_SIGNATURE } from '@/types/metmap';

interface LatencyCalibrationProps {
  isOpen: boolean;
  onClose: () => void;
  onCalibrated?: (offsetMs: number) => void;
}

export function LatencyCalibration({
  isOpen,
  onClose,
  onCalibrated,
}: LatencyCalibrationProps) {
  const [state, setState] = useState<CalibrationState>(createCalibrationState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(loadLatencyOffset);
  const [beatFlash, setBeatFlash] = useState(false);

  const metronomeRef = useRef<MetronomeEngine | null>(null);
  const lastBeatTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize metronome
  useEffect(() => {
    if (!isOpen) return;

    const metronome = new MetronomeEngine({
      volume: 0.8,
      onBeat: () => {
        // Record expected beat time using audio context
        if (audioContextRef.current) {
          lastBeatTimeRef.current = audioContextRef.current.currentTime * 1000;
        } else {
          lastBeatTimeRef.current = performance.now();
        }
        setBeatFlash(true);
        setTimeout(() => setBeatFlash(false), 100);
      },
    });

    metronomeRef.current = metronome;

    // Get audio context reference for accurate timing
    metronome.init().then(() => {
      // Access internal audio context (hacky but necessary for timing)
      audioContextRef.current = (metronome as unknown as { audioContext: AudioContext }).audioContext;
    });

    return () => {
      metronome.destroy();
      metronomeRef.current = null;
      audioContextRef.current = null;
    };
  }, [isOpen]);

  const startCalibration = useCallback(async () => {
    setState(createCalibrationState());
    setIsPlaying(true);

    if (metronomeRef.current) {
      // Create a minimal "song" for the metronome at 80 BPM (easy to tap)
      metronomeRef.current.setSong({
        id: 'calibration',
        title: 'Calibration',
        artist: '',
        duration: 60,
        bpm: 80,
        defaultTimeSignature: DEFAULT_TIME_SIGNATURE,
        sections: [],
        tempoEvents: [],
        tags: [],
        createdAt: '',
        updatedAt: '',
        totalPracticeSessions: 0,
      });
      await metronomeRef.current.start(0);
    }
  }, []);

  const stopCalibration = useCallback(() => {
    setIsPlaying(false);
    metronomeRef.current?.stop();
  }, []);

  const handleTap = useCallback(() => {
    if (!isPlaying || state.isComplete) return;

    const tapTime = audioContextRef.current
      ? audioContextRef.current.currentTime * 1000
      : performance.now();

    const offset = tapTime - lastBeatTimeRef.current;

    // Only record if it's a reasonable time since the last beat
    // (within half a beat at 80 BPM = 375ms)
    if (offset > -375 && offset < 375) {
      const newState = recordCalibrationTap(state, offset);
      setState(newState);

      if (newState.isComplete) {
        stopCalibration();
      }
    }
  }, [isPlaying, state, stopCalibration]);

  const applyCalibration = useCallback(() => {
    if (state.isComplete) {
      saveLatencyOffset(state.averageOffset);
      setCurrentOffset(state.averageOffset);
      onCalibrated?.(state.averageOffset);
    }
  }, [state, onCalibrated]);

  const resetCalibration = useCallback(() => {
    clearLatencyOffset();
    setCurrentOffset(0);
    setState(createCalibrationState());
  }, []);

  const handleClose = useCallback(() => {
    stopCalibration();
    onClose();
  }, [stopCalibration, onClose]);

  if (!isOpen) return null;

  const progress = getCalibrationProgress(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Latency Calibration</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current offset display */}
          <div className="mb-6 p-4 bg-gray-800 rounded-xl text-center">
            <div className="text-sm text-gray-400 mb-1">Current Offset</div>
            <div className="text-xl font-bold text-white">
              {formatOffset(currentOffset)}
            </div>
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-400 mb-6">
            Tap the button in time with the metronome clicks. This helps MetMap
            compensate for audio latency on your device.
          </p>

          {/* Beat indicator */}
          <div className="flex justify-center mb-6">
            <div
              className={clsx(
                'w-24 h-24 rounded-full transition-all duration-75 flex items-center justify-center',
                beatFlash
                  ? 'bg-metmap-500 scale-110 shadow-xl shadow-metmap-500/50'
                  : 'bg-gray-700'
              )}
            >
              {isPlaying && <Volume2 className="w-10 h-10 text-white" />}
            </div>
          </div>

          {/* Progress bar */}
          {isPlaying && !state.isComplete && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Taps recorded</span>
                <span>{state.taps.length} / {state.requiredTaps}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-metmap-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Result */}
          {state.isComplete && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">Calibration Complete</span>
              </div>
              <p className="text-sm text-gray-300">
                Measured offset: <strong>{formatOffset(state.averageOffset)}</strong>
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isPlaying && !state.isComplete && (
              <button
                onClick={startCalibration}
                className="flex-1 py-3 px-4 bg-metmap-500 hover:bg-metmap-600 text-white font-medium rounded-xl transition-colors"
              >
                Start Calibration
              </button>
            )}

            {isPlaying && !state.isComplete && (
              <button
                onClick={handleTap}
                className="flex-1 py-4 px-4 bg-metmap-500 hover:bg-metmap-600 active:bg-metmap-700 active:scale-95 text-white font-medium rounded-xl transition-all min-h-[60px] text-lg"
              >
                TAP
              </button>
            )}

            {state.isComplete && (
              <>
                <button
                  onClick={applyCalibration}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Apply
                </button>
                <button
                  onClick={() => setState(createCalibrationState())}
                  className="py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Reset option */}
          {currentOffset !== 0 && !isPlaying && (
            <button
              onClick={resetCalibration}
              className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white"
            >
              Reset to default (0ms)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
