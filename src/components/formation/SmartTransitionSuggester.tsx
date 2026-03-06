/**
 * SmartTransitionSuggester Component
 *
 * Suggests transition methods between two sets by analyzing source
 * and target positions. Generates three options (direct morph,
 * sequential push, follow-the-leader) with mini animated previews.
 * "Apply" inserts an intermediate set with the chosen transition.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Shuffle,
  ListOrdered,
  Users,
  Play,
  Pause,
  Check,
  ChevronRight,
  Loader2,
  Zap,
  RotateCcw,
  ArrowRightLeft,
} from 'lucide-react';
import type { Performer, Position } from '@/services/formationTypes';
import {
  interpolatePositions,
} from '@/services/movementTools';

// ============================================================================
// Types
// ============================================================================

interface SmartTransitionSuggesterProps {
  /** Source set positions (Map of performerId -> Position) */
  sourcePositions: Map<string, Position>;
  /** Target set positions (Map of performerId -> Position) */
  targetPositions: Map<string, Position>;
  /** All performers */
  performers: Performer[];
  /** Apply the chosen transition (intermediate positions + name) */
  onApply: (positions: Map<string, Position>, name: string) => void;
  /** Optional class name */
  className?: string;
}

interface TransitionOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Generate the intermediate positions at time t (0-1) */
  generateAt: (t: number) => Map<string, Position>;
  /** The midpoint positions to apply as an intermediate set */
  midpointPositions: Map<string, Position>;
}

// ============================================================================
// Constants
// ============================================================================

const ANIMATION_FPS = 24;
const ANIMATION_DURATION_MS = 2000;
const TOTAL_FRAMES = Math.round((ANIMATION_FPS * ANIMATION_DURATION_MS) / 1000);

// ============================================================================
// Transition Generation Logic
// ============================================================================

function generateOptions(
  sourcePositions: Map<string, Position>,
  targetPositions: Map<string, Position>,
  performers: Performer[],
): TransitionOption[] {
  // Get performer IDs that exist in both source and target
  const commonIds = performers
    .map((p) => p.id)
    .filter((id) => sourcePositions.has(id) && targetPositions.has(id));

  if (commonIds.length === 0) return [];

  // Build ordered arrays for the movement tools
  const sourceArr = commonIds.map((id) => sourcePositions.get(id)!);
  const targetArr = commonIds.map((id) => targetPositions.get(id)!);

  // Helper to convert position arrays back to Map
  const arrToMap = (positions: Position[]): Map<string, Position> => {
    const map = new Map<string, Position>();
    positions.forEach((pos, i) => {
      if (i < commonIds.length) {
        map.set(commonIds[i], pos);
      }
    });
    return map;
  };

  // Option 1: Direct Morph (linear interpolation)
  const directMorphOption: TransitionOption = {
    id: 'direct-morph',
    name: 'Direct Morph',
    description: 'Each performer moves directly to their target position along a straight path.',
    icon: <Shuffle className="w-4 h-4" aria-hidden="true" />,
    generateAt: (t: number) => {
      const interp = interpolatePositions(sourceArr, targetArr, t);
      return arrToMap(interp);
    },
    midpointPositions: arrToMap(interpolatePositions(sourceArr, targetArr, 0.5)),
  };

  // Option 2: Sequential Push (performers move one after another)
  const sequentialPushOption: TransitionOption = {
    id: 'sequential-push',
    name: 'Sequential Push',
    description: 'Performers start moving one by one in sequence, creating a ripple effect.',
    icon: <ListOrdered className="w-4 h-4" aria-hidden="true" />,
    generateAt: (t: number) => {
      const positions: Position[] = [];
      const delayFraction = 0.6 / Math.max(1, commonIds.length - 1);

      for (let i = 0; i < commonIds.length; i++) {
        const startT = i * delayFraction;
        const localT = Math.max(0, Math.min(1, (t - startT) / Math.max(0.01, 1 - startT * commonIds.length / (commonIds.length - 1 || 1))));
        // Ease-in-out for smoother look
        const eased = localT < 0.5
          ? 2 * localT * localT
          : 1 - Math.pow(-2 * localT + 2, 2) / 2;

        positions.push({
          x: sourceArr[i].x + (targetArr[i].x - sourceArr[i].x) * eased,
          y: sourceArr[i].y + (targetArr[i].y - sourceArr[i].y) * eased,
          rotation: sourceArr[i].rotation,
        });
      }
      return arrToMap(positions);
    },
    midpointPositions: (() => {
      const positions: Position[] = [];
      const delayFraction = 0.6 / Math.max(1, commonIds.length - 1);
      const t = 0.5;

      for (let i = 0; i < commonIds.length; i++) {
        const startT = i * delayFraction;
        const localT = Math.max(0, Math.min(1, (t - startT) / Math.max(0.01, 1 - startT)));
        positions.push({
          x: sourceArr[i].x + (targetArr[i].x - sourceArr[i].x) * localT,
          y: sourceArr[i].y + (targetArr[i].y - sourceArr[i].y) * localT,
          rotation: sourceArr[i].rotation,
        });
      }
      return arrToMap(positions);
    })(),
  };

  // Option 3: Follow the Leader (converge then diverge through center)
  const followLeaderOption: TransitionOption = {
    id: 'follow-leader',
    name: 'Follow Leader',
    description: 'Performers converge toward the center, then fan out to their target positions.',
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
    generateAt: (t: number) => {
      // Calculate center of source and target
      const srcCenterX = sourceArr.reduce((s, p) => s + p.x, 0) / sourceArr.length;
      const srcCenterY = sourceArr.reduce((s, p) => s + p.y, 0) / sourceArr.length;
      const tgtCenterX = targetArr.reduce((s, p) => s + p.x, 0) / targetArr.length;
      const tgtCenterY = targetArr.reduce((s, p) => s + p.y, 0) / targetArr.length;
      const midCenterX = (srcCenterX + tgtCenterX) / 2;
      const midCenterY = (srcCenterY + tgtCenterY) / 2;

      const convergeFactor = 0.6; // How much to converge (0=none, 1=full)

      const positions: Position[] = sourceArr.map((src, i) => {
        const tgt = targetArr[i];

        if (t <= 0.5) {
          // Converge phase (0 -> 0.5)
          const phase = t / 0.5;
          const eased = phase < 0.5
            ? 2 * phase * phase
            : 1 - Math.pow(-2 * phase + 2, 2) / 2;
          // Move toward midpoint center
          const convergenceX = src.x + (midCenterX - src.x) * convergeFactor * eased;
          const convergenceY = src.y + (midCenterY - src.y) * convergeFactor * eased;
          // Also start moving toward target
          const progressToTarget = eased * 0.3;
          return {
            x: convergenceX + (tgt.x - convergenceX) * progressToTarget,
            y: convergenceY + (tgt.y - convergenceY) * progressToTarget,
            rotation: src.rotation,
          };
        } else {
          // Diverge phase (0.5 -> 1)
          const phase = (t - 0.5) / 0.5;
          const eased = phase < 0.5
            ? 2 * phase * phase
            : 1 - Math.pow(-2 * phase + 2, 2) / 2;
          // Start from converged position
          const convergedX = src.x + (midCenterX - src.x) * convergeFactor;
          const convergedY = src.y + (midCenterY - src.y) * convergeFactor;
          const partialTarget = {
            x: convergedX + (tgt.x - convergedX) * 0.3,
            y: convergedY + (tgt.y - convergedY) * 0.3,
          };
          return {
            x: partialTarget.x + (tgt.x - partialTarget.x) * eased,
            y: partialTarget.y + (tgt.y - partialTarget.y) * eased,
            rotation: tgt.rotation ?? src.rotation,
          };
        }
      });

      return arrToMap(positions);
    },
    midpointPositions: (() => {
      const srcCenterX = sourceArr.reduce((s, p) => s + p.x, 0) / sourceArr.length;
      const srcCenterY = sourceArr.reduce((s, p) => s + p.y, 0) / sourceArr.length;
      const tgtCenterX = targetArr.reduce((s, p) => s + p.x, 0) / targetArr.length;
      const tgtCenterY = targetArr.reduce((s, p) => s + p.y, 0) / targetArr.length;
      const midCenterX = (srcCenterX + tgtCenterX) / 2;
      const midCenterY = (srcCenterY + tgtCenterY) / 2;
      const convergeFactor = 0.6;

      const positions: Position[] = sourceArr.map((src, i) => {
        const tgt = targetArr[i];
        const convergenceX = src.x + (midCenterX - src.x) * convergeFactor;
        const convergenceY = src.y + (midCenterY - src.y) * convergeFactor;
        return {
          x: convergenceX + (tgt.x - convergenceX) * 0.3,
          y: convergenceY + (tgt.y - convergenceY) * 0.3,
          rotation: src.rotation,
        };
      });
      return arrToMap(positions);
    })(),
  };

  return [directMorphOption, sequentialPushOption, followLeaderOption];
}

// ============================================================================
// Mini Preview Animation
// ============================================================================

interface MiniPreviewProps {
  option: TransitionOption;
  performers: Performer[];
  isSelected: boolean;
  onSelect: () => void;
}

function MiniPreview({ option, performers, isSelected, onSelect }: MiniPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentPositions, setCurrentPositions] = useState<Map<string, Position>>(() =>
    option.generateAt(0),
  );

  const performerLookup = useMemo(() => {
    const map = new Map<string, Performer>();
    for (const p of performers) {
      map.set(p.id, p);
    }
    return map;
  }, [performers]);

  // Animate
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    animationRef.current = setInterval(() => {
      setFrame((prev) => {
        const next = prev + 1;
        if (next > TOTAL_FRAMES) {
          // Loop back
          return 0;
        }
        return next;
      });
    }, 1000 / ANIMATION_FPS);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Update positions on frame change
  useEffect(() => {
    const t = frame / TOTAL_FRAMES;
    setCurrentPositions(option.generateAt(t));
  }, [frame, option]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying((prev) => !prev);
    if (!isPlaying) {
      setFrame(0);
    }
  }, [isPlaying]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    setFrame(0);
    setCurrentPositions(option.generateAt(0));
  }, [option]);

  return (
    <button
      onClick={onSelect}
      className={`group relative w-full text-left rounded-xl border-2 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 outline-none ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      }`}
      aria-pressed={isSelected}
      aria-label={`${option.name}: ${option.description}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
        <span className={isSelected ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}>
          {option.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {option.name}
          </p>
        </div>
        {isSelected && (
          <Check className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* Animation preview */}
      <div className="relative h-28 mx-2 my-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
        {/* Performer dots */}
        {Array.from(currentPositions.entries()).map(([performerId, pos]) => {
          const performer = performerLookup.get(performerId);
          return (
            <div
              key={performerId}
              className="absolute w-2 h-2 rounded-full shadow-sm"
              style={{
                backgroundColor: performer?.color ?? '#6b7280',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: isPlaying ? 'none' : 'all 200ms ease',
              }}
            />
          );
        })}

        {/* Progress bar */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-500 transition-[width] duration-100"
              style={{ width: `${(frame / TOTAL_FRAMES) * 100}%` }}
            />
          </div>
        )}

        {/* Play/Pause overlay */}
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={togglePlay}
            className="w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play preview'}
          >
            {isPlaying ? (
              <Pause className="w-2.5 h-2.5" aria-hidden="true" />
            ) : (
              <Play className="w-2.5 h-2.5 ml-0.5" aria-hidden="true" />
            )}
          </button>
          {frame > 0 && (
            <button
              onClick={handleReset}
              className="w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label="Reset"
            >
              <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="px-3 pb-2 text-[10px] text-gray-400 dark:text-gray-500">
        {option.description}
      </p>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SmartTransitionSuggester({
  sourcePositions,
  targetPositions,
  performers,
  onApply,
  className = '',
}: SmartTransitionSuggesterProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Generate transition options
  const options = useMemo(
    () => generateOptions(sourcePositions, targetPositions, performers),
    [sourcePositions, targetPositions, performers],
  );

  // Auto-select first option
  useEffect(() => {
    if (options.length > 0 && !selectedOptionId) {
      setSelectedOptionId(options[0].id);
    }
  }, [options, selectedOptionId]);

  const selectedOption = options.find((o) => o.id === selectedOptionId);

  const handleApply = useCallback(() => {
    if (!selectedOption) return;

    setIsApplying(true);

    // Small delay for visual feedback
    setTimeout(() => {
      onApply(selectedOption.midpointPositions, `${selectedOption.name} Transition`);
      setIsApplying(false);
    }, 200);
  }, [selectedOption, onApply]);

  const hasPositions = sourcePositions.size > 0 && targetPositions.size > 0;

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5 text-purple-500" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Smart Transitions
          </span>
        </div>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {performers.length} performers
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasPositions ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Zap className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Select two sets
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">
              Choose a source and target set to generate transition suggestions.
            </p>
          </div>
        ) : options.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No common performers between source and target sets.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Info */}
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Choose a transition method. Hover to preview the animation, then apply to insert an intermediate set.
            </p>

            {/* Options */}
            {options.map((option) => (
              <MiniPreview
                key={option.id}
                option={option}
                performers={performers}
                isSelected={selectedOptionId === option.id}
                onSelect={() => setSelectedOptionId(option.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Apply footer */}
      {hasPositions && selectedOption && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 outline-none transition-colors"
            aria-label={`Apply ${selectedOption.name} transition`}
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Applying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                Apply {selectedOption.name}
                <ChevronRight className="w-3 h-3" aria-hidden="true" />
              </>
            )}
          </button>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
            Inserts an intermediate set between the two positions
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default SmartTransitionSuggester;
