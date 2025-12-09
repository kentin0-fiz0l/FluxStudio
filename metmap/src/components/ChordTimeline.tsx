'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChordSection,
  ChordEvent,
  TimeSignature,
  formatChordSymbol,
  SIMPLE_ROOTS,
  CHORD_QUALITIES,
} from '@/types/song';

// ============================================================================
// Types
// ============================================================================

export type ChordTimelineProps = {
  section: ChordSection;
  timeSignature: TimeSignature; // Effective time sig (local or global, already resolved)
  onChange: (updatedSection: ChordSection) => void;
};

type EditorState = {
  isOpen: boolean;
  mode: 'add' | 'edit';
  bar: number;
  beat: number;
  chord?: ChordEvent;
};

// ============================================================================
// Constants
// ============================================================================

const BAR_MIN_WIDTH = 120; // Minimum width per bar in pixels
const BEAT_HEIGHT = 48;    // Height of the chord grid row

// ============================================================================
// Sub-components
// ============================================================================

/**
 * ChordBlock - Renders a single chord as a positioned block in the timeline
 */
function ChordBlock({
  chord,
  beatsPerBar,
  barWidthPercent,
  onClick,
  onDelete,
}: {
  chord: ChordEvent;
  beatsPerBar: number;
  barWidthPercent: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  // Calculate position and width
  // Left position: (bar-1) * barWidth + (beat-1) / beatsPerBar * barWidth
  const leftPercent =
    (chord.bar - 1) * barWidthPercent +
    ((chord.beat - 1) / beatsPerBar) * barWidthPercent;

  // Width: durationBeats / beatsPerBar * barWidth
  const widthPercent = (chord.durationBeats / beatsPerBar) * barWidthPercent;

  return (
    <div
      className="absolute top-1 bottom-1 flex items-center group cursor-pointer"
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        minWidth: '40px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="w-full h-full bg-hw-brass/90 hover:bg-hw-brass rounded-md px-2 py-1 flex items-center justify-between shadow-pad transition-colors overflow-hidden">
        <span className="text-hw-charcoal font-semibold text-sm truncate">
          {formatChordSymbol(chord)}
        </span>
        <button
          className="opacity-0 group-hover:opacity-100 ml-1 text-hw-charcoal/60 hover:text-hw-red transition-opacity flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete chord"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * ChordEditor - Inline popover for adding/editing chords
 */
function ChordEditor({
  mode,
  bar,
  beat,
  chord,
  beatsPerBar,
  totalBars,
  onSave,
  onCancel,
  onDelete,
}: {
  mode: 'add' | 'edit';
  bar: number;
  beat: number;
  chord?: ChordEvent;
  beatsPerBar: number;
  totalBars: number;
  onSave: (chord: ChordEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [root, setRoot] = useState(chord?.root ?? 'C');
  const [quality, setQuality] = useState(chord?.quality ?? 'maj');
  const [duration, setDuration] = useState(chord?.durationBeats ?? 1);
  const [editBar, setEditBar] = useState(chord?.bar ?? bar);
  const [editBeat, setEditBeat] = useState(chord?.beat ?? beat);

  // Calculate max duration (remaining beats in section from current position)
  const maxDuration = useMemo(() => {
    const totalBeats = totalBars * beatsPerBar;
    const currentBeatPos = (editBar - 1) * beatsPerBar + (editBeat - 1);
    return totalBeats - currentBeatPos;
  }, [editBar, editBeat, beatsPerBar, totalBars]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newChord: ChordEvent = {
      id: chord?.id ?? crypto.randomUUID(),
      bar: editBar,
      beat: editBeat,
      durationBeats: Math.min(duration, maxDuration),
      root,
      quality,
      extensions: chord?.extensions,
      inversion: chord?.inversion,
    };
    onSave(newChord);
  };

  return (
    <div className="absolute z-50 top-full left-0 mt-2 bg-hw-surface border border-hw-charcoal rounded-lg shadow-lg p-3 min-w-[280px]">
      <form onSubmit={handleSubmit}>
        <div className="text-xs text-gray-400 mb-2 font-medium">
          {mode === 'add' ? 'Add Chord' : 'Edit Chord'}
        </div>

        {/* Root and Quality row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Root</label>
            <select
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              className="w-full bg-hw-charcoal text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-hw-brass focus:outline-none"
            >
              {SIMPLE_ROOTS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full bg-hw-charcoal text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-hw-brass focus:outline-none"
            >
              {CHORD_QUALITIES.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Position and Duration row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Bar</label>
            <input
              type="number"
              min={1}
              max={totalBars}
              value={editBar}
              onChange={(e) => setEditBar(Math.max(1, Math.min(totalBars, parseInt(e.target.value) || 1)))}
              className="w-full bg-hw-charcoal text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-hw-brass focus:outline-none tabular-nums"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Beat</label>
            <input
              type="number"
              min={1}
              max={beatsPerBar}
              value={editBeat}
              onChange={(e) => setEditBeat(Math.max(1, Math.min(beatsPerBar, parseInt(e.target.value) || 1)))}
              className="w-full bg-hw-charcoal text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-hw-brass focus:outline-none tabular-nums"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Duration</label>
            <input
              type="number"
              min={1}
              max={maxDuration}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Math.min(maxDuration, parseInt(e.target.value) || 1)))}
              className="w-full bg-hw-charcoal text-white text-sm rounded px-2 py-1.5 border border-gray-600 focus:border-hw-brass focus:outline-none tabular-nums"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mb-3 p-2 bg-hw-charcoal rounded text-center">
          <span className="text-hw-brass font-bold text-lg">
            {formatChordSymbol({ id: '', bar: 1, beat: 1, durationBeats: 1, root, quality })}
          </span>
          <span className="text-gray-500 text-xs ml-2">
            ({duration} beat{duration !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-hw-brass text-hw-charcoal font-medium text-sm py-1.5 rounded hover:bg-hw-brass/90 transition-colors"
          >
            {mode === 'add' ? 'Add' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white text-sm py-1.5 rounded hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="bg-hw-red/80 text-white text-sm py-1.5 px-3 rounded hover:bg-hw-red transition-colors"
              title="Delete chord"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ChordTimeline - Visual chord progression editor for a single section
 *
 * Renders a horizontal grid representing bars and beats, with chord blocks
 * positioned according to their bar/beat/duration. Supports adding, editing,
 * and deleting chords through an inline editor.
 */
export function ChordTimeline({
  section,
  timeSignature,
  onChange,
}: ChordTimelineProps) {
  const [editor, setEditor] = useState<EditorState>({
    isOpen: false,
    mode: 'add',
    bar: 1,
    beat: 1,
  });

  const beatsPerBar = timeSignature.numerator;
  const totalBars = section.bars;

  // Width of each bar as percentage of the grid
  const barWidthPercent = 100 / totalBars;

  // Check if a beat cell has a chord starting on it
  const getChordAtBeat = useCallback(
    (bar: number, beat: number): ChordEvent | undefined => {
      return section.chords.find((c) => c.bar === bar && c.beat === beat);
    },
    [section.chords]
  );

  // Handle clicking an empty cell to add a chord
  const handleCellClick = useCallback(
    (bar: number, beat: number) => {
      // Check if there's already a chord at this position
      const existingChord = getChordAtBeat(bar, beat);
      if (existingChord) {
        // Edit existing chord
        setEditor({
          isOpen: true,
          mode: 'edit',
          bar,
          beat,
          chord: existingChord,
        });
      } else {
        // Add new chord
        setEditor({
          isOpen: true,
          mode: 'add',
          bar,
          beat,
        });
      }
    },
    [getChordAtBeat]
  );

  // Handle clicking a chord block to edit
  const handleChordClick = useCallback((chord: ChordEvent) => {
    setEditor({
      isOpen: true,
      mode: 'edit',
      bar: chord.bar,
      beat: chord.beat,
      chord,
    });
  }, []);

  // Save a chord (add or update)
  const handleSaveChord = useCallback(
    (chord: ChordEvent) => {
      let updatedChords: ChordEvent[];

      if (editor.mode === 'add') {
        updatedChords = [...section.chords, chord];
      } else {
        updatedChords = section.chords.map((c) =>
          c.id === chord.id ? chord : c
        );
      }

      onChange({
        ...section,
        chords: updatedChords,
      });

      setEditor({ isOpen: false, mode: 'add', bar: 1, beat: 1 });
    },
    [editor.mode, section, onChange]
  );

  // Delete a chord
  const handleDeleteChord = useCallback(
    (chordId: string) => {
      onChange({
        ...section,
        chords: section.chords.filter((c) => c.id !== chordId),
      });
      setEditor({ isOpen: false, mode: 'add', bar: 1, beat: 1 });
    },
    [section, onChange]
  );

  // Close editor
  const handleCancelEditor = useCallback(() => {
    setEditor({ isOpen: false, mode: 'add', bar: 1, beat: 1 });
  }, []);

  // Generate bar labels array
  const bars = useMemo(
    () => Array.from({ length: totalBars }, (_, i) => i + 1),
    [totalBars]
  );

  // Generate beat array for each bar
  const beats = useMemo(
    () => Array.from({ length: beatsPerBar }, (_, i) => i + 1),
    [beatsPerBar]
  );

  return (
    <div className="relative bg-hw-charcoal rounded-lg overflow-hidden">
      {/* Bar labels header */}
      <div className="flex border-b border-hw-surface">
        {bars.map((barNum) => (
          <div
            key={barNum}
            className="text-center py-1 text-xs text-gray-500 font-mono border-r border-hw-surface last:border-r-0"
            style={{ width: `${barWidthPercent}%` }}
          >
            Bar {barNum}
          </div>
        ))}
      </div>

      {/* Main grid with beat cells and chord blocks */}
      <div
        className="relative"
        style={{ minWidth: `${totalBars * BAR_MIN_WIDTH}px` }}
      >
        {/* Beat grid (clickable cells) */}
        <div className="flex" style={{ height: `${BEAT_HEIGHT}px` }}>
          {bars.map((barNum) => (
            <div
              key={barNum}
              className={`flex border-r border-hw-surface last:border-r-0 ${
                barNum % 2 === 0 ? 'bg-hw-surface/30' : 'bg-hw-charcoal'
              }`}
              style={{ width: `${barWidthPercent}%` }}
            >
              {beats.map((beatNum) => (
                <div
                  key={`${barNum}-${beatNum}`}
                  className="flex-1 border-r border-hw-surface/50 last:border-r-0 hover:bg-hw-brass/10 cursor-pointer transition-colors"
                  onClick={() => handleCellClick(barNum, beatNum)}
                  title={`Bar ${barNum}, Beat ${beatNum}`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Chord blocks layer (positioned absolutely over the grid) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ height: `${BEAT_HEIGHT}px` }}
        >
          <div className="relative w-full h-full pointer-events-auto">
            {section.chords.map((chord) => (
              <ChordBlock
                key={chord.id}
                chord={chord}
                beatsPerBar={beatsPerBar}
                barWidthPercent={barWidthPercent}
                onClick={() => handleChordClick(chord)}
                onDelete={() => handleDeleteChord(chord.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Beat numbers footer */}
      <div className="flex border-t border-hw-surface">
        {bars.map((barNum) => (
          <div
            key={barNum}
            className="flex border-r border-hw-surface last:border-r-0"
            style={{ width: `${barWidthPercent}%` }}
          >
            {beats.map((beatNum) => (
              <div
                key={`${barNum}-${beatNum}`}
                className="flex-1 text-center py-0.5 text-[10px] text-gray-600 font-mono"
              >
                {beatNum}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Inline chord editor (popover) */}
      {editor.isOpen && (
        <div className="relative">
          <ChordEditor
            mode={editor.mode}
            bar={editor.bar}
            beat={editor.beat}
            chord={editor.chord}
            beatsPerBar={beatsPerBar}
            totalBars={totalBars}
            onSave={handleSaveChord}
            onCancel={handleCancelEditor}
            onDelete={
              editor.mode === 'edit' && editor.chord
                ? () => handleDeleteChord(editor.chord!.id)
                : undefined
            }
          />
        </div>
      )}

      {/* Click outside to close editor */}
      {editor.isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleCancelEditor}
        />
      )}
    </div>
  );
}

export default ChordTimeline;
