/**
 * RehearsalMode - Full-screen rehearsal view for drill practice.
 *
 * Displays a large set name and count, simplified formation canvas,
 * prev/next navigation, auto-advance with metronome visualization,
 * and section spotlight mode.
 *
 * Keyboard shortcuts:
 *   Space  = play/pause auto-advance
 *   J      = previous set
 *   K      = next set
 *   Escape = exit rehearsal mode
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Eye,
  EyeOff,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import type { Formation, DrillSet, Position, Performer } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface RehearsalModeProps {
  /** The full formation data (performers, keyframes, etc.) */
  formation: Formation;
  /** All drill sets in order */
  sets: DrillSet[];
  /** Tempo in beats per minute */
  bpm: number;
  /** Callback to exit rehearsal mode */
  onExit: () => void;
}

interface MetronomeState {
  /** Whether auto-advance is playing */
  isPlaying: boolean;
  /** Current count within the active set (1-based) */
  currentCount: number;
  /** Whether the metronome dot is in "pulse" state */
  isPulsing: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PULSE_DURATION_MS = 120;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get positions for a given set by finding its linked keyframe.
 */
function getPositionsForSet(
  formation: Formation,
  set: DrillSet,
): Map<string, Position> {
  const keyframe = formation.keyframes.find((kf) => kf.id === set.keyframeId);
  return keyframe?.positions ?? new Map();
}

/**
 * Get unique section names from performers.
 */
function getSections(performers: Performer[]): string[] {
  const sections = new Set<string>();
  for (const p of performers) {
    sections.add(p.section || 'Unassigned');
  }
  return Array.from(sections).sort();
}

// ============================================================================
// Sub-components
// ============================================================================

interface RehearsalCanvasProps {
  performers: Performer[];
  positions: Map<string, Position>;
  spotlightSection: string | null;
  stageWidth: number;
  stageHeight: number;
}

function RehearsalCanvas({
  performers,
  positions,
  spotlightSection,
  stageWidth,
  stageHeight,
}: RehearsalCanvasProps) {
  const aspectRatio = stageWidth / stageHeight;

  return (
    <div
      className="relative w-full bg-gray-900 rounded-xl overflow-hidden border border-gray-700"
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={`${i * 10}%`}
            y1="0"
            x2={`${i * 10}%`}
            y2="100%"
            stroke="white"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={`${i * 10}%`}
            x2="100%"
            y2={`${i * 10}%`}
            stroke="white"
            strokeWidth="0.5"
          />
        ))}
      </svg>

      {/* Performers */}
      {performers.map((performer) => {
        const pos = positions.get(performer.id);
        if (!pos) return null;

        const isDimmed =
          spotlightSection !== null &&
          (performer.section || 'Unassigned') !== spotlightSection;

        return (
          <div
            key={performer.id}
            className="absolute flex items-center justify-center transition-all duration-300"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: isDimmed ? 0.15 : 1,
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md"
              style={{ backgroundColor: performer.color }}
            >
              {performer.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MetronomeDotProps {
  isPulsing: boolean;
  currentCount: number;
  totalCounts: number;
}

function MetronomeDot({ isPulsing, currentCount, totalCounts }: MetronomeDotProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Pulsing dot */}
      <div
        className={`
          w-5 h-5 rounded-full transition-all
          ${isPulsing
            ? 'bg-green-400 shadow-lg shadow-green-400/50 scale-125'
            : 'bg-gray-600 scale-100'
          }
        `}
        style={{ transitionDuration: `${PULSE_DURATION_MS}ms` }}
      />

      {/* Count progress dots */}
      <div className="flex gap-1">
        {Array.from({ length: totalCounts }, (_, i) => (
          <div
            key={i}
            className={`
              w-2 h-2 rounded-full transition-colors duration-100
              ${i < currentCount
                ? 'bg-blue-400'
                : 'bg-gray-700'
              }
            `}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RehearsalMode({
  formation,
  sets,
  bpm,
  onExit,
}: RehearsalModeProps) {
  const sortedSets = useMemo(
    () => [...sets].sort((a, b) => a.sortOrder - b.sortOrder),
    [sets],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [metronome, setMetronome] = useState<MetronomeState>({
    isPlaying: false,
    currentCount: 0,
    isPulsing: false,
  });
  const [spotlightSection, setSpotlightSection] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSet = sortedSets[currentIndex] ?? null;
  const sections = useMemo(() => getSections(formation.performers), [formation.performers]);

  const positions = useMemo(
    () => (currentSet ? getPositionsForSet(formation, currentSet) : new Map<string, Position>()),
    [formation, currentSet],
  );

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < sortedSets.length - 1;

  // ---- Navigation ----

  const goToPrev = useCallback(() => {
    if (!hasPrev) return;
    setCurrentIndex((i) => i - 1);
    setMetronome((prev) => ({ ...prev, currentCount: 0, isPulsing: false }));
  }, [hasPrev]);

  const goToNext = useCallback(() => {
    if (!hasNext) return;
    setCurrentIndex((i) => i + 1);
    setMetronome((prev) => ({ ...prev, currentCount: 0, isPulsing: false }));
  }, [hasNext]);

  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
    setMetronome((prev) => ({ ...prev, currentCount: 0, isPulsing: false }));
  }, []);

  const goToLast = useCallback(() => {
    setCurrentIndex(sortedSets.length - 1);
    setMetronome((prev) => ({ ...prev, currentCount: 0, isPulsing: false }));
  }, [sortedSets.length]);

  // ---- Auto-advance / Metronome ----

  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }
    setMetronome((prev) => ({ ...prev, isPlaying: false, isPulsing: false }));
  }, []);

  const startMetronome = useCallback(() => {
    if (bpm <= 0 || !currentSet) return;

    const msPerBeat = 60000 / bpm;

    setMetronome({ isPlaying: true, currentCount: 0, isPulsing: false });

    intervalRef.current = setInterval(() => {
      setMetronome((prev) => {
        const nextCount = prev.currentCount + 1;

        // Trigger pulse
        if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
        pulseTimeoutRef.current = setTimeout(() => {
          setMetronome((p) => ({ ...p, isPulsing: false }));
        }, PULSE_DURATION_MS);

        return { ...prev, currentCount: nextCount, isPulsing: true };
      });
    }, msPerBeat);
  }, [bpm, currentSet]);

  // Auto-advance to next set when counts are exhausted
  useEffect(() => {
    if (!metronome.isPlaying || !currentSet) return;

    if (metronome.currentCount >= currentSet.counts) {
      if (hasNext) {
        setCurrentIndex((i) => i + 1);
        setMetronome((prev) => ({ ...prev, currentCount: 0 }));
      } else {
        // Reached the end, stop
        stopMetronome();
      }
    }
  }, [metronome.currentCount, metronome.isPlaying, currentSet, hasNext, stopMetronome]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  // Restart metronome when set changes during playback
  useEffect(() => {
    if (metronome.isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);

      const msPerBeat = 60000 / bpm;
      intervalRef.current = setInterval(() => {
        setMetronome((prev) => {
          const nextCount = prev.currentCount + 1;

          if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
          pulseTimeoutRef.current = setTimeout(() => {
            setMetronome((p) => ({ ...p, isPulsing: false }));
          }, PULSE_DURATION_MS);

          return { ...prev, currentCount: nextCount, isPulsing: true };
        });
      }, msPerBeat);
    }

    return () => {
      if (intervalRef.current && !metronome.isPlaying) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, bpm]);

  const togglePlayPause = useCallback(() => {
    if (metronome.isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  }, [metronome.isPlaying, stopMetronome, startMetronome]);

  // ---- Spotlight ----

  const toggleSpotlight = useCallback(
    (section: string) => {
      setSpotlightSection((prev) => (prev === section ? null : section));
    },
    [],
  );

  // ---- Keyboard shortcuts ----

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'j':
        case 'J':
          goToPrev();
          break;
        case 'k':
        case 'K':
          goToNext();
          break;
        case 'Escape':
          onExit();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, goToPrev, goToNext, onExit]);

  // ---- Render ----

  if (!currentSet) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center text-gray-400">
        <p>No sets available.</p>
        <button
          onClick={onExit}
          className="ml-4 px-4 py-2 rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
        >
          Exit
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col select-none">
      {/* Top Bar: Set info + exit */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        {/* Left: Set index */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToFirst}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            aria-label="Go to first set"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500 font-medium tabular-nums">
            {currentIndex + 1} / {sortedSets.length}
          </span>
          <button
            onClick={goToLast}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            aria-label="Go to last set"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Large set name + count display */}
        <div className="text-center">
          {currentSet.rehearsalMark && (
            <span className="text-sm font-bold uppercase tracking-widest text-indigo-400 block mb-1">
              {currentSet.rehearsalMark}
            </span>
          )}
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-none">
            {currentSet.name}
          </h1>
          <p className="text-2xl md:text-3xl text-blue-400 font-semibold mt-1 tabular-nums">
            {currentSet.counts} counts
          </p>
        </div>

        {/* Right: Exit */}
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm font-medium"
          aria-label="Exit rehearsal mode"
        >
          <X className="w-4 h-4" />
          Exit
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-4 overflow-hidden">
        {/* Canvas */}
        <div className="w-full max-w-4xl">
          <RehearsalCanvas
            performers={formation.performers}
            positions={positions}
            spotlightSection={spotlightSection}
            stageWidth={formation.stageWidth}
            stageHeight={formation.stageHeight}
          />
        </div>

        {/* Notes */}
        {currentSet.notes && (
          <div className="max-w-2xl w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 text-center">
            {currentSet.notes}
          </div>
        )}

        {/* Metronome + count visualization */}
        <div className="flex flex-col items-center gap-2">
          <MetronomeDot
            isPulsing={metronome.isPulsing}
            currentCount={metronome.currentCount}
            totalCounts={Math.min(currentSet.counts, 32)}
          />
          {metronome.isPlaying && (
            <span className="text-xs text-gray-500 tabular-nums">
              Count: {metronome.currentCount} / {currentSet.counts}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Bar: Navigation + controls */}
      <div className="border-t border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Prev */}
          <button
            onClick={goToPrev}
            disabled={!hasPrev}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-medium min-w-[140px] justify-center"
            aria-label="Previous set"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          {/* Center controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause auto-advance */}
            <button
              onClick={togglePlayPause}
              className={`
                p-4 rounded-full transition-colors text-white
                ${metronome.isPlaying
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-green-600 hover:bg-green-500'
                }
              `}
              aria-label={metronome.isPlaying ? 'Pause auto-advance' : 'Start auto-advance'}
            >
              {metronome.isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            {/* Section spotlight selector */}
            <div className="flex items-center gap-1 ml-4">
              <span className="text-xs text-gray-500 mr-1">Spotlight:</span>
              {sections.map((section) => {
                const isActive = spotlightSection === section;
                return (
                  <button
                    key={section}
                    onClick={() => toggleSpotlight(section)}
                    className={`
                      px-2 py-1 rounded text-xs font-medium transition-colors
                      ${isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }
                    `}
                    title={isActive ? 'Clear spotlight' : `Spotlight ${section}`}
                  >
                    {isActive ? (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {section}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        {section}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next */}
          <button
            onClick={goToNext}
            disabled={!hasNext}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-medium min-w-[140px] justify-center"
            aria-label="Next set"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-600">
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">J</kbd> Prev</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">K</kbd> Next</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">Esc</kbd> Exit</span>
        </div>
      </div>
    </div>
  );
}

export default RehearsalMode;
