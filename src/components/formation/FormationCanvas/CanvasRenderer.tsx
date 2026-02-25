/**
 * CanvasRenderer - The main canvas area with grid, performers, overlays, and marquee selection
 */

import React from 'react';
import { PerformerMarker } from '../PerformerMarker';
import { PathOverlay } from '../PathOverlay';
import { FieldOverlay } from '../FieldOverlay';
import { TransitionGhostTrail } from '../TransitionGhostTrail';
import { FormationCursorOverlay, SelectionRingsOverlay } from '../FormationCursorOverlay';
import { ShapeToolOverlay } from './ShapeToolOverlay';
import type { Formation, Position, PlaybackState } from '../../../services/formationService';
import type { Tool, Marquee } from './types';

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
  collab: { collaborators: Array<any>; isPerformerBeingDragged: (id: string) => { dragging: boolean; by?: any } };
  canvasRef: React.RefObject<HTMLDivElement>;
  // Handlers
  onCanvasClick: (e: React.MouseEvent) => void;
  onCanvasPointerDown: (e: React.PointerEvent) => void;
  onCanvasPointerMove: (e: React.PointerEvent) => void;
  onCanvasPointerUp: (e: React.PointerEvent) => void;
  onCanvasMouseMove: (e: React.MouseEvent) => void;
  onCanvasMouseLeave: () => void;
  onSelectPerformer: (id: string, multi: boolean) => void;
  onMovePerformer: (id: string, pos: Position) => void;
  onRotatePerformer: (id: string, rotation: number) => void;
  onDragStart: (id: string) => boolean;
  onDragEnd: () => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
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
  onSelectPerformer,
  onMovePerformer,
  onRotatePerformer,
  onDragStart,
  onDragEnd,
}) => {
  return (
    <div
      ref={canvasRef}
      role="application"
      tabIndex={0}
      aria-label="Formation canvas"
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mx-auto"
      style={{
        width: `${formation.stageWidth * 20 * zoom}px`,
        height: `${formation.stageHeight * 20 * zoom}px`,
        cursor: activeTool === 'add' || isShapeTool ? 'crosshair' : activeTool === 'pan' || fingerMode === 'pan' ? 'grab' : 'default',
        transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)`,
        touchAction: 'none',
      }}
      onClick={onCanvasClick}
      onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={(e) => { onCanvasMouseMove(e as unknown as React.MouseEvent); onCanvasPointerMove(e); }}
      onPointerUp={onCanvasPointerUp}
      onMouseLeave={onCanvasMouseLeave}
    >
      {showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <pattern id="grid" width={formation.gridSize * 20 * zoom} height={formation.gridSize * 20 * zoom} patternUnits="userSpaceOnUse">
              <path d={`M ${formation.gridSize * 20 * zoom} 0 L 0 0 0 ${formation.gridSize * 20 * zoom}`} fill="none" stroke="#e5e7eb" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}
      <div className="absolute inset-0 border-2 border-gray-300 dark:border-gray-600 pointer-events-none" style={{ zIndex: 1 }} />
      {showFieldOverlay && (
        <FieldOverlay
          canvasWidth={formation.stageWidth * 20 * zoom}
          canvasHeight={formation.stageHeight * 20 * zoom}
        />
      )}
      {showPaths && !playbackState.isPlaying && (
        <PathOverlay
          performers={formation.performers}
          paths={performerPaths}
          currentTime={playbackState.currentTime}
          canvasWidth={formation.stageWidth * 20 * zoom}
          canvasHeight={formation.stageHeight * 20 * zoom}
          showPaths={showPaths}
          selectedPerformerIds={selectedPerformerIds}
        />
      )}
      {playbackState.isPlaying && ghostTrail.length > 1 && (
        <TransitionGhostTrail
          performers={formation.performers}
          trail={ghostTrail}
          maxGhosts={5}
          canvasWidth={formation.stageWidth * 20 * zoom}
          canvasHeight={formation.stageHeight * 20 * zoom}
        />
      )}
      {isShapeTool && shapeToolStart && shapeToolCurrent && (
        <ShapeToolOverlay
          tool={activeTool as 'line' | 'arc' | 'block'}
          start={shapeToolStart}
          current={shapeToolCurrent}
          performerCount={formation.performers.length}
          canvasWidth={formation.stageWidth * 20 * zoom}
          canvasHeight={formation.stageHeight * 20 * zoom}
        />
      )}
      {isCollaborativeEnabled && collab.collaborators.length > 0 && (
        <SelectionRingsOverlay
          collaborators={collab.collaborators}
          performerPositions={currentPositions}
          canvasWidth={formation.stageWidth * 20 * zoom}
          canvasHeight={formation.stageHeight * 20 * zoom}
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
      {formation.performers.map((performer) => {
        const position = currentPositions.get(performer.id);
        if (!position) return null;
        const { dragging: isBeingDragged, by: draggedBy } = isCollaborativeEnabled
          ? collab.isPerformerBeingDragged(performer.id)
          : { dragging: false, by: undefined };
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
            onDragStart={() => onDragStart(performer.id)}
            onDragEnd={onDragEnd}
            lockedByUser={draggedBy?.user.name}
          />
        );
      })}
      {isCollaborativeEnabled && collab.collaborators.length > 0 && (
        <FormationCursorOverlay
          collaborators={collab.collaborators}
          canvasWidth={formation.stageWidth * 20 * zoom}
          canvasHeight={formation.stageHeight * 20 * zoom}
          performerPositions={currentPositions}
          zoom={zoom}
        />
      )}
    </div>
  );
};
