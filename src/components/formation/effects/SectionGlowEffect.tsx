/**
 * SectionGlowEffect - SVG glow circles behind performers, colored by section.
 */

import React, { useMemo } from 'react';
import type { Performer, Position } from '../../../services/formationTypes';
import { getSectionColor } from './canvasEffects';

interface SectionGlowEffectProps {
  enabled: boolean;
  intensity: number; // 0-1, glow opacity
  performers: Performer[];
  positions: Map<string, Position>;
  canvasWidth: number;
  canvasHeight: number;
}

export const SectionGlowEffect = React.memo<SectionGlowEffectProps>(
  function SectionGlowEffect({ enabled, intensity, performers, positions, canvasWidth, canvasHeight }) {
    if (!enabled || intensity <= 0) return null;

    const sections = useMemo(() => {
      const grouped = new Map<string, Array<{ x: number; y: number }>>();
      for (const p of performers) {
        const pos = positions.get(p.id);
        if (!pos) continue;
        const section = p.section || p.group || 'Default';
        let list = grouped.get(section);
        if (!list) {
          list = [];
          grouped.set(section, list);
        }
        list.push({
          x: (pos.x / 100) * canvasWidth,
          y: (pos.y / 100) * canvasHeight,
        });
      }
      return grouped;
    }, [performers, positions, canvasWidth, canvasHeight]);

    const filterId = 'section-glow-blur';
    const glowRadius = 24;

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 4 }}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        {Array.from(sections.entries()).map(([section, coords]) => {
          const color = getSectionColor(section);
          return (
            <g key={section} opacity={intensity} filter={`url(#${filterId})`}>
              {coords.map((c, i) => (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={glowRadius}
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>
    );
  },
);
