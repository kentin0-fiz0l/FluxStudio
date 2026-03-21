/**
 * PathTemplateLibrary - Visual library of predefined path curve templates.
 *
 * Templates: follow-the-leader, pinwheel, ripple, stagger, sequential.
 * Each template includes a small SVG thumbnail preview.
 */

import React, { useCallback } from 'react';
import type { PathCurve } from '../../../services/formationTypes';

interface PathTemplateLibraryProps {
  /** IDs of performers to apply the template to (order matters) */
  performerIds: string[];
  /** Called when a template is applied */
  onApplyTemplate: (curves: Map<string, PathCurve>) => void;
}

interface PathTemplate {
  id: string;
  name: string;
  description: string;
  /** Generate path curves for the given performer IDs */
  generate: (ids: string[]) => Map<string, PathCurve>;
  /** SVG path data for the thumbnail preview */
  previewPath: string;
}

/** Default control point base for templates */
const defaultCp = { x: 0, y: 0 };

const TEMPLATES: PathTemplate[] = [
  {
    id: 'follow-the-leader',
    name: 'Follow the Leader',
    description: 'Each performer starts after the previous',
    generate: (ids) => {
      const curves = new Map<string, PathCurve>();
      ids.forEach((id, i) => {
        const delay = i / Math.max(ids.length - 1, 1);
        curves.set(id, {
          cp1: defaultCp,
          cp2: defaultCp,
          easingControlPoints: {
            cp1x: Math.min(delay + 0.1, 0.9),
            cp1y: 0,
            cp2x: Math.min(delay + 0.4, 1),
            cp2y: 1,
          },
        });
      });
      return curves;
    },
    previewPath: 'M 5 50 C 15 50, 25 10, 35 10 M 15 50 C 25 50, 35 10, 45 10 M 25 50 C 35 50, 45 10, 55 10',
  },
  {
    id: 'pinwheel',
    name: 'Pinwheel',
    description: 'Performers arrive evenly spaced in time',
    generate: (ids) => {
      const curves = new Map<string, PathCurve>();
      ids.forEach((id, i) => {
        const phase = (i / ids.length) * 0.5;
        curves.set(id, {
          cp1: defaultCp,
          cp2: defaultCp,
          easingControlPoints: {
            cp1x: 0.3 + phase * 0.4,
            cp1y: 0.1,
            cp2x: 0.7 - phase * 0.2,
            cp2y: 0.9,
          },
        });
      });
      return curves;
    },
    previewPath: 'M 10 50 C 30 50, 40 10, 55 10 M 10 45 C 25 30, 50 20, 55 15 M 10 40 C 20 20, 45 30, 55 20',
  },
  {
    id: 'ripple',
    name: 'Ripple',
    description: 'Wave-like timing offset from center outward',
    generate: (ids) => {
      const curves = new Map<string, PathCurve>();
      const center = (ids.length - 1) / 2;
      ids.forEach((id, i) => {
        const distFromCenter = Math.abs(i - center) / Math.max(center, 1);
        curves.set(id, {
          cp1: defaultCp,
          cp2: defaultCp,
          easingControlPoints: {
            cp1x: 0.2 + distFromCenter * 0.3,
            cp1y: 0,
            cp2x: 0.6 + distFromCenter * 0.2,
            cp2y: 1,
          },
        });
      });
      return curves;
    },
    previewPath: 'M 5 30 Q 25 10, 45 30 Q 65 50, 85 30 M 5 40 Q 25 25, 45 40 Q 65 55, 85 40',
  },
  {
    id: 'stagger',
    name: 'Stagger',
    description: 'Alternating fast-slow timing between odd/even',
    generate: (ids) => {
      const curves = new Map<string, PathCurve>();
      ids.forEach((id, i) => {
        const isEven = i % 2 === 0;
        curves.set(id, {
          cp1: defaultCp,
          cp2: defaultCp,
          easingControlPoints: isEven
            ? { cp1x: 0.1, cp1y: 0.6, cp2x: 0.4, cp2y: 1 }  // fast start
            : { cp1x: 0.6, cp1y: 0, cp2x: 0.9, cp2y: 0.4 },  // slow start
        });
      });
      return curves;
    },
    previewPath: 'M 5 50 C 10 20, 25 10, 50 10 M 5 50 C 35 50, 40 20, 50 10',
  },
  {
    id: 'sequential',
    name: 'Sequential',
    description: 'Performers move one at a time in order',
    generate: (ids) => {
      const curves = new Map<string, PathCurve>();
      const segmentSize = 1 / ids.length;
      ids.forEach((id, i) => {
        const start = i * segmentSize;
        const end = (i + 1) * segmentSize;
        curves.set(id, {
          cp1: defaultCp,
          cp2: defaultCp,
          easingControlPoints: {
            cp1x: start + segmentSize * 0.3,
            cp1y: 0,
            cp2x: end - segmentSize * 0.3,
            cp2y: 1,
          },
        });
      });
      return curves;
    },
    previewPath: 'M 5 50 L 15 50 C 15 50, 20 10, 30 10 L 95 10',
  },
];

export const PathTemplateLibrary: React.FC<PathTemplateLibraryProps> = ({
  performerIds,
  onApplyTemplate,
}) => {
  const handleApply = useCallback((template: PathTemplate) => {
    const curves = template.generate(performerIds);
    onApplyTemplate(curves);
  }, [performerIds, onApplyTemplate]);

  return (
    <div className="grid grid-cols-1 gap-2">
      {TEMPLATES.map((template) => (
        <button
          key={template.id}
          onClick={() => handleApply(template)}
          className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-300 dark:hover:border-purple-700 transition-colors text-left"
        >
          {/* SVG thumbnail */}
          <svg viewBox="0 0 60 60" className="w-10 h-10 flex-shrink-0 bg-gray-50 dark:bg-gray-700 rounded">
            <path
              d={template.previewPath}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{template.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{template.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default PathTemplateLibrary;
