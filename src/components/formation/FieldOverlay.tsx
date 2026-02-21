/**
 * FieldOverlay - Football field markings overlay for marching band drill writing.
 * Renders yard lines, hash marks, end zones, sidelines, and yard numbers.
 * Purely visual, pointer-events-none.
 */

import React from 'react';
import { STANDARD_FOOTBALL_FIELD } from '../../utils/drillGeometry';

interface FieldOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
}

export const FieldOverlay: React.FC<FieldOverlayProps> = ({
  canvasWidth,
  canvasHeight,
}) => {
  const field = STANDARD_FOOTBALL_FIELD;

  // Scale factors: map field yards to canvas pixels
  const xScale = canvasWidth / field.width;
  const yScale = canvasHeight / field.height;

  // End zone boundaries in pixels
  const ezLeft = field.endZoneDepth * xScale;
  const ezRight = canvasWidth - field.endZoneDepth * xScale;

  // Hash mark Y positions (from top sideline)
  const hashCollegeTop = field.hashMarks.college * yScale;
  const hashCollegeBottom = canvasHeight - field.hashMarks.college * yScale;

  // Yard lines: every 5 yards from end zone to end zone
  const yardLines: { x: number; yardNum: number }[] = [];
  for (let yard = 0; yard <= 100; yard += field.yardLineInterval) {
    const x = (yard + field.endZoneDepth) * xScale;
    yardLines.push({ x, yardNum: yard });
  }

  // Hash marks: small ticks at each yard between yard lines
  const hashTicks: { x: number }[] = [];
  for (let yard = 0; yard <= 100; yard++) {
    const x = (yard + field.endZoneDepth) * xScale;
    hashTicks.push({ x });
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="none"
    >
      {/* Field background - green */}
      <rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill="#2d5a27"
        opacity={0.15}
      />

      {/* End zones */}
      <rect
        x={0}
        y={0}
        width={ezLeft}
        height={canvasHeight}
        fill="#1a3d16"
        opacity={0.2}
      />
      <rect
        x={ezRight}
        y={0}
        width={canvasWidth - ezRight}
        height={canvasHeight}
        fill="#1a3d16"
        opacity={0.2}
      />

      {/* End zone labels */}
      <text
        x={ezLeft / 2}
        y={canvasHeight / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#4a7a43"
        fontSize={Math.min(16, ezLeft * 0.3)}
        fontWeight="bold"
        opacity={0.5}
        transform={`rotate(-90, ${ezLeft / 2}, ${canvasHeight / 2})`}
      >
        END ZONE
      </text>
      <text
        x={(ezRight + canvasWidth) / 2}
        y={canvasHeight / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#4a7a43"
        fontSize={Math.min(16, ezLeft * 0.3)}
        fontWeight="bold"
        opacity={0.5}
        transform={`rotate(90, ${(ezRight + canvasWidth) / 2}, ${canvasHeight / 2})`}
      >
        END ZONE
      </text>

      {/* Sidelines (top and bottom) */}
      <line
        x1={0}
        y1={0.5}
        x2={canvasWidth}
        y2={0.5}
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.4}
      />
      <line
        x1={0}
        y1={canvasHeight - 0.5}
        x2={canvasWidth}
        y2={canvasHeight - 0.5}
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.4}
      />

      {/* End zone lines */}
      <line
        x1={ezLeft}
        y1={0}
        x2={ezLeft}
        y2={canvasHeight}
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.5}
      />
      <line
        x1={ezRight}
        y1={0}
        x2={ezRight}
        y2={canvasHeight}
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.5}
      />

      {/* Yard lines */}
      {yardLines.map(({ x, yardNum }) => (
        <line
          key={`yard-${yardNum}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasHeight}
          stroke="#ffffff"
          strokeWidth={yardNum % 10 === 0 ? 1.5 : 0.75}
          opacity={yardNum % 10 === 0 ? 0.4 : 0.2}
        />
      ))}

      {/* Hash marks (college) - small ticks at each yard on hash lines */}
      {hashTicks.map(({ x }, i) => (
        <React.Fragment key={`hash-${i}`}>
          {/* Top hash */}
          <line
            x1={x}
            y1={hashCollegeTop - 2}
            x2={x}
            y2={hashCollegeTop + 2}
            stroke="#ffffff"
            strokeWidth={0.75}
            opacity={0.3}
          />
          {/* Bottom hash */}
          <line
            x1={x}
            y1={hashCollegeBottom - 2}
            x2={x}
            y2={hashCollegeBottom + 2}
            stroke="#ffffff"
            strokeWidth={0.75}
            opacity={0.3}
          />
        </React.Fragment>
      ))}

      {/* Yard numbers */}
      {field.yardNumbers.map((num, i) => {
        const yard = (i + 1) * 10;
        const x = (yard + field.endZoneDepth) * xScale;
        return (
          <React.Fragment key={`num-${i}`}>
            {/* Top numbers */}
            <text
              x={x}
              y={hashCollegeTop - 8}
              textAnchor="middle"
              dominantBaseline="auto"
              fill="#ffffff"
              fontSize={Math.min(14, canvasHeight * 0.04)}
              fontWeight="bold"
              opacity={0.35}
            >
              {num}
            </text>
            {/* Bottom numbers (upside down) */}
            <text
              x={x}
              y={hashCollegeBottom + 8}
              textAnchor="middle"
              dominantBaseline="hanging"
              fill="#ffffff"
              fontSize={Math.min(14, canvasHeight * 0.04)}
              fontWeight="bold"
              opacity={0.35}
              transform={`rotate(180, ${x}, ${hashCollegeBottom + 8 + Math.min(7, canvasHeight * 0.02)})`}
            >
              {num}
            </text>
          </React.Fragment>
        );
      })}

      {/* 50-yard line marker (thicker) */}
      <line
        x1={(50 + field.endZoneDepth) * xScale}
        y1={0}
        x2={(50 + field.endZoneDepth) * xScale}
        y2={canvasHeight}
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.35}
      />
    </svg>
  );
};
