/**
 * KeyframeGhostLayer - Renders faded performer outlines for up to 3 other keyframes
 *
 * Canvas2D component that draws ghost performer positions from selected keyframes,
 * using distinct color tints (blue, purple, green) at 30% opacity.
 * Follows the same Canvas2D batch pattern as PerformerCanvasLayer in CanvasRenderer.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import type { Keyframe, Performer } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

interface KeyframeGhostLayerProps {
  keyframes: Keyframe[];
  performers: Performer[];
  /** Up to 3 keyframe IDs to show as ghosts */
  activeKeyframeIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  /** Current keyframe positions for drawing connecting lines */
  currentPositions?: Map<string, { x: number; y: number }>;
  /** Whether to show dashed connecting lines from ghost to current */
  showConnectingLines?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const GHOST_COLORS = [
  'rgba(59, 130, 246, 0.3)',   // blue
  'rgba(168, 85, 247, 0.3)',   // purple
  'rgba(34, 197, 94, 0.3)',    // green
];

const GHOST_STROKE_COLORS = [
  'rgba(59, 130, 246, 0.5)',
  'rgba(168, 85, 247, 0.5)',
  'rgba(34, 197, 94, 0.5)',
];

// ============================================================================
// Component
// ============================================================================

export const KeyframeGhostLayer = React.memo<KeyframeGhostLayerProps>(
  function KeyframeGhostLayer({
    keyframes,
    performers,
    activeKeyframeIds,
    canvasWidth,
    canvasHeight,
    zoom,
    currentPositions,
    showConnectingLines = false,
  }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Pre-compute ghost data
    const ghostData = useMemo(() => {
      const data: Array<{
        colorIndex: number;
        positions: Array<{ x: number; y: number; performerId: string }>;
      }> = [];

      // Limit to 3 ghost keyframes
      const activeIds = activeKeyframeIds.slice(0, 3);

      for (let i = 0; i < activeIds.length; i++) {
        const kfId = activeIds[i];
        const keyframe = keyframes.find((kf) => kf.id === kfId);
        if (!keyframe) continue;

        const positions: Array<{ x: number; y: number; performerId: string }> = [];

        for (const performer of performers) {
          const pos = keyframe.positions.get(performer.id);
          if (!pos) continue;

          positions.push({
            x: (pos.x / 100) * canvasWidth,
            y: (pos.y / 100) * canvasHeight,
            performerId: performer.id,
          });
        }

        data.push({ colorIndex: i, positions });
      }

      return data;
    }, [keyframes, performers, activeKeyframeIds, canvasWidth, canvasHeight]);

    // Draw on canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;

      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const markerRadius = 12 * zoom;

      for (const ghost of ghostData) {
        const fillColor = GHOST_COLORS[ghost.colorIndex];
        const strokeColor = GHOST_STROKE_COLORS[ghost.colorIndex];

        // Draw connecting lines first (behind circles)
        if (showConnectingLines && currentPositions) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;

          for (const pos of ghost.positions) {
            const current = currentPositions.get(pos.performerId);
            if (!current) continue;

            const currentPixelX = (current.x / 100) * canvasWidth;
            const currentPixelY = (current.y / 100) * canvasHeight;

            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(currentPixelX, currentPixelY);
            ctx.stroke();
          }

          ctx.setLineDash([]);
        }

        // Draw ghost circles
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;

        for (const pos of ghost.positions) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, markerRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }
    }, [ghostData, canvasWidth, canvasHeight, zoom, currentPositions, showConnectingLines]);

    if (activeKeyframeIds.length === 0) return null;

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 4 }}
        aria-hidden="true"
      />
    );
  },
);

export default KeyframeGhostLayer;
