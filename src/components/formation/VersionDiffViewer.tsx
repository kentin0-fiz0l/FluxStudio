/**
 * VersionDiffViewer - Side-by-side or overlay comparison of two formation versions
 *
 * Supports two modes:
 * 1. Overlay: Single canvas showing both versions with color-coded displacement arrows
 * 2. Side-by-side: Two synchronized canvases with hover highlighting
 *
 * Includes summary stats panel and per-performer displacement table.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Layers,
  Columns2,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import type { Position, Performer } from '../../services/formationTypes';

// ============================================================================
// Types
// ============================================================================

export interface VersionDiffViewerProps {
  versionA: { positions: Map<string, Position>; label: string };
  versionB: { positions: Map<string, Position>; label: string };
  performers: Performer[];
  canvasWidth: number;
  canvasHeight: number;
  mode: 'overlay' | 'side-by-side';
  onClose: () => void;
}

interface PerformerDisplacement {
  performer: Performer;
  distance: number;
  dx: number;
  dy: number;
  direction: number;
  fromPos: Position | null;
  toPos: Position | null;
}

type SortKey = 'name' | 'distance' | 'direction';
type SortDir = 'asc' | 'desc';

// ============================================================================
// Helpers
// ============================================================================

const MOVE_THRESHOLD = 0.5;

function displacementColor(distance: number): string {
  if (distance < 3) return '#22c55e';
  if (distance < 8) return '#f59e0b';
  return '#ef4444';
}

function directionLabel(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'Right';
  if (normalized >= 22.5 && normalized < 67.5) return 'Down-Right';
  if (normalized >= 67.5 && normalized < 112.5) return 'Down';
  if (normalized >= 112.5 && normalized < 157.5) return 'Down-Left';
  if (normalized >= 157.5 && normalized < 202.5) return 'Left';
  if (normalized >= 202.5 && normalized < 247.5) return 'Up-Left';
  if (normalized >= 247.5 && normalized < 292.5) return 'Up';
  return 'Up-Right';
}

// ============================================================================
// Canvas Rendering
// ============================================================================

function renderOverlayCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  performers: Performer[],
  versionA: Map<string, Position>,
  versionB: Map<string, Position>,
  hoveredId: string | null,
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const radius = 8;

  for (const performer of performers) {
    const posA = versionA.get(performer.id);
    const posB = versionB.get(performer.id);
    if (!posA && !posB) continue;

    const pxA = posA ? { x: (posA.x / 100) * width, y: (posA.y / 100) * height } : null;
    const pxB = posB ? { x: (posB.x / 100) * width, y: (posB.y / 100) * height } : null;

    const isHovered = performer.id === hoveredId;
    const alpha = isHovered ? 1.0 : 0.7;

    // Draw displacement arrow
    if (pxA && pxB) {
      const dx = posB!.x - posA!.x;
      const dy = posB!.y - posA!.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > MOVE_THRESHOLD) {
        ctx.beginPath();
        ctx.moveTo(pxA.x, pxA.y);
        ctx.lineTo(pxB.x, pxB.y);
        ctx.strokeStyle = displacementColor(dist);
        ctx.globalAlpha = alpha;
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(pxB.y - pxA.y, pxB.x - pxA.x);
        const headLen = 6;
        ctx.beginPath();
        ctx.moveTo(pxB.x, pxB.y);
        ctx.lineTo(
          pxB.x - headLen * Math.cos(angle - Math.PI / 6),
          pxB.y - headLen * Math.sin(angle - Math.PI / 6),
        );
        ctx.moveTo(pxB.x, pxB.y);
        ctx.lineTo(
          pxB.x - headLen * Math.cos(angle + Math.PI / 6),
          pxB.y - headLen * Math.sin(angle + Math.PI / 6),
        );
        ctx.stroke();
      }
    }

    // Version A performer (blue outline)
    if (pxA) {
      ctx.beginPath();
      ctx.arc(pxA.x, pxA.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }

    // Version B performer (green outline)
    if (pxB) {
      ctx.beginPath();
      ctx.arc(pxB.x, pxB.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }

    // Label
    const labelPos = pxB ?? pxA;
    if (labelPos) {
      ctx.globalAlpha = isHovered ? 1.0 : 0.6;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#374151';
      ctx.fillText(performer.label, labelPos.x, labelPos.y);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function renderSingleVersionCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  performers: Performer[],
  positions: Map<string, Position>,
  color: string,
  hoveredId: string | null,
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const radius = 8;

  for (const performer of performers) {
    const pos = positions.get(performer.id);
    if (!pos) continue;

    const px = (pos.x / 100) * width;
    const py = (pos.y / 100) * height;
    const isHovered = performer.id === hoveredId;

    // Fill circle
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = performer.color;
    ctx.globalAlpha = isHovered ? 1.0 : 0.7;
    ctx.fill();

    // Highlight ring
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Label
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = isHovered ? 1.0 : 0.8;
    ctx.fillText(performer.label, px, py);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ============================================================================
// Sub-components
// ============================================================================

const OverlayCanvas = React.memo(function OverlayCanvas({
  width,
  height,
  performers,
  versionA,
  versionB,
  hoveredId,
  onHover,
}: {
  width: number;
  height: number;
  performers: Performer[];
  versionA: Map<string, Position>;
  versionB: Map<string, Position>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderOverlayCanvas(ctx, width, height, performers, versionA, versionB, hoveredId);
  }, [width, height, performers, versionA, versionB, hoveredId]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      const threshold = 3;
      let closest: string | null = null;
      let closestDist = Infinity;

      for (const p of performers) {
        const posB = versionB.get(p.id);
        const posA = versionA.get(p.id);
        const pos = posB ?? posA;
        if (!pos) continue;
        const d = Math.sqrt((pos.x - mx) ** 2 + (pos.y - my) ** 2);
        if (d < threshold && d < closestDist) {
          closest = p.id;
          closestDist = d;
        }
      }
      onHover(closest);
    },
    [performers, versionA, versionB, onHover],
  );

  return (
    <canvas
      ref={canvasRef}
      className="block bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      style={{ width, height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHover(null)}
    />
  );
});

const SideBySideCanvas = React.memo(function SideBySideCanvas({
  width,
  height,
  performers,
  positions,
  color,
  label,
  hoveredId,
  onHover,
}: {
  width: number;
  height: number;
  performers: Performer[];
  positions: Map<string, Position>;
  color: string;
  label: string;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderSingleVersionCanvas(ctx, width, height, performers, positions, color, hoveredId);
  }, [width, height, performers, positions, color, hoveredId]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      const threshold = 3;
      let closest: string | null = null;
      let closestDist = Infinity;

      for (const p of performers) {
        const pos = positions.get(p.id);
        if (!pos) continue;
        const d = Math.sqrt((pos.x - mx) ** 2 + (pos.y - my) ** 2);
        if (d < threshold && d < closestDist) {
          closest = p.id;
          closestDist = d;
        }
      }
      onHover(closest);
    },
    [performers, positions, onHover],
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold" style={{ color }}>
        {label}
      </span>
      <canvas
        ref={canvasRef}
        className="block bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ width, height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover(null)}
      />
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const VersionDiffViewer = React.memo(function VersionDiffViewer({
  versionA,
  versionB,
  performers,
  canvasWidth,
  canvasHeight,
  mode: initialMode,
  onClose,
}: VersionDiffViewerProps) {
  const [mode, setMode] = useState(initialMode);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Compute displacements
  const displacements: PerformerDisplacement[] = useMemo(() => {
    return performers.map((performer) => {
      const posA = versionA.positions.get(performer.id) ?? null;
      const posB = versionB.positions.get(performer.id) ?? null;

      if (!posA || !posB) {
        return { performer, distance: 0, dx: 0, dy: 0, direction: 0, fromPos: posA, toPos: posB };
      }

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const direction = (Math.atan2(dy, dx) * 180) / Math.PI;

      return { performer, distance, dx, dy, direction, fromPos: posA, toPos: posB };
    });
  }, [performers, versionA.positions, versionB.positions]);

  // Summary stats
  const stats = useMemo(() => {
    const moved = displacements.filter((d) => d.distance > MOVE_THRESHOLD);
    const avgDisplacement =
      moved.length > 0 ? moved.reduce((sum, d) => sum + d.distance, 0) / moved.length : 0;
    const maxDisplacement =
      moved.length > 0 ? moved.reduce((max, d) => (d.distance > max.distance ? d : max), moved[0]) : null;

    return {
      movedCount: moved.length,
      totalCount: performers.length,
      avgDisplacement: Math.round(avgDisplacement * 10) / 10,
      maxDisplacement,
    };
  }, [displacements, performers.length]);

  // Sorted displacements for table
  const sortedDisplacements = useMemo(() => {
    const sorted = [...displacements];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.performer.name.localeCompare(b.performer.name);
          break;
        case 'distance':
          cmp = a.distance - b.distance;
          break;
        case 'direction':
          cmp = a.direction - b.direction;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [displacements, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey],
  );

  // Canvas dimensions for rendering
  const singleCanvasW = mode === 'side-by-side' ? Math.min(350, canvasWidth / 2 - 10) : Math.min(700, canvasWidth);
  const singleCanvasH = Math.round(singleCanvasW * (canvasHeight / canvasWidth));

  const SortIcon = useCallback(
    ({ column }: { column: SortKey }) => {
      if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
      return sortDir === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-blue-500" />
      ) : (
        <ArrowDown className="w-3 h-3 text-blue-500" />
      );
    },
    [sortKey, sortDir],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-[900px] w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Version Diff
            </h2>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setMode('overlay')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  mode === 'overlay'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Overlay
              </button>
              <button
                onClick={() => setMode('side-by-side')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  mode === 'side-by-side'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                Side by Side
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
            aria-label="Close diff viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-shrink-0 p-4 flex justify-center gap-4 bg-gray-50 dark:bg-gray-800/50">
          {mode === 'overlay' ? (
            <div>
              <div className="flex items-center justify-center gap-4 mb-2 text-xs">
                <span className="flex items-center gap-1 text-blue-500 font-medium">
                  <span className="w-3 h-3 rounded-full border-2 border-blue-500 inline-block" />
                  {versionA.label}
                </span>
                <span className="flex items-center gap-1 text-green-500 font-medium">
                  <span className="w-3 h-3 rounded-full border-2 border-green-500 inline-block" />
                  {versionB.label}
                </span>
              </div>
              <OverlayCanvas
                width={singleCanvasW}
                height={singleCanvasH}
                performers={performers}
                versionA={versionA.positions}
                versionB={versionB.positions}
                hoveredId={hoveredId}
                onHover={setHoveredId}
              />
            </div>
          ) : (
            <div className="flex gap-4">
              <SideBySideCanvas
                width={singleCanvasW}
                height={singleCanvasH}
                performers={performers}
                positions={versionA.positions}
                color="#3b82f6"
                label={versionA.label}
                hoveredId={hoveredId}
                onHover={setHoveredId}
              />
              <SideBySideCanvas
                width={singleCanvasW}
                height={singleCanvasH}
                performers={performers}
                positions={versionB.positions}
                color="#22c55e"
                label={versionB.label}
                hoveredId={hoveredId}
                onHover={setHoveredId}
              />
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6 px-5 py-3 border-t border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.movedCount}</div>
            <div className="text-[10px] text-gray-500 uppercase">Moved</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.avgDisplacement}</div>
            <div className="text-[10px] text-gray-500 uppercase">Avg Distance</div>
          </div>
          {stats.maxDisplacement && (
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">
                {Math.round(stats.maxDisplacement.distance * 10) / 10}
              </div>
              <div className="text-[10px] text-gray-500 uppercase">
                Max ({stats.maxDisplacement.performer.name})
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="text-lg font-bold text-gray-400">{stats.totalCount - stats.movedCount}</div>
            <div className="text-[10px] text-gray-500 uppercase">Unchanged</div>
          </div>
        </div>

        {/* Per-Performer Displacement Table */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                    Performer <SortIcon column="name" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  <button onClick={() => handleSort('distance')} className="flex items-center gap-1">
                    Distance <SortIcon column="distance" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  <button onClick={() => handleSort('direction')} className="flex items-center gap-1">
                    Direction <SortIcon column="direction" />
                  </button>
                </th>
                <th className="px-4 py-2 text-left font-medium">From</th>
                <th className="px-4 py-2 text-left font-medium">To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sortedDisplacements.map((d) => {
                const isHovered = d.performer.id === hoveredId;
                const moved = d.distance > MOVE_THRESHOLD;
                return (
                  <tr
                    key={d.performer.id}
                    className={`transition-colors cursor-pointer ${
                      isHovered
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                    onMouseEnter={() => setHoveredId(d.performer.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: d.performer.color }}
                        />
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {d.performer.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="text-xs font-mono font-medium"
                        style={{ color: moved ? displacementColor(d.distance) : '#9ca3af' }}
                      >
                        {moved ? d.distance.toFixed(1) : '--'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {moved ? directionLabel(d.direction) : '--'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-mono text-gray-400">
                        {d.fromPos ? `(${d.fromPos.x.toFixed(1)}, ${d.fromPos.y.toFixed(1)})` : '--'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-[10px] font-mono text-gray-400">
                        {d.toPos ? `(${d.toPos.x.toFixed(1)}, ${d.toPos.y.toFixed(1)})` : '--'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default VersionDiffViewer;
