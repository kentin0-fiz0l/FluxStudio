/**
 * CoordinatePanel Component
 *
 * Side panel that displays detailed coordinate information for a selected
 * performer in standard drill notation. Shows the performer's position,
 * step info to/from adjacent sets, and provides a "Copy coordinate" action.
 *
 * When no performer is selected, a placeholder message is shown.
 */

import { useMemo, useCallback, useState } from 'react';
import { MapPin, ArrowRight, ArrowLeft, Copy, Navigation } from 'lucide-react';
import type { Position, FieldConfig } from '../../services/formationTypes';
import { positionToCoordinate, calculateStepInfo } from '../../utils/drillCoordinates';

// ============================================================================
// Types
// ============================================================================

export interface CoordinatePanelProps {
  /** Currently selected performer ID (null if none selected) */
  performerId: string | null;
  /** Display name for the selected performer */
  performerName: string;
  /** Current position of the selected performer */
  position: Position | null;
  /** Position in the next set (null if last set or none) */
  nextPosition: Position | null;
  /** Position in the previous set (null if first set or none) */
  prevPosition: Position | null;
  /** Field configuration for coordinate calculations */
  fieldConfig: FieldConfig;
  /** Count duration of the current set (for step size to next) */
  currentSetCounts: number;
  /** Count duration of the previous set (for step size from prev) */
  prevSetCounts: number;
  /** Callback when the user manually adjusts the position */
  onPositionChange: (pos: Position) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DIFFICULTY_STYLES = {
  easy: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
    label: 'Easy',
  },
  moderate: {
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    dot: 'bg-yellow-500',
    label: 'Moderate',
  },
  hard: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
    label: 'Hard',
  },
} as const;

const COPY_FEEDBACK_DURATION_MS = 2000;

// ============================================================================
// Main Component
// ============================================================================

export function CoordinatePanel({
  performerId,
  performerName,
  position,
  nextPosition,
  prevPosition,
  fieldConfig,
  currentSetCounts,
  prevSetCounts,
  onPositionChange: _onPositionChange,
}: CoordinatePanelProps) {
  const [copied, setCopied] = useState(false);

  // Calculate coordinate notation for the current position
  const coordinate = useMemo(() => {
    if (!position) return null;
    return positionToCoordinate(position, fieldConfig);
  }, [position, fieldConfig]);

  // Calculate step info to the next set
  const stepToNext = useMemo(() => {
    if (!position || !nextPosition || currentSetCounts <= 0) return null;
    return calculateStepInfo(position, nextPosition, currentSetCounts, fieldConfig);
  }, [position, nextPosition, currentSetCounts, fieldConfig]);

  // Calculate step info from the previous set
  const stepFromPrev = useMemo(() => {
    if (!position || !prevPosition || prevSetCounts <= 0) return null;
    return calculateStepInfo(prevPosition, position, prevSetCounts, fieldConfig);
  }, [position, prevPosition, prevSetCounts, fieldConfig]);

  // Copy coordinate string to clipboard
  const handleCopyCoordinate = useCallback(async () => {
    if (!coordinate) return;
    const text = `${coordinate.sideToSide}, ${coordinate.frontToBack}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch {
      // Fallback: silently fail if clipboard API is unavailable
    }
  }, [coordinate]);

  // ---- Placeholder when no performer is selected ----
  if (!performerId || !position) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 p-6 text-center
                    text-gray-400 dark:text-gray-500"
        data-testid="coordinate-panel-placeholder"
      >
        <MapPin className="h-8 w-8 opacity-40" />
        <p className="text-sm">Select a performer to view coordinates</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 p-4 text-sm
                  text-gray-800 dark:text-gray-200"
      data-testid="coordinate-panel"
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <span className="font-semibold truncate max-w-[160px]" title={performerName}>
            {performerName}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyCoordinate}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
                     bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                     text-gray-600 dark:text-gray-300 transition-colors"
          title="Copy coordinate to clipboard"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* ---- Coordinate Display ---- */}
      {coordinate && (
        <div
          className="rounded-lg border border-gray-200 dark:border-gray-700
                      bg-gray-50 dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700"
        >
          {/* Side-to-side */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 shrink-0">
              S/S
            </span>
            <span className="font-mono text-sm">{coordinate.sideToSide}</span>
          </div>
          {/* Front-to-back */}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 shrink-0">
              F/B
            </span>
            <span className="font-mono text-sm">{coordinate.frontToBack}</span>
          </div>
        </div>
      )}

      {/* ---- Step Info: To Next Set ---- */}
      {stepToNext && (
        <StepInfoSection
          label="To next set"
          icon={<ArrowRight className="h-3.5 w-3.5" />}
          stepInfo={stepToNext}
        />
      )}

      {/* ---- Step Info: From Previous Set ---- */}
      {stepFromPrev && (
        <StepInfoSection
          label="From previous set"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
          stepInfo={stepFromPrev}
        />
      )}
    </div>
  );
}

// ============================================================================
// StepInfoSection Sub-component
// ============================================================================

interface StepInfoSectionProps {
  label: string;
  icon: React.ReactNode;
  stepInfo: {
    stepSizeLabel: string;
    directionLabel: string;
    difficulty: 'easy' | 'moderate' | 'hard';
    counts: number;
    distanceYards: number;
  };
}

function StepInfoSection({ label, icon, stepInfo }: StepInfoSectionProps) {
  const styles = DIFFICULTY_STYLES[stepInfo.difficulty];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Section header */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        {icon}
        <span>{label}</span>
        <span className="text-gray-400 dark:text-gray-500">
          ({stepInfo.counts} count{stepInfo.counts !== 1 ? 's' : ''})
        </span>
      </div>

      {/* Step details card */}
      <div
        className={`rounded-lg border px-3 py-2 ${styles.bg} ${styles.border}`}
      >
        {/* Step size and difficulty */}
        <div className="flex items-center justify-between">
          <span className={`font-mono font-semibold text-sm ${styles.text}`}>
            {stepInfo.stepSizeLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${styles.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {styles.label}
          </span>
        </div>

        {/* Direction */}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
          <Navigation className="h-3 w-3" />
          <span className="capitalize">{stepInfo.directionLabel}</span>
          <span className="text-gray-400 dark:text-gray-500 ml-1">
            ({stepInfo.distanceYards.toFixed(1)} {stepInfo.distanceYards === 1 ? 'yard' : 'yards'})
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default CoordinatePanel;
