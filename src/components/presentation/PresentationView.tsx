/**
 * PresentationView - Fullscreen formation slideshow for presentations
 *
 * Phase 3.3: Client Presentation Mode
 *
 * Read-only presentation view for directors presenting to parents/boosters
 * or designers presenting to clients. Features:
 * - Fullscreen animated slideshow (sets auto-advance with music)
 * - Per-set narration notes panel
 * - Pointer highlight cursor for the presenter
 * - Keyboard navigation (arrows, space, escape)
 *
 * Guarded behind `presentation-mode` feature flag.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Maximize,
  FileText,
  Loader2,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface PresentationPerformer {
  id: string;
  name: string;
  label: string;
  color: string;
  section?: string;
  instrument?: string;
}

export interface PresentationKeyframe {
  id: string;
  timestamp: number;
  positions: Record<string, { x: number; y: number; rotation?: number }>;
}

export interface PresentationSet {
  id: string;
  name: string;
  counts: number;
  sortOrder: number;
  notes?: string;
}

export interface PresentationNote {
  setIndex: number;
  setName: string;
  content: string;
}

export interface PresentationViewProps {
  /** Formation name shown in the title bar */
  formationName: string;
  /** Description shown below the title */
  description?: string;
  /** Array of performers to render */
  performers: PresentationPerformer[];
  /** Ordered keyframes for interpolation */
  keyframes: PresentationKeyframe[];
  /** Drill sets for set navigation */
  sets?: PresentationSet[];
  /** Audio track URL (optional) */
  audioUrl?: string;
  /** AI-generated notes per set */
  notes?: PresentationNote[];
  /** Whether notes are currently being generated */
  isLoadingNotes?: boolean;
  /** Callback to request AI note generation */
  onRequestNotes?: () => void;
  /** Called when the user exits presentation mode */
  onExit: () => void;
  /** Stage dimensions for coordinate mapping */
  stageWidth?: number;
  stageHeight?: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// Component
// ============================================================================

export const PresentationView: React.FC<PresentationViewProps> = ({
  formationName,
  description,
  performers,
  keyframes,
  sets = [],
  audioUrl,
  notes = [],
  isLoadingNotes = false,
  onRequestNotes,
  onExit,
}) => {
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playbackRef = useRef<{ startWall: number; startTime: number } | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived
  const sortedSets = useMemo(
    () => [...sets].sort((a, b) => a.sortOrder - b.sortOrder),
    [sets],
  );

  const duration = useMemo(() => {
    if (keyframes.length < 2) return 0;
    return keyframes[keyframes.length - 1].timestamp;
  }, [keyframes]);

  const currentSetIndex = useMemo(() => {
    if (sortedSets.length === 0) return -1;
    let bestIdx = 0;
    for (let i = 0; i < sortedSets.length && i < keyframes.length; i++) {
      if (keyframes[i].timestamp <= currentTime) bestIdx = i;
    }
    return bestIdx;
  }, [sortedSets, keyframes, currentTime]);

  // ============================================================================
  // Interpolation
  // ============================================================================

  const getInterpolatedPositions = useCallback(
    (time: number): Map<string, { x: number; y: number; rotation?: number }> => {
      if (keyframes.length === 0) return new Map();

      let prevKf = keyframes[0];
      let nextKf = keyframes[0];

      for (const kf of keyframes) {
        if (kf.timestamp <= time) prevKf = kf;
        if (kf.timestamp >= time) {
          nextKf = kf;
          break;
        }
      }

      if (prevKf.id === nextKf.id) {
        const map = new Map<string, { x: number; y: number; rotation?: number }>();
        Object.entries(prevKf.positions).forEach(([id, pos]) => map.set(id, pos));
        return map;
      }

      const range = nextKf.timestamp - prevKf.timestamp;
      const t = range > 0 ? (time - prevKf.timestamp) / range : 0;
      const map = new Map<string, { x: number; y: number; rotation?: number }>();
      const allIds = new Set([...Object.keys(prevKf.positions), ...Object.keys(nextKf.positions)]);

      for (const id of allIds) {
        const p = prevKf.positions[id];
        const n = nextKf.positions[id];
        if (p && n) {
          map.set(id, {
            x: p.x + (n.x - p.x) * t,
            y: p.y + (n.y - p.y) * t,
            rotation: (p.rotation ?? 0) + ((n.rotation ?? 0) - (p.rotation ?? 0)) * t,
          });
        } else if (p) {
          map.set(id, p);
        } else if (n) {
          map.set(id, n);
        }
      }
      return map;
    },
    [keyframes],
  );

  const [positions, setPositions] = useState<Map<string, { x: number; y: number; rotation?: number }>>(() =>
    getInterpolatedPositions(0),
  );

  // ============================================================================
  // Playback
  // ============================================================================

  const seekTo = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(t, duration));
      setCurrentTime(clamped);
      setPositions(getInterpolatedPositions(clamped));
      if (audioRef.current) {
        audioRef.current.currentTime = clamped / 1000;
      }
    },
    [duration, getInterpolatedPositions],
  );

  useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    playbackRef.current = {
      startWall: performance.now(),
      startTime: currentTime,
    };
    let raf: number;

    if (audioRef.current) {
      audioRef.current.currentTime = currentTime / 1000;
      audioRef.current.play().catch(() => {});
    }

    const tick = () => {
      if (!playbackRef.current) return;
      const elapsed = performance.now() - playbackRef.current.startWall;
      const t = playbackRef.current.startTime + elapsed;

      if (t >= duration) {
        setCurrentTime(0);
        setPositions(getInterpolatedPositions(0));
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        return;
      }

      setCurrentTime(t);
      setPositions(getInterpolatedPositions(t));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      playbackRef.current = null;
      if (audioRef.current) audioRef.current.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, duration, getInterpolatedPositions]);

  // ============================================================================
  // Navigation
  // ============================================================================

  const navigateToSet = useCallback(
    (index: number) => {
      if (sortedSets.length === 0 || keyframes.length === 0) return;
      const clamped = Math.max(0, Math.min(index, sortedSets.length - 1));
      if (clamped < keyframes.length) {
        seekTo(keyframes[clamped].timestamp);
      }
    },
    [sortedSets, keyframes, seekTo],
  );

  // ============================================================================
  // Fullscreen
  // ============================================================================

  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  // ============================================================================
  // Auto-hide controls
  // ============================================================================

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying, resetControlsTimer]);

  // ============================================================================
  // Pointer tracking
  // ============================================================================

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      resetControlsTimer();
      const rect = e.currentTarget.getBoundingClientRect();
      setPointerPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    },
    [resetControlsTimer],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setPointerPos(null);
  }, []);

  // ============================================================================
  // Keyboard shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onExit();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (sortedSets.length > 0) {
            navigateToSet(currentSetIndex + 1);
          } else {
            seekTo(currentTime + duration / 20);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (sortedSets.length > 0) {
            navigateToSet(currentSetIndex - 1);
          } else {
            seekTo(currentTime - duration / 20);
          }
          break;
        case 'f':
          enterFullscreen();
          break;
        case 'n':
          setShowNotes((v) => !v);
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit, currentSetIndex, navigateToSet, seekTo, currentTime, duration, sortedSets.length, enterFullscreen]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gray-950 flex flex-col"
      onMouseMove={resetControlsTimer}
    >
      {/* Hidden audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}

      {/* Top bar (auto-hides) */}
      <div
        className={`flex items-center justify-between px-6 py-3 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="min-w-0">
          <h1 className="text-white text-lg font-semibold truncate">{formationName}</h1>
          {description && (
            <p className="text-gray-400 text-sm truncate">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notes toggle */}
          {(notes.length > 0 || onRequestNotes) && (
            <button
              onClick={() => {
                setShowNotes((v) => !v);
                if (notes.length === 0 && onRequestNotes) onRequestNotes();
              }}
              className={`p-2 rounded-lg transition-colors ${showNotes ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              title="Toggle narration notes (N)"
              aria-label="Toggle narration notes"
              aria-pressed={showNotes}
            >
              {isLoadingNotes ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileText className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={enterFullscreen}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Fullscreen (F)"
            aria-label="Enter fullscreen"
          >
            <Maximize className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Exit */}
          <button
            onClick={onExit}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Exit presentation (Esc)"
            aria-label="Exit presentation"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 2D formation canvas */}
        <div
          className="flex-1 flex items-center justify-center cursor-none"
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
        >
          <div className="relative" style={{ width: '75vmin', height: '75vmin' }}>
            <div className="absolute inset-0 border border-gray-800 rounded-xl bg-gray-900/50">
              {performers.map((performer) => {
                const pos = positions.get(performer.id);
                if (!pos) return null;

                return (
                  <div
                    key={performer.id}
                    className="absolute transition-all duration-75 ease-linear"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      className="rounded-full flex items-center justify-center text-white font-bold shadow-lg w-7 h-7 text-xs"
                      style={{ backgroundColor: performer.color }}
                    >
                      {performer.label}
                    </div>
                  </div>
                );
              })}

              {/* Pointer highlight */}
              {pointerPos && (
                <div
                  className="absolute w-6 h-6 rounded-full border-2 border-yellow-400 bg-yellow-400/20 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${pointerPos.x}%`,
                    top: `${pointerPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Notes panel (slide-in) */}
        {showNotes && (
          <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto flex-shrink-0">
            <h2 className="text-white text-sm font-semibold mb-3">Presentation Notes</h2>
            {isLoadingNotes ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Generating notes...
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.setIndex}
                    className={`p-3 rounded-lg text-sm transition-colors ${
                      note.setIndex === currentSetIndex
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                        : 'bg-gray-800/50 text-gray-400'
                    }`}
                  >
                    <div className="font-medium text-xs text-gray-500 mb-1">{note.setName}</div>
                    <p>{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No notes available.
                {onRequestNotes && (
                  <button
                    onClick={onRequestNotes}
                    className="block mt-2 text-indigo-400 hover:text-indigo-300 underline text-sm"
                  >
                    Generate AI notes
                  </button>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom transport bar (auto-hides) */}
      <div
        className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Set indicator */}
        {sortedSets.length > 0 && currentSetIndex >= 0 && (
          <span className="text-sm text-white font-medium min-w-[5rem]">
            {sortedSets[currentSetIndex]?.name || `Set ${currentSetIndex + 1}`}
          </span>
        )}

        {/* Previous set */}
        <button
          onClick={() => navigateToSet(currentSetIndex - 1)}
          disabled={currentSetIndex <= 0}
          className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous set"
        >
          <SkipBack className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => {
            if (isPlaying) {
              setIsPlaying(false);
            } else {
              if (currentTime >= duration && duration > 0) seekTo(0);
              setIsPlaying(true);
            }
          }}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Play className="w-5 h-5" aria-hidden="true" />
          )}
        </button>

        {/* Next set */}
        <button
          onClick={() => navigateToSet(currentSetIndex + 1)}
          disabled={sortedSets.length === 0 || currentSetIndex >= sortedSets.length - 1}
          className="p-2 text-gray-400 hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
          aria-label="Next set"
        >
          <SkipForward className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Progress bar */}
        {duration > 0 && (
          <>
            <div
              className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden cursor-pointer group"
              role="slider"
              tabIndex={0}
              aria-label="Playback progress"
              aria-valuenow={Math.round(currentTime)}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const fraction = (e.clientX - rect.left) / rect.width;
                seekTo(fraction * duration);
              }}
            >
              <div
                className="h-full bg-indigo-500 rounded-full transition-[width] duration-75 group-hover:bg-indigo-400"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </>
        )}

        {/* Set counter */}
        {sortedSets.length > 0 && (
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {currentSetIndex + 1} / {sortedSets.length}
          </span>
        )}
      </div>
    </div>
  );
};

export default PresentationView;
