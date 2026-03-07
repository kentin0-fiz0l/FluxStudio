/**
 * MeasurementOverlay - FluxStudio Drill Writer
 *
 * Renders distance/step measurement labels between selected performers.
 * Shows step counts, yards, and direction labels on connecting lines.
 */

import { useMemo } from 'react';
import type { Position, Performer, FieldConfig } from '../../services/formationTypes';
import { calculateStepDistance, type StepMeasurement } from '../../utils/drillGeometry';

interface MeasurementOverlayProps {
  performers: Performer[];
  positions: Map<string, Position>;
  selectedPerformerIds: Set<string>;
  canvasWidth: number;
  canvasHeight: number;
  fieldConfig: FieldConfig;
  /** Steps per 5 yards (default: 8 for 8-to-5) */
  stepsPerFiveYards?: number;
}

interface MeasurementLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  midpoint: { x: number; y: number };
  measurement: StepMeasurement;
  color: string;
}

export function MeasurementOverlay({
  performers,
  positions,
  selectedPerformerIds,
  canvasWidth,
  canvasHeight,
  fieldConfig,
  stepsPerFiveYards = 8,
}: MeasurementOverlayProps) {
  const measurements = useMemo(() => {
    const selectedIds = Array.from(selectedPerformerIds);
    if (selectedIds.length < 2) return [];

    const lines: MeasurementLine[] = [];
    const performerMap = new Map(performers.map((p) => [p.id, p]));

    // Draw measurement lines between consecutive selected performers
    for (let i = 0; i < selectedIds.length; i++) {
      for (let j = i + 1; j < selectedIds.length; j++) {
        const id1 = selectedIds[i];
        const id2 = selectedIds[j];
        const pos1 = positions.get(id1);
        const pos2 = positions.get(id2);
        const perf1 = performerMap.get(id1);

        if (!pos1 || !pos2) continue;

        const fromCanvas = {
          x: (pos1.x / 100) * canvasWidth,
          y: (pos1.y / 100) * canvasHeight,
        };
        const toCanvas = {
          x: (pos2.x / 100) * canvasWidth,
          y: (pos2.y / 100) * canvasHeight,
        };

        const measurement = calculateStepDistance(pos1, pos2, fieldConfig, stepsPerFiveYards);

        lines.push({
          id: `${id1}-${id2}`,
          from: fromCanvas,
          to: toCanvas,
          midpoint: {
            x: (fromCanvas.x + toCanvas.x) / 2,
            y: (fromCanvas.y + toCanvas.y) / 2,
          },
          measurement,
          color: perf1?.color ?? '#3b82f6',
        });
      }
    }

    return lines;
  }, [performers, positions, selectedPerformerIds, canvasWidth, canvasHeight, fieldConfig, stepsPerFiveYards]);

  if (measurements.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 15 }}
    >
      {measurements.map((line) => (
        <g key={line.id}>
          {/* Measurement line */}
          <line
            x1={line.from.x}
            y1={line.from.y}
            x2={line.to.x}
            y2={line.to.y}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            strokeOpacity={0.8}
          />

          {/* Label background */}
          <rect
            x={line.midpoint.x - 36}
            y={line.midpoint.y - 12}
            width={72}
            height={24}
            rx={4}
            fill="rgba(0, 0, 0, 0.8)"
          />

          {/* Step count label */}
          <text
            x={line.midpoint.x}
            y={line.midpoint.y + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={11}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {line.measurement.steps.toFixed(1)} steps
          </text>

          {/* Yards label (below main label) */}
          <text
            x={line.midpoint.x}
            y={line.midpoint.y + 18}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#9ca3af"
            fontSize={9}
            fontFamily="system-ui, sans-serif"
          >
            {line.measurement.yards.toFixed(1)} yds ({line.measurement.stepSizeLabel})
          </text>

          {/* End markers */}
          <circle cx={line.from.x} cy={line.from.y} r={3} fill="#f59e0b" />
          <circle cx={line.to.x} cy={line.to.y} r={3} fill="#f59e0b" />
        </g>
      ))}
    </svg>
  );
}

export default MeasurementOverlay;
