/**
 * PathOverlay Component - FluxStudio Drill Writer
 *
 * Renders SVG paths showing performer travel between keyframes.
 * Provides visual feedback for movement patterns and transitions.
 */

import { useMemo } from 'react';
import { Position, Performer } from '../../services/formationService';

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
}: PathOverlayProps) {
  // Convert normalized positions (0-100) to canvas coordinates
  const toCanvasCoords = (pos: Position) => ({
    x: (pos.x / 100) * canvasWidth,
    y: (pos.y / 100) * canvasHeight,
  });

  // Memoized path rendering data
  const pathRenderData = useMemo(() => {
    if (!showPaths) return [];

    // Generate SVG path data for a performer's path
    const generatePathData = (
      points: { time: number; position: Position }[],
      filterFn?: (point: { time: number; position: Position }) => boolean
    ): string => {
      const filteredPoints = filterFn ? points.filter(filterFn) : points;
      if (filteredPoints.length < 2) return '';

      const toCoords = (pos: Position) => ({
        x: (pos.x / 100) * canvasWidth,
        y: (pos.y / 100) * canvasHeight,
      });
      const coords = filteredPoints.map((p) => toCoords(p.position));
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

      const toCoords = (pos: Position) => ({
        x: (pos.x / 100) * canvasWidth,
        y: (pos.y / 100) * canvasHeight,
      });
      const lastTwo = points.slice(-2);
      const start = toCoords(lastTwo[0].position);
      const end = toCoords(lastTwo[1].position);

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
  }, [performers, paths, currentTime, showPaths, showPastPaths, showFuturePaths, selectedPerformerIds, canvasWidth, canvasHeight]);

  if (!showPaths) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 5 }}
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
    </svg>
  );
}

export default PathOverlay;
