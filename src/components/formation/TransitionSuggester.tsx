/**
 * TransitionSuggester - Popover panel showing 3 transition variants
 *
 * Each variant card shows: style label, collision count badge,
 * Preview button (toggles ghost preview) and Apply button (commits paths).
 */

import { useState, useMemo, useCallback } from 'react';
import {
  GitBranch,
  AlertTriangle,
  Check,
  Eye,
  X,
} from 'lucide-react';
import type { Position, PathCurve } from '../../services/formationTypes';
import {
  generateTransitionVariants,
  type TransitionVariant,
} from '../../services/transitionGenerator';
import { useGhostPreview } from '../../store/slices/ghostPreviewSlice';

// ============================================================================
// Types
// ============================================================================

interface TransitionSuggesterProps {
  /** Positions at the start of the transition (current keyframe) */
  fromPositions: Map<string, Position>;
  /** Positions at the end of the transition (next keyframe) */
  toPositions: Map<string, Position>;
  /** IDs of all performers involved */
  performerIds: string[];
  /** Called when user applies a transition variant */
  onApplyPathCurves: (pathCurves: Map<string, PathCurve>) => void;
  /** Called to close the suggester */
  onClose: () => void;
}

// ============================================================================
// Variant Card
// ============================================================================

interface VariantCardProps {
  variant: TransitionVariant;
  isPreviewActive: boolean;
  onPreview: () => void;
  onApply: () => void;
}

function VariantCard({ variant, isPreviewActive, onPreview, onApply }: VariantCardProps) {
  const collisionColor = variant.estimatedCollisions === 0
    ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
    : variant.estimatedCollisions <= 3
      ? 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20'
      : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        isPreviewActive
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-purple-500" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {variant.style.charAt(0).toUpperCase() + variant.style.slice(1)}
          </span>
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${collisionColor}`}>
          {variant.estimatedCollisions === 0
            ? 'No collisions'
            : `${variant.estimatedCollisions} collision${variant.estimatedCollisions !== 1 ? 's' : ''}`
          }
        </span>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2">
        {variant.label}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onPreview}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
            isPreviewActive
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
        >
          <Eye className="w-3 h-3" aria-hidden="true" />
          {isPreviewActive ? 'Previewing' : 'Preview'}
        </button>
        <button
          onClick={onApply}
          className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-500 hover:bg-green-600 text-white rounded transition-colors focus-visible:ring-2 focus-visible:ring-green-500 outline-none"
        >
          <Check className="w-3 h-3" aria-hidden="true" />
          Apply
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TransitionSuggester({
  fromPositions,
  toPositions,
  performerIds,
  onApplyPathCurves,
  onClose,
}: TransitionSuggesterProps) {
  const ghostPreview = useGhostPreview();
  const [previewingStyle, setPreviewingStyle] = useState<string | null>(null);

  const variants = useMemo(
    () => generateTransitionVariants(fromPositions, toPositions, performerIds),
    [fromPositions, toPositions, performerIds],
  );

  const handlePreview = useCallback((variant: TransitionVariant) => {
    if (previewingStyle === variant.style) {
      // Toggle off
      ghostPreview.clearPreview();
      setPreviewingStyle(null);
    } else {
      // Show ghost preview with path curves
      ghostPreview.setPreview({
        id: `transition-${variant.style}-${Date.now()}`,
        source: 'transition',
        sourceLabel: variant.label,
        proposedPositions: toPositions,
        proposedPathCurves: variant.pathCurves,
        affectedPerformerIds: performerIds,
      });
      setPreviewingStyle(variant.style);
    }
  }, [previewingStyle, ghostPreview, toPositions, performerIds]);

  const handleApply = useCallback((variant: TransitionVariant) => {
    onApplyPathCurves(variant.pathCurves);
    ghostPreview.clearPreview();
    setPreviewingStyle(null);
    onClose();
  }, [onApplyPathCurves, ghostPreview, onClose]);

  return (
    <div className="w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-purple-500" aria-hidden="true" />
          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
            Transition Variants
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded focus-visible:ring-2 focus-visible:ring-purple-500 outline-none"
          aria-label="Close transition suggester"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Performer count */}
      <div className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
        {performerIds.length} performer{performerIds.length !== 1 ? 's' : ''} &middot;{' '}
        {variants.reduce((min, v) => Math.min(min, v.estimatedCollisions), Infinity) === 0
          ? 'Collision-free option available'
          : 'All variants have potential collisions'
        }
      </div>

      {/* Variant cards */}
      <div className="p-2 space-y-2">
        {variants.map((variant) => (
          <VariantCard
            key={variant.style}
            variant={variant}
            isPreviewActive={previewingStyle === variant.style}
            onPreview={() => handlePreview(variant)}
            onApply={() => handleApply(variant)}
          />
        ))}
      </div>

      {/* Tip */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          Collision estimates are approximate (sampled at 3 midpoints)
        </p>
      </div>
    </div>
  );
}

export default TransitionSuggester;
