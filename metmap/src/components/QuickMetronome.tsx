'use client';

import { useState, useEffect } from 'react';
import { useMetronome } from '@/hooks/useMetronome';
import { TIME_SIGNATURES } from '@/lib/accentPatterns';
import { clsx } from 'clsx';
import { ChevronDown, Play, Pause, Minus, Plus } from 'lucide-react';

interface QuickMetronomeProps {
  className?: string;
}

/**
 * Compact metronome module for quick access on the main page.
 * Collapsible design - shows minimal info when collapsed, full controls when expanded.
 */
export function QuickMetronome({ className = '' }: QuickMetronomeProps) {
  const {
    isPlaying,
    tempo,
    timeSignature,
    beatsPerMeasure,
    currentBeat,
    beatPulse,
    isDownbeat,
    toggle,
    setTempo,
    setTimeSignature,
    tap,
    stop,
  } = useMetronome();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showTimeSignatures, setShowTimeSignatures] = useState(false);

  // Stop metronome when component unmounts
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Tap tempo handling
  const handleTap = () => {
    tap();
  };

  // Quick tempo adjustments
  const adjustTempo = (delta: number) => {
    setTempo(Math.max(20, Math.min(400, tempo + delta)));
  };

  return (
    <div
      className={clsx(
        'bg-hw-surface rounded-xl overflow-hidden transition-all duration-200',
        className
      )}
    >
      {/* Collapsed view - always visible */}
      <div
        className={clsx(
          'flex items-center gap-3 px-4 py-3 cursor-pointer',
          'hover:bg-hw-surface/80 transition-colors'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Play/Pause button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center',
            'transition-all duration-75 shadow-knob active:shadow-knob-pressed',
            isPlaying
              ? beatPulse
                ? isDownbeat
                  ? 'bg-hw-red scale-105'
                  : 'bg-hw-orange scale-102'
                : 'bg-hw-charcoal'
              : 'bg-hw-charcoal hover:bg-gray-600'
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>

        {/* BPM display */}
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-white">{tempo}</span>
            <span className="text-xs text-gray-500">BPM</span>
          </div>
          <span className="text-xs text-gray-500">{timeSignature}</span>
        </div>

        {/* Beat LEDs (compact) */}
        <div className="flex gap-1">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                'w-2 h-2 rounded-full transition-all duration-75',
                currentBeat === i && isPlaying
                  ? i === 0
                    ? 'bg-hw-red shadow-lg shadow-hw-red/50'
                    : 'bg-hw-orange shadow-lg shadow-hw-orange/50'
                  : 'bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Expand toggle */}
        <ChevronDown
          className={clsx(
            'w-5 h-5 text-gray-500 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </div>

      {/* Expanded controls */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-hw-charcoal space-y-3">
          {/* Tempo controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustTempo(-5)}
              className="w-9 h-9 rounded-lg bg-hw-charcoal text-gray-400 hover:text-white hover:bg-gray-600 flex items-center justify-center transition-colors shadow-pad active:shadow-pad-active"
            >
              <span className="text-xs font-medium">-5</span>
            </button>
            <button
              onClick={() => adjustTempo(-1)}
              className="w-9 h-9 rounded-lg bg-hw-charcoal text-gray-400 hover:text-white hover:bg-gray-600 flex items-center justify-center transition-colors shadow-pad active:shadow-pad-active"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Tempo slider */}
            <div className="flex-1 relative">
              <input
                type="range"
                min={20}
                max={300}
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-full h-2 bg-hw-charcoal rounded-lg appearance-none cursor-pointer accent-hw-brass"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <button
              onClick={() => adjustTempo(1)}
              className="w-9 h-9 rounded-lg bg-hw-charcoal text-gray-400 hover:text-white hover:bg-gray-600 flex items-center justify-center transition-colors shadow-pad active:shadow-pad-active"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => adjustTempo(5)}
              className="w-9 h-9 rounded-lg bg-hw-charcoal text-gray-400 hover:text-white hover:bg-gray-600 flex items-center justify-center transition-colors shadow-pad active:shadow-pad-active"
            >
              <span className="text-xs font-medium">+5</span>
            </button>
          </div>

          {/* Quick actions row */}
          <div className="flex gap-2">
            <button
              onClick={handleTap}
              className="flex-1 py-2 px-3 rounded-lg bg-hw-brass text-hw-charcoal font-medium text-sm shadow-pad active:shadow-pad-active transition-all"
            >
              TAP TEMPO
            </button>

            {/* Time signature selector */}
            <div className="relative">
              <button
                onClick={() => setShowTimeSignatures(!showTimeSignatures)}
                className="py-2 px-3 rounded-lg bg-hw-charcoal text-gray-300 hover:text-white font-medium text-sm shadow-pad active:shadow-pad-active transition-all flex items-center gap-1"
              >
                {timeSignature}
                <ChevronDown
                  className={clsx(
                    'w-4 h-4 transition-transform',
                    showTimeSignatures && 'rotate-180'
                  )}
                />
              </button>

              {showTimeSignatures && (
                <div className="absolute bottom-full mb-2 right-0 bg-hw-charcoal rounded-lg shadow-xl border border-hw-surface p-2 grid grid-cols-4 gap-1 min-w-[160px] z-10">
                  {TIME_SIGNATURES.slice(0, 8).map((ts) => (
                    <button
                      key={ts.display}
                      onClick={() => {
                        setTimeSignature(ts.display);
                        setShowTimeSignatures(false);
                      }}
                      className={clsx(
                        'py-1.5 px-2 rounded text-xs font-medium transition-colors',
                        timeSignature === ts.display
                          ? 'bg-hw-brass text-hw-charcoal'
                          : 'text-gray-400 hover:text-white hover:bg-hw-surface'
                      )}
                    >
                      {ts.display}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Common tempo presets */}
          <div className="flex gap-1 flex-wrap">
            {[60, 80, 100, 120, 140, 160, 180].map((bpm) => (
              <button
                key={bpm}
                onClick={() => setTempo(bpm)}
                className={clsx(
                  'py-1 px-2.5 rounded text-xs font-mono transition-colors',
                  tempo === bpm
                    ? 'bg-hw-brass text-hw-charcoal'
                    : 'bg-hw-charcoal text-gray-400 hover:text-white'
                )}
              >
                {bpm}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickMetronome;
