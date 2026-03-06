/**
 * StepSizeOverlay Component
 *
 * A visual SVG overlay that renders step size information between two sets
 * on the formation canvas. For each performer, it draws a dotted line from
 * the current position to the next position, with a color-coded label
 * indicating step size and difficulty.
 *
 * Color coding:
 *   - Green: 8+ to 5 (easy / relaxed stride)
 *   - Yellow: 6-7 to 5 (moderate)
 *   - Red:   <6 to 5 (hard / large steps)
 */

import { useMemo } from 'react';
import type { Position, FieldConfig } from '../../services/formationTypes';
import { calculateStepInfo } from '../../utils/drillCoordinates';

// ============================================================================
// Types
// ============================================================================

export interface StepSizeOverlayProps {
  /** Current set performer positions (performerId -> Position) */
  positions: Map<string, Position>;
  /** Next set performer positions (null if this is the last set) */
  nextPositions: Map<string, Position> | null;
  /** Field configuration for yard/distance calculations */
  fieldConfig: FieldConfig;
  /** Count duration of the current set */
  counts: number;
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
}

interface PerformerStepData {
  performerId: string;
  /** Current position in pixel coordinates */
  fromX: number;
  fromY: number;
  /** Next position in pixel coordinates */
  toX: number;
  toY: number;
  /** Midpoint in pixel coordinates (for label placement) */
  midX: number;
  midY: number;
  /** Step size label (e.g., "8 to 5", "Mark Time") */
  label: string;
  /** Difficulty level for color coding */
  difficulty: 'easy' | 'moderate' | 'hard';
}

// ============================================================================
// Constants
// ============================================================================

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22c55e',     // green-500
  moderate: '#eab308', // yellow-500
  hard: '#ef4444',     // red-500
};

const DIFFICULTY_BG_COLORS: Record<string, string> = {
  easy: '#166534',     // green-800 (dark background for label)
  moderate: '#854d0e', // yellow-800
  hard: '#991b1b',     // red-800
};

const LABEL_FONT_SIZE = 11;
const LABEL_PADDING_X = 6;
const LABEL_PADDING_Y = 3;
const LABEL_BORDER_RADIUS = 4;

// ============================================================================
// Main Component
// ============================================================================

export function StepSizeOverlay({
  positions,
  nextPositions,
  fieldConfig,
  counts,
  canvasWidth,
  canvasHeight,
}: StepSizeOverlayProps) {
  // Calculate step data for all performers that exist in both sets
  const stepData = useMemo<PerformerStepData[]>(() => {
    if (!nextPositions || counts <= 0) return [];

    const data: PerformerStepData[] = [];

    positions.forEach((currentPos, performerId) => {
      const nextPos = nextPositions.get(performerId);
      if (!nextPos) return;

      // Calculate step info using the drill coordinate utilities
      const stepInfo = calculateStepInfo(currentPos, nextPos, counts, fieldConfig);

      // Skip mark time (no movement) to avoid visual clutter
      if (stepInfo.stepSize === 0) return;

      // Convert normalized positions (0-100) to pixel coordinates
      const fromX = (currentPos.x / 100) * canvasWidth;
      const fromY = (currentPos.y / 100) * canvasHeight;
      const toX = (nextPos.x / 100) * canvasWidth;
      const toY = (nextPos.y / 100) * canvasHeight;

      data.push({
        performerId,
        fromX,
        fromY,
        toX,
        toY,
        midX: (fromX + toX) / 2,
        midY: (fromY + toY) / 2,
        label: stepInfo.stepSizeLabel,
        difficulty: stepInfo.difficulty,
      });
    });

    return data;
  }, [positions, nextPositions, fieldConfig, counts, canvasWidth, canvasHeight]);

  // Don't render if there's no next set or no movement data
  if (!nextPositions || stepData.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 40 }}
      aria-hidden="true"
      data-testid="step-size-overlay"
    >
      <defs>
        {/* Arrow marker for dotted lines */}
        <marker
          id="step-arrow-easy"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={DIFFICULTY_COLORS.easy} />
        </marker>
        <marker
          id="step-arrow-moderate"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={DIFFICULTY_COLORS.moderate} />
        </marker>
        <marker
          id="step-arrow-hard"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={DIFFICULTY_COLORS.hard} />
        </marker>
      </defs>

      {stepData.map((step) => {
        const color = DIFFICULTY_COLORS[step.difficulty];
        const bgColor = DIFFICULTY_BG_COLORS[step.difficulty];
        // Estimate label width based on character count
        const labelWidth = step.label.length * (LABEL_FONT_SIZE * 0.6) + LABEL_PADDING_X * 2;
        const labelHeight = LABEL_FONT_SIZE + LABEL_PADDING_Y * 2;

        return (
          <g key={step.performerId}>
            {/* Dotted line from current to next position */}
            <line
              x1={step.fromX}
              y1={step.fromY}
              x2={step.toX}
              y2={step.toY}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.8}
              markerEnd={`url(#step-arrow-${step.difficulty})`}
            />

            {/* Label background */}
            <rect
              x={step.midX - labelWidth / 2}
              y={step.midY - labelHeight / 2}
              width={labelWidth}
              height={labelHeight}
              rx={LABEL_BORDER_RADIUS}
              ry={LABEL_BORDER_RADIUS}
              fill={bgColor}
              fillOpacity={0.9}
              stroke={color}
              strokeWidth={1}
            />

            {/* Step size label text */}
            <text
              x={step.midX}
              y={step.midY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={LABEL_FONT_SIZE}
              fontWeight={600}
              fontFamily="ui-monospace, SFMono-Regular, monospace"
            >
              {step.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default StepSizeOverlay;
