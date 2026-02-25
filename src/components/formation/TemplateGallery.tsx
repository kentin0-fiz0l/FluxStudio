/**
 * TemplateGallery - Grid gallery of pre-built formation templates with SVG previews
 *
 * Provides 7 built-in formation templates (Parade Block, Scatter, Company Front,
 * Pinwheel, Wedge, Diamond, Circle) with dynamic position generation functions.
 * Each template card shows an SVG thumbnail preview with performer dots on a mini-field.
 */

import * as React from 'react';
import { Users, LayoutGrid, Shuffle, Circle, Wind, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { observability } from '@/services/observability';
import type { Position } from '@/services/formationTypes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'marching' | 'drill' | 'dance' | 'custom';
  performerCount: { min: number; max: number; default: number };
  generatePositions: (count: number, fieldWidth: number, fieldHeight: number) => Position[];
  thumbnail: React.ReactNode;
}

export interface TemplateGalleryProps {
  onSelectTemplate: (template: FormationTemplate) => void;
  fieldWidth?: number;
  fieldHeight?: number;
  performerCount?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Position generation functions
// ---------------------------------------------------------------------------

function generateParadeBlock(
  count: number,
  fieldWidth: number,
  fieldHeight: number,
): Position[] {
  const cols = Math.ceil(Math.sqrt(count * (fieldWidth / fieldHeight)));
  const rows = Math.ceil(count / cols);
  const xPad = fieldWidth * 0.15;
  const yPad = fieldHeight * 0.15;
  const usableW = fieldWidth - xPad * 2;
  const usableH = fieldHeight - yPad * 2;

  const positions: Position[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({
      x: xPad + (cols > 1 ? (col / (cols - 1)) * usableW : usableW / 2),
      y: yPad + (rows > 1 ? (row / (rows - 1)) * usableH : usableH / 2),
      rotation: 0,
    });
  }
  return positions;
}

function generateScatter(
  count: number,
  fieldWidth: number,
  fieldHeight: number,
): Position[] {
  // Deterministic pseudo-random scatter using a seeded sequence
  const positions: Position[] = [];
  const pad = 0.1;
  for (let i = 0; i < count; i++) {
    // Simple seeded hash for reproducibility
    const seed = (i * 2654435761) >>> 0;
    const xNorm = ((seed % 10000) / 10000) * (1 - 2 * pad) + pad;
    const yNorm = (((seed * 7 + 13) % 10000) / 10000) * (1 - 2 * pad) + pad;
    positions.push({
      x: xNorm * fieldWidth,
      y: yNorm * fieldHeight,
      rotation: 0,
    });
  }
  return positions;
}

function generateCompanyFront(
  count: number,
  fieldWidth: number,
  _fieldHeight: number,
): Position[] {
  const pad = fieldWidth * 0.1;
  const usable = fieldWidth - pad * 2;
  const yCenter = _fieldHeight / 2;

  return Array.from({ length: count }, (_, i) => ({
    x: pad + (count > 1 ? (i / (count - 1)) * usable : usable / 2),
    y: yCenter,
    rotation: 0,
  }));
}

function generatePinwheel(
  count: number,
  fieldWidth: number,
  fieldHeight: number,
): Position[] {
  const cx = fieldWidth / 2;
  const cy = fieldHeight / 2;
  const maxRadius = Math.min(fieldWidth, fieldHeight) * 0.38;
  const arms = Math.max(3, Math.ceil(count / 3));
  const perArm = Math.ceil(count / arms);

  const positions: Position[] = [];
  let placed = 0;
  for (let arm = 0; arm < arms && placed < count; arm++) {
    const baseAngle = (arm / arms) * 2 * Math.PI - Math.PI / 2;
    for (let j = 0; j < perArm && placed < count; j++) {
      const radius = ((j + 1) / perArm) * maxRadius;
      positions.push({
        x: cx + Math.cos(baseAngle) * radius,
        y: cy + Math.sin(baseAngle) * radius,
        rotation: (baseAngle * 180) / Math.PI + 90,
      });
      placed++;
    }
  }
  return positions;
}

function generateWedge(
  count: number,
  fieldWidth: number,
  fieldHeight: number,
): Position[] {
  const cx = fieldWidth / 2;
  const topY = fieldHeight * 0.2;
  const spreadX = fieldWidth * 0.35;
  const depth = fieldHeight * 0.55;

  const positions: Position[] = [];
  // Tip performer
  positions.push({ x: cx, y: topY, rotation: 0 });

  // Remaining performers placed in pairs down the two legs
  let remaining = count - 1;
  let level = 1;
  while (remaining > 0) {
    const t = level / Math.ceil((count - 1) / 2);
    const yPos = topY + t * depth;
    const xOffset = t * spreadX;

    // Left
    positions.push({ x: cx - xOffset, y: yPos, rotation: 0 });
    remaining--;
    if (remaining <= 0) break;

    // Right
    positions.push({ x: cx + xOffset, y: yPos, rotation: 0 });
    remaining--;
    level++;
  }

  return positions;
}

function generateDiamond(
  count: number,
  fieldWidth: number,
  fieldHeight: number,
): Position[] {
  const cx = fieldWidth / 2;
  const cy = fieldHeight / 2;
  const radiusX = fieldWidth * 0.35;
  const radiusY = fieldHeight * 0.38;

  // Distribute performers evenly around a diamond (rhombus) perimeter
  return Array.from({ length: count }, (_, i) => {
    const t = i / count; // 0..1 around the perimeter
    let x: number;
    let y: number;

    if (t < 0.25) {
      // Top to right
      const s = t / 0.25;
      x = cx + s * radiusX;
      y = cy - (1 - s) * radiusY;
    } else if (t < 0.5) {
      // Right to bottom
      const s = (t - 0.25) / 0.25;
      x = cx + (1 - s) * radiusX;
      y = cy + s * radiusY;
    } else if (t < 0.75) {
      // Bottom to left
      const s = (t - 0.5) / 0.25;
      x = cx - s * radiusX;
      y = cy + (1 - s) * radiusY;
    } else {
      // Left to top
      const s = (t - 0.75) / 0.25;
      x = cx - (1 - s) * radiusX;
      y = cy - s * radiusY;
    }

    return { x, y, rotation: 0 };
  });
}

function generateCircle(
  count: number,
  fieldWidth: number,
  fieldHeight: number,
): Position[] {
  const cx = fieldWidth / 2;
  const cy = fieldHeight / 2;
  const radius = Math.min(fieldWidth, fieldHeight) * 0.35;

  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      rotation: ((angle + Math.PI / 2) * 180) / Math.PI,
    };
  });
}

// ---------------------------------------------------------------------------
// SVG Thumbnail component
// ---------------------------------------------------------------------------

const THUMB_W = 200;
const THUMB_H = 120;
const DOT_R = 3.5;

const PERFORMER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#14b8a6',
  '#f43f5e', '#a855f7',
];

interface TemplateThumbnailProps {
  generatePositions: FormationTemplate['generatePositions'];
  previewCount?: number;
}

function TemplateThumbnail({ generatePositions, previewCount = 10 }: TemplateThumbnailProps) {
  const positions = React.useMemo(
    () => generatePositions(previewCount, THUMB_W, THUMB_H),
    [generatePositions, previewCount],
  );

  return (
    <svg
      viewBox={`0 0 ${THUMB_W} ${THUMB_H}`}
      className="w-full h-full"
      aria-hidden="true"
    >
      {/* Field background with subtle grid */}
      <rect x="0" y="0" width={THUMB_W} height={THUMB_H} rx="4" fill="none" />
      {/* Yard lines */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={`v-${t}`}
          x1={THUMB_W * t}
          y1={0}
          x2={THUMB_W * t}
          y2={THUMB_H}
          stroke="currentColor"
          className="text-gray-300 dark:text-gray-600"
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />
      ))}
      {[0.33, 0.66].map((t) => (
        <line
          key={`h-${t}`}
          x1={0}
          y1={THUMB_H * t}
          x2={THUMB_W}
          y2={THUMB_H * t}
          stroke="currentColor"
          className="text-gray-300 dark:text-gray-600"
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />
      ))}

      {/* Performer dots */}
      {positions.map((pos, idx) => (
        <circle
          key={idx}
          cx={pos.x}
          cy={pos.y}
          r={DOT_R}
          fill={PERFORMER_COLORS[idx % PERFORMER_COLORS.length]}
          opacity={0.9}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Template definitions
// ---------------------------------------------------------------------------

const TEMPLATES: FormationTemplate[] = [
  {
    id: 'parade-block',
    name: 'Parade Block',
    description: 'Rectangular grid formation ideal for marching band blocks and parade units.',
    category: 'marching',
    performerCount: { min: 4, max: 64, default: 16 },
    generatePositions: generateParadeBlock,
    thumbnail: <TemplateThumbnail generatePositions={generateParadeBlock} previewCount={12} />,
  },
  {
    id: 'scatter',
    name: 'Scatter',
    description: 'Random scattered positions across the field for organic or contemporary looks.',
    category: 'dance',
    performerCount: { min: 2, max: 100, default: 10 },
    generatePositions: generateScatter,
    thumbnail: <TemplateThumbnail generatePositions={generateScatter} previewCount={10} />,
  },
  {
    id: 'company-front',
    name: 'Company Front',
    description: 'Single horizontal line spanning the field, a signature marching band formation.',
    category: 'marching',
    performerCount: { min: 2, max: 50, default: 12 },
    generatePositions: generateCompanyFront,
    thumbnail: <TemplateThumbnail generatePositions={generateCompanyFront} previewCount={10} />,
  },
  {
    id: 'pinwheel',
    name: 'Pinwheel',
    description: 'Radial arms extending from a center point, creating a spinning pinwheel pattern.',
    category: 'drill',
    performerCount: { min: 4, max: 48, default: 12 },
    generatePositions: generatePinwheel,
    thumbnail: <TemplateThumbnail generatePositions={generatePinwheel} previewCount={12} />,
  },
  {
    id: 'wedge',
    name: 'Wedge / V-Shape',
    description: 'V-formation with a point performer at the front and two symmetrical legs.',
    category: 'drill',
    performerCount: { min: 3, max: 40, default: 9 },
    generatePositions: generateWedge,
    thumbnail: <TemplateThumbnail generatePositions={generateWedge} previewCount={9} />,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Performers arranged along a diamond / rhombus perimeter for visual impact.',
    category: 'drill',
    performerCount: { min: 4, max: 48, default: 8 },
    generatePositions: generateDiamond,
    thumbnail: <TemplateThumbnail generatePositions={generateDiamond} previewCount={8} />,
  },
  {
    id: 'circle',
    name: 'Circle',
    description: 'Ring formation with performers evenly distributed around a circular path.',
    category: 'dance',
    performerCount: { min: 4, max: 48, default: 12 },
    generatePositions: generateCircle,
    thumbnail: <TemplateThumbnail generatePositions={generateCircle} previewCount={12} />,
  },
];

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<
  FormationTemplate['category'],
  { label: string; icon: React.ReactNode }
> = {
  marching: { label: 'Marching', icon: <Grid3X3 className="w-3.5 h-3.5" aria-hidden="true" /> },
  drill: { label: 'Drill', icon: <Wind className="w-3.5 h-3.5" aria-hidden="true" /> },
  dance: { label: 'Dance', icon: <Circle className="w-3.5 h-3.5" aria-hidden="true" /> },
  custom: { label: 'Custom', icon: <Shuffle className="w-3.5 h-3.5" aria-hidden="true" /> },
};

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

interface TemplateCardInternalProps {
  template: FormationTemplate;
  onSelect: (t: FormationTemplate) => void;
}

function TemplateCardInternal({ template, onSelect }: TemplateCardInternalProps) {
  const { label, icon } = CATEGORY_META[template.category];

  return (
    <div
      className={cn(
        'group flex flex-col rounded-xl border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800 overflow-hidden',
        'hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg',
        'transition-all duration-200',
      )}
    >
      {/* SVG Thumbnail */}
      <div className="aspect-[5/3] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 p-3">
        {template.thumbnail}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {template.name}
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
          {template.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 capitalize">
            {icon}
            {label}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" aria-hidden="true" />
            {template.performerCount.min}-{template.performerCount.max}
          </span>
        </div>
      </div>

      {/* Action */}
      <div className="px-4 pb-4 pt-1">
        <button
          onClick={() => {
            observability.analytics.track('template_used', {
              templateId: template.id,
              templateName: template.name,
              category: template.category,
            });
            onSelect(template);
          }}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg',
            'bg-indigo-600 text-white hover:bg-indigo-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
            'transition-colors',
          )}
        >
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          Use Template
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateGallery (main export)
// ---------------------------------------------------------------------------

export function TemplateGallery({
  onSelectTemplate,
  fieldWidth = 200,
  fieldHeight = 120,
  performerCount,
  className,
}: TemplateGalleryProps) {
  // Filter templates by performer count when provided
  const visibleTemplates = React.useMemo(() => {
    if (performerCount === undefined) return TEMPLATES;

    return TEMPLATES.filter(
      (t) =>
        performerCount >= t.performerCount.min &&
        performerCount <= t.performerCount.max,
    );
  }, [performerCount]);

  // Build template list with correct thumbnails based on field dimensions
  const templatesWithThumbnails = React.useMemo(() => {
    // If caller uses default field dimensions, the static thumbnails are fine
    if (fieldWidth === 200 && fieldHeight === 120) return visibleTemplates;

    // Otherwise regenerate thumbnails using caller's field dimensions
    return visibleTemplates.map((t) => ({
      ...t,
      thumbnail: (
        <TemplateThumbnail
          generatePositions={(count, _w, _h) =>
            // Scale generated positions into the SVG thumbnail coordinate space
            t.generatePositions(count, fieldWidth, fieldHeight).map((p) => ({
              x: (p.x / fieldWidth) * THUMB_W,
              y: (p.y / fieldHeight) * THUMB_H,
              rotation: p.rotation,
            }))
          }
          previewCount={Math.min(
            performerCount ?? t.performerCount.default,
            12,
          )}
        />
      ),
    }));
  }, [visibleTemplates, fieldWidth, fieldHeight, performerCount]);

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-indigo-600" aria-hidden="true" />
          Formation Templates
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose a starting formation and customize it to fit your show.
        </p>
      </div>

      {/* Gallery grid */}
      {templatesWithThumbnails.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p className="font-medium">No templates match your performer count</p>
          <p className="text-sm mt-1">Try adding or removing performers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templatesWithThumbnails.map((template) => (
            <TemplateCardInternal
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TemplateGallery;
