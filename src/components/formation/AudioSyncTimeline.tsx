/**
 * AudioSyncTimeline - Unified waveform + beat markers + formation keyframes
 *
 * Combines wavesurfer.js waveform visualization with an SVG overlay of beat
 * markers and draggable diamond keyframe markers.  Keyframe markers
 * magnetically snap to the nearest beat (or half-beat / measure boundary)
 * when dragged within proximity.
 *
 * Enhanced snap features:
 * - Snap guide line: pulsing amber vertical line at snap target during drag
 * - Snap resolution selector: inline toolbar (Beat/Half-Beat/Measure)
 * - Snap tooltip: ephemeral "Snapped!" label that fades out after 500ms
 * - Beat count labels: beat numbers (1,2,3,4) along the bottom of the grid
 *
 * Playback is NOT owned here — currentTime is driven externally.
 */

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { BeatMap } from '../../contexts/metmap/types';
import type { Keyframe } from '../../services/formationTypes';
import { snapToBeat } from '../../services/audioAnalysis';

// ============================================================================
// Snap Resolution Selector (inline toolbar)
// ============================================================================

interface SnapResolutionSelectorProps {
  value: 'beat' | 'half-beat' | 'measure';
  onChange: (resolution: 'beat' | 'half-beat' | 'measure') => void;
}

const SNAP_RESOLUTION_OPTIONS: {
  value: 'beat' | 'half-beat' | 'measure';
  label: string;
  symbol: string;
}[] = [
  { value: 'beat', label: 'Beat', symbol: '\u2669' },
  { value: 'half-beat', label: 'Half-Beat', symbol: '\u266A' },
  { value: 'measure', label: 'Measure', symbol: '\uD834\uDD00' },
];

function SnapResolutionSelector({ value, onChange }: SnapResolutionSelectorProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 py-1"
      role="radiogroup"
      aria-label="Snap resolution"
    >
      <span className="text-xs text-neutral-400 mr-1 select-none">Snap:</span>
      {SNAP_RESOLUTION_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          aria-label={opt.label}
          title={opt.label}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors select-none ${
            value === opt.value
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300'
          }`}
        >
          <span className="mr-1">{opt.symbol}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Types
// ============================================================================

interface AudioSyncTimelineProps {
  audioUrl: string;
  beatMap: BeatMap | null;
  keyframes: Keyframe[];
  currentTime: number; // ms
  duration: number; // ms
  zoom: number; // px per second
  bpm: number;
  snapResolution: 'beat' | 'half-beat' | 'measure';
  selectedKeyframeId?: string;
  isPlaying: boolean;
  onSeek: (timeMs: number) => void;
  onKeyframeMove: (keyframeId: string, newTimestamp: number) => void;
  onKeyframeAdd: (timestamp: number) => void;
  onKeyframeSelect: (keyframeId: string) => void;
  onSnapResolutionChange?: (resolution: 'beat' | 'half-beat' | 'measure') => void;
  className?: string;

  // Trim & loop controls (optional — defaults to full duration)
  trimStart?: number; // ms – start of active region
  trimEnd?: number; // ms – end of active region
  loopEnabled?: boolean;
  onTrimChange?: (start: number, end: number) => void;
}

/** Snap-proximity threshold in pixels — when a keyframe is dragged within
 *  this many pixels of a beat line it magnetically locks. */
const SNAP_THRESHOLD_PX = 12;

// ============================================================================
// Helpers
// ============================================================================

/** Given a snap resolution and bpm, return the effective bpm for snapping.
 *  half-beat doubles bpm, measure divides by beats-per-measure (4). */
function effectiveBpmForSnap(
  bpm: number,
  resolution: 'beat' | 'half-beat' | 'measure',
): number {
  switch (resolution) {
    case 'half-beat':
      return bpm * 2;
    case 'measure':
      return bpm / 4; // assume 4/4
    default:
      return bpm;
  }
}

/** Get the beat grid timestamps in seconds for the overlay, respecting
 *  snap resolution. */
function getBeatTimestamps(
  beatMap: BeatMap | null,
  durationMs: number,
  bpm: number,
  resolution: 'beat' | 'half-beat' | 'measure',
): number[] {
  // If we have a real beat map and resolution is 'beat', use detected beats
  if (beatMap && resolution === 'beat') {
    return beatMap.beats; // already in seconds
  }

  // Otherwise generate from bpm
  const effectiveBpm = effectiveBpmForSnap(bpm, resolution);
  if (effectiveBpm <= 0 || durationMs <= 0) return [];
  const intervalSec = 60 / effectiveBpm;
  const durationSec = durationMs / 1000;
  const timestamps: number[] = [];
  for (let t = 0; t < durationSec; t += intervalSec) {
    timestamps.push(t);
  }
  return timestamps;
}

/** Generate beat-level timestamps for beat count labels, always at per-beat
 *  resolution regardless of snap setting. */
function getBeatLevelTimestamps(
  beatMap: BeatMap | null,
  durationMs: number,
  bpm: number,
): number[] {
  if (beatMap) {
    return beatMap.beats;
  }
  if (bpm <= 0 || durationMs <= 0) return [];
  const intervalSec = 60 / bpm;
  const durationSec = durationMs / 1000;
  const timestamps: number[] = [];
  for (let t = 0; t < durationSec; t += intervalSec) {
    timestamps.push(t);
  }
  return timestamps;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

// ============================================================================
// KeyframeDiamond sub-component
// ============================================================================

interface KeyframeDiamondProps {
  keyframe: Keyframe;
  durationMs: number;
  containerWidth: number;
  height: number;
  isSelected: boolean;
  isSnapped: boolean;
  /** Show ephemeral "Snapped!" tooltip near the diamond */
  showSnapTooltip: boolean;
  onSelect: () => void;
  onDragStart: (keyframeId: string, startX: number, startTimeMs: number) => void;
}

function KeyframeDiamond({
  keyframe,
  durationMs,
  containerWidth,
  height,
  isSelected,
  isSnapped,
  showSnapTooltip,
  onSelect,
  onDragStart,
}: KeyframeDiamondProps) {
  const xPos =
    durationMs > 0 ? (keyframe.timestamp / durationMs) * containerWidth : 0;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect();
      onDragStart(keyframe.id, e.clientX, keyframe.timestamp);
    },
    [keyframe.id, keyframe.timestamp, onSelect, onDragStart],
  );

  const diamondSize = 10;
  const halfDiamond = diamondSize / 2;

  return (
    <g
      style={{ cursor: 'grab' }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Vertical line from diamond to bottom */}
      <line
        x1={xPos}
        y1={halfDiamond + 4}
        x2={xPos}
        y2={height}
        stroke={isSelected ? '#3b82f6' : '#6b7280'}
        strokeWidth={1}
        strokeDasharray={isSelected ? undefined : '2 2'}
      />

      {/* Diamond marker */}
      <rect
        x={xPos - halfDiamond}
        y={4}
        width={diamondSize}
        height={diamondSize}
        rx={1}
        transform={`rotate(45, ${xPos}, ${4 + halfDiamond})`}
        fill={isSelected ? '#3b82f6' : '#4b5563'}
        stroke={isSnapped ? '#f59e0b' : isSelected ? '#93c5fd' : '#6b7280'}
        strokeWidth={isSnapped ? 2 : 1}
      />

      {/* Snap glow effect */}
      {isSnapped && (
        <circle
          cx={xPos}
          cy={4 + halfDiamond}
          r={10}
          fill="none"
          stroke="rgba(245, 158, 11, 0.4)"
          strokeWidth={2}
        >
          <animate
            attributeName="r"
            values="8;12;8"
            dur="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Ephemeral "Snapped!" tooltip — fades out over 500ms */}
      {showSnapTooltip && (
        <text
          key={`snap-tooltip-${keyframe.id}-${keyframe.timestamp}`}
          x={xPos}
          y={-2}
          textAnchor="middle"
          fontSize={9}
          fontWeight="bold"
          fill="#f59e0b"
          className="pointer-events-none select-none"
        >
          Snapped!
          <animate
            attributeName="opacity"
            values="1;1;0"
            keyTimes="0;0.6;1"
            dur="0.5s"
            fill="freeze"
          />
        </text>
      )}

      {/* Timestamp label */}
      <text
        x={xPos}
        y={height - 2}
        textAnchor="middle"
        fontSize={9}
        fill={isSelected ? '#3b82f6' : '#9ca3af'}
        className="select-none pointer-events-none"
      >
        {formatTime(keyframe.timestamp)}
      </text>
    </g>
  );
}

// ============================================================================
// TrimHandle sub-component
// ============================================================================

interface TrimHandleProps {
  xPos: number;
  height: number;
  side: 'start' | 'end';
  onDragStart: (side: 'start' | 'end', startX: number) => void;
}

function TrimHandle({ xPos, height, side, onDragStart }: TrimHandleProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStart(side, e.clientX);
    },
    [side, onDragStart],
  );

  // Triangle grab handle points at top — points inward toward the active region
  const triangleSize = 8;
  const trianglePoints =
    side === 'start'
      ? `${xPos},0 ${xPos},${triangleSize * 2} ${xPos + triangleSize},${triangleSize}`
      : `${xPos},0 ${xPos},${triangleSize * 2} ${xPos - triangleSize},${triangleSize}`;

  return (
    <g
      style={{ cursor: 'ew-resize' }}
      onMouseDown={handleMouseDown}
    >
      {/* Tall thin bar */}
      <rect
        x={xPos - 1.5}
        y={0}
        width={3}
        height={height}
        fill="rgba(34, 197, 94, 0.8)"
        rx={1}
      />
      {/* Triangular grab handle at top */}
      <polygon
        points={trianglePoints}
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth={1}
      />
      {/* Invisible wider hit-area for easier grabbing */}
      <rect
        x={xPos - 8}
        y={0}
        width={16}
        height={height}
        fill="transparent"
      />
    </g>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const AudioSyncTimeline = memo(function AudioSyncTimeline({
  audioUrl,
  beatMap,
  keyframes,
  currentTime,
  duration,
  zoom,
  bpm,
  snapResolution,
  selectedKeyframeId,
  isPlaying,
  onSeek,
  onKeyframeMove,
  onKeyframeAdd,
  onKeyframeSelect,
  onSnapResolutionChange,
  className = '',
  trimStart: trimStartProp,
  trimEnd: trimEndProp,
  loopEnabled = false,
  onTrimChange,
}: AudioSyncTimelineProps) {
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const seekingRef = useRef(false);

  const [containerWidth, setContainerWidth] = useState(0);
  const [dragState, setDragState] = useState<{
    keyframeId: string;
    startX: number;
    startTimeMs: number;
  } | null>(null);

  // Drag preview: the snap-target time (ms) while dragging near a beat, null otherwise
  const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);

  // Ephemeral "Snapped!" tooltip tracking — set of keyframe ids currently showing tooltip
  const [snapTooltipIds, setSnapTooltipIds] = useState<Set<string>>(new Set());
  const snapTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const OVERLAY_HEIGHT = 96;

  // ------------------------------------------------------------------
  // Trim region – resolve optional props to concrete values
  // ------------------------------------------------------------------
  const trimStart = trimStartProp ?? 0;
  const trimEnd = trimEndProp ?? duration;

  // Pixel positions of trim handles
  const trimStartX =
    duration > 0 && containerWidth > 0
      ? (trimStart / duration) * containerWidth
      : 0;
  const trimEndX =
    duration > 0 && containerWidth > 0
      ? (trimEnd / duration) * containerWidth
      : containerWidth;

  // Trim handle drag state
  const [trimDrag, setTrimDrag] = useState<{
    side: 'start' | 'end';
    startX: number;
    startTimeMs: number;
  } | null>(null);

  const handleTrimDragStart = useCallback(
    (side: 'start' | 'end', mouseX: number) => {
      setTrimDrag({
        side,
        startX: mouseX,
        startTimeMs: side === 'start' ? trimStart : trimEnd,
      });
    },
    [trimStart, trimEnd],
  );

  // Mouse-move / mouse-up for trim handle dragging
  useEffect(() => {
    if (!trimDrag || !onTrimChange) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerWidth || duration <= 0) return;

      const deltaX = e.clientX - trimDrag.startX;
      const deltaTimeMs = (deltaX / containerWidth) * duration;
      const newTimeMs = Math.max(
        0,
        Math.min(duration, trimDrag.startTimeMs + deltaTimeMs),
      );

      if (trimDrag.side === 'start') {
        // Start handle cannot pass end handle (with 50ms minimum region)
        onTrimChange(Math.min(newTimeMs, trimEnd - 50), trimEnd);
      } else {
        // End handle cannot pass start handle
        onTrimChange(trimStart, Math.max(newTimeMs, trimStart + 50));
      }
    };

    const handleMouseUp = () => {
      setTrimDrag(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimDrag, containerWidth, duration, trimStart, trimEnd, onTrimChange]);

  // ------------------------------------------------------------------
  // Loop logic – when playback passes trim end, seek back to trim start
  // ------------------------------------------------------------------
  const prevTimeRef = useRef(currentTime);
  useEffect(() => {
    if (loopEnabled && isPlaying && duration > 0) {
      if (currentTime >= trimEnd && prevTimeRef.current < trimEnd) {
        onSeek(trimStart);
      }
    }
    prevTimeRef.current = currentTime;
  }, [currentTime, loopEnabled, isPlaying, trimStart, trimEnd, duration, onSeek]);

  // Track which keyframes are on a beat (snapped)
  const snappedKeyframeIds = useMemo(() => {
    const effectiveBpm = effectiveBpmForSnap(bpm, snapResolution);
    if (effectiveBpm <= 0) return new Set<string>();
    const interval = 60000 / effectiveBpm; // ms
    const threshold = interval * 0.05; // 5% of interval
    const ids = new Set<string>();
    for (const kf of keyframes) {
      const snapped = snapToBeat(kf.timestamp, effectiveBpm);
      if (Math.abs(kf.timestamp - snapped) < threshold) {
        ids.add(kf.id);
      }
    }
    return ids;
  }, [keyframes, bpm, snapResolution]);

  // Beat timestamps for the overlay (respects snap resolution)
  const beatTimestampsSec = useMemo(
    () => getBeatTimestamps(beatMap, duration, bpm, snapResolution),
    [beatMap, duration, bpm, snapResolution],
  );

  // Beat-level timestamps for beat count labels (always per-beat)
  const beatLevelTimestampsSec = useMemo(
    () => getBeatLevelTimestamps(beatMap, duration, bpm),
    [beatMap, duration, bpm],
  );

  // ------------------------------------------------------------------
  // WaveSurfer lifecycle
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!waveformContainerRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: 'rgba(99, 102, 241, 0.35)',
      progressColor: 'rgba(99, 102, 241, 0.7)',
      cursorColor: 'transparent', // We draw our own playhead
      cursorWidth: 0,
      height: OVERLAY_HEIGHT,
      normalize: true,
      interact: false, // We handle click-to-seek ourselves on the overlay
      fillParent: false,
      minPxPerSec: zoom,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      backend: 'WebAudio',
      mediaControls: false,
    });

    ws.load(audioUrl);
    wsRef.current = ws;

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Sync zoom
  useEffect(() => {
    wsRef.current?.zoom(zoom);
  }, [zoom]);

  // Sync currentTime -> wavesurfer cursor
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || seekingRef.current) return;
    const dur = ws.getDuration();
    if (dur > 0) {
      ws.seekTo(Math.min((currentTime / 1000) / dur, 1));
    }
  }, [currentTime]);

  // ------------------------------------------------------------------
  // Container width tracking (for SVG overlay sizing)
  // ------------------------------------------------------------------
  useEffect(() => {
    const container = waveformContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use the scroll width so the overlay matches the waveform even when
        // the waveform is wider than the visible viewport (zoomed in).
        setContainerWidth(entry.target.scrollWidth);
      }
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Also re-measure after wavesurfer loads / zooms
  useEffect(() => {
    const container = waveformContainerRef.current;
    if (container) {
      setContainerWidth(container.scrollWidth);
    }
  }, [zoom, audioUrl]);

  // ------------------------------------------------------------------
  // Click-to-seek on the overlay
  // ------------------------------------------------------------------
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = overlayRef.current;
      if (!svg || duration <= 0) return;

      const rect = svg.getBoundingClientRect();
      // Account for horizontal scroll of the parent container
      const scrollLeft = svg.parentElement?.scrollLeft ?? 0;
      const clickX = e.clientX - rect.left + scrollLeft;
      const timeMs = (clickX / containerWidth) * duration;
      onSeek(Math.max(0, Math.min(duration, timeMs)));
    },
    [containerWidth, duration, onSeek],
  );

  // ------------------------------------------------------------------
  // Double-click to add keyframe
  // ------------------------------------------------------------------
  const handleOverlayDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = overlayRef.current;
      if (!svg || duration <= 0) return;

      const rect = svg.getBoundingClientRect();
      const scrollLeft = svg.parentElement?.scrollLeft ?? 0;
      const clickX = e.clientX - rect.left + scrollLeft;
      const timeMs = (clickX / containerWidth) * duration;
      onKeyframeAdd(Math.max(0, Math.min(duration, timeMs)));
    },
    [containerWidth, duration, onKeyframeAdd],
  );

  // ------------------------------------------------------------------
  // Keyframe drag logic with snap-to-beat + drag preview guide line
  // ------------------------------------------------------------------
  const handleDragStart = useCallback(
    (keyframeId: string, startX: number, startTimeMs: number) => {
      setDragState({ keyframeId, startX, startTimeMs });
    },
    [],
  );

  // Use a ref to track whether we snapped at drag-end (avoids stale closure)
  const dragSnappedRef = useRef(false);

  useEffect(() => {
    if (!dragState) {
      // Clear drag preview when drag ends
      setDragPreviewTime(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerWidth || duration <= 0) return;

      const deltaX = e.clientX - dragState.startX;
      const deltaPx = deltaX;
      const deltaTimeMs = (deltaPx / containerWidth) * duration;
      let newTimeMs = Math.max(
        0,
        Math.min(duration, dragState.startTimeMs + deltaTimeMs),
      );

      // Snap check: convert to px position, check proximity to beat lines
      const effectiveBpm = effectiveBpmForSnap(bpm, snapResolution);
      let didSnap = false;
      if (effectiveBpm > 0) {
        const snappedMs = snapToBeat(newTimeMs, effectiveBpm);
        const snappedPx = (snappedMs / duration) * containerWidth;
        const currentPx = (newTimeMs / duration) * containerWidth;
        if (Math.abs(snappedPx - currentPx) < SNAP_THRESHOLD_PX) {
          // Within snap proximity — show guide line and snap
          setDragPreviewTime(snappedMs);
          newTimeMs = snappedMs;
          didSnap = true;
        }
      }

      if (!didSnap) {
        setDragPreviewTime(null);
      }
      dragSnappedRef.current = didSnap;

      onKeyframeMove(dragState.keyframeId, Math.round(newTimeMs));
    };

    const handleMouseUp = () => {
      // If keyframe snapped on release, show tooltip briefly
      if (dragSnappedRef.current && dragState) {
        const kfId = dragState.keyframeId;
        setSnapTooltipIds(new Set([kfId]));
        if (snapTooltipTimerRef.current) {
          clearTimeout(snapTooltipTimerRef.current);
        }
        snapTooltipTimerRef.current = setTimeout(() => {
          setSnapTooltipIds(new Set());
          snapTooltipTimerRef.current = null;
        }, 500);
      }
      dragSnappedRef.current = false;
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, containerWidth, duration, bpm, snapResolution, onKeyframeMove]);

  // Cleanup tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (snapTooltipTimerRef.current) {
        clearTimeout(snapTooltipTimerRef.current);
      }
    };
  }, []);

  // ------------------------------------------------------------------
  // Playhead position
  // ------------------------------------------------------------------
  const playheadX =
    duration > 0 && containerWidth > 0
      ? (currentTime / duration) * containerWidth
      : 0;

  // Drag preview guide line X position
  const dragPreviewX =
    dragPreviewTime !== null && duration > 0 && containerWidth > 0
      ? (dragPreviewTime / duration) * containerWidth
      : null;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div
      className={`relative w-full rounded-lg overflow-x-auto overflow-y-hidden bg-neutral-900/50 ${className}`}
      role="region"
      aria-label="Audio sync timeline"
    >
      {/* Snap resolution selector toolbar */}
      {onSnapResolutionChange && (
        <SnapResolutionSelector
          value={snapResolution}
          onChange={onSnapResolutionChange}
        />
      )}

      {/* Waveform layer (wavesurfer.js) */}
      <div ref={waveformContainerRef} className="w-full" />

      {/* SVG overlay: beat markers + keyframes + playhead */}
      <svg
        ref={overlayRef}
        className="absolute left-0"
        style={{
          top: onSnapResolutionChange ? 28 : 0,
          pointerEvents: 'all',
        }}
        width={containerWidth || '100%'}
        height={OVERLAY_HEIGHT}
        onClick={handleOverlayClick}
        onDoubleClick={handleOverlayDoubleClick}
      >
        {/* Trim region: dimmed overlays outside active range */}
        {containerWidth > 0 && duration > 0 && (trimStartProp !== undefined || trimEndProp !== undefined) && (
          <>
            {/* Dimmed region before trim start */}
            {trimStartX > 0 && (
              <rect
                x={0}
                y={0}
                width={trimStartX}
                height={OVERLAY_HEIGHT}
                fill="rgba(0, 0, 0, 0.4)"
                className="pointer-events-none"
              />
            )}
            {/* Dimmed region after trim end */}
            {trimEndX < containerWidth && (
              <rect
                x={trimEndX}
                y={0}
                width={containerWidth - trimEndX}
                height={OVERLAY_HEIGHT}
                fill="rgba(0, 0, 0, 0.4)"
                className="pointer-events-none"
              />
            )}
            {/* Active region highlight border lines */}
            <line
              x1={trimStartX}
              y1={0}
              x2={trimStartX}
              y2={OVERLAY_HEIGHT}
              stroke="rgba(34, 197, 94, 0.5)"
              strokeWidth={1}
              className="pointer-events-none"
            />
            <line
              x1={trimEndX}
              y1={0}
              x2={trimEndX}
              y2={OVERLAY_HEIGHT}
              stroke="rgba(34, 197, 94, 0.5)"
              strokeWidth={1}
              className="pointer-events-none"
            />
          </>
        )}

        {/* Beat marker lines */}
        {containerWidth > 0 &&
          duration > 0 &&
          beatTimestampsSec.map((timeSec, i) => {
            const x = (timeSec / (duration / 1000)) * containerWidth;
            const isMeasureBoundary =
              beatMap && bpm > 0
                ? i % 4 === 0
                : snapResolution === 'measure' || i % 4 === 0;
            return (
              <line
                key={i}
                x1={x}
                y1={0}
                x2={x}
                y2={OVERLAY_HEIGHT}
                stroke={
                  isMeasureBoundary
                    ? 'rgba(245, 158, 11, 0.45)'
                    : 'rgba(245, 158, 11, 0.2)'
                }
                strokeWidth={isMeasureBoundary ? 1.5 : 0.5}
                className="pointer-events-none"
              />
            );
          })}

        {/* Beat count labels (1,2,3,4) along the bottom of the beat grid */}
        {containerWidth > 0 &&
          duration > 0 &&
          beatLevelTimestampsSec.map((timeSec, i) => {
            const x = (timeSec / (duration / 1000)) * containerWidth;
            const beatInMeasure = (i % 4) + 1;
            const isMeasureStart = beatInMeasure === 1;
            return (
              <text
                key={`beat-label-${i}`}
                x={x + 3}
                y={OVERLAY_HEIGHT - 14}
                fontSize={isMeasureStart ? 10 : 8}
                fontWeight={isMeasureStart ? 'bold' : 'normal'}
                fill={
                  isMeasureStart
                    ? 'rgba(245, 158, 11, 0.7)'
                    : 'rgba(245, 158, 11, 0.4)'
                }
                className="pointer-events-none select-none"
              >
                {beatInMeasure}
              </text>
            );
          })}

        {/* Snap guide line during drag — pulsing amber line at snap target */}
        {dragPreviewX !== null && (
          <g className="pointer-events-none">
            {/* Wider glow behind */}
            <line
              x1={dragPreviewX}
              y1={0}
              x2={dragPreviewX}
              y2={OVERLAY_HEIGHT}
              stroke="rgba(245, 158, 11, 0.15)"
              strokeWidth={8}
            >
              <animate
                attributeName="stroke-opacity"
                values="0.1;0.25;0.1"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </line>
            {/* Bright center line */}
            <line
              x1={dragPreviewX}
              y1={0}
              x2={dragPreviewX}
              y2={OVERLAY_HEIGHT}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 2"
            >
              <animate
                attributeName="stroke-opacity"
                values="0.6;1;0.6"
                dur="0.6s"
                repeatCount="indefinite"
              />
            </line>
          </g>
        )}

        {/* Keyframe diamonds */}
        {keyframes.map((kf) => (
          <KeyframeDiamond
            key={kf.id}
            keyframe={kf}
            durationMs={duration}
            containerWidth={containerWidth}
            height={OVERLAY_HEIGHT}
            isSelected={selectedKeyframeId === kf.id}
            isSnapped={snappedKeyframeIds.has(kf.id)}
            showSnapTooltip={snapTooltipIds.has(kf.id)}
            onSelect={() => onKeyframeSelect(kf.id)}
            onDragStart={handleDragStart}
          />
        ))}

        {/* Trim handles (rendered above keyframes for easy grabbing) */}
        {containerWidth > 0 && duration > 0 && onTrimChange && (
          <>
            <TrimHandle
              xPos={trimStartX}
              height={OVERLAY_HEIGHT}
              side="start"
              onDragStart={handleTrimDragStart}
            />
            <TrimHandle
              xPos={trimEndX}
              height={OVERLAY_HEIGHT}
              side="end"
              onDragStart={handleTrimDragStart}
            />
          </>
        )}

        {/* Playhead */}
        {isPlaying && (
          <line
            x1={playheadX}
            y1={0}
            x2={playheadX}
            y2={OVERLAY_HEIGHT}
            stroke="rgba(239, 68, 68, 0.25)"
            strokeWidth={6}
            className="pointer-events-none"
          />
        )}
        <line
          x1={playheadX}
          y1={0}
          x2={playheadX}
          y2={OVERLAY_HEIGHT}
          stroke="#ef4444"
          strokeWidth={2}
          className="pointer-events-none"
        />
        <polygon
          points={`${playheadX - 5},0 ${playheadX + 5},0 ${playheadX},7`}
          fill="#ef4444"
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
});

export default AudioSyncTimeline;
