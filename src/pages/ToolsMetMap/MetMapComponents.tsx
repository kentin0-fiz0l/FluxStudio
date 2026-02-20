/**
 * MetMap sub-components: SectionRow, ChordGrid, PlaybackControls
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Section, Chord } from '../../contexts/MetMapContext';
import type { BeatMap } from '../../contexts/metmap/types';
import { COMMON_CHORDS, TIME_SIGNATURES } from './MetMapHelpers';
import { nearestBeat } from '../../services/snapToBeat';

// Section Editor Row
export function SectionRow({
  section,
  index,
  isPlaying,
  isCurrentSection,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: {
  section: Section;
  index: number;
  isPlaying: boolean;
  isCurrentSection: boolean;
  onUpdate: (changes: Partial<Section>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const hasTempoRamp = section.tempoEnd && section.tempoEnd !== section.tempoStart;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        isCurrentSection && isPlaying
          ? 'bg-indigo-50 border-indigo-300 shadow-sm'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Reorder buttons */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          aria-label="Move section up"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          aria-label="Move section down"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Section name */}
      <input
        type="text"
        value={section.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        onBlur={(e) => {
          const trimmed = e.target.value.trim();
          if (!trimmed) {
            onUpdate({ name: `Section ${index + 1}` });
          } else if (trimmed !== e.target.value) {
            onUpdate({ name: trimmed });
          }
        }}
        className="w-32 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Section name"
        maxLength={50}
      />

      {/* Bars */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">Bars:</label>
        <input
          type="number"
          value={section.bars}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) {
              onUpdate({ bars: Math.max(1, Math.min(999, val)) });
            }
          }}
          onBlur={(e) => {
            const val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) {
              onUpdate({ bars: 4 });
            }
          }}
          className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          min="1"
          max="999"
          aria-label="Number of bars"
        />
      </div>

      {/* Time signature */}
      <select
        value={section.timeSignature}
        onChange={(e) => onUpdate({ timeSignature: e.target.value })}
        className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Time signature"
      >
        {TIME_SIGNATURES.map((ts) => (
          <option key={ts} value={ts}>{ts}</option>
        ))}
      </select>

      {/* Tempo */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-500">Tempo:</label>
        <input
          type="number"
          value={section.tempoStart}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) {
              onUpdate({ tempoStart: Math.max(20, Math.min(300, val)) });
            }
          }}
          onBlur={(e) => {
            const val = parseInt(e.target.value);
            if (isNaN(val) || val < 20 || val > 300) {
              onUpdate({ tempoStart: 120 });
            }
          }}
          className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          min="20"
          max="300"
          aria-label="Starting tempo"
        />
      </div>

      {/* Tempo ramp toggle */}
      <button
        onClick={() => {
          if (hasTempoRamp) {
            onUpdate({ tempoEnd: undefined, tempoCurve: undefined });
          } else {
            onUpdate({ tempoEnd: section.tempoStart, tempoCurve: 'linear' });
          }
        }}
        className={`px-2 py-1 text-xs rounded ${
          hasTempoRamp ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        aria-label={hasTempoRamp ? 'Remove tempo ramp' : 'Add tempo ramp'}
      >
        {hasTempoRamp ? 'Ramp' : '+ Ramp'}
      </button>

      {/* Tempo ramp options */}
      {hasTempoRamp && (
        <>
          <span className="text-gray-400">to</span>
          <input
            type="number"
            value={section.tempoEnd || section.tempoStart}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) {
                onUpdate({ tempoEnd: Math.max(20, Math.min(300, val)) });
              }
            }}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (isNaN(val) || val < 20 || val > 300) {
                onUpdate({ tempoEnd: section.tempoStart });
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="20"
            max="300"
            aria-label="Ending tempo"
          />
          <select
            value={section.tempoCurve || 'linear'}
            onChange={(e) => onUpdate({ tempoCurve: e.target.value as 'linear' | 'exponential' | 'step' })}
            className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Tempo curve type"
          >
            <option value="linear">Linear</option>
            <option value="exponential">Exponential</option>
            <option value="step">Step</option>
          </select>
        </>
      )}

      {/* Bar range display */}
      <div className="ml-auto text-xs text-gray-400">
        Bars {section.startBar}-{section.startBar + section.bars - 1}
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Delete section"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// Chord Grid for a section
export function ChordGrid({
  section,
  sectionIndex: _sectionIndex,
  chords,
  onChordsChange,
  beatMap,
  onCrossSectionDrop
}: {
  section: Section;
  sectionIndex: number;
  chords: Chord[];
  onChordsChange: (chords: Chord[]) => void;
  beatMap?: BeatMap | null;
  onCrossSectionDrop?: (chord: Chord, direction: 'prev' | 'next') => void;
}) {
  const [selectedCell, setSelectedCell] = useState<{ bar: number; beat: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragState, setDragState] = useState<{
    sourceBar: number;
    sourceBeat: number;
    symbol: string;
    currentBar: number;
    currentBeat: number;
    active: boolean;
    snapped: boolean; // whether target snapped to a detected beat
  } | null>(null);
  const [altHeld, setAltHeld] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Track Alt key for snap bypass
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;

  const chordMap = useMemo(() => {
    const map: Record<string, Chord> = {};
    for (const chord of chords) {
      map[`${chord.bar}-${chord.beat}`] = chord;
    }
    return map;
  }, [chords]);

  const getCellFromPoint = useCallback((x: number, y: number): { bar: number; beat: number } | null => {
    const grid = gridRef.current;
    if (!grid) return null;
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cellBar = el.getAttribute('data-bar');
    const cellBeat = el.getAttribute('data-beat');
    if (cellBar && cellBeat) {
      return { bar: parseInt(cellBar), beat: parseInt(cellBeat) };
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((bar: number, beat: number, e: React.PointerEvent) => {
    const chord = chordMap[`${bar}-${beat}`];
    if (!chord) return; // Only drag existing chords
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragState({
      sourceBar: bar,
      sourceBeat: beat,
      symbol: chord.symbol,
      currentBar: bar,
      currentBeat: beat,
      active: false,
      snapped: false,
    });
  }, [chordMap]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState || !dragStartPos.current) return;

    // Check drag threshold (5px) before activating
    if (!dragState.active) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx + dy < 5) return;
      setDragState(prev => prev ? { ...prev, active: true } : null);
    }

    // Check if pointer left the grid (cross-section)
    const grid = gridRef.current;
    if (grid && onCrossSectionDrop) {
      const rect = grid.getBoundingClientRect();
      if (e.clientX < rect.left - 20) {
        // Dragged past left edge → previous section
        onCrossSectionDrop(
          { bar: dragState.sourceBar, beat: dragState.sourceBeat, symbol: dragState.symbol, durationBeats: 1 },
          'prev',
        );
        setDragState(null);
        dragStartPos.current = null;
        return;
      }
      if (e.clientX > rect.right + 20) {
        // Dragged past right edge → next section
        onCrossSectionDrop(
          { bar: dragState.sourceBar, beat: dragState.sourceBeat, symbol: dragState.symbol, durationBeats: 1 },
          'next',
        );
        setDragState(null);
        dragStartPos.current = null;
        return;
      }
    }

    const target = getCellFromPoint(e.clientX, e.clientY);
    if (target && (target.bar !== dragState.currentBar || target.beat !== dragState.currentBeat)) {
      // Snap-to-beat check (only when beatMap available and Alt not held)
      let snapped = false;
      if (beatMap && !altHeld) {
        // Estimate time for this bar/beat position
        const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;
        const avgTempo = section.tempoEnd
          ? (section.tempoStart + section.tempoEnd) / 2
          : section.tempoStart;
        const beatDuration = 60 / avgTempo;
        const sectionStartTime = 0; // Relative within section
        const beatTime = sectionStartTime + ((target.bar - 1) * beatsPerBar + (target.beat - 1)) * beatDuration;
        const snappedBeat = nearestBeat(beatTime, beatMap, 80);
        snapped = snappedBeat !== null;
      }
      setDragState(prev => prev ? { ...prev, currentBar: target.bar, currentBeat: target.beat, snapped } : null);
    }
  }, [dragState, getCellFromPoint, beatMap, altHeld, onCrossSectionDrop, section]);

  const handlePointerUp = useCallback(() => {
    if (dragState?.active) {
      const { sourceBar, sourceBeat, symbol, currentBar, currentBeat } = dragState;
      if (sourceBar !== currentBar || sourceBeat !== currentBeat) {
        let newChords = chords.filter(c => !(c.bar === sourceBar && c.beat === sourceBeat));
        newChords = newChords.filter(c => !(c.bar === currentBar && c.beat === currentBeat));
        newChords.push({ bar: currentBar, beat: currentBeat, symbol, durationBeats: 1 });
        onChordsChange(newChords);
      }
    }
    setDragState(null);
    dragStartPos.current = null;
  }, [dragState, chords, onChordsChange]);

  const handleCellClick = (bar: number, beat: number) => {
    // Skip if we just finished a drag
    if (dragState?.active) return;
    const existing = chordMap[`${bar}-${beat}`];
    setSelectedCell({ bar, beat });
    setEditValue(existing?.symbol || '');
  };

  const handleChordSet = (symbol: string) => {
    if (!selectedCell) return;

    const { bar, beat } = selectedCell;

    if (!symbol.trim()) {
      onChordsChange(chords.filter(c => !(c.bar === bar && c.beat === beat)));
    } else {
      const existing = chordMap[`${bar}-${beat}`];
      if (existing) {
        onChordsChange(chords.map(c =>
          c.bar === bar && c.beat === beat ? { ...c, symbol: symbol.trim() } : c
        ));
      } else {
        onChordsChange([...chords, {
          bar,
          beat,
          symbol: symbol.trim(),
          durationBeats: 1
        }]);
      }
    }

    setSelectedCell(null);
    setEditValue('');
  };

  return (
    <div className="mt-2">
      <div className="text-xs text-gray-500 mb-1">{section.name} Chords</div>
      <div
        ref={gridRef}
        className="flex flex-wrap gap-1"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {Array.from({ length: section.bars }, (_, barIndex) => (
          <div key={barIndex} className="flex border border-gray-200 rounded overflow-hidden">
            {Array.from({ length: beatsPerBar }, (_, beatIndex) => {
              const bar = barIndex + 1;
              const beat = beatIndex + 1;
              const key = `${bar}-${beat}`;
              const chord = chordMap[key];
              const isSelected = selectedCell?.bar === bar && selectedCell?.beat === beat;
              const isDragSource = dragState?.active && dragState.sourceBar === bar && dragState.sourceBeat === beat;
              const isDragTarget = dragState?.active && dragState.currentBar === bar && dragState.currentBeat === beat
                && (dragState.sourceBar !== bar || dragState.sourceBeat !== beat);
              const isOccupiedTarget = isDragTarget && chord != null;
              const isSnappedTarget = isDragTarget && dragState?.snapped;

              return (
                <button
                  type="button"
                  key={beatIndex}
                  data-bar={bar}
                  data-beat={beat}
                  onClick={() => handleCellClick(bar, beat)}
                  onPointerDown={(e) => handlePointerDown(bar, beat, e)}
                  className={`w-12 h-8 flex items-center justify-center text-xs transition-colors touch-none ${
                    dragState?.active ? 'cursor-grabbing' : chord ? 'cursor-grab' : 'cursor-pointer'
                  } ${
                    isOccupiedTarget
                      ? 'bg-red-100 text-red-500 ring-2 ring-red-400'
                      : isSnappedTarget
                        ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400'
                        : isDragTarget
                          ? 'bg-indigo-300 text-white ring-2 ring-indigo-400'
                          : isDragSource
                            ? 'bg-gray-200 text-gray-400 opacity-50'
                            : isSelected
                              ? 'bg-indigo-500 text-white'
                              : chord
                                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-400'
                  } ${beatIndex > 0 ? 'border-l border-gray-200' : ''}`}
                  aria-label={`Bar ${bar}, Beat ${beat}${chord ? `: ${chord.symbol}` : ''}${chord ? ' (drag to move)' : ''}`}
                  aria-pressed={isSelected}
                >
                  {isDragTarget
                    ? <span className={isOccupiedTarget ? '' : 'opacity-60'}>{dragState?.symbol}</span>
                    : (chord?.symbol || '-')}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Chord input modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedCell(null)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-medium mb-2">
              Set chord at Bar {selectedCell.bar}, Beat {selectedCell.beat}
            </div>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChordSet(editValue);
                if (e.key === 'Escape') setSelectedCell(null);
              }}
              placeholder="e.g., Cmaj7, Dm, G7"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
              autoFocus
            />
            <div className="flex flex-wrap gap-1 mb-3">
              {COMMON_CHORDS.slice(0, 14).map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => handleChordSet(symbol)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-indigo-100 rounded transition-colors"
                >
                  {symbol}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleChordSet(editValue)}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Set
              </button>
              <button
                onClick={() => handleChordSet('')}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setSelectedCell(null)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Playback Controls
export function PlaybackControls({
  isPlaying,
  isPaused: _isPaused,
  currentBar,
  currentBeat,
  currentTempo,
  countingOff,
  countoffBeatsRemaining,
  onPlay,
  onPause,
  onStop,
  tempoOverride,
  setTempoOverride,
  useClick,
  setUseClick,
  countoffBars,
  setCountoffBars
}: {
  isPlaying: boolean;
  isPaused: boolean;
  currentBar: number;
  currentBeat: number;
  currentTempo: number;
  countingOff: boolean;
  countoffBeatsRemaining: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  tempoOverride: number | null;
  setTempoOverride: (tempo: number | null) => void;
  useClick: boolean;
  setUseClick: (use: boolean) => void;
  countoffBars: number;
  setCountoffBars: (bars: number) => void;
}) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 text-white">
      {/* Position display */}
      <div className="text-center mb-4">
        {countingOff ? (
          <div className="text-4xl font-mono font-bold text-yellow-400">
            Count: {countoffBeatsRemaining}
          </div>
        ) : (
          <div className="text-4xl font-mono font-bold">
            <span className="text-indigo-400">{currentBar}</span>
            <span className="text-gray-500 mx-1">.</span>
            <span className="text-white">{currentBeat}</span>
          </div>
        )}
        <div className="text-sm text-gray-400 mt-1">
          {currentTempo} BPM
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={onStop}
          className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          aria-label="Stop"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>

        {isPlaying ? (
          <button
            onClick={onPause}
            className="p-4 bg-yellow-500 hover:bg-yellow-400 rounded-full transition-colors"
            aria-label="Pause"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="p-4 bg-green-500 hover:bg-green-400 rounded-full transition-colors"
            aria-label="Play"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <label className="text-gray-400 text-xs">Tempo Override</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={tempoOverride !== null}
              onChange={(e) => setTempoOverride(e.target.checked ? currentTempo : null)}
              className="rounded"
            />
            <input
              type="number"
              value={tempoOverride || currentTempo}
              onChange={(e) => setTempoOverride(parseInt(e.target.value) || null)}
              disabled={tempoOverride === null}
              className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-50"
              min="20"
              max="300"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-xs">Count-off Bars</label>
          <select
            value={countoffBars}
            onChange={(e) => setCountoffBars(parseInt(e.target.value))}
            className="w-full mt-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white"
          >
            <option value="0">None</option>
            <option value="1">1 bar</option>
            <option value="2">2 bars</option>
            <option value="4">4 bars</option>
          </select>
        </div>
      </div>

      {/* Metronome click toggle */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={useClick}
            onChange={(e) => setUseClick(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800 text-indigo-600"
          />
          Enable metronome click
        </label>
      </div>
    </div>
  );
}
