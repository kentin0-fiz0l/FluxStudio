/**
 * MetMap Page - FluxStudio
 *
 * Musical timeline tool for creating songs with sections, tempo changes,
 * and chord progressions. Includes a programmable metronome.
 *
 * Features:
 * - Song management with project linking
 * - Section timeline with tempo ramps
 * - Chord progression grid
 * - Timer-based metronome playback
 * - Practice session tracking
 *
 * WCAG 2.1 Level A Compliant
 */

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/templates/DashboardLayout';
import { useMetMap, Song, Section, Chord } from '../contexts/MetMapContext';
import { useNotification } from '../contexts/NotificationContext';
import { useProjectContextOptional } from '../contexts/ProjectContext';
import { MobilePlaybackControls } from '../components/metmap/MobilePlaybackControls';
import { OfflineIndicator, NetworkStatusBadge } from '../components/pwa/OfflineIndicator';
import { usePWA } from '../hooks/usePWA';
import { ONBOARDING_STORAGE_KEYS, useFirstTimeExperience } from '../hooks/useFirstTimeExperience';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../utils/apiHelpers';

// New MetMap components
import { TapTempo } from '../components/metmap/TapTempo';
import { SectionTemplates, SectionTemplate } from '../components/metmap/SectionTemplates';
import { VisualTimeline } from '../components/metmap/VisualTimeline';
import { PracticeMode } from '../components/metmap/PracticeMode';
import { ExportImport } from '../components/metmap/ExportImport';
import { useMetronomeAudio, ClickSound } from '../components/metmap/MetronomeAudio';
import { useMetMapKeyboardShortcuts, ShortcutsHelp } from '../hooks/useMetMapKeyboardShortcuts';

// Import accessibility utilities
import { announceToScreenReader } from '../utils/accessibility';

// Hook for detecting mobile viewport
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

// ==================== Helper Functions ====================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Common chord symbols for quick selection
const COMMON_CHORDS = [
  'C', 'Cm', 'C7', 'Cmaj7', 'Cm7',
  'D', 'Dm', 'D7', 'Dmaj7', 'Dm7',
  'E', 'Em', 'E7', 'Emaj7', 'Em7',
  'F', 'Fm', 'F7', 'Fmaj7', 'Fm7',
  'G', 'Gm', 'G7', 'Gmaj7', 'Gm7',
  'A', 'Am', 'A7', 'Amaj7', 'Am7',
  'B', 'Bm', 'B7', 'Bmaj7', 'Bm7'
];

const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4', '5/4', '7/8', '12/8'];

// ==================== Components ====================

// Song List Item
function SongListItem({
  song,
  isSelected,
  onClick
}: {
  song: Song;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`p-3 border-b border-gray-100 cursor-pointer transition-colors text-left w-full ${
        isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div className="font-medium text-gray-900 truncate">{song.title}</div>
      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
        <span>{song.bpmDefault} BPM</span>
        <span className="text-gray-300">|</span>
        <span>{song.timeSignatureDefault}</span>
        {song.sectionCount > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span>{song.sectionCount} sections</span>
          </>
        )}
      </div>
      {song.projectName && (
        <div className="text-xs text-indigo-600 mt-1 truncate">{song.projectName}</div>
      )}
    </button>
  );
}

// Section Editor Row
function SectionRow({
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
          // Ensure section name is never empty
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
              onUpdate({ bars: 4 }); // Default to 4 bars
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
              onUpdate({ tempoStart: 120 }); // Default to 120 BPM
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
                onUpdate({ tempoEnd: section.tempoStart }); // Default to start tempo
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
function ChordGrid({
  section,
  sectionIndex: _sectionIndex,
  chords,
  onChordsChange
}: {
  section: Section;
  sectionIndex: number;
  chords: Chord[];
  onChordsChange: (chords: Chord[]) => void;
}) {
  const [selectedCell, setSelectedCell] = useState<{ bar: number; beat: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const beatsPerBar = parseInt(section.timeSignature.split('/')[0]) || 4;

  // Create a grid map of chords
  const chordMap = useMemo(() => {
    const map: Record<string, Chord> = {};
    for (const chord of chords) {
      map[`${chord.bar}-${chord.beat}`] = chord;
    }
    return map;
  }, [chords]);

  const handleCellClick = (bar: number, beat: number) => {
    const key = `${bar}-${beat}`;
    const existing = chordMap[key];
    setSelectedCell({ bar, beat });
    setEditValue(existing?.symbol || '');
  };

  const handleChordSet = (symbol: string) => {
    if (!selectedCell) return;

    const { bar, beat } = selectedCell;
    const key = `${bar}-${beat}`;

    if (!symbol.trim()) {
      // Remove chord
      onChordsChange(chords.filter(c => !(c.bar === bar && c.beat === beat)));
    } else {
      const existing = chordMap[key];
      if (existing) {
        // Update existing
        onChordsChange(chords.map(c =>
          c.bar === bar && c.beat === beat ? { ...c, symbol: symbol.trim() } : c
        ));
      } else {
        // Add new
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
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: section.bars }, (_, barIndex) => (
          <div key={barIndex} className="flex border border-gray-200 rounded overflow-hidden">
            {Array.from({ length: beatsPerBar }, (_, beatIndex) => {
              const bar = barIndex + 1;
              const beat = beatIndex + 1;
              const key = `${bar}-${beat}`;
              const chord = chordMap[key];
              const isSelected = selectedCell?.bar === bar && selectedCell?.beat === beat;

              return (
                <button
                  type="button"
                  key={beatIndex}
                  onClick={() => handleCellClick(bar, beat)}
                  className={`w-12 h-8 flex items-center justify-center text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-500 text-white'
                      : chord
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-400'
                  } ${beatIndex > 0 ? 'border-l border-gray-200' : ''}`}
                  aria-label={`Bar ${bar}, Beat ${beat}${chord ? `: ${chord.symbol}` : ''}`}
                  aria-pressed={isSelected}
                >
                  {chord?.symbol || '-'}
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
function PlaybackControls({
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

// New Song Modal
function NewSongModal({
  isOpen,
  onClose,
  onCreate
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Partial<Song>) => void;
}) {
  const [title, setTitle] = useState('');
  const [bpmDefault, setBpmDefault] = useState(120);
  const [timeSignatureDefault, setTimeSignatureDefault] = useState('4/4');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim(), bpmDefault, timeSignatureDefault });
    setTitle('');
    setBpmDefault(120);
    setTimeSignatureDefault('4/4');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">New Song</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="My Song"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default BPM</label>
              <input
                type="number"
                value={bpmDefault}
                onChange={(e) => setBpmDefault(parseInt(e.target.value) || 120)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="20"
                max="300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Signature</label>
              <select
                value={timeSignatureDefault}
                onChange={(e) => setTimeSignatureDefault(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TIME_SIGNATURES.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export default function ToolsMetMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const projectContext = useProjectContextOptional();
  const { token } = useAuth();
  const isMobile = useIsMobile();
  const { isOnline: _isOnline } = usePWA();
  const { markStepComplete } = useFirstTimeExperience({
    projectCount: 0,
    conversationCount: 0,
    fileCount: 0,
  });

  // Project context - MetMap sessions should be project-scoped
  const currentProject = projectContext?.currentProject;
  const projectId = searchParams.get('projectId') || currentProject?.id;

  // Auto-complete MetMap onboarding step on first visit
  useEffect(() => {
    markStepComplete('metmap');
  }, [markStepComplete]);

  const {
    songs,
    songsLoading,
    filters: _filters,
    setFilters,
    currentSong,
    currentSongLoading,
    editedSections,
    hasUnsavedChanges,
    playback,
    stats,
    createSong,
    loadSong,
    updateSong,
    deleteSong,
    closeSong: _closeSong,
    addSection,
    updateSection,
    removeSection,
    reorderSections,
    updateSectionChords,
    saveSections,
    play,
    pause,
    stop,
    seekToBar,
    loadStats
  } = useMetMap();

  // Local state
  const [showNewSongModal, setShowNewSongModal] = useState(false);
  const [showSongList, setShowSongList] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempoOverride, setTempoOverride] = useState<number | null>(null);
  const [useClick, setUseClick] = useState(true);
  const [countoffBars, setCountoffBars] = useState(0);
  const [showChords, setShowChords] = useState(false);

  // New feature state
  const [showVisualTimeline, setShowVisualTimeline] = useState(true);
  const [practiceMode, setPracticeMode] = useState(false);
  const [loopSection, setLoopSection] = useState<number | null>(null);
  const [tempoPercent, setTempoPercent] = useState(100);
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [clickSound, _setClickSound] = useState<ClickSound>('classic');
  const [clickVolume, _setClickVolume] = useState(80);
  const [accentFirstBeat, _setAccentFirstBeat] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Metronome audio hook
  const { playClick } = useMetronomeAudio();

  // Calculate total bars for mobile controls
  const totalBars = useMemo(() =>
    editedSections.reduce((sum, s) => sum + s.bars, 0),
    [editedSections]
  );

  // Play metronome click on beat change
  useEffect(() => {
    if (playback.isPlaying && useClick) {
      const isAccent = accentFirstBeat && playback.currentBeat === 1;
      playClick(isAccent, clickSound, clickVolume);
    }
  }, [playback.currentBeat, playback.isPlaying, useClick, playClick, clickSound, clickVolume, accentFirstBeat]);

  // Track repetitions in practice mode
  useEffect(() => {
    if (practiceMode && playback.isPlaying && playback.currentBar === 1 && playback.currentBeat === 1) {
      setRepetitionCount((prev) => prev + 1);
    }
  }, [practiceMode, playback.isPlaying, playback.currentBar, playback.currentBeat]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Sync filters with project context
  useEffect(() => {
    if (projectId) {
      setFilters({ projectId });
    }
  }, [projectId, setFilters]);

  // Mark MetMap as visited for onboarding (first-time experience)
  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEYS.metmapVisited, 'true');
    } catch {
      // localStorage not available
    }
  }, []);

  // Handle URL-based song selection
  useEffect(() => {
    const songId = searchParams.get('song');
    if (songId && (!currentSong || currentSong.id !== songId)) {
      loadSong(songId);
    }
  }, [searchParams, currentSong, loadSong]);

  // Handle asset-based song loading (from "Open in MetMap" on asset cards)
  useEffect(() => {
    const assetId = searchParams.get('assetId');
    if (!assetId || !projectId || !token) return;

    async function loadFromAsset() {
      try {
        // Fetch the asset file content
        const response = await fetch(
          getApiUrl(`/assets/${assetId}/file`),
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!response.ok) {
          showNotification({
            type: 'error',
            title: 'Load Failed',
            message: 'Could not load MetMap session from asset'
          });
          return;
        }

        const data = await response.json();

        // Check if it's a valid MetMap export
        if (!data.song?.id || !data.song?.title) {
          showNotification({
            type: 'error',
            title: 'Invalid Format',
            message: 'This asset does not contain a valid MetMap session'
          });
          return;
        }

        // Try to load the original song if it still exists
        const songId = data.song.id;
        const existingSong = songs.find(s => s.id === songId);

        if (existingSong) {
          // Song still exists, navigate to it
          const params = new URLSearchParams();
          params.set('song', songId);
          if (projectId) params.set('projectId', projectId);
          navigate(`/tools/metmap?${params.toString()}`, { replace: true });
        } else {
          // Song doesn't exist, import it
          const newSong = await createSong({
            title: data.song.title,
            bpmDefault: data.song.bpmDefault || 120,
            timeSignatureDefault: data.song.timeSignatureDefault || '4/4',
            projectId
          });

          if (newSong && data.song.sections) {
            // Import sections
            for (const sectionData of data.song.sections) {
              addSection(sectionData);
            }

            const params = new URLSearchParams();
            params.set('song', newSong.id);
            if (projectId) params.set('projectId', projectId);
            navigate(`/tools/metmap?${params.toString()}`, { replace: true });

            showNotification({
              type: 'success',
              title: 'Session Restored',
              message: `MetMap session "${data.song.title}" has been restored from the saved asset`
            });
          }
        }
      } catch (error) {
        console.error('Failed to load MetMap from asset:', error);
        showNotification({
          type: 'error',
          title: 'Load Failed',
          message: 'Could not load MetMap session from asset'
        });
      }
    }

    loadFromAsset();
  }, [searchParams, projectId, token, songs, createSong, addSection, navigate, showNotification]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilters]);

  const handleCreateSong = async (data: Partial<Song>) => {
    // Include projectId when creating songs (project-scoped)
    const songData = projectId ? { ...data, projectId } : data;
    const song = await createSong(songData);
    if (song) {
      const params = new URLSearchParams();
      params.set('song', song.id);
      if (projectId) if (projectId) params.set('projectId', projectId);
      navigate(`/tools/metmap?${params.toString()}`);
    }
  };

  const handleSelectSong = (song: Song) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    const params = new URLSearchParams();
    params.set('song', song.id);
    if (projectId) if (projectId) params.set('projectId', projectId);
    navigate(`/tools/metmap?${params.toString()}`);
    // Close sidebar on mobile after selection
    if (isMobile) {
      setShowSongList(false);
    }
    // Announce song selection to screen readers
    announceToScreenReader(`Selected song: ${song.title}. ${song.sectionCount} sections, ${song.bpmDefault} BPM.`);
  };

  const handleDeleteSong = async () => {
    if (!currentSong) return;
    if (!confirm(`Delete "${currentSong.title}"? This cannot be undone.`)) return;

    const success = await deleteSong(currentSong.id);
    if (success) {
      const params = new URLSearchParams();
      if (projectId) if (projectId) params.set('projectId', projectId);
      navigate(`/tools/metmap?${params.toString()}`);
    }
  };

  const handlePlay = () => {
    // Apply practice mode tempo percentage
    const effectiveTempo = practiceMode && tempoPercent !== 100
      ? Math.round((tempoOverride || currentSong?.bpmDefault || 120) * (tempoPercent / 100))
      : tempoOverride || undefined;

    play({
      tempoOverride: effectiveTempo,
      countoffBars,
      loopSection: practiceMode ? loopSection : undefined
    });
  };

  // Handle tap tempo
  const handleTapTempo = (bpm: number) => {
    setTempoOverride(bpm);
  };

  // Handle section template add
  const handleAddSectionTemplate = (template: SectionTemplate) => {
    addSection({
      name: template.name,
      bars: template.bars,
      tempoStart: currentSong?.bpmDefault || 120,
      timeSignature: currentSong?.timeSignatureDefault || '4/4'
    });
  };

  // Handle import song
  const handleImportSong = async (data: Partial<Song> & { sections?: Partial<Section>[] }) => {
    const song = await createSong({
      title: data.title || 'Imported Song',
      bpmDefault: data.bpmDefault || 120,
      timeSignatureDefault: data.timeSignatureDefault || '4/4',
      projectId: projectId || undefined
    });
    if (song && data.sections) {
      // Add sections from import
      for (const sectionData of data.sections) {
        addSection(sectionData);
      }
      const params = new URLSearchParams();
      params.set('song', song.id);
      if (projectId) if (projectId) params.set('projectId', projectId);
      navigate(`/tools/metmap?${params.toString()}`);
    }
  };

  // Handle asset created (from Export as Asset)
  const handleAssetCreated = (_asset: any) => {
    showNotification({
      type: 'success',
      title: 'Asset Saved',
      message: `MetMap session "${currentSong?.title}" saved to project assets`
    });
  };

  // Handle share to chat
  const handleShareToChat = async (asset: any) => {
    if (!projectId || !token) return;

    try {
      // Get project conversations to find the main project chat
      const conversationsResponse = await fetch(
        getApiUrl(`/api/messaging/conversations?projectId=${projectId}&limit=1`),
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!conversationsResponse.ok) {
        throw new Error('Could not find project chat');
      }

      const convData = await conversationsResponse.json();
      const conversation = convData.conversations?.[0];

      if (!conversation) {
        showNotification({
          type: 'warning',
          title: 'No Project Chat',
          message: 'Create a conversation in this project first to share MetMap sessions'
        });
        return;
      }

      // Create message with asset reference
      const messageContent = `🎵 Shared MetMap: **${currentSong?.title}**\n\n` +
        `${editedSections.length} sections • ${editedSections.reduce((sum, s) => sum + s.bars, 0)} bars • ${currentSong?.bpmDefault} BPM`;

      const messageResponse = await fetch(
        getApiUrl(`/api/messaging/conversations/${conversation.id}/messages`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: messageContent,
            attachments: [{
              type: 'asset',
              assetId: asset.id,
              name: asset.name,
              mimeType: 'application/json'
            }]
          })
        }
      );

      if (!messageResponse.ok) {
        throw new Error('Failed to send message');
      }

      showNotification({
        type: 'success',
        title: 'Shared to Chat',
        message: `MetMap session shared to project chat`
      });

      // Navigate to messages
      navigate(`/messages?projectId=${projectId}&conversationId=${conversation.id}`);
    } catch (error) {
      console.error('Share to chat failed:', error);
      showNotification({
        type: 'error',
        title: 'Share Failed',
        message: error instanceof Error ? error.message : 'Could not share to chat'
      });
    }
  };

  // Handle visual timeline section click
  const handleTimelineSectionClick = (sectionIndex: number) => {
    if (practiceMode) {
      // In practice mode, clicking sets loop section
      setLoopSection(loopSection === sectionIndex ? null : sectionIndex);
    } else {
      // Otherwise, seek to section start
      const startBar = editedSections.slice(0, sectionIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
      seekToBar(startBar);
    }
  };

  // Keyboard shortcuts
  useMetMapKeyboardShortcuts({
    onPlayPause: () => {
      if (playback.isPlaying) {
        pause();
      } else {
        handlePlay();
      }
    },
    onStop: stop,
    onNextSection: () => {
      const nextIndex = Math.min(playback.currentSectionIndex + 1, editedSections.length - 1);
      const startBar = editedSections.slice(0, nextIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
      seekToBar(startBar);
    },
    onPrevSection: () => {
      const prevIndex = Math.max(playback.currentSectionIndex - 1, 0);
      const startBar = editedSections.slice(0, prevIndex).reduce((sum, s) => sum + s.bars, 0) + 1;
      seekToBar(startBar);
    },
    onTempoUp: () => {
      setTempoOverride((prev) => Math.min(300, (prev || currentSong?.bpmDefault || 120) + 5));
    },
    onTempoDown: () => {
      setTempoOverride((prev) => Math.max(20, (prev || currentSong?.bpmDefault || 120) - 5));
    },
    onToggleClick: () => setUseClick((prev) => !prev),
    onSave: saveSections,
    onNewSection: () => addSection({})
  }, !!currentSong);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Tools', path: '/tools' },
        { label: 'MetMap' }
      ]}
    >
      {/* Offline Indicator */}
      <OfflineIndicator position="top" />

      {/* Breadcrumb Navigation */}
      <div className="px-4 py-2 bg-white border-b border-gray-100">
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link
            to="/tools"
            className="text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Tools
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium">MetMap</span>
          {currentProject && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-indigo-600 font-medium">{currentProject.name}</span>
            </>
          )}
        </nav>
      </div>

      {/* Project selection prompt */}
      {!projectId && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a project to use MetMap</h2>
            <p className="text-gray-500 mb-6">
              MetMap sessions are project-scoped. Choose a project to start mapping your musical timeline with tempo changes, time signatures, and chord progressions.
            </p>
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Go to Projects
            </Link>
          </div>
        </div>
      )}

      {projectId && <div className="h-full flex">
        {/* Mobile header with sidebar toggle */}
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setShowSongList(!showSongList)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-label={showSongList ? 'Hide song list' : 'Show song list'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="font-medium text-gray-900">
              {currentSong?.title || 'MetMap'}
            </div>
            <div className="flex items-center gap-2">
              <NetworkStatusBadge />
              <button
                onClick={() => setShowNewSongModal(true)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                aria-label="New song"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Left sidebar - Song list */}
        <div className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out ${
                showSongList ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'w-72'
        } border-r border-gray-200 bg-white flex flex-col`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">MetMap</h2>
              <button
                onClick={() => setShowNewSongModal(true)}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                aria-label="New song"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {/* Use-case anchoring copy */}
            <p className="text-xs text-gray-500 mb-3">
              Rehearse tempo + meter changes and map chord progressions — great for complex pieces.
            </p>
            {/* Project bridge link */}
            <a
              href="/projects"
              className="inline-block text-xs text-indigo-600 hover:text-indigo-700 mb-3"
            >
              Organize this work in a project →
            </a>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Stats */}
          {stats && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex gap-3">
              <span>{stats.songCount} songs</span>
              <span>{stats.practiceCount} sessions</span>
              <span>{formatDuration(stats.totalPracticeMinutes)} practiced</span>
            </div>
          )}

          {/* Song list */}
          <div className="flex-1 overflow-y-auto">
            {songsLoading && songs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : songs.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No songs yet</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Map out tempo changes, time signatures, and chord progressions for practice.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // Quick Start: Create a song with common sections
                      const quickStartSections: Section[] = [
                        { id: crypto.randomUUID(), name: 'Intro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 0, startBar: 1 },
                        { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 1, startBar: 5 },
                        { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 2, startBar: 13 },
                        { id: crypto.randomUUID(), name: 'Verse', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 3, startBar: 21 },
                        { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 4, startBar: 29 },
                        { id: crypto.randomUUID(), name: 'Bridge', bars: 4, timeSignature: '4/4', tempoStart: 100, orderIndex: 5, startBar: 37 },
                        { id: crypto.randomUUID(), name: 'Chorus', bars: 8, timeSignature: '4/4', tempoStart: 120, orderIndex: 6, startBar: 41 },
                        { id: crypto.randomUUID(), name: 'Outro', bars: 4, timeSignature: '4/4', tempoStart: 120, orderIndex: 7, startBar: 49 },
                      ];
                      const quickStartSong: Partial<Song> = {
                        title: 'My Song',
                        projectId: undefined,
                        bpmDefault: 120,
                        timeSignatureDefault: '4/4',
                        sectionCount: quickStartSections.length,
                        totalBars: quickStartSections.reduce((sum, s) => sum + s.bars, 0),
                        practiceCount: 0,
                        sections: quickStartSections,
                      };
                      createSong(quickStartSong);
                    }}
                    className="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Quick Start (with template)
                  </button>
                  <button
                    onClick={() => setShowNewSongModal(true)}
                    className="w-full px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Start from scratch
                  </button>
                </div>
              </div>
            ) : (
              songs.map((song) => (
                <SongListItem
                  key={song.id}
                  song={song}
                  isSelected={currentSong?.id === song.id}
                  onClick={() => handleSelectSong(song)}
                />
              ))
            )}
          </div>
        </div>

        {/* Mobile sidebar backdrop */}
        {isMobile && showSongList && (
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setShowSongList(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile ? 'pt-12' : ''}`}>
          {currentSongLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-500">Loading song...</div>
            </div>
          ) : currentSong ? (
            <>
              {/* Song header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <input
                      type="text"
                      value={currentSong.title}
                      onChange={(e) => updateSong(currentSong.id, { title: e.target.value })}
                      className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1 -ml-1"
                    />
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                      <span>{currentSong.bpmDefault} BPM</span>
                      <span>{currentSong.timeSignatureDefault}</span>
                      <span>{currentSong.totalBars} bars total</span>
                      {currentSong.projectName && (
                        <span className="text-indigo-600">Project: {currentSong.projectName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                      <span className="text-xs text-orange-500">Unsaved changes</span>
                    )}
                    <TapTempo onTempoDetected={handleTapTempo} />
                    <button
                      onClick={saveSections}
                      disabled={!hasUnsavedChanges}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Save Timeline
                    </button>
                    <ExportImport
                      currentSong={currentSong}
                      sections={editedSections}
                      onImportSong={handleImportSong}
                      projectId={projectId}
                      token={token || undefined}
                      onAssetCreated={handleAssetCreated}
                      onShareToChat={handleShareToChat}
                    />
                    <button
                      onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Keyboard shortcuts"
                      title="Keyboard shortcuts"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDeleteSong}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete song"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Keyboard shortcuts help */}
                {showShortcutsHelp && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <ShortcutsHelp />
                  </div>
                )}
              </div>

              {/* Visual Timeline */}
              {showVisualTimeline && editedSections.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">Timeline</span>
                    <button
                      onClick={() => setShowVisualTimeline(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Hide
                    </button>
                  </div>
                  <VisualTimeline
                    sections={editedSections}
                    currentBar={playback.currentBar}
                    isPlaying={playback.isPlaying}
                    onSectionClick={handleTimelineSectionClick}
                    loopSection={practiceMode ? loopSection : null}
                  />
                </div>
              )}

              {/* Practice Mode */}
              <div className="px-4 py-2 border-b border-gray-200 bg-white">
                <PracticeMode
                  sections={editedSections}
                  loopSection={loopSection}
                  onLoopSectionChange={setLoopSection}
                  tempoPercent={tempoPercent}
                  onTempoPercentChange={setTempoPercent}
                  repetitionCount={repetitionCount}
                  isActive={practiceMode}
                  onToggleActive={() => {
                    setPracticeMode(!practiceMode);
                    if (!practiceMode) setRepetitionCount(0);
                  }}
                />
              </div>

              {/* Section timeline */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Sections</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowChords(!showChords)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        showChords ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {showChords ? 'Hide' : 'Show'} Chords
                    </button>
                    {!showVisualTimeline && (
                      <button
                        onClick={() => setShowVisualTimeline(true)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                      >
                        Show Timeline
                      </button>
                    )}
                    <SectionTemplates
                      onAddSection={handleAddSectionTemplate}
                      compact
                    />
                  </div>
                </div>

                {editedSections.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="mb-2">No sections yet</div>
                    <button
                      onClick={() => addSection({})}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Add your first section
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editedSections.map((section, index) => (
                      <div key={section.id || index}>
                        <SectionRow
                          section={section}
                          index={index}
                          isPlaying={playback.isPlaying}
                          isCurrentSection={playback.currentSectionIndex === index}
                          onUpdate={(changes) => updateSection(index, changes)}
                          onRemove={() => removeSection(index)}
                          onMoveUp={() => reorderSections(index, index - 1)}
                          onMoveDown={() => reorderSections(index, index + 1)}
                          canMoveUp={index > 0}
                          canMoveDown={index < editedSections.length - 1}
                        />
                        {showChords && (
                          <ChordGrid
                            section={section}
                            sectionIndex={index}
                            chords={section.chords || []}
                            onChordsChange={(chords) => updateSectionChords(index, chords)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Playback controls - responsive */}
              <div className="p-4 border-t border-gray-200 bg-white">
                {isMobile ? (
                  <MobilePlaybackControls
                    isPlaying={playback.isPlaying}
                    isPaused={playback.isPaused}
                    currentBar={playback.currentBar}
                    currentBeat={playback.currentBeat}
                    currentTempo={playback.currentTempo}
                    totalBars={totalBars}
                    countingOff={playback.countingOff}
                    countoffBeatsRemaining={playback.countoffBeatsRemaining}
                    onPlay={handlePlay}
                    onPause={pause}
                    onStop={stop}
                    onSeekToBar={seekToBar}
                    defaultTempo={currentSong?.bpmDefault || 120}
                  />
                ) : (
                  <PlaybackControls
                    isPlaying={playback.isPlaying}
                    isPaused={playback.isPaused}
                    currentBar={playback.currentBar}
                    currentBeat={playback.currentBeat}
                    currentTempo={playback.currentTempo}
                    countingOff={playback.countingOff}
                    countoffBeatsRemaining={playback.countoffBeatsRemaining}
                    onPlay={handlePlay}
                    onPause={pause}
                    onStop={stop}
                    tempoOverride={tempoOverride}
                    setTempoOverride={setTempoOverride}
                    useClick={useClick}
                    setUseClick={setUseClick}
                    countoffBars={countoffBars}
                    setCountoffBars={setCountoffBars}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Select or create a song</h3>
                <p className="text-gray-500 mb-4">Choose a song from the list or create a new one</p>
                <button
                  onClick={() => setShowNewSongModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Create New Song
                </button>
              </div>
            </div>
          )}
        </div>
      </div>}

      {/* Modals */}
      <NewSongModal
        isOpen={showNewSongModal}
        onClose={() => setShowNewSongModal(false)}
        onCreate={handleCreateSong}
      />
    </DashboardLayout>
  );
}
