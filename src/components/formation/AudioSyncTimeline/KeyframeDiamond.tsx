/**
 * KeyframeDiamond - SVG diamond marker for a formation keyframe
 */

import { useCallback } from 'react';
import type { Keyframe } from '../../../services/formationTypes';
import { formatTime } from './helpers';

export interface KeyframeDiamondProps {
  keyframe: Keyframe;
  durationMs: number;
  containerWidth: number;
  height: number;
  isSelected: boolean;
  isSnapped: boolean;
  /** Show ephemeral "Snapped!" tooltip near the diamond */
  showSnapTooltip: boolean;
  onSelect: () => void;
  onDragStart: (keyframeId: string, startX: number, startTimeMs: number) => void;
}

export function KeyframeDiamond({
  keyframe,
  durationMs,
  containerWidth,
  height,
  isSelected,
  isSnapped,
  showSnapTooltip,
  onSelect,
  onDragStart,
}: KeyframeDiamondProps) {
  const xPos =
    durationMs > 0 ? (keyframe.timestamp / durationMs) * containerWidth : 0;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect();
      onDragStart(keyframe.id, e.clientX, keyframe.timestamp);
    },
    [keyframe.id, keyframe.timestamp, onSelect, onDragStart],
  );

  const diamondSize = 10;
  const halfDiamond = diamondSize / 2;

  return (
    <g
      style={{ cursor: 'grab' }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Vertical line from diamond to bottom */}
      <line
        x1={xPos}
        y1={halfDiamond + 4}
        x2={xPos}
        y2={height}
        stroke={isSelected ? '#3b82f6' : '#6b7280'}
        strokeWidth={1}
        strokeDasharray={isSelected ? undefined : '2 2'}
      />

      {/* Diamond marker */}
      <rect
        x={xPos - halfDiamond}
        y={4}
        width={diamondSize}
        height={diamondSize}
        rx={1}
        transform={`rotate(45, ${xPos}, ${4 + halfDiamond})`}
        fill={isSelected ? '#3b82f6' : '#4b5563'}
        stroke={isSnapped ? '#f59e0b' : isSelected ? '#93c5fd' : '#6b7280'}
        strokeWidth={isSnapped ? 2 : 1}
      />

      {/* Snap glow effect */}
      {isSnapped && (
        <circle
          cx={xPos}
          cy={4 + halfDiamond}
          r={10}
          fill="none"
          stroke="rgba(245, 158, 11, 0.4)"
          strokeWidth={2}
        >
          <animate
            attributeName="r"
            values="8;12;8"
            dur="1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Ephemeral "Snapped!" tooltip -- fades out over 500ms */}
      {showSnapTooltip && (
        <text
          key={`snap-tooltip-${keyframe.id}-${keyframe.timestamp}`}
          x={xPos}
          y={-2}
          textAnchor="middle"
          fontSize={9}
          fontWeight="bold"
          fill="#f59e0b"
          className="pointer-events-none select-none"
        >
          Snapped!
          <animate
            attributeName="opacity"
            values="1;1;0"
            keyTimes="0;0.6;1"
            dur="0.5s"
            fill="freeze"
          />
        </text>
      )}

      {/* Timestamp label */}
      <text
        x={xPos}
        y={height - 2}
        textAnchor="middle"
        fontSize={9}
        fill={isSelected ? '#3b82f6' : '#9ca3af'}
        className="select-none pointer-events-none"
      >
        {formatTime(keyframe.timestamp)}
      </text>
    </g>
  );
}
