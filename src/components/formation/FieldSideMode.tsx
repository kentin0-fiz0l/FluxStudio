/**
 * FieldSideMode - Director's field-side view
 *
 * Simplified layout for use on a tablet/phone while on the practice field.
 * Shows a large set name and performer count at top, the formation canvas
 * in the middle, and large prev/next navigation at the bottom.
 *
 * Features:
 *   - All toolbars hidden except play/pause and set navigation
 *   - Large touch-friendly buttons (48px+ tap targets)
 *   - "Flag for Review" button that marks the current set
 *   - Swipe left/right to advance/rewind sets
 *   - Auto-scroll timeline as audio plays
 *   - Entry via toolbar: full-screen icon button
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Flag,
  Maximize,
  Check,
} from 'lucide-react';
import type { Formation, DrillSet } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface FieldSideModeProps {
  /** The active formation */
  formation: Formation;
  /** Ordered list of drill sets */
  sets: DrillSet[];
  /** Exit field-side mode */
  onExit: () => void;
  /** Flag a set for later review */
  onFlagSet: (setId: string) => void;
  /** Optional: navigate to a specific set */
  onNavigateToSet?: (setId: string) => void;
  /** Optional: playback controls */
  isPlaying?: boolean;
  onPlayPause?: () => void;
  /** Optional: current set ID (controlled) */
  currentSetId?: string;
  /** IDs of sets already flagged */
  flaggedSetIds?: Set<string>;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum swipe distance (px) to trigger set navigation */
const SWIPE_THRESHOLD = 60;
/** Maximum vertical drift allowed for a horizontal swipe */
const SWIPE_MAX_Y = 40;

// ============================================================================
// Component
// ============================================================================

export const FieldSideMode: React.FC<FieldSideModeProps> = ({
  formation,
  sets,
  onExit,
  onFlagSet,
  onNavigateToSet,
  isPlaying = false,
  onPlayPause,
  currentSetId,
  flaggedSetIds = new Set<string>(),
}) => {
  // ---- State ----
  const [activeIndex, setActiveIndex] = useState(() => {
    if (currentSetId) {
      const idx = sets.findIndex((s) => s.id === currentSetId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const activeSet = sets[activeIndex] ?? null;
  const performerCount = formation.performers.length;

  // Keep activeIndex in sync if currentSetId changes externally
  useEffect(() => {
    if (currentSetId) {
      const idx = sets.findIndex((s) => s.id === currentSetId);
      if (idx >= 0 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  }, [currentSetId, sets, activeIndex]);

  // ---- Swipe detection ----
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      touchStart.current = null;

      if (dy > SWIPE_MAX_Y) return; // Too much vertical drift

      if (dx < -SWIPE_THRESHOLD && activeIndex < sets.length - 1) {
        // Swipe left: advance
        const nextIdx = activeIndex + 1;
        setActiveIndex(nextIdx);
        onNavigateToSet?.(sets[nextIdx].id);
      } else if (dx > SWIPE_THRESHOLD && activeIndex > 0) {
        // Swipe right: rewind
        const prevIdx = activeIndex - 1;
        setActiveIndex(prevIdx);
        onNavigateToSet?.(sets[prevIdx].id);
      }
    },
    [activeIndex, sets, onNavigateToSet],
  );

  // ---- Navigation callbacks ----
  const goToPrev = useCallback(() => {
    if (activeIndex <= 0) return;
    const prevIdx = activeIndex - 1;
    setActiveIndex(prevIdx);
    onNavigateToSet?.(sets[prevIdx].id);
  }, [activeIndex, sets, onNavigateToSet]);

  const goToNext = useCallback(() => {
    if (activeIndex >= sets.length - 1) return;
    const nextIdx = activeIndex + 1;
    setActiveIndex(nextIdx);
    onNavigateToSet?.(sets[nextIdx].id);
  }, [activeIndex, sets, onNavigateToSet]);

  const handleFlag = useCallback(() => {
    if (activeSet) {
      onFlagSet(activeSet.id);
    }
  }, [activeSet, onFlagSet]);

  const isFlagged = activeSet ? flaggedSetIds.has(activeSet.id) : false;

  // ---- Keyboard navigation ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onExit();
          break;
        case ' ':
          e.preventDefault();
          onPlayPause?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, onExit, onPlayPause]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-gray-950 text-white select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ================================================================ */}
      {/* TOP BAR: Set name, count, close button                          */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        {/* Set info */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl font-bold truncate">
            {activeSet?.name ?? 'No sets'}
          </h1>
          <p className="text-sm text-gray-400">
            {performerCount} performer{performerCount !== 1 ? 's' : ''}
            {activeSet?.counts ? ` \u00B7 ${activeSet.counts} counts` : ''}
          </p>
        </div>

        {/* Right side: Flag + Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeSet && (
            <button
              onClick={handleFlag}
              className={`
                p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl
                transition-colors
                focus-visible:ring-2 focus-visible:ring-blue-500 outline-none
                ${isFlagged
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-amber-400 hover:bg-gray-700'
                }
              `}
              aria-label={isFlagged ? 'Set flagged for review' : 'Flag set for review'}
              title="Flag for Review"
            >
              {isFlagged ? <Check className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={onExit}
            className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl
                       bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700
                       focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            aria-label="Exit field-side view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* PROGRESS BAR: Set position indicator                            */}
      {/* ================================================================ */}
      {sets.length > 0 && (
        <div className="h-1 bg-gray-800 flex">
          {sets.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 transition-colors duration-200 ${
                i < activeIndex
                  ? 'bg-blue-500'
                  : i === activeIndex
                    ? 'bg-blue-400'
                    : 'bg-gray-800'
              } ${flaggedSetIds.has(s.id) ? 'border-b-2 border-amber-400' : ''}`}
            />
          ))}
        </div>
      )}

      {/* ================================================================ */}
      {/* CANVAS AREA: Main stage for the formation                        */}
      {/* ================================================================ */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-2 py-4">
        {/* Placeholder for actual canvas rendering */}
        {/* In integration, this should render a read-only FormationCanvas */}
        <div
          className="w-full h-full max-w-3xl max-h-[60vh] rounded-xl border border-gray-700
                     bg-gray-900 flex items-center justify-center"
          data-testid="field-side-canvas"
        >
          <div className="text-center text-gray-500">
            <Maximize className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Formation Canvas</p>
            <p className="text-xs mt-1 text-gray-600">
              Set {activeIndex + 1} of {sets.length}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* BOTTOM BAR: Prev / Play-Pause / Next                            */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between px-4 py-4 bg-gray-900 safe-area-pb">
        {/* Previous */}
        <button
          onClick={goToPrev}
          disabled={activeIndex <= 0}
          className="p-4 min-w-[56px] min-h-[56px] flex items-center justify-center rounded-2xl
                     bg-gray-800 text-white transition-colors
                     hover:bg-gray-700 active:bg-gray-600
                     disabled:opacity-30 disabled:cursor-not-allowed
                     focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          aria-label="Previous set"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        {/* Play / Pause */}
        {onPlayPause && (
          <button
            onClick={onPlayPause}
            className="p-4 min-w-[64px] min-h-[64px] flex items-center justify-center rounded-full
                       bg-blue-500 text-white transition-colors
                       hover:bg-blue-400 active:bg-blue-600
                       focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                       focus-visible:ring-offset-gray-900 outline-none"
            aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>
        )}

        {/* Next */}
        <button
          onClick={goToNext}
          disabled={activeIndex >= sets.length - 1}
          className="p-4 min-w-[56px] min-h-[56px] flex items-center justify-center rounded-2xl
                     bg-gray-800 text-white transition-colors
                     hover:bg-gray-700 active:bg-gray-600
                     disabled:opacity-30 disabled:cursor-not-allowed
                     focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
          aria-label="Next set"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// FieldSideModeButton - Toolbar entry point for activating field-side view
// ============================================================================

export interface FieldSideModeButtonProps {
  onClick: () => void;
}

export const FieldSideModeButton: React.FC<FieldSideModeButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="p-1.5 min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 rounded
               text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
               hover:bg-gray-100 dark:hover:bg-gray-700
               focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
    title="Field-Side View"
    aria-label="Enter field-side view"
  >
    <Maximize className="w-4 h-4" aria-hidden="true" />
  </button>
);

export default FieldSideMode;
