/**
 * TransitionGhostTrail Component
 *
 * Renders faded ghost copies of performers at their recent positions during
 * playback, creating a motion trail effect that visualises the transition
 * between keyframes.
 */

import { useMemo } from 'react';
import { Performer, Position } from '../../services/formationService';

interface GhostSnapshot {
  performerId: string;
  position: Position;
  opacity: number;
}

interface TransitionGhostTrailProps {
  performers: Performer[];
  /** Trail history: array of { time, positions } snapshots (most recent last) */
  trail: Array<{ time: number; positions: Map<string, Position> }>;
  /** Maximum number of ghost copies per performer */
  maxGhosts?: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function TransitionGhostTrail({
  performers,
  trail,
  maxGhosts = 5,
  canvasWidth,
  canvasHeight,
}: TransitionGhostTrailProps) {
  const ghosts = useMemo(() => {
    if (trail.length < 2) return [];

    const result: GhostSnapshot[] = [];
    // Take the last N snapshots for the trail (skip the most recent — that's the live marker)
    const trailSlice = trail.slice(-(maxGhosts + 1), -1);

    trailSlice.forEach((snapshot, idx) => {
      const opacity = ((idx + 1) / (trailSlice.length + 1)) * 0.4;
      performers.forEach((performer) => {
        const pos = snapshot.positions.get(performer.id);
        if (pos) {
          result.push({
            performerId: performer.id,
            position: pos,
            opacity,
          });
        }
      });
    });

    return result;
  }, [performers, trail, maxGhosts]);

  if (ghosts.length === 0) return null;

  const performerMap = new Map(performers.map((p) => [p.id, p]));

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={canvasWidth}
      height={canvasHeight}
      style={{ zIndex: 4 }}
    >
      {ghosts.map((ghost, i) => {
        const performer = performerMap.get(ghost.performerId);
        if (!performer) return null;
        const cx = (ghost.position.x / 100) * canvasWidth;
        const cy = (ghost.position.y / 100) * canvasHeight;

        return (
          <circle
            key={`${ghost.performerId}-${i}`}
            cx={cx}
            cy={cy}
            r={8}
            fill={performer.color}
            fillOpacity={ghost.opacity}
          />
        );
      })}
    </svg>
  );
}
