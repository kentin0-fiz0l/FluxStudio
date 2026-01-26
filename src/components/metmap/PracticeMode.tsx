/**
 * PracticeMode Component
 *
 * Controls for focused practice including section looping,
 * tempo gradual increase, and repetition tracking.
 */

import { useState, useCallback } from 'react';
import { Section } from '../../contexts/MetMapContext';

interface PracticeModeProps {
  sections: Section[];
  loopSection: number | null;
  onLoopSectionChange: (sectionIndex: number | null) => void;
  tempoPercent: number;
  onTempoPercentChange: (percent: number) => void;
  repetitionCount: number;
  isActive: boolean;
  onToggleActive: () => void;
  className?: string;
}

const TEMPO_PRESETS = [50, 60, 70, 80, 90, 100];

export function PracticeMode({
  sections,
  loopSection,
  onLoopSectionChange,
  tempoPercent,
  onTempoPercentChange,
  repetitionCount,
  isActive,
  onToggleActive,
  className = ''
}: PracticeModeProps) {
  const [expanded, setExpanded] = useState(false);

  const handleSectionSelect = (index: number) => {
    if (loopSection === index) {
      onLoopSectionChange(null);
    } else {
      onLoopSectionChange(index);
    }
  };

  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="font-medium text-amber-900">Practice Mode</span>
          {isActive && (
            <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loopSection !== null && (
            <span className="text-xs text-amber-700">
              Looping: {sections[loopSection]?.name}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              isActive
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
            }`}
          >
            {isActive ? 'Exit Practice' : 'Start Practice'}
          </button>
          <svg
            className={`w-5 h-5 text-amber-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-4">
          {/* Section selection */}
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Loop Section
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onLoopSectionChange(null)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  loopSection === null
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                }`}
              >
                All Sections
              </button>
              {sections.map((section, index) => (
                <button
                  key={section.id || index}
                  onClick={() => handleSectionSelect(index)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    loopSection === index
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tempo control */}
          <div>
            <label className="block text-sm font-medium text-amber-800 mb-2">
              Practice Tempo: {tempoPercent}%
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="25"
                max="150"
                value={tempoPercent}
                onChange={(e) => onTempoPercentChange(parseInt(e.target.value))}
                className="flex-1 accent-amber-600"
              />
              <div className="flex gap-1">
                {TEMPO_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onTempoPercentChange(preset)}
                    className={`px-2 py-1 text-xs rounded ${
                      tempoPercent === preset
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Start slow and gradually increase to full tempo
            </p>
          </div>

          {/* Repetition counter */}
          <div className="flex items-center justify-between bg-white/50 rounded-lg p-3">
            <div>
              <div className="text-sm font-medium text-amber-800">Repetitions</div>
              <div className="text-xs text-amber-600">This practice session</div>
            </div>
            <div className="text-3xl font-bold text-amber-700">
              {repetitionCount}
            </div>
          </div>

          {/* Tips */}
          <div className="text-xs text-amber-700 bg-white/50 rounded p-2">
            <strong>Practice Tips:</strong>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>Start at 50-60% tempo until you can play cleanly</li>
              <li>Increase tempo by 5-10% when comfortable</li>
              <li>Loop difficult sections until mastered</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default PracticeMode;
