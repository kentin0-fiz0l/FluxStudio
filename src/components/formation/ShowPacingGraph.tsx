/**
 * ShowPacingGraph - SVG-based horizontal bar chart showing activity intensity
 * across set transitions.
 *
 * For each set transition, calculates average stride distance and direction
 * change count, combining them into an activity intensity score.
 */

import React, { useMemo } from 'react';
import type { Formation, DrillSet } from '../../services/formationTypes';
import type { TempoMap } from '../../services/tempoMap';

interface ShowPacingGraphProps {
  formation: Formation;
  sets: DrillSet[];
  tempoMap?: TempoMap;
  onNavigateToSet?: (setId: string) => void;
  className?: string;
}

interface TransitionData {
  setId: string;
  setName: string;
  avgStride: number;
  directionChanges: number;
  intensity: number;
}

const BAR_HEIGHT = 120;
const LABEL_HEIGHT = 20;
const TOP_PADDING = 24;

function intensityColor(intensity: number): string {
  if (intensity < 0.33) return '#22c55e';
  if (intensity < 0.66) return '#eab308';
  return '#ef4444';
}

export const ShowPacingGraph = React.memo<ShowPacingGraphProps>(
  function ShowPacingGraph({ formation, sets, onNavigateToSet, className }) {
    const transitions = useMemo(() => {
      const { keyframes, performers } = formation;
      const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
      const result: TransitionData[] = [];

      if (sortedSets.length < 2 || performers.length === 0) {
        // Still create entries for display even with no transitions
        for (const set of sortedSets) {
          result.push({
            setId: set.id,
            setName: set.name,
            avgStride: 0,
            directionChanges: 0,
            intensity: 0,
          });
        }
        return result;
      }

      for (let si = 0; si < sortedSets.length - 1; si++) {
        const currentSet = sortedSets[si];
        const nextSet = sortedSets[si + 1];
        const currentKf = keyframes.find((k) => k.id === currentSet.keyframeId);
        const nextKf = keyframes.find((k) => k.id === nextSet.keyframeId);

        if (!currentKf || !nextKf) {
          result.push({
            setId: currentSet.id,
            setName: currentSet.name,
            avgStride: 0,
            directionChanges: 0,
            intensity: 0,
          });
          continue;
        }

        // Calculate average stride distance across all performers
        let totalDist = 0;
        let movedCount = 0;
        for (const performer of performers) {
          const fromPos = currentKf.positions.get(performer.id);
          const toPos = nextKf.positions.get(performer.id);
          if (!fromPos || !toPos) continue;
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.5) {
            totalDist += dist;
            movedCount++;
          }
        }
        const avgStride = movedCount > 0 ? totalDist / movedCount : 0;

        // Count direction changes (need 3 consecutive sets)
        let directionChanges = 0;
        if (si > 0) {
          const prevSet = sortedSets[si - 1];
          const prevKf = keyframes.find((k) => k.id === prevSet.keyframeId);
          if (prevKf) {
            for (const performer of performers) {
              const posA = prevKf.positions.get(performer.id);
              const posB = currentKf.positions.get(performer.id);
              const posC = nextKf.positions.get(performer.id);
              if (!posA || !posB || !posC) continue;

              const distAB = Math.sqrt((posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2);
              const distBC = Math.sqrt((posC.x - posB.x) ** 2 + (posC.y - posB.y) ** 2);
              if (distAB < 0.5 || distBC < 0.5) continue;

              const dirAB = Math.atan2(posB.y - posA.y, posB.x - posA.x);
              const dirBC = Math.atan2(posC.y - posB.y, posC.x - posB.x);
              let angleDiff = Math.abs(dirBC - dirAB) * (180 / Math.PI);
              if (angleDiff > 180) angleDiff = 360 - angleDiff;
              if (angleDiff > 90) directionChanges++;
            }
          }
        }

        result.push({
          setId: currentSet.id,
          setName: currentSet.name,
          avgStride,
          directionChanges,
          intensity: 0, // computed below
        });
      }

      // Add last set with zero intensity
      const lastSet = sortedSets[sortedSets.length - 1];
      result.push({
        setId: lastSet.id,
        setName: lastSet.name,
        avgStride: 0,
        directionChanges: 0,
        intensity: 0,
      });

      // Normalize intensities (0-1) based on max values across all transitions
      const maxStride = Math.max(...result.map((t) => t.avgStride), 1);
      const maxDirChanges = Math.max(...result.map((t) => t.directionChanges), 1);
      for (const t of result) {
        const strideFactor = t.avgStride / maxStride;
        const dirFactor = t.directionChanges / maxDirChanges;
        t.intensity = strideFactor * 0.6 + dirFactor * 0.4;
      }

      return result;
    }, [formation, sets]);

    if (transitions.length === 0) return null;

    const svgWidth = Math.max(300, transitions.length * 60);
    const barAreaHeight = BAR_HEIGHT - LABEL_HEIGHT - TOP_PADDING;

    return (
      <div className={`overflow-x-auto ${className ?? ''}`}>
        <svg
          width={svgWidth}
          height={BAR_HEIGHT}
          viewBox={`0 0 ${svgWidth} ${BAR_HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Show pacing graph"
        >
          {/* Title */}
          <text
            x={4}
            y={14}
            fill="currentColor"
            fontSize={11}
            fontWeight="600"
            className="text-gray-600 dark:text-gray-400"
          >
            Pacing
          </text>

          {transitions.map((t, i) => {
            const barWidth = Math.max(20, svgWidth / transitions.length - 4);
            const x = i * (svgWidth / transitions.length) + 2;
            const h = Math.max(2, t.intensity * barAreaHeight);
            const y = TOP_PADDING + barAreaHeight - h;

            return (
              <g
                key={t.setId}
                style={{ cursor: onNavigateToSet ? 'pointer' : 'default' }}
                onClick={() => onNavigateToSet?.(t.setId)}
                role="button"
                tabIndex={0}
                aria-label={`${t.setName}: intensity ${Math.round(t.intensity * 100)}%`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigateToSet?.(t.setId);
                  }
                }}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={3}
                  fill={intensityColor(t.intensity)}
                  opacity={0.85}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={3}
                  fill="transparent"
                  className="hover:fill-white/20"
                />
                <text
                  x={x + barWidth / 2}
                  y={BAR_HEIGHT - 4}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize={9}
                  className="text-gray-500 dark:text-gray-400"
                >
                  {t.setName.replace('Set ', 'S')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  },
);
