/**
 * PathOverlay Component - FluxStudio Drill Writer
 *
 * Renders SVG paths showing performer travel between keyframes.
 * Supports both linear (L) and cubic Bezier (C) paths.
 * Shows draggable control point handles when a transition is selected.
 */

import { useMemo, useCallback } from 'react';
import type { Position, Performer, Keyframe } from '../../services/formationTypes';

interface PathOverlayProps {
  performers: Performer[];
  paths: Map<string, { time: number; position: Position }[]>;
  currentTime: number;
  canvasWidth: number;
  canvasHeight: number;
  showPaths: boolean;
  showFuturePaths?: boolean;
  showPastPaths?: boolean;
  selectedPerformerIds?: Set<string>;
  pathOpacity?: number;
  pathWidth?: number;
  /** Keyframes for rendering Bezier control point handles */
  keyframes?: Keyframe[];
  /** Currently selected keyframe index (for showing curve handles) */
  selectedKeyframeIndex?: number;
  /** Callback when a control point is dragged */
  onCurveControlPointMove?: (
    keyframeId: string,
    performerId: string,
    controlPoint: 'cp1' | 'cp2',
    position: Position,
  ) => void;
  /** Whether curve editing is active */
  curveEditMode?: boolean;
}

export function PathOverlay({
  performers,
  paths,
  currentTime,
  canvasWidth,
  canvasHeight,
  showPaths,
  showFuturePaths = true,
  showPastPaths = true,
  selectedPerformerIds,
  pathOpacity = 0.6,
  pathWidth = 2,
  keyframes,
  selectedKeyframeIndex,
  onCurveControlPointMove,
  curveEditMode = false,
}: PathOverlayProps) {
  // Convert normalized positions (0-100) to canvas coordinates
  const toCanvasCoords = useCallback((pos: Position) => ({
    x: (pos.x / 100) * canvasWidth,
    y: (pos.y / 100) * canvasHeight,
  }), [canvasWidth, canvasHeight]);

  // Convert canvas coordinates back to normalized
  const toNormalizedCoords = useCallback((canvasX: number, canvasY: number) => ({
    x: (canvasX / canvasWidth) * 100,
    y: (canvasY / canvasHeight) * 100,
  }), [canvasWidth, canvasHeight]);

  // Memoized path rendering data
  const pathRenderData = useMemo(() => {
    if (!showPaths) return [];

    // Generate SVG path data from interpolated points
    const generatePathData = (
      points: { time: number; position: Position }[],
      filterFn?: (point: { time: number; position: Position }) => boolean
    ): string => {
      const filteredPoints = filterFn ? points.filter(filterFn) : points;
      if (filteredPoints.length < 2) return '';

      const coords = filteredPoints.map((p) => toCanvasCoords(p.position));
      let d = `M ${coords[0].x} ${coords[0].y}`;

      for (let i = 1; i < coords.length; i++) {
        d += ` L ${coords[i].x} ${coords[i].y}`;
      }

      return d;
    };

    // Calculate arrow marker position at path end
    const getArrowPosition = (
      points: { time: number; position: Position }[]
    ): { x: number; y: number; rotation: number } | null => {
      if (points.length < 2) return null;

      const lastTwo = points.slice(-2);
      const start = toCanvasCoords(lastTwo[0].position);
      const end = toCanvasCoords(lastTwo[1].position);

      const rotation = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

      return { x: end.x, y: end.y, rotation };
    };

    const data: Array<{
      performer: Performer;
      pastPath: string;
      futurePath: string;
      arrowPos: { x: number; y: number; rotation: number } | null;
      isSelected: boolean;
    }> = [];

    performers.forEach((performer) => {
      const path = paths.get(performer.id);
      if (!path || path.length < 2) return;

      const isSelected = !selectedPerformerIds || selectedPerformerIds.size === 0
        || selectedPerformerIds.has(performer.id);

      // Split path into past and future segments
      const pastPath = showPastPaths
        ? generatePathData(path, (p) => p.time <= currentTime)
        : '';
      const futurePath = showFuturePaths
        ? generatePathData(path, (p) => p.time >= currentTime)
        : '';

      // Get arrow position for future path end
      const futurePoints = path.filter((p) => p.time >= currentTime);
      const arrowPos = showFuturePaths ? getArrowPosition(futurePoints) : null;

      data.push({
        performer,
        pastPath,
        futurePath,
        arrowPos,
        isSelected,
      });
    });

    return data;
  }, [performers, paths, currentTime, showPaths, showPastPaths, showFuturePaths, selectedPerformerIds, toCanvasCoords]);

  // Compute Bezier control point handles for curve editing
  const curveHandles = useMemo(() => {
    if (!curveEditMode || !keyframes || selectedKeyframeIndex == null) return [];

    const kfIndex = selectedKeyframeIndex;
    if (kfIndex < 0 || kfIndex >= keyframes.length - 1) return [];

    const startKf = keyframes[kfIndex];
    const endKf = keyframes[kfIndex + 1];

    const handles: Array<{
      performerId: string;
      color: string;
      startPos: { x: number; y: number };
      endPos: { x: number; y: number };
      cp1: { x: number; y: number };
      cp2: { x: number; y: number };
      cp1Normalized: Position;
      cp2Normalized: Position;
      keyframeId: string;
    }> = [];

    const activePerformerIds = selectedPerformerIds && selectedPerformerIds.size > 0
      ? selectedPerformerIds
      : new Set(performers.map((p) => p.id));

    for (const performer of performers) {
      if (!activePerformerIds.has(performer.id)) continue;

      const startPos = startKf.positions.get(performer.id);
      const endPos = endKf.positions.get(performer.id);
      if (!startPos || !endPos) continue;

      const curve = startKf.pathCurves?.get(performer.id);
      // Default control points at 1/3 and 2/3 if no curve is set
      const cp1 = curve?.cp1 ?? {
        x: startPos.x + (endPos.x - startPos.x) / 3,
        y: startPos.y + (endPos.y - startPos.y) / 3,
      };
      const cp2 = curve?.cp2 ?? {
        x: startPos.x + (endPos.x - startPos.x) * 2 / 3,
        y: startPos.y + (endPos.y - startPos.y) * 2 / 3,
      };

      handles.push({
        performerId: performer.id,
        color: performer.color,
        startPos: toCanvasCoords(startPos),
        endPos: toCanvasCoords(endPos),
        cp1: toCanvasCoords(cp1),
        cp2: toCanvasCoords(cp2),
        cp1Normalized: cp1,
        cp2Normalized: cp2,
        keyframeId: startKf.id,
      });
    }

    return handles;
  }, [curveEditMode, keyframes, selectedKeyframeIndex, selectedPerformerIds, performers, toCanvasCoords]);

  // Handle control point dragging
  const handleControlPointPointerDown = useCallback((
    e: React.PointerEvent<SVGCircleElement>,
    keyframeId: string,
    performerId: string,
    controlPoint: 'cp1' | 'cp2',
  ) => {
    if (!onCurveControlPointMove) return;
    e.stopPropagation();
    e.preventDefault();

    const svg = (e.target as SVGCircleElement).closest('svg');
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();

    const handleMove = (moveEvent: PointerEvent) => {
      const canvasX = moveEvent.clientX - svgRect.left;
      const canvasY = moveEvent.clientY - svgRect.top;
      const normalized = toNormalizedCoords(canvasX, canvasY);
      onCurveControlPointMove(keyframeId, performerId, controlPoint, {
        x: Math.max(0, Math.min(100, normalized.x)),
        y: Math.max(0, Math.min(100, normalized.y)),
      });
    };

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  }, [onCurveControlPointMove, toNormalizedCoords]);

  if (!showPaths) return null;

  return (
    <svg
      className="absolute inset-0"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 5, pointerEvents: curveEditMode ? 'auto' : 'none' }}
    >
      {/* Define arrow marker */}
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {pathRenderData.map(({ performer, pastPath, futurePath, arrowPos, isSelected }) => {
        const opacity = isSelected ? pathOpacity : pathOpacity * 0.3;
        const width = isSelected ? pathWidth : pathWidth * 0.75;

        return (
          <g key={performer.id} style={{ color: performer.color }}>
            {/* Past path (solid line) */}
            {pastPath && (
              <path
                d={pastPath}
                fill="none"
                stroke={performer.color}
                strokeWidth={width}
                strokeOpacity={opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Future path (dashed line) */}
            {futurePath && (
              <path
                d={futurePath}
                fill="none"
                stroke={performer.color}
                strokeWidth={width}
                strokeOpacity={opacity * 0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8 4"
              />
            )}

            {/* Arrow at destination */}
            {arrowPos && isSelected && (
              <g
                transform={`translate(${arrowPos.x}, ${arrowPos.y}) rotate(${arrowPos.rotation})`}
              >
                <polygon
                  points="-6,-4 0,0 -6,4"
                  fill={performer.color}
                  fillOpacity={opacity}
                />
              </g>
            )}

            {/* Start/end dots for selected performers */}
            {isSelected && paths.get(performer.id) && (
              <>
                {/* Start dot */}
                {paths.get(performer.id)!.length > 0 && (
                  <circle
                    cx={toCanvasCoords(paths.get(performer.id)![0].position).x}
                    cy={toCanvasCoords(paths.get(performer.id)![0].position).y}
                    r={3}
                    fill={performer.color}
                    fillOpacity={opacity * 0.5}
                  />
                )}
              </>
            )}
          </g>
        );
      })}

      {/* Bezier curve control point handles */}
      {curveEditMode && curveHandles.map((handle) => (
        <g key={`curve-${handle.performerId}`}>
          {/* Line from start to cp1 */}
          <line
            x1={handle.startPos.x} y1={handle.startPos.y}
            x2={handle.cp1.x} y2={handle.cp1.y}
            stroke={handle.color}
            strokeWidth={1}
            strokeOpacity={0.4}
            strokeDasharray="4 2"
          />
          {/* Line from cp2 to end */}
          <line
            x1={handle.cp2.x} y1={handle.cp2.y}
            x2={handle.endPos.x} y2={handle.endPos.y}
            stroke={handle.color}
            strokeWidth={1}
            strokeOpacity={0.4}
            strokeDasharray="4 2"
          />

          {/* Bezier preview curve */}
          <path
            d={`M ${handle.startPos.x} ${handle.startPos.y} C ${handle.cp1.x} ${handle.cp1.y}, ${handle.cp2.x} ${handle.cp2.y}, ${handle.endPos.x} ${handle.endPos.y}`}
            fill="none"
            stroke={handle.color}
            strokeWidth={2}
            strokeOpacity={0.6}
          />

          {/* Control point 1 (draggable) */}
          <circle
            cx={handle.cp1.x}
            cy={handle.cp1.y}
            r={6}
            fill="white"
            stroke={handle.color}
            strokeWidth={2}
            style={{ cursor: 'grab', pointerEvents: 'auto' }}
            onPointerDown={(e) =>
              handleControlPointPointerDown(e, handle.keyframeId, handle.performerId, 'cp1')
            }
          />

          {/* Control point 2 (draggable) */}
          <circle
            cx={handle.cp2.x}
            cy={handle.cp2.y}
            r={6}
            fill="white"
            stroke={handle.color}
            strokeWidth={2}
            style={{ cursor: 'grab', pointerEvents: 'auto' }}
            onPointerDown={(e) =>
              handleControlPointPointerDown(e, handle.keyframeId, handle.performerId, 'cp2')
            }
          />
        </g>
      ))}
    </svg>
  );
}

export default PathOverlay;
