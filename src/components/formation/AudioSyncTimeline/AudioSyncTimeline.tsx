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
 * Playback is NOT owned here -- currentTime is driven externally.
 */

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import type { BeatMap } from '../../../contexts/metmap/types';
import type { Keyframe } from '../../../services/formationTypes';
import { snapToBeat } from '../../../services/audioAnalysis';
import {
  effectiveBpmForSnap,
  getBeatTimestamps,
  getBeatLevelTimestamps,
  formatTime,
} from './helpers';
import { useKeyframeDrag } from './useKeyframeDrag';
import { useTrimDrag } from './useTrimDrag';
import { useWaveSurfer } from './useWaveSurfer';
import { BeatGrid } from './BeatGrid';
import { TrimRegionOverlay } from './TrimRegionOverlay';
import { SnapGuideLine } from './SnapGuideLine';
import { Playhead } from './Playhead';

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

export interface AudioSyncTimelineProps {
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

  // Trim & loop controls (optional -- defaults to full duration)
  trimStart?: number; // ms - start of active region
  trimEnd?: number; // ms - end of active region
  loopEnabled?: boolean;
  onTrimChange?: (start: number, end: number) => void;
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

      {/* Ephemeral "Snapped!" tooltip -- fades out over 500ms */}
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

  // Triangle grab handle points at top -- points inward toward the active region
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
  const overlayRef = useRef<SVGSVGElement>(null);

  const [containerWidth, setContainerWidth] = useState(0);

  const OVERLAY_HEIGHT = 96;

  // ------------------------------------------------------------------
  // Trim region -- resolve optional props to concrete values
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

  // ------------------------------------------------------------------
  // Custom hooks for drag logic and WaveSurfer
  // ------------------------------------------------------------------
  const { dragPreviewTime, snapTooltipIds, handleDragStart } = useKeyframeDrag({
    containerWidth,
    duration,
    bpm,
    snapResolution,
    onKeyframeMove,
  });

  const { handleTrimDragStart } = useTrimDrag({
    containerWidth,
    duration,
    trimStart,
    trimEnd,
    onTrimChange,
  });

  const { waveformContainerRef } = useWaveSurfer({
    audioUrl,
    zoom,
    currentTime,
    OVERLAY_HEIGHT,
  });

  // ------------------------------------------------------------------
  // Loop logic -- when playback passes trim end, seek back to trim start
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
  }, [waveformContainerRef]);

  // Also re-measure after wavesurfer loads / zooms
  useEffect(() => {
    const container = waveformContainerRef.current;
    if (container) {
      setContainerWidth(container.scrollWidth);
    }
  }, [zoom, audioUrl, waveformContainerRef]);

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
        <TrimRegionOverlay
          containerWidth={containerWidth}
          duration={duration}
          trimStartX={trimStartX}
          trimEndX={trimEndX}
          trimStartProp={trimStartProp}
          trimEndProp={trimEndProp}
          OVERLAY_HEIGHT={OVERLAY_HEIGHT}
        />

        {/* Beat markers and count labels */}
        <BeatGrid
          containerWidth={containerWidth}
          duration={duration}
          beatTimestampsSec={beatTimestampsSec}
          beatLevelTimestampsSec={beatLevelTimestampsSec}
          beatMap={beatMap}
          bpm={bpm}
          snapResolution={snapResolution}
          OVERLAY_HEIGHT={OVERLAY_HEIGHT}
        />

        {/* Snap guide line during drag */}
        <SnapGuideLine
          dragPreviewX={dragPreviewX}
          OVERLAY_HEIGHT={OVERLAY_HEIGHT}
        />

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
        <Playhead
          playheadX={playheadX}
          isPlaying={isPlaying}
          OVERLAY_HEIGHT={OVERLAY_HEIGHT}
        />
      </svg>
    </div>
  );
});

export default AudioSyncTimeline;
