/**
 * CanvasRenderer - The main canvas area with grid, performers, overlays, and marquee selection
 *
 * Performance optimizations for 200+ performers:
 * - Canvas2D batch layer renders non-interactive performers via a single <canvas> element,
 *   batching draw calls by color to minimize state changes.
 * - Viewport culling: only performers within the visible area are drawn on the batch canvas.
 * - Only selected/dragged performers use DOM-based PerformerMarker for interactivity.
 * - React.memo with custom comparator prevents unnecessary re-renders.
 * - useDeferredValue defers non-critical overlay updates (paths, ghost trails) during drag.
 * - Debounced path recalculation (100ms during drag, immediate on drag end).
 * - Collaboration drag state is pre-computed into a Map to avoid per-performer function calls.
 * - Stable callback refs via useCallback avoid re-creating closures in the render loop.
 */

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { PerformerMarker } from '../PerformerMarker';
import { PathOverlay } from '../PathOverlay';
import { FieldOverlay } from '../FieldOverlay';
import { TransitionGhostTrail } from '../TransitionGhostTrail';
import { FormationCursorOverlay, SelectionRingsOverlay } from '../FormationCursorOverlay';
import { ShapeToolOverlay } from './ShapeToolOverlay';
import type { Formation, Performer, Position, PlaybackState } from '../../../services/formationService';
import type { Tool, Marquee } from './types';
import type { FormationAwarenessState } from '../../../services/formation/yjs/formationYjsTypes';
import { AudienceHeatmap } from '../AudienceHeatmap';
import { CountOverlay } from '../CountOverlay';
import { KeyframeGhostLayer } from '../KeyframeGhostLayer';
import { isInViewport } from '../../../utils/performanceUtils';
import { createSpatialIndex } from '../../../services/formation/spatialIndex';
import type { SpatialIndex } from '../../../services/formation/spatialIndex';

// ============================================================================
// Types
// ============================================================================

interface CanvasRendererProps {
  formation: Formation;
  currentPositions: Map<string, Position>;
  selectedPerformerIds: Set<string>;
  activeTool: Tool;
  zoom: number;
  canvasPan: { x: number; y: number };
  fingerMode: 'select' | 'pan';
  showGrid: boolean;
  showLabels: boolean;
  showRotation: boolean;
  showPaths: boolean;
  showFieldOverlay: boolean;
  isShapeTool: boolean;
  shapeToolStart: Position | null;
  shapeToolCurrent: Position | null;
  marquee: Marquee | null;
  playbackState: PlaybackState;
  ghostTrail: Array<{ time: number; positions: Map<string, Position> }>;
  performerPaths: Map<string, { time: number; position: Position }[]>;
  isCollaborativeEnabled: boolean;
  collab: { collaborators: FormationAwarenessState[]; isPerformerBeingDragged: (id: string) => { dragging: boolean; by?: FormationAwarenessState } };
  canvasRef: React.RefObject<HTMLDivElement>;
  /** Size of the visible scroll container (pixels). Enables viewport culling when provided. */
  viewportSize?: { width: number; height: number };
  // Handlers
  onCanvasClick: (e: React.MouseEvent) => void;
  onCanvasPointerDown: (e: React.PointerEvent) => void;
  onCanvasPointerMove: (e: React.PointerEvent) => void;
  onCanvasPointerUp: (e: React.PointerEvent) => void;
  onCanvasMouseMove: (e: React.MouseEvent) => void;
  onCanvasMouseLeave: () => void;
  onWheel?: (e: React.WheelEvent) => void;
  onSelectPerformer: (id: string, multi: boolean) => void;
  onMovePerformer: (id: string, pos: Position) => void;
  onRotatePerformer: (id: string, rotation: number) => void;
  onDragStart: (id: string) => boolean;
  onDragEnd: () => void;
  // Curve editing
  curveEditMode?: boolean;
  selectedKeyframeIndex?: number;
  onCurveControlPointMove?: (
    keyframeId: string,
    performerId: string,
    controlPoint: 'cp1' | 'cp2',
    position: Position,
  ) => void;
  // Snap guides
  snapGuides?: import('../../../utils/drillGeometry').SnapGuide[];
  // Transform handles
  transformMode?: 'none' | 'rotate' | 'scale' | 'mirror';
  onTransformApply?: (mode: 'rotate' | 'scale' | 'mirror', value: number, axis?: 'x' | 'y') => void;
  // Audience heatmap
  showAudienceHeatmap?: boolean;
  audienceHeatmapMode?: 'top-down' | 'audience';
  // Count overlay data (rendered when playback is active)
  countOverlay?: {
    currentBeat: number;
    currentMeasure: number;
    beatsPerMeasure: number;
    showMetronome?: boolean;
  };
  // Multi-keyframe ghost comparison
  ghostKeyframeIds?: string[];
  // Annotations
  annotations?: import('../../../services/formationTypes').Annotation[];
  currentKeyframeIndex?: number;
  onAnnotationClick?: (id: string) => void;
}

// ============================================================================
// Canvas2D Batch Renderer - draws non-interactive performers on a <canvas>
// ============================================================================

/** Performer data pre-computed for canvas drawing */
interface BatchPerformer {
  color: string;
  label: string;
  name: string;
  pixelX: number;
  pixelY: number;
  shape: import('../../../services/formationTypes').SymbolShape;
}

/**
 * Draw a single performer shape onto a Canvas2D context.
 */
function drawPerformerShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: import('../../../services/formationTypes').SymbolShape,
): void {
  switch (shape) {
    case 'square':
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 'diamond':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      break;
    case 'triangle':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y + size * 0.7);
      ctx.lineTo(x - size, y + size * 0.7);
      ctx.closePath();
      break;
    case 'cross': {
      const arm = size * 0.35;
      ctx.moveTo(x - arm, y - size);
      ctx.lineTo(x + arm, y - size);
      ctx.lineTo(x + arm, y - arm);
      ctx.lineTo(x + size, y - arm);
      ctx.lineTo(x + size, y + arm);
      ctx.lineTo(x + arm, y + arm);
      ctx.lineTo(x + arm, y + size);
      ctx.lineTo(x - arm, y + size);
      ctx.lineTo(x - arm, y + arm);
      ctx.lineTo(x - size, y + arm);
      ctx.lineTo(x - size, y - arm);
      ctx.lineTo(x - arm, y - arm);
      ctx.closePath();
      break;
    }
    case 'circle':
    default:
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      break;
  }
}

/**
 * Batch-render performers onto a Canvas2D context.
 * Groups performers by color to minimize fillStyle changes.
 * Supports multiple symbol shapes (circle, square, diamond, triangle, cross).
 */
export function batchRenderPerformers(
  ctx: CanvasRenderingContext2D,
  performers: BatchPerformer[],
  markerRadius: number,
  showLabels: boolean,
  _devicePixelRatio: number,
): void {
  if (performers.length === 0) return;

  // Group performers by color + shape for batched fills
  const colorShapeGroups = new Map<string, BatchPerformer[]>();
  for (const p of performers) {
    const key = `${p.color}|${p.shape}`;
    let group = colorShapeGroups.get(key);
    if (!group) {
      group = [];
      colorShapeGroups.set(key, group);
    }
    group.push(p);
  }

  // Batch draw shapes - single beginPath per color+shape group
  for (const [key, group] of colorShapeGroups) {
    const color = key.split('|')[0];
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const p of group) {
      drawPerformerShape(ctx, p.pixelX, p.pixelY, markerRadius, p.shape);
    }
    ctx.fill();
  }

  // Draw labels if enabled - single font/color setup
  if (showLabels) {
    const fontSize = Math.max(10, markerRadius * 0.8);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    for (const p of performers) {
      ctx.fillText(p.label, p.pixelX, p.pixelY);
    }

    // Draw names below markers
    const nameFontSize = Math.max(9, markerRadius * 0.6);
    ctx.font = `500 ${nameFontSize}px sans-serif`;
    ctx.fillStyle = '#374151'; // gray-700

    for (const p of performers) {
      ctx.fillText(p.name, p.pixelX, p.pixelY + markerRadius + nameFontSize + 2);
    }
  }
}

/**
 * Simplified batch renderer for 200+ visible performers.
 * Draws only colored dots without labels or shapes for maximum throughput.
 */
export function batchRenderDots(
  ctx: CanvasRenderingContext2D,
  performers: BatchPerformer[],
  dotRadius: number,
): void {
  if (performers.length === 0) return;

  // Group by color for minimal fillStyle changes
  const colorGroups = new Map<string, BatchPerformer[]>();
  for (const p of performers) {
    let group = colorGroups.get(p.color);
    if (!group) {
      group = [];
      colorGroups.set(p.color, group);
    }
    group.push(p);
  }

  for (const [color, group] of colorGroups) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const p of group) {
      ctx.moveTo(p.pixelX + dotRadius, p.pixelY);
      ctx.arc(p.pixelX, p.pixelY, dotRadius, 0, 2 * Math.PI);
    }
    ctx.fill();
  }
}

// ============================================================================
// Canvas2D Batch Layer Component
// ============================================================================

interface PerformerCanvasLayerProps {
  performers: Performer[];
  positions: Map<string, Position>;
  excludeIds: Set<string>;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  showLabels: boolean;
  /** Pan offset in pixels for viewport culling */
  canvasPan?: { x: number; y: number };
  /** Visible container size in pixels for viewport culling */
  viewportSize?: { width: number; height: number };
}

const PerformerCanvasLayer = React.memo<PerformerCanvasLayerProps>(function PerformerCanvasLayer({
  performers,
  positions,
  excludeIds,
  canvasWidth,
  canvasHeight,
  zoom,
  showLabels,
  canvasPan,
  viewportSize,
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const spatialIndexRef = useRef<SpatialIndex | null>(null);

  // Rebuild spatial index when positions change and performer count is high
  const useSpatialIndex = performers.length > 200;

  // Pre-compute batch data with viewport culling
  const batchData = useMemo(() => {
    const result: BatchPerformer[] = [];
    const doCull = viewportSize != null && canvasPan != null;
    const canvasSize = { width: canvasWidth, height: canvasHeight };

    // For large formations, use spatial index for viewport culling
    if (useSpatialIndex && doCull) {
      if (!spatialIndexRef.current) {
        spatialIndexRef.current = createSpatialIndex({ x: 0, y: 0, width: 100, height: 100 });
      }
      const idx = spatialIndexRef.current;
      const posMap = new Map<string, { x: number; y: number }>();
      for (const performer of performers) {
        if (excludeIds.has(performer.id)) continue;
        const pos = positions.get(performer.id);
        if (pos) posMap.set(performer.id, pos);
      }
      idx.rebuild(posMap);

      // Calculate viewport bounds in normalized coordinates
      const vpLeft = Math.max(0, (-canvasPan.x / canvasSize.width) * 100);
      const vpTop = Math.max(0, (-canvasPan.y / canvasSize.height) * 100);
      const vpWidth = Math.min(100, (viewportSize!.width / canvasSize.width) * 100);
      const vpHeight = Math.min(100, (viewportSize!.height / canvasSize.height) * 100);

      const visible = idx.query({ x: vpLeft - 2, y: vpTop - 2, width: vpWidth + 4, height: vpHeight + 4 });
      const performerMap = new Map(performers.map(p => [p.id, p]));

      for (const entry of visible) {
        const performer = performerMap.get(entry.id);
        if (!performer) continue;
        result.push({
          color: performer.color,
          label: performer.label,
          name: performer.name,
          pixelX: (entry.x / 100) * canvasWidth,
          pixelY: (entry.y / 100) * canvasHeight,
          shape: performer.symbolShape ?? 'circle',
        });
      }
      return result;
    }

    // Standard path for smaller formations
    for (const performer of performers) {
      if (excludeIds.has(performer.id)) continue;
      const pos = positions.get(performer.id);
      if (!pos) continue;

      // Skip performers outside the visible viewport
      if (doCull && !isInViewport(pos, zoom, canvasPan, canvasSize, viewportSize)) {
        continue;
      }

      result.push({
        color: performer.color,
        label: performer.label,
        name: performer.name,
        pixelX: (pos.x / 100) * canvasWidth,
        pixelY: (pos.y / 100) * canvasHeight,
        shape: performer.symbolShape ?? 'circle',
      });
    }
    return result;
  }, [performers, positions, excludeIds, canvasWidth, canvasHeight, zoom, canvasPan, viewportSize, useSpatialIndex]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasElRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth;
    const h = canvasHeight;

    // Set canvas size accounting for device pixel ratio
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const markerRadius = 16 * zoom;

    // For very large formations (>200 visible), render simplified dots for performance
    if (batchData.length > 200) {
      batchRenderDots(ctx, batchData, Math.max(3, markerRadius * 0.4));
    } else {
      batchRenderPerformers(ctx, batchData, markerRadius, showLabels, dpr);
    }
  }, [batchData, canvasWidth, canvasHeight, zoom, showLabels]);

  return (
    <canvas
      ref={canvasElRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    />
  );
});

// ============================================================================
// Main CanvasRenderer Component
// ============================================================================

export const CanvasRenderer = React.memo<CanvasRendererProps>(function CanvasRenderer({
  formation,
  currentPositions,
  selectedPerformerIds,
  activeTool,
  zoom,
  canvasPan,
  fingerMode,
  showGrid,
  showLabels,
  showRotation,
  showPaths,
  showFieldOverlay,
  isShapeTool,
  shapeToolStart,
  shapeToolCurrent,
  marquee,
  playbackState,
  ghostTrail,
  performerPaths,
  isCollaborativeEnabled,
  collab,
  canvasRef,
  viewportSize,
  onCanvasClick,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onCanvasMouseMove,
  onCanvasMouseLeave,
  onWheel,
  onSelectPerformer,
  onMovePerformer,
  onRotatePerformer,
  onDragStart,
  onDragEnd,
  curveEditMode,
  selectedKeyframeIndex,
  onCurveControlPointMove,
  snapGuides,
  transformMode,
  showAudienceHeatmap,
  audienceHeatmapMode = 'audience',
  countOverlay,
  ghostKeyframeIds,
  annotations,
  currentKeyframeIndex,
  onAnnotationClick,
}) {
  const canvasWidth = formation.stageWidth * 20 * zoom;
  const canvasHeight = formation.stageHeight * 20 * zoom;

  // ---------------------------------------------------------------------------
  // Drag state tracking for debounced path recalculation
  // ---------------------------------------------------------------------------
  const [isDraggingPerformer, setIsDraggingPerformer] = useState(false);

  // Debounced performer paths: during drag, defer path updates by 100ms.
  // On drag end, the paths update immediately via the flush below.
  const debouncedPathsRef = useRef(performerPaths);
  const pathDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update debounced paths: 100ms delay during drag, immediate otherwise
  useEffect(() => {
    if (!isDraggingPerformer) {
      // Immediate update on drag end or when not dragging
      if (pathDebounceTimer.current !== null) {
        clearTimeout(pathDebounceTimer.current);
        pathDebounceTimer.current = null;
      }
      debouncedPathsRef.current = performerPaths;
      return;
    }

    // During drag: debounce path recalculation by 100ms
    if (pathDebounceTimer.current !== null) {
      clearTimeout(pathDebounceTimer.current);
    }
    pathDebounceTimer.current = setTimeout(() => {
      debouncedPathsRef.current = performerPaths;
      pathDebounceTimer.current = null;
    }, 100);

    return () => {
      if (pathDebounceTimer.current !== null) {
        clearTimeout(pathDebounceTimer.current);
        pathDebounceTimer.current = null;
      }
    };
  }, [performerPaths, isDraggingPerformer]);

  // Effective paths: use debounced ref during drag, live paths otherwise
  const effectivePaths = isDraggingPerformer ? debouncedPathsRef.current : performerPaths;

  // ---------------------------------------------------------------------------
  // useDeferredValue for non-critical visual updates during drag
  // ---------------------------------------------------------------------------
  // Ghost trail and collaboration overlays can lag slightly during drag
  // without affecting the user's perception of responsiveness.
  const deferredGhostTrail = useDeferredValue(ghostTrail);
  const deferredCollaborators = useDeferredValue(
    isCollaborativeEnabled ? collab.collaborators : [],
  );

  // Pre-compute collaboration drag state into a Map to avoid calling
  // collab.isPerformerBeingDragged() per performer during render
  const collabDragMap = useMemo(() => {
    const map = new Map<string, { dragging: boolean; by?: FormationAwarenessState }>();
    if (!isCollaborativeEnabled) return map;
    for (const performer of formation.performers) {
      const result = collab.isPerformerBeingDragged(performer.id);
      if (result.dragging) {
        map.set(performer.id, result);
      }
    }
    return map;
  }, [isCollaborativeEnabled, collab, formation.performers]);

  // Determine which performers need full DOM rendering (selected or being dragged)
  const interactivePerformerIds = useMemo(() => {
    const ids = new Set<string>(selectedPerformerIds);
    for (const [id] of collabDragMap) {
      ids.add(id);
    }
    return ids;
  }, [selectedPerformerIds, collabDragMap]);

  // Stable per-performer drag-start callbacks using a ref-based approach
  // to avoid creating new closures in the render loop
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const dragStartCallbacks = useRef(new Map<string, () => boolean>());

  const getDragStartCallback = useCallback((performerId: string) => {
    let cb = dragStartCallbacks.current.get(performerId);
    if (!cb) {
      cb = () => {
        const allowed = onDragStartRef.current(performerId);
        if (allowed) setIsDraggingPerformer(true);
        return allowed;
      };
      dragStartCallbacks.current.set(performerId, cb);
    }
    return cb;
  }, []);

  // Wrapped onDragEnd to clear drag state for debounce control
  const handleDragEnd = useCallback(() => {
    setIsDraggingPerformer(false);
    onDragEndRef.current();
  }, []);

  // Combined pointer move handler (stable reference)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      onCanvasMouseMove(e as unknown as React.MouseEvent);
      onCanvasPointerMove(e);
    },
    [onCanvasMouseMove, onCanvasPointerMove],
  );

  // Stable keydown handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ') e.preventDefault();
  }, []);

  // Memoize the grid pattern values
  const gridPatternSize = useMemo(
    () => formation.gridSize * 20 * zoom,
    [formation.gridSize, zoom],
  );

  return (
    <div
      ref={canvasRef}
      role="application"
      tabIndex={0}
      aria-label={`Formation canvas: ${formation.performers.length} performers, ${formation.keyframes.length} sets`}
      aria-roledescription="formation canvas"
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mx-auto"
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        cursor: activeTool === 'add' || isShapeTool ? 'crosshair' : activeTool === 'pan' || fingerMode === 'pan' ? 'grab' : 'default',
        transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)`,
        touchAction: 'none',
      }}
      onClick={onCanvasClick}
      onKeyDown={handleKeyDown}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={onCanvasPointerUp}
      onMouseLeave={onCanvasMouseLeave}
      onWheel={onWheel}
    >
      {showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <pattern id="grid" width={gridPatternSize} height={gridPatternSize} patternUnits="userSpaceOnUse">
              <path d={`M ${gridPatternSize} 0 L 0 0 0 ${gridPatternSize}`} fill="none" stroke="#e5e7eb" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}
      <div className="absolute inset-0 border-2 border-gray-300 dark:border-gray-600 pointer-events-none" style={{ zIndex: 1 }} />
      {showFieldOverlay && (
        <FieldOverlay
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
      {showPaths && !playbackState.isPlaying && (
        <PathOverlay
          performers={formation.performers}
          paths={effectivePaths}
          currentTime={playbackState.currentTime}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          showPaths={showPaths}
          selectedPerformerIds={selectedPerformerIds}
          keyframes={formation.keyframes}
          selectedKeyframeIndex={selectedKeyframeIndex}
          curveEditMode={curveEditMode}
          onCurveControlPointMove={onCurveControlPointMove}
        />
      )}
      {playbackState.isPlaying && deferredGhostTrail.length > 1 && (
        <TransitionGhostTrail
          performers={formation.performers}
          trail={deferredGhostTrail}
          maxGhosts={5}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
      {isShapeTool && shapeToolStart && shapeToolCurrent && (
        <ShapeToolOverlay
          tool={activeTool as 'line' | 'arc' | 'block'}
          start={shapeToolStart}
          current={shapeToolCurrent}
          performerCount={formation.performers.length}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
      {isCollaborativeEnabled && deferredCollaborators.length > 0 && (
        <SelectionRingsOverlay
          collaborators={deferredCollaborators}
          performerPositions={currentPositions}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      )}
      {/* Rubber-band marquee selection rectangle */}
      {marquee && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
          style={{
            left: `${Math.min(marquee.startX, marquee.currentX)}%`,
            top: `${Math.min(marquee.startY, marquee.currentY)}%`,
            width: `${Math.abs(marquee.currentX - marquee.startX)}%`,
            height: `${Math.abs(marquee.currentY - marquee.startY)}%`,
            zIndex: 40,
          }}
        />
      )}

      {/* Snap alignment guides during drag */}
      {snapGuides && snapGuides.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 25 }}>
          {snapGuides.map((guide, i) =>
            guide.type === 'x' ? (
              <line
                key={`sg-${i}`}
                x1={`${guide.value}%`} y1="0" x2={`${guide.value}%`} y2="100%"
                stroke="#06b6d4" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7}
              />
            ) : (
              <line
                key={`sg-${i}`}
                x1="0" y1={`${guide.value}%`} x2="100%" y2={`${guide.value}%`}
                stroke="#06b6d4" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.7}
              />
            ),
          )}
        </svg>
      )}

      {/* Transform bounding box for multi-selection */}
      {transformMode && transformMode !== 'none' && selectedPerformerIds.size >= 2 && (() => {
        const selectedPositions = Array.from(selectedPerformerIds)
          .map(id => currentPositions.get(id))
          .filter((p): p is Position => !!p);
        if (selectedPositions.length < 2) return null;
        const xs = selectedPositions.map(p => p.x);
        const ys = selectedPositions.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const padding = 2; // percent padding
        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 30 }}>
            <rect
              x={`${minX - padding}%`} y={`${minY - padding}%`}
              width={`${maxX - minX + padding * 2}%`} height={`${maxY - minY + padding * 2}%`}
              fill="none" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="6 3" rx={4}
            />
            {/* Center crosshair */}
            <circle
              cx={`${(minX + maxX) / 2}%`} cy={`${(minY + maxY) / 2}%`}
              r={4} fill="#8b5cf6" fillOpacity={0.5} stroke="#8b5cf6" strokeWidth={1}
            />
            {/* Corner handles */}
            {[
              [minX - padding, minY - padding],
              [maxX + padding, minY - padding],
              [minX - padding, maxY + padding],
              [maxX + padding, maxY + padding],
            ].map(([cx, cy], i) => (
              <rect
                key={`th-${i}`}
                x={`${cx - 0.5}%`} y={`${cy - 0.5}%`}
                width="1%" height="1%"
                fill="white" stroke="#8b5cf6" strokeWidth={1.5} rx={2}
              />
            ))}
            {/* Rotation handle (above center) */}
            {transformMode === 'rotate' && (
              <g>
                <line
                  x1={`${(minX + maxX) / 2}%`} y1={`${minY - padding}%`}
                  x2={`${(minX + maxX) / 2}%`} y2={`${minY - padding - 4}%`}
                  stroke="#8b5cf6" strokeWidth={1}
                />
                <circle
                  cx={`${(minX + maxX) / 2}%`} cy={`${minY - padding - 4}%`}
                  r={5} fill="white" stroke="#8b5cf6" strokeWidth={1.5}
                />
              </g>
            )}
            {/* Mode label */}
            <text
              x={`${(minX + maxX) / 2}%`} y={`${maxY + padding + 3}%`}
              textAnchor="middle" fill="#8b5cf6" fontSize={11} fontWeight="bold"
            >
              {transformMode === 'rotate' ? 'Rotate' : transformMode === 'scale' ? 'Scale' : 'Mirror'}
            </text>
          </svg>
        );
      })()}

      {/* Audience heatmap overlay (z-index 4: behind performers, above grid) */}
      {showAudienceHeatmap && (
        <AudienceHeatmap
          performers={formation.performers}
          positions={currentPositions}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          mode={audienceHeatmapMode}
          zoom={zoom}
        />
      )}

      {/* Multi-keyframe ghost comparison layer (z-index 4: behind performers) */}
      {ghostKeyframeIds && ghostKeyframeIds.length > 0 && (
        <KeyframeGhostLayer
          keyframes={formation.keyframes}
          performers={formation.performers}
          activeKeyframeIds={ghostKeyframeIds}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          zoom={zoom}
          currentPositions={currentPositions}
          showConnectingLines
        />
      )}

      {/* Canvas2D batch layer for non-interactive performers */}
      <PerformerCanvasLayer
        performers={formation.performers}
        positions={currentPositions}
        excludeIds={interactivePerformerIds}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        zoom={zoom}
        showLabels={showLabels}
        canvasPan={canvasPan}
        viewportSize={viewportSize}
      />

      {/* DOM-based PerformerMarker only for selected/dragged performers */}
      {formation.performers.map((performer) => {
        if (!interactivePerformerIds.has(performer.id)) return null;
        const position = currentPositions.get(performer.id);
        if (!position) return null;
        const dragState = collabDragMap.get(performer.id);
        const isBeingDragged = dragState?.dragging ?? false;
        return (
          <PerformerMarker
            key={performer.id}
            performer={performer}
            position={position}
            isSelected={selectedPerformerIds.has(performer.id)}
            isMultiSelected={selectedPerformerIds.size > 1 && selectedPerformerIds.has(performer.id)}
            isLocked={playbackState.isPlaying || isBeingDragged}
            showLabel={showLabels}
            showRotation={showRotation && selectedPerformerIds.has(performer.id)}
            scale={zoom}
            isAnimating={playbackState.isPlaying}
            onSelect={onSelectPerformer}
            onMove={onMovePerformer}
            onRotate={onRotatePerformer}
            onDragStart={getDragStartCallback(performer.id)}
            onDragEnd={handleDragEnd}
            lockedByUser={dragState?.by?.user.name}
          />
        );
      })}
      {isCollaborativeEnabled && deferredCollaborators.length > 0 && (
        <FormationCursorOverlay
          collaborators={deferredCollaborators}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          performerPositions={currentPositions}
          zoom={zoom}
        />
      )}
      {/* Annotation markers (z-index 35: above performers, below selection UI) */}
      {annotations && annotations.length > 0 && currentKeyframeIndex != null && (() => {
        const kfAnnotations = annotations.filter(
          (a) => a.keyframeIndex === currentKeyframeIndex && a.position != null,
        );
        if (kfAnnotations.length === 0) return null;
        return kfAnnotations.map((annotation) => {
          const pos = annotation.position!;
          const leftPx = (pos.x / 100) * canvasWidth;
          const topPx = (pos.y / 100) * canvasHeight;
          const bgColor = annotation.color ?? '#3b82f6';
          return (
            <div
              key={annotation.id}
              className="absolute flex items-center justify-center cursor-pointer group"
              style={{
                left: leftPx - 12,
                top: topPx - 12,
                width: 24,
                height: 24,
                zIndex: 35,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAnnotationClick?.(annotation.id);
              }}
              title={`${annotation.author}: ${annotation.text}`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: bgColor }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              {/* Tooltip on hover */}
              <div className="hidden group-hover:block absolute left-7 top-0 z-50 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg max-w-[200px]">
                <div className="font-semibold">{annotation.author}</div>
                <div className="truncate">{annotation.text}</div>
                <div className="text-gray-400">{new Date(annotation.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          );
        });
      })()}

      {/* Count overlay during playback */}
      {playbackState.isPlaying && countOverlay && (
        <CountOverlay
          currentBeat={countOverlay.currentBeat}
          currentMeasure={countOverlay.currentMeasure}
          beatsPerMeasure={countOverlay.beatsPerMeasure}
          isPlaying={playbackState.isPlaying}
          showMetronome={countOverlay.showMetronome}
        />
      )}
    </div>
  );
});
