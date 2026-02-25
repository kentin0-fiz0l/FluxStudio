/**
 * CanvasRenderer - The main canvas area with grid, performers, overlays, and marquee selection
 *
 * Performance optimizations for 200+ performers:
 * - Canvas2D batch layer renders non-interactive performers via a single <canvas> element,
 *   batching draw calls by color to minimize state changes.
 * - Only selected/dragged performers use DOM-based PerformerMarker for interactivity.
 * - React.memo with custom comparator prevents unnecessary re-renders.
 * - Collaboration drag state is pre-computed into a Map to avoid per-performer function calls.
 * - Stable callback refs via useCallback avoid re-creating closures in the render loop.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { PerformerMarker } from '../PerformerMarker';
import { PathOverlay } from '../PathOverlay';
import { FieldOverlay } from '../FieldOverlay';
import { TransitionGhostTrail } from '../TransitionGhostTrail';
import { FormationCursorOverlay, SelectionRingsOverlay } from '../FormationCursorOverlay';
import { ShapeToolOverlay } from './ShapeToolOverlay';
import type { Formation, Performer, Position, PlaybackState } from '../../../services/formationService';
import type { Tool, Marquee } from './types';
import type { FormationAwarenessState } from '../../../services/formation/yjs/formationYjsTypes';

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
}

const PerformerCanvasLayer = React.memo<PerformerCanvasLayerProps>(function PerformerCanvasLayer({
  performers,
  positions,
  excludeIds,
  canvasWidth,
  canvasHeight,
  zoom,
  showLabels,
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);

  // Pre-compute batch data
  const batchData = useMemo(() => {
    const result: BatchPerformer[] = [];
    for (const performer of performers) {
      if (excludeIds.has(performer.id)) continue;
      const pos = positions.get(performer.id);
      if (!pos) continue;
      result.push({
        color: performer.color,
        label: performer.label,
        name: performer.name,
        pixelX: (pos.x / 100) * canvasWidth,
        pixelY: (pos.y / 100) * canvasHeight,
      });
    }
    return result;
  }, [performers, positions, excludeIds, canvasWidth, canvasHeight]);

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

  const dragStartCallbacks = useRef(new Map<string, () => boolean>());

  const getDragStartCallback = useCallback((performerId: string) => {
    let cb = dragStartCallbacks.current.get(performerId);
    if (!cb) {
      cb = () => onDragStartRef.current(performerId);
      dragStartCallbacks.current.set(performerId, cb);
    }
    return cb;
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
          paths={performerPaths}
          currentTime={playbackState.currentTime}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          showPaths={showPaths}
          selectedPerformerIds={selectedPerformerIds}
        />
      )}
      {playbackState.isPlaying && ghostTrail.length > 1 && (
        <TransitionGhostTrail
          performers={formation.performers}
          trail={ghostTrail}
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
      {isCollaborativeEnabled && collab.collaborators.length > 0 && (
        <SelectionRingsOverlay
          collaborators={collab.collaborators}
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
            onDragEnd={onDragEnd}
            lockedByUser={dragState?.by?.user.name}
          />
        );
      })}
      {isCollaborativeEnabled && collab.collaborators.length > 0 && (
        <FormationCursorOverlay
          collaborators={collab.collaborators}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          performerPositions={currentPositions}
          zoom={zoom}
        />
      )}
    </div>
  );
});
