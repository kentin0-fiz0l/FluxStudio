'use client';

import { useState, useRef, useCallback } from 'react';
import { useMetronome, SoundPreset } from '@/hooks/useMetronome';
import { TIME_SIGNATURES } from '@/lib/accentPatterns';
import { clsx } from 'clsx';

interface HardwareMetronomeProps {
  className?: string;
  onTempoChange?: (bpm: number) => void;
  compact?: boolean;
}

/**
 * Hardware-style Knob Component
 * Draggable circular control inspired by Orchid MIDI controller
 */
function Knob({
  value,
  min,
  max,
  onChange,
  size = 'md',
  color = 'default',
  label,
  showValue = true,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'orange' | 'brass';
  label?: string;
  showValue?: boolean;
}) {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(value);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const colorClasses = {
    default: 'bg-hw-charcoal',
    orange: 'bg-hw-orange',
    brass: 'bg-hw-brass',
  };

  // Calculate rotation angle (270 degree range, from -135 to 135)
  const percentage = (value - min) / (max - min);
  const rotation = -135 + percentage * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaY = startY.current - e.clientY;
      const sensitivity = (max - min) / 200;
      const newValue = Math.round(
        Math.min(max, Math.max(min, startValue.current + deltaY * sensitivity))
      );
      onChange(newValue);
    },
    [min, max, onChange]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    startValue.current = value;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const deltaY = startY.current - e.touches[0].clientY;
    const sensitivity = (max - min) / 200;
    const newValue = Math.round(
      Math.min(max, Math.max(min, startValue.current + deltaY * sensitivity))
    );
    onChange(newValue);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
          {label}
        </span>
      )}
      <div
        ref={knobRef}
        className={clsx(
          sizeClasses[size],
          colorClasses[color],
          'rounded-full cursor-grab active:cursor-grabbing',
          'shadow-knob active:shadow-knob-pressed',
          'relative select-none transition-shadow'
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Knob indicator line */}
        <div
          className="absolute inset-2 rounded-full bg-gradient-to-b from-white/10 to-transparent"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className={clsx(
              'absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full',
              color === 'default' ? 'bg-hw-brass' : 'bg-white/80'
            )}
          />
        </div>
      </div>
      {showValue && (
        <span className="text-xs font-mono text-gray-400">{value}</span>
      )}
    </div>
  );
}

/**
 * LED Beat Indicator
 */
function BeatLED({
  active,
  accent,
  size = 'md',
}: {
  active: boolean;
  accent?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
  };

  return (
    <div
      className={clsx(
        sizeClasses[size],
        'rounded-full transition-all duration-75',
        active
          ? accent
            ? 'bg-hw-red shadow-lg shadow-hw-red/50'
            : 'bg-hw-orange shadow-lg shadow-hw-orange/50'
          : 'bg-gray-700'
      )}
    />
  );
}

/**
 * Hardware-style tactile button
 */
function HardwareButton({
  children,
  onClick,
  active,
  color = 'default',
  size = 'md',
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  color?: 'default' | 'orange' | 'red' | 'brass';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const colorClasses = {
    default: active
      ? 'bg-hw-surface text-white shadow-pad-active'
      : 'bg-hw-charcoal text-gray-300 shadow-pad hover:bg-hw-surface',
    orange: active
      ? 'bg-hw-orange text-white shadow-pad-active'
      : 'bg-hw-orange/80 text-white shadow-pad hover:bg-hw-orange',
    red: active
      ? 'bg-hw-red text-white shadow-pad-active'
      : 'bg-hw-red/80 text-white shadow-pad hover:bg-hw-red',
    brass: active
      ? 'bg-hw-brass text-hw-charcoal shadow-pad-active'
      : 'bg-hw-brass/80 text-hw-charcoal shadow-pad hover:bg-hw-brass',
  };

  return (
    <button
      onClick={onClick}
      className={clsx(
        sizeClasses[size],
        colorClasses[color],
        'rounded-lg font-medium transition-all active:scale-95',
        'min-h-[44px] min-w-[44px]'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Main Hardware Metronome Component
 * Inspired by Orchid MIDI controller aesthetic
 */
export function HardwareMetronome({
  className = '',
  onTempoChange,
  compact: _compact = false,
}: HardwareMetronomeProps) {
  const {
    isPlaying,
    tempo,
    timeSignature,
    beatsPerMeasure,
    currentBeat,
    soundPreset,
    subdivisions,
    accentPattern,
    beatPulse,
    isDownbeat,
    toggle,
    setTempo,
    setTimeSignature,
    setSoundPreset,
    setSubdivisions,
    tap,
  } = useMetronome();

  const [showOptions, setShowOptions] = useState(false);

  const handleTempoChange = (bpm: number) => {
    setTempo(bpm);
    onTempoChange?.(bpm);
  };

  const handleTap = () => {
    const bpm = tap();
    if (bpm !== null) {
      onTempoChange?.(bpm);
    }
  };

  return (
    <div
      className={clsx(
        'bg-hw-charcoal rounded-2xl overflow-hidden',
        className
      )}
    >
      {/* Brass accent strip */}
      <div className="h-1.5 bg-gradient-to-r from-hw-brass via-hw-peach to-hw-brass" />

      <div className="p-4">
        {/* Beat LED strip */}
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <BeatLED
              key={i}
              active={currentBeat === i && isPlaying}
              accent={i === 0}
            />
          ))}
        </div>

        {/* Main controls row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* BPM Knob */}
          <Knob
            value={tempo}
            min={20}
            max={300}
            onChange={handleTempoChange}
            size="lg"
            color="brass"
            label="BPM"
          />

          {/* Center: Play button and tempo display */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggle}
              className={clsx(
                'w-16 h-16 rounded-full flex items-center justify-center',
                'transition-all duration-75 shadow-knob active:shadow-knob-pressed',
                isPlaying
                  ? beatPulse
                    ? isDownbeat
                      ? 'bg-hw-red scale-105'
                      : 'bg-hw-orange scale-102'
                    : 'bg-hw-surface'
                  : 'bg-hw-surface hover:bg-gray-600'
              )}
            >
              {isPlaying ? (
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="mt-2 text-center">
              <div className="text-2xl font-mono font-bold text-white">
                {tempo}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {timeSignature}
              </div>
            </div>
          </div>

          {/* Subdivisions Knob */}
          <Knob
            value={subdivisions}
            min={1}
            max={4}
            onChange={setSubdivisions}
            size="md"
            color="orange"
            label="Sub"
          />
        </div>

        {/* Quick tempo buttons */}
        <div className="flex gap-2 mb-3">
          <HardwareButton onClick={() => handleTempoChange(tempo - 5)} size="sm">
            -5
          </HardwareButton>
          <HardwareButton onClick={() => handleTempoChange(tempo - 1)} size="sm">
            -1
          </HardwareButton>
          <HardwareButton onClick={handleTap} color="brass" size="sm">
            TAP
          </HardwareButton>
          <HardwareButton onClick={() => handleTempoChange(tempo + 1)} size="sm">
            +1
          </HardwareButton>
          <HardwareButton onClick={() => handleTempoChange(tempo + 5)} size="sm">
            +5
          </HardwareButton>
        </div>

        {/* Options toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1"
        >
          Options
          <svg
            className={clsx(
              'w-3 h-3 transition-transform',
              showOptions && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Expanded options */}
        {showOptions && (
          <div className="mt-3 pt-3 border-t border-gray-700 space-y-4">
            {/* Time Signature */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                Time Signature
              </label>
              <div className="flex flex-wrap gap-1">
                {TIME_SIGNATURES.slice(0, 8).map((ts) => (
                  <HardwareButton
                    key={ts.display}
                    onClick={() => setTimeSignature(ts.display)}
                    active={timeSignature === ts.display}
                    size="sm"
                  >
                    {ts.display}
                  </HardwareButton>
                ))}
              </div>
            </div>

            {/* Sound preset */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                Sound
              </label>
              <div className="flex flex-wrap gap-1">
                {(['classic', 'wood', 'digital', 'soft'] as SoundPreset[]).map(
                  (preset) => (
                    <HardwareButton
                      key={preset}
                      onClick={() => setSoundPreset(preset)}
                      active={soundPreset === preset}
                      size="sm"
                    >
                      {preset}
                    </HardwareButton>
                  )
                )}
              </div>
            </div>

            {/* Accent pattern visualizer */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                Accent Pattern
              </label>
              <div className="flex gap-1">
                {accentPattern.map((level, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'flex-1 h-8 rounded flex items-center justify-center text-xs font-mono',
                      level >= 0.8
                        ? 'bg-hw-red/30 text-hw-red border border-hw-red/50'
                        : 'bg-hw-surface text-gray-500'
                    )}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom brass strip */}
      <div className="h-1 bg-gradient-to-r from-hw-brass/50 via-hw-brass to-hw-brass/50" />
    </div>
  );
}

export default HardwareMetronome;
