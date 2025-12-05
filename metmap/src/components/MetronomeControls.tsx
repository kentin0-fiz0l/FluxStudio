'use client';

import { useState } from 'react';
import { useMetronome, SoundPreset } from '@/hooks/useMetronome';
import { TIME_SIGNATURES, getAccentPatterns } from '@/lib/accentPatterns';
import { SOUND_PRESETS } from '@/lib/metronome';

interface MetronomeControlsProps {
  className?: string;
  onTempoChange?: (bpm: number) => void;
}

export function MetronomeControls({
  className = '',
  onTempoChange,
}: MetronomeControlsProps) {
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
    setAccentPattern,
    tap,
  } = useMetronome();

  const [showSettings, setShowSettings] = useState(false);

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

  const availablePatterns = getAccentPatterns(timeSignature);

  // Find current pattern name
  const currentPatternName = availablePatterns.find(
    p => JSON.stringify(p.pattern) === JSON.stringify(accentPattern)
  )?.name || 'Custom';

  return (
    <div className={`bg-gray-900 rounded-xl p-4 ${className}`}>
      {/* Visual Beat Display */}
      <div className="flex items-center justify-center mb-4">
        {/* Beat dots */}
        <div className="flex gap-2">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={`
                w-4 h-4 rounded-full transition-all duration-100
                ${currentBeat === i && isPlaying
                  ? i === 0
                    ? 'bg-red-500 scale-125 shadow-lg shadow-red-500/50'
                    : 'bg-blue-400 scale-110 shadow-lg shadow-blue-400/50'
                  : accentPattern[i] >= 0.8
                    ? 'bg-gray-500'
                    : 'bg-gray-700'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Main Pulse Indicator */}
      <div className="flex justify-center mb-4">
        <div
          className={`
            w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-75 cursor-pointer
            ${isPlaying
              ? beatPulse
                ? isDownbeat
                  ? 'bg-red-500 scale-110 shadow-xl shadow-red-500/50'
                  : 'bg-blue-500 scale-105 shadow-lg shadow-blue-500/40'
                : 'bg-gray-700'
              : 'bg-gray-800 hover:bg-gray-700'
            }
          `}
          onClick={toggle}
        >
          {isPlaying ? (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </div>

      {/* Tempo Display & Controls */}
      <div className="text-center mb-4">
        <div className="text-4xl font-mono font-bold text-white mb-1">
          {tempo}
          <span className="text-lg text-gray-400 ml-1">BPM</span>
        </div>
        <div className="text-sm text-gray-400">
          {timeSignature}
          {subdivisions > 1 && ` · ${['', '', '8ths', 'triplets', '16ths'][subdivisions]}`}
        </div>
      </div>

      {/* Tempo Slider */}
      <div className="mb-4">
        <input
          type="range"
          min="20"
          max="300"
          value={tempo}
          onChange={(e) => handleTempoChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:hover:bg-blue-400"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>20</span>
          <span>160</span>
          <span>300</span>
        </div>
      </div>

      {/* Quick Controls */}
      <div className="flex gap-2 mb-4">
        {/* Tempo adjust buttons */}
        <button
          onClick={() => handleTempoChange(tempo - 5)}
          className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white
                     active:scale-95 transition-transform min-h-[44px]"
        >
          -5
        </button>
        <button
          onClick={() => handleTempoChange(tempo - 1)}
          className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white
                     active:scale-95 transition-transform min-h-[44px]"
        >
          -1
        </button>
        <button
          onClick={handleTap}
          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white
                     font-medium active:scale-95 transition-transform min-h-[44px]"
        >
          TAP
        </button>
        <button
          onClick={() => handleTempoChange(tempo + 1)}
          className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white
                     active:scale-95 transition-transform min-h-[44px]"
        >
          +1
        </button>
        <button
          onClick={() => handleTempoChange(tempo + 5)}
          className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white
                     active:scale-95 transition-transform min-h-[44px]"
        >
          +5
        </button>
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300
                   flex items-center justify-center gap-2 min-h-[44px]"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
        <svg
          className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Settings */}
      {showSettings && (
        <div className="mt-4 space-y-4 border-t border-gray-700 pt-4">
          {/* Time Signature */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Time Signature</label>
            <div className="grid grid-cols-5 gap-2">
              {TIME_SIGNATURES.slice(0, 10).map((ts) => (
                <button
                  key={ts.display}
                  onClick={() => setTimeSignature(ts.display)}
                  className={`
                    py-2 px-2 rounded-lg text-sm font-mono min-h-[44px]
                    ${timeSignature === ts.display
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {ts.display}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Pattern */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Accent Pattern: <span className="text-white">{currentPatternName}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availablePatterns.map((pattern) => (
                <button
                  key={pattern.name}
                  onClick={() => setAccentPattern(pattern.pattern)}
                  title={pattern.description}
                  className={`
                    py-2 px-3 rounded-lg text-sm min-h-[44px]
                    ${JSON.stringify(accentPattern) === JSON.stringify(pattern.pattern)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {pattern.name}
                </button>
              ))}
            </div>
            {/* Custom Pattern Editor */}
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-2">Tap beats to toggle accent:</div>
              <div className="flex gap-1">
                {accentPattern.map((level, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const newPattern = [...accentPattern];
                      newPattern[i] = level >= 0.8 ? 0.5 : 1;
                      setAccentPattern(newPattern);
                    }}
                    className={`
                      flex-1 py-3 rounded text-xs font-mono min-h-[44px]
                      ${level >= 0.8
                        ? 'bg-red-600 text-white'
                        : level >= 0.6
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }
                    `}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound Preset */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Click Sound</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SOUND_PRESETS) as SoundPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSoundPreset(preset)}
                  className={`
                    py-2 px-3 rounded-lg text-sm capitalize min-h-[44px]
                    ${soundPreset === preset
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Subdivisions */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Subdivisions</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 1, label: 'Quarter' },
                { value: 2, label: '8ths' },
                { value: 3, label: 'Triplets' },
                { value: 4, label: '16ths' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSubdivisions(value)}
                  className={`
                    py-2 px-2 rounded-lg text-sm min-h-[44px]
                    ${subdivisions === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetronomeControls;
