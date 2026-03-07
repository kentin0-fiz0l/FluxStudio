/**
 * PerformerView - Individual performer's movement chart
 *
 * Mobile-first view showing a single performer's dots across all sets.
 * Displays step-by-step navigation, position details, and a mini field
 * with highlighted current and next positions.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Footprints,
} from 'lucide-react';
import type { Formation, Position, FieldConfig } from '../../services/formationTypes';
import { NCAA_FOOTBALL_FIELD } from '../../services/fieldConfigService';
import { calculateStepDistance } from '../../utils/drillGeometry';

export interface PerformerViewProps {
  formation: Formation;
  performerId: string;
  fieldConfig?: FieldConfig;
  onClose: () => void;
  onChangePerformer?: (performerId: string) => void;
}

interface SetDot {
  setIndex: number;
  setName: string;
  position: Position | null;
  counts: number;
}

export function PerformerView({
  formation,
  performerId,
  fieldConfig = NCAA_FOOTBALL_FIELD,
  onClose,
  onChangePerformer,
}: PerformerViewProps) {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  const performer = useMemo(
    () => formation.performers.find((p) => p.id === performerId) ?? null,
    [formation.performers, performerId],
  );

  const sets: SetDot[] = useMemo(() => {
    return formation.keyframes.map((kf, i) => ({
      setIndex: i,
      setName: `Set ${i + 1}`,
      position: kf.positions.get(performerId) ?? null,
      counts: 8,
    }));
  }, [formation.keyframes, performerId]);

  const currentSet = sets[currentSetIndex] ?? null;
  const nextSet = sets[currentSetIndex + 1] ?? null;
  const prevSet = sets[currentSetIndex - 1] ?? null;

  const stepInfo = useMemo(() => {
    if (!currentSet?.position || !nextSet?.position) return null;
    return calculateStepDistance(currentSet.position, nextSet.position, fieldConfig);
  }, [currentSet, nextSet, fieldConfig]);

  const handlePrev = useCallback(() => {
    setCurrentSetIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSetIndex((i) => Math.min(sets.length - 1, i + 1));
  }, [sets.length]);

  if (!performer) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Performer not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: performer.color }}
          >
            {performer.label}
          </div>
          <div>
            <h2 className="font-semibold text-sm">{performer.name}</h2>
            {performer.drillNumber && (
              <span className="text-xs text-gray-400">#{performer.drillNumber}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Performer selector (if multiple) */}
      {onChangePerformer && formation.performers.length > 1 && (
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 overflow-x-auto">
          <div className="flex gap-1.5">
            {formation.performers.map((p) => (
              <button
                key={p.id}
                onClick={() => { onChangePerformer(p.id); setCurrentSetIndex(0); }}
                className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold border-2 ${
                  p.id === performerId ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mini field with current + next positions */}
      <div className="flex-1 flex items-center justify-center p-4">
        <svg viewBox="0 0 300 180" className="w-full max-w-sm bg-green-900/30 rounded-lg border border-gray-700">
          {/* Yard lines */}
          {Array.from({ length: 11 }, (_, i) => {
            const x = (i / 10) * 300;
            return (
              <line key={`yl-${i}`} x1={x} y1={0} x2={x} y2={180} stroke="#4a5568" strokeWidth={0.5} />
            );
          })}
          {/* Hash marks */}
          <line x1={0} y1={60} x2={300} y2={60} stroke="#4a5568" strokeWidth={0.3} strokeDasharray="2 4" />
          <line x1={0} y1={120} x2={300} y2={120} stroke="#4a5568" strokeWidth={0.3} strokeDasharray="2 4" />

          {/* Previous position (faded) */}
          {prevSet?.position && (
            <circle
              cx={(prevSet.position.x / 100) * 300}
              cy={(prevSet.position.y / 100) * 180}
              r={6}
              fill="none"
              stroke={performer.color}
              strokeWidth={1}
              strokeOpacity={0.3}
              strokeDasharray="2 2"
            />
          )}

          {/* Arrow from current to next */}
          {currentSet?.position && nextSet?.position && (
            <line
              x1={(currentSet.position.x / 100) * 300}
              y1={(currentSet.position.y / 100) * 180}
              x2={(nextSet.position.x / 100) * 300}
              y2={(nextSet.position.y / 100) * 180}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              markerEnd="url(#arrowhead)"
            />
          )}

          {/* Next position (outline) */}
          {nextSet?.position && (
            <circle
              cx={(nextSet.position.x / 100) * 300}
              cy={(nextSet.position.y / 100) * 180}
              r={8}
              fill="none"
              stroke={performer.color}
              strokeWidth={2}
              strokeOpacity={0.5}
            />
          )}

          {/* Current position (solid) */}
          {currentSet?.position && (
            <circle
              cx={(currentSet.position.x / 100) * 300}
              cy={(currentSet.position.y / 100) * 180}
              r={10}
              fill={performer.color}
              stroke="white"
              strokeWidth={2}
            />
          )}

          {/* Arrowhead marker definition */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="#f59e0b" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Position details */}
      <div className="px-4 py-3 bg-gray-800/50 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-gray-400">Position:</span>
          {currentSet?.position ? (
            <span className="font-mono">
              ({currentSet.position.x.toFixed(1)}, {currentSet.position.y.toFixed(1)})
            </span>
          ) : (
            <span className="text-gray-500">Not in this set</span>
          )}
        </div>
        {stepInfo && (
          <div className="flex items-center gap-2 text-sm">
            <Footprints className="w-4 h-4 text-amber-400" />
            <span className="text-gray-400">To next:</span>
            <span className="font-mono">
              {stepInfo.steps.toFixed(1)} steps ({stepInfo.yards.toFixed(1)} yds)
            </span>
          </div>
        )}
      </div>

      {/* Set navigation */}
      <div className="flex items-center justify-between px-4 py-4 bg-gray-800 border-t border-gray-700">
        <button
          onClick={handlePrev}
          disabled={currentSetIndex === 0}
          className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <div className="text-2xl font-bold">{currentSet?.setName ?? '—'}</div>
          <div className="text-sm text-gray-400">
            {currentSetIndex + 1} of {sets.length}
          </div>
        </div>
        <button
          onClick={handleNext}
          disabled={currentSetIndex >= sets.length - 1}
          className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Set dots (quick jump) */}
      <div className="px-4 py-2 bg-gray-800/50 flex justify-center gap-1 flex-wrap">
        {sets.map((s, i) => (
          <button
            key={s.setIndex}
            onClick={() => setCurrentSetIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentSetIndex ? 'bg-white' : s.position ? 'bg-gray-500 hover:bg-gray-400' : 'bg-gray-700'
            }`}
            title={s.setName}
            aria-label={`Go to ${s.setName}`}
          />
        ))}
      </div>
    </div>
  );
}

export default PerformerView;
