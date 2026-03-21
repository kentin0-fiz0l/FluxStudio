/**
 * PathEditor - Panel for multi-performer path curve editing.
 *
 * Shows selected performers with their current transition curves
 * and allows batch curve application.
 */

import React, { useState, useCallback } from 'react';
import { Spline, Users, ChevronDown, Check } from 'lucide-react';
import type { PathCurve } from '../../../services/formationTypes';
import { PathTemplateLibrary } from './PathTemplateLibrary';

/** Supported curve types for path editing */
export type CurveType = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out';

interface PerformerCurveInfo {
  id: string;
  name: string;
  label: string;
  currentCurve: PathCurve | null;
}

interface PathEditorProps {
  /** Selected performers with their current curves */
  performers: PerformerCurveInfo[];
  /** Called when curves are applied */
  onApplyCurves: (updates: Map<string, PathCurve>) => void;
  /** Close the path editor panel */
  onClose: () => void;
}

/** Predefined control points for each curve type */
const CURVE_PRESETS: Record<CurveType, Omit<PathCurve, 'cp1' | 'cp2'> & { easingControlPoints: NonNullable<PathCurve['easingControlPoints']> }> = {
  linear: { easingControlPoints: { cp1x: 0, cp1y: 0, cp2x: 1, cp2y: 1 } },
  'ease-in': { easingControlPoints: { cp1x: 0.42, cp1y: 0, cp2x: 1, cp2y: 1 } },
  'ease-out': { easingControlPoints: { cp1x: 0, cp1y: 0, cp2x: 0.58, cp2y: 1 } },
  'ease-in-out': { easingControlPoints: { cp1x: 0.42, cp1y: 0, cp2x: 0.58, cp2y: 1 } },
  bezier: { easingControlPoints: { cp1x: 0.25, cp1y: 0.1, cp2x: 0.75, cp2y: 0.9 } },
};

const CURVE_LABELS: Record<CurveType, string> = {
  linear: 'Linear',
  'ease-in': 'Ease In',
  'ease-out': 'Ease Out',
  'ease-in-out': 'Ease In-Out',
  bezier: 'Custom Bezier',
};

export const PathEditor: React.FC<PathEditorProps> = ({
  performers,
  onApplyCurves,
  onClose,
}) => {
  const [selectedCurveType, setSelectedCurveType] = useState<CurveType>('linear');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleApplyCurve = useCallback((type: CurveType) => {
    const preset = CURVE_PRESETS[type];
    const updates = new Map<string, PathCurve>();
    for (const performer of performers) {
      updates.set(performer.id, {
        cp1: performer.currentCurve?.cp1 ?? { x: 0, y: 0 },
        cp2: performer.currentCurve?.cp2 ?? { x: 0, y: 0 },
        easingControlPoints: preset.easingControlPoints,
      });
    }
    onApplyCurves(updates);
    setSelectedCurveType(type);
  }, [performers, onApplyCurves]);

  const handleApplyTemplate = useCallback((templateCurves: Map<string, PathCurve>) => {
    onApplyCurves(templateCurves);
    setShowTemplates(false);
  }, [onApplyCurves]);

  return (
    <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Spline className="w-5 h-5 text-purple-500" aria-hidden="true" />
          <h3 className="font-medium text-gray-900 dark:text-white">Path Editor</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          aria-label="Close path editor"
        >
          &times;
        </button>
      </div>

      {/* Performer list */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {performers.length} performer{performers.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {performers.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-2 py-1 rounded text-sm bg-gray-50 dark:bg-gray-700/50">
              <span className="text-gray-800 dark:text-gray-200">{p.label} - {p.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {p.currentCurve?.easingControlPoints ? 'Custom' : 'Linear'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Curve type selector */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Curve Type</h4>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(CURVE_PRESETS) as CurveType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleApplyCurve(type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                selectedCurveType === type
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {selectedCurveType === type && <Check className="w-3 h-3" aria-hidden="true" />}
              {CURVE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Curve preview SVG */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
        <svg viewBox="0 0 100 60" className="w-full h-16 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          {(() => {
            const preset = CURVE_PRESETS[selectedCurveType].easingControlPoints;
            const startX = 10;
            const endX = 90;
            const startY = 50;
            const endY = 10;
            const cp1x = startX + preset.cp1x * (endX - startX);
            const cp1y = startY - preset.cp1y * (startY - endY);
            const cp2x = startX + preset.cp2x * (endX - startX);
            const cp2y = startY - preset.cp2y * (startY - endY);
            return (
              <>
                <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2 2" />
                <path
                  d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                />
                <circle cx={startX} cy={startY} r="2.5" fill="#3b82f6" />
                <circle cx={endX} cy={endY} r="2.5" fill="#3b82f6" />
              </>
            );
          })()}
        </svg>
      </div>

      {/* Template library toggle */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <span>Path Templates</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {showTemplates && (
          <div className="mt-2">
            <PathTemplateLibrary
              performerIds={performers.map(p => p.id)}
              onApplyTemplate={handleApplyTemplate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PathEditor;
