/**
 * TrimHandle - SVG trim region grab handle (start or end)
 */

import { useCallback } from 'react';

export interface TrimHandleProps {
  xPos: number;
  height: number;
  side: 'start' | 'end';
  onDragStart: (side: 'start' | 'end', startX: number) => void;
}

export function TrimHandle({ xPos, height, side, onDragStart }: TrimHandleProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDragStart(side, e.clientX);
    },
    [side, onDragStart],
  );

  // Triangle grab handle points at top -- points inward toward the active region
  const triangleSize = 8;
  const trianglePoints =
    side === 'start'
      ? `${xPos},0 ${xPos},${triangleSize * 2} ${xPos + triangleSize},${triangleSize}`
      : `${xPos},0 ${xPos},${triangleSize * 2} ${xPos - triangleSize},${triangleSize}`;

  return (
    <g
      style={{ cursor: 'ew-resize' }}
      onMouseDown={handleMouseDown}
    >
      {/* Tall thin bar */}
      <rect
        x={xPos - 1.5}
        y={0}
        width={3}
        height={height}
        fill="rgba(34, 197, 94, 0.8)"
        rx={1}
      />
      {/* Triangular grab handle at top */}
      <polygon
        points={trianglePoints}
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth={1}
      />
      {/* Invisible wider hit-area for easier grabbing */}
      <rect
        x={xPos - 8}
        y={0}
        width={16}
        height={height}
        fill="transparent"
      />
    </g>
  );
}
