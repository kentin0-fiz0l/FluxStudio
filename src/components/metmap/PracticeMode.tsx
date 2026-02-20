/**
 * PracticeMode Component
 *
 * Controls for focused practice including section looping,
 * tempo gradual increase, repetition tracking, and auto-ramp.
 */

import { useState, useEffect, useCallback } from 'react';
import { Section } from '../../contexts/MetMapContext';

export interface AutoRampSettings {
  enabled: boolean;
  startPercent: number;
  targetPercent: number;
  stepPercent: number;
  loopsPerStep: number;
}

export interface PracticeStartInfo {
  loopedSectionName?: string;
  autoRampEnabled: boolean;
  startTempoPercent: number;
}

interface PracticeModeProps {
  sections: Section[];
  loopSection: number | null;
  onLoopSectionChange: (sectionIndex: number | null) => void;
  tempoPercent: number;
  onTempoPercentChange: (percent: number) => void;
  repetitionCount: number;
  isActive: boolean;
  onToggleActive: () => void;
  onPracticeStart?: (info: PracticeStartInfo) => void;
  className?: string;
}

const TEMPO_PRESETS = [50, 60, 70, 80, 90, 100];
const STEP_OPTIONS = [5, 10, 15, 20];
const LOOP_OPTIONS = [2, 4, 8];

const STORAGE_KEY = 'metmap_auto_ramp';

function loadAutoRamp(): AutoRampSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { enabled: false, startPercent: 60, targetPercent: 100, stepPercent: 5, loopsPerStep: 4 };
}

function saveAutoRamp(settings: AutoRampSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function PracticeMode({
  sections,
  loopSection,
  onLoopSectionChange,
  tempoPercent,
  onTempoPercentChange,
  repetitionCount,
  isActive,
  onToggleActive,
  onPracticeStart,
  className = ''
}: PracticeModeProps) {
  const [expanded, setExpanded] = useState(false);
  const [autoRamp, setAutoRamp] = useState<AutoRampSettings>(loadAutoRamp);
  const [showAutoRamp, setShowAutoRamp] = useState(false);
  const [rampNotification, setRampNotification] = useState<string | null>(null);

  // Persist auto-ramp settings
  useEffect(() => { saveAutoRamp(autoRamp); }, [autoRamp]);

  // Set start tempo when enabling auto-ramp
  const handleToggleAutoRamp = useCallback(() => {
    const next = { ...autoRamp, enabled: !autoRamp.enabled };
    if (next.enabled) {
      next.startPercent = tempoPercent;
      onTempoPercentChange(tempoPercent);
    }
    setAutoRamp(next);
  }, [autoRamp, tempoPercent, onTempoPercentChange]);

  // Auto-ramp: check on repetition count changes (called by parent)
  useEffect(() => {
    if (!autoRamp.enabled || !isActive || repetitionCount === 0) return;
    if (repetitionCount % autoRamp.loopsPerStep !== 0) return;

    const newPercent = Math.min(tempoPercent + autoRamp.stepPercent, autoRamp.targetPercent);
    if (newPercent <= tempoPercent) return;

    // Defer to avoid synchronous setState-in-effect lint violation
    const timer = setTimeout(() => {
      onTempoPercentChange(newPercent);
      const msg = `Tempo → ${newPercent}%`;
      setRampNotification(msg);
      // Announce to screen reader
      const announcement = document.createElement('div');
      announcement.setAttribute('role', 'status');
      announcement.setAttribute('aria-live', 'polite');
      announcement.className = 'sr-only';
      announcement.textContent = msg;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 2000);
    }, 0);
    return () => clearTimeout(timer);
  }, [repetitionCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear notification after a delay
  useEffect(() => {
    if (!rampNotification) return;
    const timer = setTimeout(() => setRampNotification(null), 2500);
    return () => clearTimeout(timer);
  }, [rampNotification]);

  // Reset auto-ramp when practice mode turns off
  useEffect(() => {
    if (!isActive && autoRamp.enabled) {
      const timer = setTimeout(() => setAutoRamp(prev => ({ ...prev, enabled: false })), 0);
      return () => clearTimeout(timer);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSectionSelect = (index: number) => {
    if (loopSection === index) {
      onLoopSectionChange(null);
    } else {
      onLoopSectionChange(index);
    }
  };

  const rampProgress = autoRamp.enabled
    ? Math.min(1, (tempoPercent - autoRamp.startPercent) / Math.max(1, autoRamp.targetPercent - autoRamp.startPercent))
    : 0;

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
              if (!isActive && onPracticeStart) {
                onPracticeStart({
                  loopedSectionName: loopSection !== null ? sections[loopSection]?.name : undefined,
                  autoRampEnabled: autoRamp.enabled,
                  startTempoPercent: tempoPercent,
                });
              }
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

      {/* Ramp notification toast */}
      {rampNotification && (
        <div className="mx-3 mb-2 px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-md text-center animate-pulse">
          {rampNotification}
        </div>
      )}

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
          </div>

          {/* Auto-Ramp */}
          <div className="bg-white/50 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAutoRamp(!showAutoRamp)}
                className="text-sm font-medium text-amber-800 flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showAutoRamp ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Auto-Ramp
              </button>
              <button
                onClick={handleToggleAutoRamp}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  autoRamp.enabled
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-600 border border-amber-300'
                }`}
              >
                {autoRamp.enabled ? 'On' : 'Off'}
              </button>
            </div>

            {/* Auto-ramp progress bar */}
            {autoRamp.enabled && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-amber-600 mb-0.5">
                  <span>{autoRamp.startPercent}%</span>
                  <span>{tempoPercent}%</span>
                  <span>{autoRamp.targetPercent}%</span>
                </div>
                <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${rampProgress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Auto-ramp settings */}
            {showAutoRamp && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-700 w-20">Target:</span>
                  <input
                    type="range"
                    min="50" max="150"
                    value={autoRamp.targetPercent}
                    onChange={(e) => setAutoRamp(prev => ({ ...prev, targetPercent: parseInt(e.target.value) }))}
                    className="flex-1 accent-amber-600 h-1"
                  />
                  <span className="text-xs text-amber-800 w-10 text-right">{autoRamp.targetPercent}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-700 w-20">Step:</span>
                  <div className="flex gap-1">
                    {STEP_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setAutoRamp(prev => ({ ...prev, stepPercent: s }))}
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          autoRamp.stepPercent === s ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'
                        }`}
                      >
                        +{s}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-700 w-20">Every:</span>
                  <div className="flex gap-1">
                    {LOOP_OPTIONS.map(l => (
                      <button
                        key={l}
                        onClick={() => setAutoRamp(prev => ({ ...prev, loopsPerStep: l }))}
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          autoRamp.loopsPerStep === l ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'
                        }`}
                      >
                        {l} loops
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
              <li>Use Auto-Ramp for automatic tempo progression</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default PracticeMode;
