/**
 * QuickStartWizard - Drill writer quick-start setup
 *
 * Guides new users through show setup:
 * 1. Show name + field type
 * 2. Section/instrument configuration
 * 3. Show duration + BPM
 * 4. Generate and preview
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Wand2, Plus, Trash2, Check, X, ChevronRight, ChevronLeft, Music } from 'lucide-react';
import type { FieldConfig, Performer } from '../../services/formationTypes';
import { getFieldPresetList } from '../../services/fieldConfigService';
import { generateQuickStartShow, type QuickStartConfig } from '../../services/drillAiService';

// ============================================================================
// TYPES
// ============================================================================

interface QuickStartWizardProps {
  onComplete: (config: {
    showName: string;
    fieldType: FieldConfig['type'];
    performers: Omit<Performer, 'id'>[];
    initialSets: Array<{ name: string; counts: number; description: string }>;
  }) => void;
  onClose: () => void;
}

interface SectionEntry {
  id: string;
  name: string;
  instrument: string;
  count: number;
}

const DEFAULT_SECTIONS: SectionEntry[] = [
  { id: '1', name: 'Brass', instrument: 'Trumpet', count: 12 },
  { id: '2', name: 'Brass', instrument: 'Mellophone', count: 8 },
  { id: '3', name: 'Brass', instrument: 'Trombone', count: 8 },
  { id: '4', name: 'Brass', instrument: 'Tuba', count: 6 },
  { id: '5', name: 'Woodwinds', instrument: 'Clarinet', count: 10 },
  { id: '6', name: 'Woodwinds', instrument: 'Flute', count: 8 },
  { id: '7', name: 'Percussion', instrument: 'Snare', count: 4 },
  { id: '8', name: 'Percussion', instrument: 'Bass Drum', count: 4 },
  { id: '9', name: 'Percussion', instrument: 'Cymbals', count: 2 },
  { id: '10', name: 'Color Guard', instrument: 'Flag', count: 8 },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const QuickStartWizard: React.FC<QuickStartWizardProps> = ({
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState(0);
  const fieldPresets = useMemo(() => getFieldPresetList(), []);

  // Step 1: Show info
  const [showName, setShowName] = useState('My Show');
  const [fieldType, setFieldType] = useState<FieldConfig['type']>('ncaa_football');

  // Step 2: Sections
  const [sections, setSections] = useState<SectionEntry[]>(DEFAULT_SECTIONS);
  let nextId = 20;

  // Step 3: Duration
  const [showDuration, setShowDuration] = useState(6);
  const [musicBpm, setMusicBpm] = useState(120);

  const totalPerformers = useMemo(
    () => sections.reduce((sum, s) => sum + s.count, 0),
    [sections],
  );

  const addSection = useCallback(() => {
    setSections((prev) => [
      ...prev,
      { id: String(nextId++), name: 'Brass', instrument: '', count: 4 },
    ]);
  }, []);

  const removeSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSection = useCallback(
    (id: string, field: keyof SectionEntry, value: string | number) => {
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  // Generate preview
  const preview = useMemo(() => {
    if (step < 3) return null;

    const config: QuickStartConfig = {
      showName,
      bandSize: totalPerformers,
      fieldType,
      showDuration,
      sections: sections.map((s) => ({
        name: s.name,
        instrument: s.instrument,
        count: s.count,
      })),
      musicBpm,
    };

    return generateQuickStartShow(config);
  }, [step, showName, totalPerformers, fieldType, showDuration, sections, musicBpm]);

  const handleComplete = useCallback(() => {
    if (!preview) return;
    onComplete({
      showName,
      fieldType,
      performers: preview.performers,
      initialSets: preview.initialSets,
    });
  }, [preview, showName, fieldType, onComplete]);

  const steps = ['Show Info', 'Sections', 'Duration', 'Review'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Start Wizard"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Start</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 bg-gray-50 dark:bg-gray-900/50">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  i === step
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : i < step
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400'
                }`}
              >
                {i < step ? <Check className="w-3 h-3 inline-block mr-0.5" /> : null}
                {s}
              </span>
              {i < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Show Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Show Name
                </label>
                <input
                  type="text"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="My Halftime Show"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Field Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {fieldPresets.map((preset) => (
                    <button
                      key={preset.type}
                      onClick={() => setFieldType(preset.type)}
                      className={`p-3 rounded-lg border text-center text-sm ${
                        fieldType === preset.type
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Sections */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {totalPerformers} performers total
                </p>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {sections.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <select
                      value={s.name}
                      onChange={(e) => updateSection(s.id, 'name', e.target.value)}
                      className="px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      {['Brass', 'Woodwinds', 'Percussion', 'Color Guard', 'Drum Major'].map(
                        (n) => <option key={n} value={n}>{n}</option>,
                      )}
                    </select>
                    <input
                      type="text"
                      value={s.instrument}
                      onChange={(e) => updateSection(s.id, 'instrument', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      placeholder="Instrument"
                    />
                    <input
                      type="number"
                      value={s.count}
                      onChange={(e) =>
                        updateSection(s.id, 'count', Math.max(1, Number(e.target.value)))
                      }
                      min={1}
                      className="w-16 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-center"
                    />
                    <button
                      onClick={() => removeSection(s.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Duration */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Show Duration (minutes)
                </label>
                <input
                  type="number"
                  value={showDuration}
                  onChange={(e) => setShowDuration(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={30}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-gray-400" />
                  Music BPM
                </label>
                <input
                  type="number"
                  value={musicBpm}
                  onChange={(e) => setMusicBpm(Math.max(40, Number(e.target.value)))}
                  min={40}
                  max={240}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && preview && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Ready to create: "{showName}"
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {preview.performers.length} performers, {preview.initialSets.length} sets
                </p>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Performers
                </h4>
                <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                  {sections.map((s) => (
                    <span key={s.id} className="text-xs text-gray-600 dark:text-gray-300">
                      {s.instrument} x{s.count}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Show Structure
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {preview.initialSets.map((set, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 dark:bg-gray-900/50 rounded"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{set.name}</span>
                      <span className="text-gray-400">{set.counts} counts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
          >
            {step > 0 ? (
              <>
                <ChevronLeft className="w-4 h-4" /> Back
              </>
            ) : (
              <>
                <X className="w-4 h-4" /> Cancel
              </>
            )}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !showName.trim()}
              className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-1.5 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
            >
              <Wand2 className="w-4 h-4" /> Create Show
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickStartWizard;
