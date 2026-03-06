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
import { isInViewport } from '../../../utils/performanceUtils';

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
}

/**
 * Batch-render performers onto a Canvas2D context.
 * Groups performers by color to minimize fillStyle changes,
 * uses a single beginPath/fill per color group.
 */
export function batchRenderPerformers(
  ctx: CanvasRenderingContext2D,
  performers: BatchPerformer[],
  markerRadius: number,
  showLabels: boolean,
  _devicePixelRatio: number,
): void {
  if (performers.length === 0) return;

  // Group performers by color for batched fills
  const colorGroups = new Map<string, BatchPerformer[]>();
  for (const p of performers) {
    let group = colorGroups.get(p.color);
    if (!group) {
      group = [];
      colorGroups.set(p.color, group);
    }
    group.push(p);
  }

  const TAU = 2 * Math.PI;

  // Batch draw circles - single beginPath per color
  for (const [color, group] of colorGroups) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const p of group) {
      ctx.moveTo(p.pixelX + markerRadius, p.pixelY);
      ctx.arc(p.pixelX, p.pixelY, markerRadius, 0, TAU);
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

  // Pre-compute batch data with viewport culling
  const batchData = useMemo(() => {
    const result: BatchPerformer[] = [];
    const doCull = viewportSize != null && canvasPan != null;
    const canvasSize = { width: canvasWidth, height: canvasHeight };

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
      });
    }
    return result;
  }, [performers, positions, excludeIds, canvasWidth, canvasHeight, zoom, canvasPan, viewportSize]);

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

    batchRenderPerformers(ctx, batchData, markerRadius, showLabels, dpr);
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
      aria-label="Formation canvas"
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
    </div>
  );
});
