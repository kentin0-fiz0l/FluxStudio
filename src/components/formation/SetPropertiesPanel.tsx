/**
 * SetPropertiesPanel - Side panel for editing drill set properties.
 *
 * Displays and allows editing of set name, counts, rehearsal mark, notes,
 * and shows auto-calculated duration from counts + BPM.
 * Opens when double-clicking a set in SetNavigator.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Hash,
  Clock,
  Music,
  StickyNote,
  Bookmark,
} from 'lucide-react';
import type { DrillSet } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface SetPropertiesPanelProps {
  /** The drill set to edit */
  set: DrillSet;
  /** Tempo in beats per minute (used for duration calculation) */
  bpm: number;
  /** Callback when any set property changes */
  onUpdate: (updates: Partial<DrillSet>) => void;
  /** Callback to close the panel */
  onClose: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_COUNTS = 1;
const MAX_COUNTS = 64;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate duration in seconds from counts and BPM.
 */
function calculateDuration(counts: number, bpm: number): number {
  if (bpm <= 0) return 0;
  return (counts / bpm) * 60;
}

/**
 * Format seconds into a human-readable duration string (e.g., "4.0s", "1m 12.0s").
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(1)}s`;
}

// ============================================================================
// Main Component
// ============================================================================

export function SetPropertiesPanel({
  set,
  bpm,
  onUpdate,
  onClose,
}: SetPropertiesPanelProps) {
  const [localName, setLocalName] = useState(set.name);
  const [localCounts, setLocalCounts] = useState(set.counts);
  const [localRehearsalMark, setLocalRehearsalMark] = useState(set.rehearsalMark ?? '');
  const [localNotes, setLocalNotes] = useState(set.notes ?? '');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus name input on mount
  useEffect(() => {
    nameInputRef.current?.select();
  }, []);

  // Sync local state when the set prop changes (e.g., external update)
  useEffect(() => {
    setLocalName(set.name);
    setLocalCounts(set.counts);
    setLocalRehearsalMark(set.rehearsalMark ?? '');
    setLocalNotes(set.notes ?? '');
  }, [set.id, set.name, set.counts, set.rehearsalMark, set.notes]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to prevent the double-click that opened the panel from closing it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Auto-calculated duration
  const duration = useMemo(
    () => calculateDuration(localCounts, bpm),
    [localCounts, bpm],
  );

  // ---- Handlers ----

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalName(value);
      onUpdate({ name: value });
    },
    [onUpdate],
  );

  const handleCountsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(e.target.value, 10);
      if (isNaN(raw)) return;
      const clamped = Math.max(MIN_COUNTS, Math.min(MAX_COUNTS, raw));
      setLocalCounts(clamped);
      onUpdate({ counts: clamped });
    },
    [onUpdate],
  );

  const handleCountsIncrement = useCallback(
    (delta: number) => {
      const next = Math.max(MIN_COUNTS, Math.min(MAX_COUNTS, localCounts + delta));
      setLocalCounts(next);
      onUpdate({ counts: next });
    },
    [localCounts, onUpdate],
  );

  const handleRehearsalMarkChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalRehearsalMark(value);
      onUpdate({ rehearsalMark: value || undefined });
    },
    [onUpdate],
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalNotes(value);
      onUpdate({ notes: value || undefined });
    },
    [onUpdate],
  );

  return (
    <div
      ref={panelRef}
      className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg flex flex-col h-full overflow-hidden"
      role="dialog"
      aria-label={`Edit ${set.name}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-blue-500" />
          Set Properties
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Hash className="w-3.5 h-3.5" />
            Name
          </label>
          <input
            ref={nameInputRef}
            type="text"
            value={localName}
            onChange={handleNameChange}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Set name"
          />
        </div>

        {/* Counts */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Music className="w-3.5 h-3.5" />
            Counts
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCountsIncrement(-1)}
              disabled={localCounts <= MIN_COUNTS}
              className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              -
            </button>
            <input
              type="number"
              value={localCounts}
              onChange={handleCountsChange}
              min={MIN_COUNTS}
              max={MAX_COUNTS}
              className="flex-1 px-3 py-2 text-sm text-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              onClick={() => handleCountsIncrement(1)}
              disabled={localCounts >= MAX_COUNTS}
              className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              +
            </button>
          </div>
          <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
            Range: {MIN_COUNTS} - {MAX_COUNTS} counts
          </p>
        </div>

        {/* Auto-calculated Duration */}
        <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            <Clock className="w-3.5 h-3.5" />
            Duration
          </div>
          <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">
            {formatDuration(duration)}
          </div>
          <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
            {localCounts} counts @ {bpm} BPM
          </p>
        </div>

        {/* Rehearsal Mark */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            Rehearsal Mark
            <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={localRehearsalMark}
            onChange={handleRehearsalMarkChange}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder='e.g. "A", "Opener", "Ballad"'
            maxLength={32}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <StickyNote className="w-3.5 h-3.5" />
            Rehearsal Notes
          </label>
          <textarea
            value={localNotes}
            onChange={handleNotesChange}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            placeholder="Add rehearsal notes, instructions, reminders..."
          />
        </div>

        {/* Set Metadata */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Set ID: <code className="font-mono">{set.id.slice(0, 16)}...</code>
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Sort Order: {set.sortOrder}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Keyframe: <code className="font-mono">{set.keyframeId.slice(0, 16)}...</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SetPropertiesPanel;
