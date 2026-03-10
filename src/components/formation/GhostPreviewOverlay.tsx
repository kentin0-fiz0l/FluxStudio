/**
 * GhostPreviewOverlay - Semi-transparent preview of proposed positions
 *
 * Renders at z-index 15 (between batch performer layer and collision overlay).
 * Shows ghost performers at proposed positions with movement arrows from
 * current → proposed position. Also renders ghost Bezier curves when
 * proposedPathCurves are present (transition previews).
 */

import { useMemo } from 'react';
import type { Position, Performer } from '../../services/formationTypes';
import type { GhostPreviewEntry } from '../../store/slices/ghostPreviewSlice';
import { evaluateCubicBezier } from '../../utils/drillGeometry';

// ============================================================================
// Types
// ============================================================================

interface GhostPreviewOverlayProps {
  preview: GhostPreviewEntry;
  currentPositions: Map<string, Position>;
  performers: Performer[];
  canvasWidth: number;
  canvasHeight: number;
  ghostOpacity: number;
  showMovementArrows: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function toPixel(normalized: number, canvasSize: number): number {
  return (normalized / 100) * canvasSize;
}

/** Sample a cubic Bezier curve for rendering as SVG polyline */
function sampleBezierPath(
  p0: Position,
  cp1: Position,
  cp2: Position,
  p1: Position,
  canvasWidth: number,
  canvasHeight: number,
  samples: number = 20,
): string {
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = evaluateCubicBezier(t, p0, cp1, cp2, p1);
    points.push(`${toPixel(pt.x, canvasWidth)},${toPixel(pt.y, canvasHeight)}`);
  }
  return points.join(' ');
}

// ============================================================================
// Component
// ============================================================================

export function GhostPreviewOverlay({
  preview,
  currentPositions,
  performers,
  canvasWidth,
  canvasHeight,
  ghostOpacity,
  showMovementArrows,
}: GhostPreviewOverlayProps) {
  // Build a color lookup for performers
  const performerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of performers) {
      map.set(p.id, p.color);
    }
    return map;
  }, [performers]);

  // Compute ghost circles and movement arrows
  const ghostData = useMemo(() => {
    const circles: Array<{
      id: string;
      cx: number;
      cy: number;
      color: string;
    }> = [];
    const arrows: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }> = [];

    for (const performerId of preview.affectedPerformerIds) {
      const proposed = preview.proposedPositions.get(performerId);
      if (!proposed) continue;

      const cx = toPixel(proposed.x, canvasWidth);
      const cy = toPixel(proposed.y, canvasHeight);
      const color = performerColorMap.get(performerId) ?? '#6b7280';

      circles.push({ id: performerId, cx, cy, color });

      if (showMovementArrows) {
        const current = currentPositions.get(performerId);
        if (current) {
          const x1 = toPixel(current.x, canvasWidth);
          const y1 = toPixel(current.y, canvasHeight);
          // Only draw arrow if there's meaningful movement
          const dist = Math.sqrt((cx - x1) ** 2 + (cy - y1) ** 2);
          if (dist > 3) {
            arrows.push({ id: performerId, x1, y1, x2: cx, y2: cy });
          }
        }
      }
    }

    return { circles, arrows };
  }, [preview, currentPositions, canvasWidth, canvasHeight, performerColorMap, showMovementArrows]);

  // Compute ghost Bezier paths for transition previews
  const ghostPaths = useMemo(() => {
    if (!preview.proposedPathCurves || preview.proposedPathCurves.size === 0) return [];

    const paths: Array<{ id: string; points: string; color: string }> = [];

    for (const [performerId, pathCurve] of preview.proposedPathCurves) {
      const from = currentPositions.get(performerId);
      const to = preview.proposedPositions.get(performerId);
      if (!from || !to) continue;

      const points = sampleBezierPath(
        from,
        pathCurve.cp1,
        pathCurve.cp2,
        to,
        canvasWidth,
        canvasHeight,
      );
      const color = performerColorMap.get(performerId) ?? '#6b7280';
      paths.push({ id: performerId, points, color });
    }

    return paths;
  }, [preview, currentPositions, canvasWidth, canvasHeight, performerColorMap]);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 15 }}
    >
      <defs>
        <marker
          id="ghost-arrow"
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L8,3 L0,6 Z" fill="#3b82f6" fillOpacity={0.7} />
        </marker>
      </defs>

      {/* Movement arrows: current → proposed */}
      {ghostData.arrows.map((arrow) => (
        <line
          key={`arrow-${arrow.id}`}
          x1={arrow.x1}
          y1={arrow.y1}
          x2={arrow.x2}
          y2={arrow.y2}
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeOpacity={0.5}
          strokeDasharray="4 3"
          markerEnd="url(#ghost-arrow)"
        />
      ))}

      {/* Ghost Bezier curves for transition previews */}
      {ghostPaths.map((path) => (
        <polyline
          key={`path-${path.id}`}
          points={path.points}
          fill="none"
          stroke={path.color}
          strokeWidth={2}
          strokeOpacity={ghostOpacity * 0.8}
          strokeDasharray="6 3"
        />
      ))}

      {/* Ghost performer circles at proposed positions */}
      {ghostData.circles.map((circle) => (
        <g key={`ghost-${circle.id}`}>
          <circle
            cx={circle.cx}
            cy={circle.cy}
            r={8}
            fill={circle.color}
            fillOpacity={ghostOpacity}
            stroke={circle.color}
            strokeWidth={1.5}
            strokeOpacity={ghostOpacity * 0.8}
            strokeDasharray="3 2"
          />
        </g>
      ))}
    </svg>
  );
}

export default GhostPreviewOverlay;
