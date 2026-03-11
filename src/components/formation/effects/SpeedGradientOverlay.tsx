/**
 * SpeedGradientOverlay - SVG overlay showing speed along transition paths.
 * Draws performer paths with color coding: green (slow) -> yellow -> red (fast).
 */

import React, { useMemo } from 'react';
import type { Position } from '../../../services/formationTypes';
import { computeSpeedAlongPath, speedColor } from './canvasEffects';

interface SpeedGradientOverlayProps {
  enabled: boolean;
  opacity: number;
  performerPaths: Map<string, { time: number; position: Position }[]>;
  selectedPerformerIds: Set<string>;
  canvasWidth: number;
  canvasHeight: number;
}

export const SpeedGradientOverlay = React.memo<SpeedGradientOverlayProps>(
  function SpeedGradientOverlay({
    enabled,
    opacity,
    performerPaths,
    selectedPerformerIds,
    canvasWidth,
    canvasHeight,
  }) {
    if (!enabled) return null;

    const segments = useMemo(() => {
      const result: Array<{
        key: string;
        x1: number; y1: number;
        x2: number; y2: number;
        color: string;
      }> = [];

      // Only show for selected performers if any are selected, otherwise show all
      const pathsToShow = selectedPerformerIds.size > 0
        ? Array.from(selectedPerformerIds)
            .map((id) => [id, performerPaths.get(id)] as const)
            .filter((e): e is [string, { time: number; position: Position }[]] => !!e[1])
        : Array.from(performerPaths.entries());

      for (const [performerId, path] of pathsToShow) {
        if (path.length < 2) continue;

        const speeds = computeSpeedAlongPath(path);
        const maxSpeed = Math.max(...speeds.map((s) => s.speed), 0.001);

        for (let i = 1; i < path.length; i++) {
          const prev = path[i - 1];
          const curr = path[i];
          const normalizedSpeed = speeds[i].speed / maxSpeed;

          result.push({
            key: `${performerId}-${i}`,
            x1: (prev.position.x / 100) * canvasWidth,
            y1: (prev.position.y / 100) * canvasHeight,
            x2: (curr.position.x / 100) * canvasWidth,
            y2: (curr.position.y / 100) * canvasHeight,
            color: speedColor(normalizedSpeed),
          });
        }
      }

      return result;
    }, [performerPaths, selectedPerformerIds, canvasWidth, canvasHeight]);

    if (segments.length === 0) return null;

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 7, opacity }}
        aria-hidden="true"
      >
        {segments.map((seg) => (
          <line
            key={seg.key}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={seg.color}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
      </svg>
    );
  },
);
