/**
 * CollisionOverlay - FluxStudio Drill Writer
 *
 * Renders warning indicators when performers are too close together.
 * Shows red warning circles and connecting lines between collision pairs.
 * Also renders transition collision markers when performers cross paths
 * between keyframes.
 */

import { useMemo } from 'react';
import type { Position } from '../../services/formationTypes';
import { detectCollisions } from '../../utils/drillGeometry';

export interface TransitionCollision {
  id1: string;
  id2: string;
  /** Time offset within transition when collision occurs */
  time: number;
  position1: { x: number; y: number };
  position2: { x: number; y: number };
}

interface CollisionOverlayProps {
  positions: Map<string, Position>;
  canvasWidth: number;
  canvasHeight: number;
  /** Minimum distance threshold in normalized units (default: 2) */
  minDistance?: number;
  /** Whether collision detection is enabled */
  enabled?: boolean;
  /** Collision points detected during transitions between keyframes */
  transitionCollisions?: TransitionCollision[];
}

export function CollisionOverlay({
  positions,
  canvasWidth,
  canvasHeight,
  minDistance = 2,
  enabled = true,
  transitionCollisions,
}: CollisionOverlayProps) {
  const collisions = useMemo(() => {
    if (!enabled) return [];
    return detectCollisions(positions, minDistance);
  }, [positions, minDistance, enabled]);

  const collisionCircles = useMemo(() => {
    if (collisions.length === 0) return [];

    const involvedIds = new Set<string>();
    collisions.forEach((c) => {
      involvedIds.add(c.id1);
      involvedIds.add(c.id2);
    });

    return Array.from(involvedIds).map((id) => {
      const pos = positions.get(id);
      if (!pos) return null;
      return {
        id,
        cx: (pos.x / 100) * canvasWidth,
        cy: (pos.y / 100) * canvasHeight,
      };
    }).filter(Boolean) as Array<{ id: string; cx: number; cy: number }>;
  }, [collisions, positions, canvasWidth, canvasHeight]);

  const collisionLines = useMemo(() => {
    if (collisions.length === 0) return [];

    return collisions.map((c) => {
      const pos1 = positions.get(c.id1);
      const pos2 = positions.get(c.id2);
      if (!pos1 || !pos2) return null;
      return {
        key: `${c.id1}-${c.id2}`,
        x1: (pos1.x / 100) * canvasWidth,
        y1: (pos1.y / 100) * canvasHeight,
        x2: (pos2.x / 100) * canvasWidth,
        y2: (pos2.y / 100) * canvasHeight,
        severity: c.distance / minDistance,
      };
    }).filter(Boolean) as Array<{ key: string; x1: number; y1: number; x2: number; y2: number; severity: number }>;
  }, [collisions, positions, canvasWidth, canvasHeight, minDistance]);

  // Compute transition collision markers (diamond positions + danger zone path)
  const transitionMarkers = useMemo(() => {
    if (!enabled || !transitionCollisions || transitionCollisions.length === 0) return [];

    return transitionCollisions.map((tc) => {
      // Average position of the two colliders
      const avgX = ((tc.position1.x + tc.position2.x) / 2 / 100) * canvasWidth;
      const avgY = ((tc.position1.y + tc.position2.y) / 2 / 100) * canvasHeight;
      return {
        key: `${tc.id1}-${tc.id2}-${tc.time}`,
        cx: avgX,
        cy: avgY,
        time: tc.time,
      };
    });
  }, [enabled, transitionCollisions, canvasWidth, canvasHeight]);

  // Build a path string connecting all transition collision points (danger zone)
  const dangerZonePath = useMemo(() => {
    if (transitionMarkers.length < 2) return '';

    // Sort by time so the path follows the temporal sequence
    const sorted = [...transitionMarkers].sort((a, b) => a.time - b.time);
    return sorted
      .map((m, i) => `${i === 0 ? 'M' : 'L'} ${m.cx} ${m.cy}`)
      .join(' ');
  }, [transitionMarkers]);

  const hasStaticCollisions = collisions.length > 0;
  const hasTransitionCollisions = transitionMarkers.length > 0;

  if (!enabled || (!hasStaticCollisions && !hasTransitionCollisions)) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 20 }}
    >
      {/* Warning lines between colliding performers */}
      {collisionLines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#ef4444"
          strokeWidth={2}
          strokeOpacity={0.6 + (1 - line.severity) * 0.4}
          strokeDasharray="4 2"
        />
      ))}

      {/* Warning circles around colliding performers */}
      {collisionCircles.map((circle) => (
        <g key={circle.id}>
          <circle
            cx={circle.cx}
            cy={circle.cy}
            r={20}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
            strokeOpacity={0.7}
            strokeDasharray="3 2"
          >
            <animate
              attributeName="r"
              values="18;22;18"
              dur="1.5s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.7;0.3;0.7"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Warning icon */}
          <text
            x={circle.cx}
            y={circle.cy - 22}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={12}
            fontWeight="bold"
          >
            ⚠
          </text>
        </g>
      ))}

      {/* Danger zone path connecting transition collision points */}
      {dangerZonePath && (
        <path
          d={dangerZonePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeOpacity={0.25}
          strokeDasharray="6 3"
        />
      )}

      {/* Transition collision diamond markers */}
      {transitionMarkers.map((marker) => (
        <g key={marker.key}>
          {/* Red diamond marker (rotated square) */}
          <rect
            x={marker.cx - 5}
            y={marker.cy - 5}
            width={10}
            height={10}
            fill="#ef4444"
            fillOpacity={0.8}
            stroke="#dc2626"
            strokeWidth={1.5}
            transform={`rotate(45 ${marker.cx} ${marker.cy})`}
          >
            <animate
              attributeName="fill-opacity"
              values="0.8;0.4;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
          {/* Time offset tooltip label */}
          <rect
            x={marker.cx + 8}
            y={marker.cy - 18}
            width={38}
            height={16}
            rx={3}
            fill="#1f2937"
            fillOpacity={0.85}
          />
          <text
            x={marker.cx + 27}
            y={marker.cy - 7}
            textAnchor="middle"
            fill="#fca5a5"
            fontSize={9}
            fontFamily="monospace"
          >
            {marker.time.toFixed(2)}s
          </text>
        </g>
      ))}
    </svg>
  );
}

export default CollisionOverlay;
