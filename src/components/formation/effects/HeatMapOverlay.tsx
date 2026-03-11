/**
 * HeatMapOverlay - Canvas2D heat map rendered over the formation canvas.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import type { Performer, Position } from '../../../services/formationTypes';
import {
  computeStepDensityHeatMap,
  computeCollisionRiskHeatMap,
  heatMapColor,
} from './canvasEffects';

interface HeatMapOverlayProps {
  enabled: boolean;
  mode: 'step_density' | 'collision_risk' | 'audience_visibility';
  opacity: number;
  performers: Performer[];
  positions: Map<string, Position>;
  keyframePositions?: Map<string, Position>[];
  canvasWidth: number;
  canvasHeight: number;
}

const RESOLUTION = 20; // px per grid cell
const MIN_COLLISION_DIST = 40; // px

export const HeatMapOverlay = React.memo<HeatMapOverlayProps>(
  function HeatMapOverlay({ enabled, mode, opacity, positions, keyframePositions, canvasWidth, canvasHeight }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const grid = useMemo(() => {
      if (!enabled) return null;

      if (mode === 'step_density') {
        const allPositions = keyframePositions && keyframePositions.length > 0
          ? keyframePositions
          : [positions];
        return computeStepDensityHeatMap(allPositions, canvasWidth, canvasHeight, RESOLUTION);
      }

      if (mode === 'collision_risk') {
        return computeCollisionRiskHeatMap(positions, MIN_COLLISION_DIST, canvasWidth, canvasHeight, RESOLUTION);
      }

      // audience_visibility: simple distance-from-bottom gradient
      const cols = Math.ceil(canvasWidth / RESOLUTION);
      const rows = Math.ceil(canvasHeight / RESOLUTION);
      const g: number[][] = Array.from({ length: rows }, (_, r) =>
        new Array(cols).fill(0).map(() => {
          // Further from audience (top) = less visible = hotter
          return r / Math.max(1, rows - 1);
        }),
      );
      return g;
    }, [enabled, mode, positions, keyframePositions, canvasWidth, canvasHeight]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !grid || !enabled) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const value = grid[r][c];
          if (value < 0.01) continue;
          ctx.fillStyle = heatMapColor(value);
          ctx.globalAlpha = value * 0.8;
          ctx.fillRect(c * RESOLUTION, r * RESOLUTION, RESOLUTION, RESOLUTION);
        }
      }
      ctx.globalAlpha = 1;
    }, [grid, enabled, canvasWidth, canvasHeight]);

    if (!enabled) return null;

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 3, opacity }}
        aria-hidden="true"
      />
    );
  },
);
