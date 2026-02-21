/**
 * ShapeToolOverlay - Ghost preview SVG overlay for shape tools (line, arc, block)
 * Renders dashed guide lines and preview dots during two-click shape tool interaction.
 */

import React from 'react';
import {
  generateLinePositions,
  generateArcPositions,
  generateBlockPositions,
} from '../../../utils/drillGeometry';
import type { Position } from '../../../services/formationTypes';

type ShapeTool = 'line' | 'arc' | 'block';

interface ShapeToolOverlayProps {
  tool: ShapeTool;
  start: Position;
  current: Position;
  performerCount: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const ShapeToolOverlay: React.FC<ShapeToolOverlayProps> = ({
  tool,
  start,
  current,
  performerCount,
  canvasWidth,
  canvasHeight,
}) => {
  const count = Math.max(1, performerCount);

  // Convert normalized (0-100) positions to pixel coordinates
  const toPixel = (pos: Position) => ({
    x: (pos.x / 100) * canvasWidth,
    y: (pos.y / 100) * canvasHeight,
  });

  const startPx = toPixel(start);
  const currentPx = toPixel(current);

  // Generate preview positions based on tool type
  let previewPositions: Position[] = [];
  let guidePath = '';

  switch (tool) {
    case 'line': {
      previewPositions = generateLinePositions(start, current, count);
      guidePath = `M ${startPx.x} ${startPx.y} L ${currentPx.x} ${currentPx.y}`;
      break;
    }
    case 'arc': {
      // Arc: start is center, distance to current is radius
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      const endAngle = Math.atan2(dy, dx);
      const startAngle = endAngle - Math.PI; // 180-degree arc
      previewPositions = generateArcPositions(start, radius, startAngle, endAngle, count);

      // Generate SVG arc path
      const arcPoints = Array.from({ length: 32 }, (_, i) => {
        const t = i / 31;
        const angle = startAngle + (endAngle - startAngle) * t;
        const px = (start.x + Math.cos(angle) * radius) / 100 * canvasWidth;
        const py = (start.y + Math.sin(angle) * radius) / 100 * canvasHeight;
        return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
      });
      guidePath = arcPoints.join(' ');
      break;
    }
    case 'block': {
      const topLeft = { x: Math.min(start.x, current.x), y: Math.min(start.y, current.y) };
      const bottomRight = { x: Math.max(start.x, current.x), y: Math.max(start.y, current.y) };
      previewPositions = generateBlockPositions(topLeft, bottomRight, count);

      const tl = toPixel(topLeft);
      const br = toPixel(bottomRight);
      guidePath = `M ${tl.x} ${tl.y} L ${br.x} ${tl.y} L ${br.x} ${br.y} L ${tl.x} ${br.y} Z`;
      break;
    }
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 30 }}
    >
      {/* Guide path (dashed) */}
      <path
        d={guidePath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity={0.6}
      />

      {/* Center marker for arc tool */}
      {tool === 'arc' && (
        <circle
          cx={startPx.x}
          cy={startPx.y}
          r={4}
          fill="#3b82f6"
          opacity={0.8}
        />
      )}

      {/* Preview dots */}
      {previewPositions.map((pos, i) => {
        const px = toPixel(pos);
        return (
          <circle
            key={i}
            cx={px.x}
            cy={px.y}
            r={8}
            fill="#3b82f6"
            opacity={0.4}
            stroke="#3b82f6"
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
};
