/**
 * MorphDialog - Visual mapping dialog for formation morphing
 *
 * Split-view dot map showing source and target positions with connecting
 * lines. Supports proximity, index-order, and manual matching methods.
 *
 * MorphSliderDialog (Feature 10) - Continuous slider to interpolate between
 * current formation and a target formation template, with live preview.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Shuffle, ArrowRight, Check, X } from 'lucide-react';
import type { Position, Performer } from '../../services/formationTypes';
import { calculateMorphMapping, type MorphMethod } from '../../services/movementTools';
import { FORMATION_TEMPLATES, type FormationTemplate } from '../../services/formationTemplates';

// ============================================================================
// TYPES
// ============================================================================

interface MorphDialogProps {
  sourcePositions: Position[];
  targetPositions: Position[];
  performerIds: string[];
  performerNames: string[];
  onApply: (mapping: Map<number, number>) => void;
  onClose: () => void;
}

interface DotMapDimensions {
  width: number;
  height: number;
  padding: number;
}

const DOT_RADIUS = 8;
const MAP_DIMS: DotMapDimensions = { width: 260, height: 200, padding: 20 };
const GAP = 60; // gap between source and target maps

// ============================================================================
// HELPERS
// ============================================================================

function posToPixel(pos: Position, dims: DotMapDimensions): { x: number; y: number } {
  const usable = { w: dims.width - 2 * dims.padding, h: dims.height - 2 * dims.padding };
  return {
    x: dims.padding + (pos.x / 100) * usable.w,
    y: dims.padding + (pos.y / 100) * usable.h,
  };
}

const METHOD_LABELS: Record<MorphMethod, string> = {
  proximity: 'Proximity (nearest)',
  index: 'Index Order',
  manual: 'Manual',
};

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MorphDialog: React.FC<MorphDialogProps> = ({
  sourcePositions,
  targetPositions,
  performerIds: _performerIds,
  performerNames,
  onApply,
  onClose,
}) => {
  // _performerIds available for future use (e.g., filtering, labeling)
  const [method, setMethod] = useState<MorphMethod>('proximity');
  const [manualMapping, setManualMapping] = useState<Map<number, number>>(new Map());
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationT, setAnimationT] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Compute the active mapping based on current method
  const activeMapping = useMemo(() => {
    if (method === 'manual') {
      return manualMapping;
    }

    const morphMappings = calculateMorphMapping(sourcePositions, targetPositions, method);
    const map = new Map<number, number>();
    for (const m of morphMappings) {
      map.set(m.fromIndex, m.toIndex);
    }
    return map;
  }, [method, sourcePositions, targetPositions, manualMapping]);

  // Handle manual mode dot clicks
  const handleSourceDotClick = useCallback(
    (index: number) => {
      if (method !== 'manual') return;
      setSelectedSourceIndex(index);
    },
    [method],
  );

  const handleTargetDotClick = useCallback(
    (index: number) => {
      if (method !== 'manual' || selectedSourceIndex === null) return;

      setManualMapping((prev) => {
        const next = new Map(prev);
        // Remove any existing mapping to this target
        for (const [k, v] of next) {
          if (v === index) next.delete(k);
        }
        next.set(selectedSourceIndex, index);
        return next;
      });
      setSelectedSourceIndex(null);
    },
    [method, selectedSourceIndex],
  );

  // Preview animation
  const handlePreview = useCallback(() => {
    if (isAnimating) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
      setAnimationT(0);
      return;
    }

    setIsAnimating(true);
    setAnimationT(0);
    const startTime = performance.now();
    const duration = 1500; // ms

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      setAnimationT(t);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Hold for a moment then reset
        setTimeout(() => {
          setIsAnimating(false);
          setAnimationT(0);
        }, 500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isAnimating]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Apply mapping
  const handleApply = useCallback(() => {
    onApply(activeMapping);
  }, [activeMapping, onApply]);

  // Reset manual mapping when method changes
  useEffect(() => {
    if (method === 'manual') {
      // Initialize manual mapping with proximity results
      const proximityMappings = calculateMorphMapping(sourcePositions, targetPositions, 'proximity');
      const map = new Map<number, number>();
      for (const m of proximityMappings) {
        map.set(m.fromIndex, m.toIndex);
      }
      setManualMapping(map);
    }
    setSelectedSourceIndex(null);
  }, [method, sourcePositions, targetPositions]);

  const totalWidth = MAP_DIMS.width * 2 + GAP;
  const totalHeight = MAP_DIMS.height;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Formation Morph Mapping"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Formation Morph
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close morph dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Method Selector */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Matching Method
            </label>
            <div className="flex gap-2">
              {(['proximity', 'index', 'manual'] as MorphMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    method === m
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
            {method === 'manual' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Click a source dot (left), then click a target dot (right) to create a mapping.
              </p>
            )}
          </div>

          {/* Dot Maps */}
          <div className="flex justify-center mb-5">
            <svg
              width={totalWidth}
              height={totalHeight + 30}
              className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Labels */}
              <text
                x={MAP_DIMS.width / 2}
                y={14}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400 text-xs"
              >
                Source
              </text>
              <text
                x={MAP_DIMS.width + GAP + MAP_DIMS.width / 2}
                y={14}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400 text-xs"
              >
                Target
              </text>

              {/* Arrow between panels */}
              <g transform={`translate(${MAP_DIMS.width + GAP / 2}, ${totalHeight / 2 + 15})`}>
                <ArrowRight className="w-5 h-5 text-gray-400" x={-10} y={-10} />
                <line x1={-12} y1={0} x2={12} y2={0} stroke="currentColor" className="text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
                <polygon points="12,-4 20,0 12,4" className="fill-gray-300 dark:fill-gray-600" />
              </g>

              {/* Connecting lines */}
              {!isAnimating && Array.from(activeMapping.entries()).map(([srcIdx, tgtIdx]) => {
                const srcPos = sourcePositions[srcIdx];
                const tgtPos = targetPositions[tgtIdx];
                if (!srcPos || !tgtPos) return null;

                const src = posToPixel(srcPos, MAP_DIMS);
                const tgt = posToPixel(tgtPos, MAP_DIMS);
                const color = getColor(srcIdx);

                return (
                  <line
                    key={`line-${srcIdx}-${tgtIdx}`}
                    x1={src.x}
                    y1={src.y + 20}
                    x2={tgt.x + MAP_DIMS.width + GAP}
                    y2={tgt.y + 20}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeOpacity={0.4}
                    strokeDasharray="4 2"
                  />
                );
              })}

              {/* Animated positions */}
              {isAnimating && sourcePositions.map((srcPos, i) => {
                const tgtIdx = activeMapping.get(i);
                const tgtPos = tgtIdx !== undefined ? targetPositions[tgtIdx] : srcPos;

                const interpX = srcPos.x + (tgtPos.x - srcPos.x) * animationT;
                const interpY = srcPos.y + (tgtPos.y - srcPos.y) * animationT;

                const pos = posToPixel({ x: interpX, y: interpY }, MAP_DIMS);
                const xOffset = MAP_DIMS.width / 2 + GAP / 2;

                return (
                  <circle
                    key={`anim-${i}`}
                    cx={pos.x + xOffset}
                    cy={pos.y + 20}
                    r={DOT_RADIUS}
                    fill={getColor(i)}
                    fillOpacity={0.9}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                );
              })}

              {/* Source dots */}
              {!isAnimating && sourcePositions.map((pos, i) => {
                const p = posToPixel(pos, MAP_DIMS);
                const isSelected = selectedSourceIndex === i;
                const isMapped = activeMapping.has(i);

                return (
                  <g
                    key={`src-${i}`}
                    onClick={() => handleSourceDotClick(i)}
                    className={method === 'manual' ? 'cursor-pointer' : ''}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y + 20}
                      r={DOT_RADIUS}
                      fill={isMapped ? getColor(i) : '#9ca3af'}
                      fillOpacity={0.9}
                      stroke={isSelected ? '#3b82f6' : 'white'}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    <text
                      x={p.x}
                      y={p.y + 20 + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-white text-[8px] font-bold pointer-events-none select-none"
                    >
                      {i + 1}
                    </text>
                    {/* Tooltip */}
                    <title>{performerNames[i] ?? `Performer ${i + 1}`}</title>
                  </g>
                );
              })}

              {/* Target dots */}
              {!isAnimating && targetPositions.map((pos, i) => {
                const p = posToPixel(pos, MAP_DIMS);
                // Find which source maps to this target
                const mappedSourceIdx = Array.from(activeMapping.entries()).find(
                  ([, v]) => v === i,
                )?.[0];
                const isMapped = mappedSourceIdx !== undefined;

                return (
                  <g
                    key={`tgt-${i}`}
                    onClick={() => handleTargetDotClick(i)}
                    className={method === 'manual' && selectedSourceIndex !== null ? 'cursor-pointer' : ''}
                  >
                    <circle
                      cx={p.x + MAP_DIMS.width + GAP}
                      cy={p.y + 20}
                      r={DOT_RADIUS}
                      fill={isMapped ? getColor(mappedSourceIdx!) : '#9ca3af'}
                      fillOpacity={0.9}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <text
                      x={p.x + MAP_DIMS.width + GAP}
                      y={p.y + 20 + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-white text-[8px] font-bold pointer-events-none select-none"
                    >
                      {i + 1}
                    </text>
                    <title>{`Target ${i + 1}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Mapping summary */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Mapping Summary
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-32 overflow-y-auto">
              {Array.from(activeMapping.entries())
                .sort(([a], [b]) => a - b)
                .map(([srcIdx, tgtIdx]) => (
                  <div key={srcIdx} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getColor(srcIdx) }}
                    />
                    <span className="truncate">
                      {performerNames[srcIdx] ?? `#${srcIdx + 1}`}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
                    <span className="text-gray-400">
                      Pos {tgtIdx + 1}
                    </span>
                  </div>
                ))}
            </div>
            {activeMapping.size === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                No mappings defined
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Shuffle className="w-4 h-4" aria-hidden="true" />
            {isAnimating ? 'Stop Preview' : 'Preview'}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={activeMapping.size === 0}
              className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MorphDialog;

// ============================================================================
// MORPH SLIDER DIALOG (Feature 10)
// ============================================================================

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface MorphSliderDialogProps {
  open: boolean;
  onClose: () => void;
  performers: Performer[];
  currentPositions: Map<string, Position>;
  onApply: (positions: Map<string, Position>) => void;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPosition(current: Position, target: Position, t: number): Position {
  return {
    x: lerp(current.x, target.x, t),
    y: lerp(current.y, target.y, t),
  };
}

const PREVIEW_DIMS = { width: 320, height: 240, padding: 24 };
const PREVIEW_DOT_RADIUS = 6;

function posToPreviewPixel(pos: Position): { x: number; y: number } {
  const usable = {
    w: PREVIEW_DIMS.width - 2 * PREVIEW_DIMS.padding,
    h: PREVIEW_DIMS.height - 2 * PREVIEW_DIMS.padding,
  };
  return {
    x: PREVIEW_DIMS.padding + (pos.x / 100) * usable.w,
    y: PREVIEW_DIMS.padding + (pos.y / 100) * usable.h,
  };
}

/**
 * Generate target positions for each performer from a formation template.
 * Uses the template generator to produce positions for N performers,
 * then maps each performer ID to a template position by index order.
 */
function targetPositionsFromTemplate(
  template: FormationTemplate,
  performerIds: string[],
): Map<string, Position> {
  const generated = template.generator(
    performerIds.length,
    { minX: 15, minY: 15, maxX: 85, maxY: 85 },
  );
  const result = new Map<string, Position>();
  for (let i = 0; i < performerIds.length; i++) {
    const pos = generated[i];
    if (pos) {
      result.set(performerIds[i], { x: pos.x, y: pos.y });
    }
  }
  return result;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export const MorphSliderDialog: React.FC<MorphSliderDialogProps> = ({
  open,
  onClose,
  performers,
  currentPositions,
  onApply,
}) => {
  const [morphT, setMorphT] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    FORMATION_TEMPLATES[0]?.id ?? '',
  );
  // Build performer ID list (stable order)
  const performerIds = useMemo(
    () => performers.map((p) => p.id),
    [performers],
  );

  // Compute target positions from the selected template
  const targetPositions = useMemo(() => {
    const template = FORMATION_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!template) return new Map<string, Position>();
    return targetPositionsFromTemplate(template, performerIds);
  }, [selectedTemplateId, performerIds]);

  // Compute interpolated positions based on slider value
  const interpolatedPositions = useMemo(() => {
    const t = morphT / 100;
    const result = new Map<string, Position>();

    for (const id of performerIds) {
      const current = currentPositions.get(id);
      const target = targetPositions.get(id);
      if (current && target) {
        result.set(id, lerpPosition(current, target, t));
      } else if (current) {
        result.set(id, current);
      }
    }

    return result;
  }, [morphT, performerIds, currentPositions, targetPositions]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMorphT(Number(e.target.value));
    },
    [],
  );

  // Handle template selection
  const handleTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedTemplateId(e.target.value);
      setMorphT(0);
    },
    [],
  );

  // Apply the current interpolated positions
  const handleApply = useCallback(() => {
    onApply(interpolatedPositions);
  }, [interpolatedPositions, onApply]);

  // Reset slider when dialog opens
  useEffect(() => {
    if (open) {
      setMorphT(0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Formation Morph Slider"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Formation Morph Slider
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close morph slider dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* Target Selector */}
          <div className="mb-5">
            <label
              htmlFor="morph-target-template"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Target Formation
            </label>
            <select
              id="morph-target-template"
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {FORMATION_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
          </div>

          {/* Morph Slider */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="morph-slider"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Morph Amount
              </label>
              <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                {morphT}%
              </span>
            </div>
            <input
              id="morph-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={morphT}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={morphT}
              aria-label="Morph interpolation amount"
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
              <span>Current</span>
              <span>Target</span>
            </div>
          </div>

          {/* Live Preview */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </h3>
            <div className="flex justify-center">
              <svg
                width={PREVIEW_DIMS.width}
                height={PREVIEW_DIMS.height}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* Ghost dots: target positions (faded) */}
                {performerIds.map((id, i) => {
                  const target = targetPositions.get(id);
                  if (!target) return null;
                  const p = posToPreviewPixel(target);
                  return (
                    <circle
                      key={`ghost-${id}`}
                      cx={p.x}
                      cy={p.y}
                      r={PREVIEW_DOT_RADIUS}
                      fill={getColor(i)}
                      fillOpacity={0.15}
                      stroke={getColor(i)}
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      strokeDasharray="2 2"
                    />
                  );
                })}

                {/* Current dots: original positions (ring only) */}
                {performerIds.map((id, i) => {
                  const current = currentPositions.get(id);
                  if (!current) return null;
                  const p = posToPreviewPixel(current);
                  return (
                    <circle
                      key={`orig-${id}`}
                      cx={p.x}
                      cy={p.y}
                      r={PREVIEW_DOT_RADIUS}
                      fill="none"
                      stroke={getColor(i)}
                      strokeWidth={1}
                      strokeOpacity={0.3}
                    />
                  );
                })}

                {/* Interpolated dots (active positions) */}
                {performerIds.map((id, i) => {
                  const pos = interpolatedPositions.get(id);
                  if (!pos) return null;
                  const p = posToPreviewPixel(pos);
                  const performer = performers[i];
                  return (
                    <g key={`interp-${id}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={PREVIEW_DOT_RADIUS}
                        fill={getColor(i)}
                        fillOpacity={0.9}
                        stroke="white"
                        strokeWidth={1.5}
                      />
                      <title>{performer?.name ?? `Performer ${i + 1}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
