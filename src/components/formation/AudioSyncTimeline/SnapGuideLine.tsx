/**
 * SnapGuideLine - Pulsing amber vertical line at snap target during drag.
 */

import { memo } from 'react';

interface SnapGuideLineProps {
  dragPreviewX: number | null;
  OVERLAY_HEIGHT: number;
}

export const SnapGuideLine = memo(function SnapGuideLine({
  dragPreviewX,
  OVERLAY_HEIGHT,
}: SnapGuideLineProps) {
  if (dragPreviewX === null) return null;

  return (
    <g className="pointer-events-none">
      {/* Wider glow behind */}
      <line
        x1={dragPreviewX}
        y1={0}
        x2={dragPreviewX}
        y2={OVERLAY_HEIGHT}
        stroke="rgba(245, 158, 11, 0.15)"
        strokeWidth={8}
      >
        <animate
          attributeName="stroke-opacity"
          values="0.1;0.25;0.1"
          dur="0.6s"
          repeatCount="indefinite"
        />
      </line>
      {/* Bright center line */}
      <line
        x1={dragPreviewX}
        y1={0}
        x2={dragPreviewX}
        y2={OVERLAY_HEIGHT}
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="4 2"
      >
        <animate
          attributeName="stroke-opacity"
          values="0.6;1;0.6"
          dur="0.6s"
          repeatCount="indefinite"
        />
      </line>
    </g>
  );
});
