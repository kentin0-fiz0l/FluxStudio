/**
 * FieldOverlay - Dynamic field markings overlay for drill writing.
 * Supports multiple field types: football, indoor, stage, parade, custom.
 * Renders yard lines, hash marks, end zones, sidelines, and yard numbers.
 * Purely visual, pointer-events-none.
 */

import React from 'react';
import type { FieldConfig } from '../../services/formationTypes';
import { STANDARD_FOOTBALL_FIELD, type FieldOverlayConfig } from '../../utils/drillGeometry';

interface FieldOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  /** Dynamic field configuration. Falls back to standard football field. */
  fieldConfig?: FieldConfig;
}

/**
 * Convert FieldConfig to legacy FieldOverlayConfig for rendering.
 */
function fieldConfigToOverlay(config: FieldConfig): FieldOverlayConfig {
  const yardNumbers: number[] = [];
  const playingWidth = config.width - 2 * config.endZoneDepth;
  for (let yard = 10; yard < playingWidth; yard += 10) {
    const num = yard <= playingWidth / 2 ? yard : playingWidth - yard;
    if (num > 0) yardNumbers.push(num);
  }

  return {
    width: config.width,
    height: config.height,
    yardLineInterval: config.yardLineInterval,
    hashMarks: {
      college: config.hashMarks.front,
      nfl: config.hashMarks.back,
    },
    endZoneDepth: config.endZoneDepth,
    yardNumbers,
  };
}

export const FieldOverlay: React.FC<FieldOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  fieldConfig,
}) => {
  // Use provided FieldConfig or fall back to standard football field
  const field = fieldConfig
    ? fieldConfigToOverlay(fieldConfig)
    : STANDARD_FOOTBALL_FIELD;

  const isIndoorOrStage = field.endZoneDepth === 0;

  // Scale factors: map field yards to canvas pixels
  const xScale = canvasWidth / field.width;
  const yScale = canvasHeight / field.height;

  // End zone boundaries in pixels
  const ezLeft = field.endZoneDepth * xScale;
  const ezRight = canvasWidth - field.endZoneDepth * xScale;

  // Hash mark Y positions (from top sideline)
  const hashTop = field.hashMarks.college * yScale;
  const hashBottom = canvasHeight - field.hashMarks.college * yScale;

  // Playing field width
  const playingWidth = field.width - 2 * field.endZoneDepth;

  // Yard lines: every interval from end zone to end zone
  const yardLines: { x: number; yardNum: number }[] = [];
  for (let yard = 0; yard <= playingWidth; yard += field.yardLineInterval) {
    const x = (yard + field.endZoneDepth) * xScale;
    yardLines.push({ x, yardNum: yard });
  }

  // Hash marks: small ticks at each yard between yard lines
  const hashTicks: { x: number }[] = [];
  if (!isIndoorOrStage) {
    for (let yard = 0; yard <= playingWidth; yard++) {
      const x = (yard + field.endZoneDepth) * xScale;
      hashTicks.push({ x });
    }
  }

  // Custom lines (for indoor/stage fields)
  const customLines = fieldConfig?.customLines ?? [];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="none"
    >
      {/* Field background - green for outdoor, gray for indoor */}
      <rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill={isIndoorOrStage ? '#3a3a4a' : '#2d5a27'}
        opacity={0.15}
      />

      {/* End zones (outdoor fields only) */}
      {!isIndoorOrStage && (
        <>
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
        </>
      )}

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

      {/* Yard lines */}
      {yardLines.map(({ x, yardNum }) => (
        <line
          key={`yard-${yardNum}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasHeight}
          stroke="#ffffff"
          strokeWidth={
            isIndoorOrStage
              ? 0.75
              : yardNum % 10 === 0 ? 1.5 : 0.75
          }
          opacity={
            isIndoorOrStage
              ? 0.3
              : yardNum % 10 === 0 ? 0.4 : 0.2
          }
        />
      ))}

      {/* Hash marks (outdoor fields) - small ticks at each yard on hash lines */}
      {hashTicks.map(({ x }, i) => (
        <React.Fragment key={`hash-${i}`}>
          {/* Top hash */}
          <line
            x1={x}
            y1={hashTop - 2}
            x2={x}
            y2={hashTop + 2}
            stroke="#ffffff"
            strokeWidth={0.75}
            opacity={0.3}
          />
          {/* Bottom hash */}
          <line
            x1={x}
            y1={hashBottom - 2}
            x2={x}
            y2={hashBottom + 2}
            stroke="#ffffff"
            strokeWidth={0.75}
            opacity={0.3}
          />
        </React.Fragment>
      ))}

      {/* Yard numbers (outdoor fields) */}
      {!isIndoorOrStage && field.yardNumbers.map((num, i) => {
        const yard = (i + 1) * 10;
        const x = (yard + field.endZoneDepth) * xScale;
        return (
          <React.Fragment key={`num-${i}`}>
            {/* Top numbers */}
            <text
              x={x}
              y={hashTop - 8}
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
              y={hashBottom + 8}
              textAnchor="middle"
              dominantBaseline="hanging"
              fill="#ffffff"
              fontSize={Math.min(14, canvasHeight * 0.04)}
              fontWeight="bold"
              opacity={0.35}
              transform={`rotate(180, ${x}, ${hashBottom + 8 + Math.min(7, canvasHeight * 0.02)})`}
            >
              {num}
            </text>
          </React.Fragment>
        );
      })}

      {/* 50-yard line marker (thicker, outdoor only) */}
      {!isIndoorOrStage && (
        <line
          x1={(playingWidth / 2 + field.endZoneDepth) * xScale}
          y1={0}
          x2={(playingWidth / 2 + field.endZoneDepth) * xScale}
          y2={canvasHeight}
          stroke="#ffffff"
          strokeWidth={2}
          opacity={0.35}
        />
      )}

      {/* Custom lines (indoor/stage fields) */}
      {customLines.map((line, i) => {
        if (line.orientation === 'vertical') {
          const x = (line.position / field.width) * canvasWidth;
          return (
            <React.Fragment key={`custom-${i}`}>
              <line
                x1={x}
                y1={0}
                x2={x}
                y2={canvasHeight}
                stroke="#ffffff"
                strokeWidth={1.5}
                opacity={0.3}
                strokeDasharray="4 4"
              />
              <text
                x={x}
                y={12}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={10}
                opacity={0.4}
              >
                {line.label}
              </text>
            </React.Fragment>
          );
        } else {
          const y = (line.position / field.height) * canvasHeight;
          return (
            <React.Fragment key={`custom-${i}`}>
              <line
                x1={0}
                y1={y}
                x2={canvasWidth}
                y2={y}
                stroke="#ffffff"
                strokeWidth={1.5}
                opacity={0.3}
                strokeDasharray="4 4"
              />
              <text
                x={8}
                y={y - 4}
                fill="#ffffff"
                fontSize={10}
                opacity={0.4}
              >
                {line.label}
              </text>
            </React.Fragment>
          );
        }
      })}
    </svg>
  );
};
