/**
 * WaypointEditor - UI for editing fly-through camera path waypoints
 *
 * Allows users to select presets, add/remove/reorder custom waypoints,
 * edit per-waypoint position/lookAt/duration/easing, and preview the
 * camera trajectory as an SVG top-down path.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Play, X,
} from 'lucide-react';
import type { CameraWaypoint, FlyThroughPreset } from './FlyThroughController';

// ============================================================================
// Types
// ============================================================================

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export interface WaypointWithMeta extends CameraWaypoint {
  duration: number;
  easing: EasingType;
}

export interface WaypointEditorProps {
  preset: FlyThroughPreset;
  onPresetChange: (preset: FlyThroughPreset) => void;
  waypoints: WaypointWithMeta[];
  onWaypointsChange: (waypoints: WaypointWithMeta[]) => void;
  onPlayPreview?: () => void;
  onClose: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const PRESET_OPTIONS: { value: FlyThroughPreset; label: string }[] = [
  { value: 'audience_sweep', label: 'Audience Sweep' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'director_tower', label: 'Director Tower' },
  { value: 'custom', label: 'Custom' },
];

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In/Out' },
];

const DEFAULT_WAYPOINT: WaypointWithMeta = {
  position: [0, 5, 10],
  lookAt: [0, 0, 0],
  time: 0,
  duration: 2,
  easing: 'easeInOut',
};

// ============================================================================
// Helpers
// ============================================================================

function recalculateTimes(waypoints: WaypointWithMeta[]): WaypointWithMeta[] {
  if (waypoints.length === 0) return waypoints;
  if (waypoints.length === 1) return [{ ...waypoints[0], time: 0 }];
  return waypoints.map((wp, i) => ({
    ...wp,
    time: i / (waypoints.length - 1),
  }));
}

// ============================================================================
// Sub-components
// ============================================================================

interface Vec3InputProps {
  label: string;
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
}

const Vec3Input: React.FC<Vec3InputProps> = ({ label, value, onChange }) => (
  <div>
    <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
    <div className="flex gap-1 mt-0.5">
      {(['x', 'y', 'z'] as const).map((axis, i) => (
        <div key={axis} className="flex-1">
          <label className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">{axis}</label>
          <input
            type="number"
            step={0.5}
            value={value[i]}
            onChange={(e) => {
              const next: [number, number, number] = [...value];
              next[i] = parseFloat(e.target.value) || 0;
              onChange(next);
            }}
            className="w-full px-1.5 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 focus:border-blue-500 focus:outline-none tabular-nums"
          />
        </div>
      ))}
    </div>
  </div>
);

interface WaypointRowProps {
  index: number;
  waypoint: WaypointWithMeta;
  total: number;
  onChange: (wp: WaypointWithMeta) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const WaypointRow: React.FC<WaypointRowProps> = ({
  index, waypoint, total, onChange, onRemove, onMoveUp, onMoveDown,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer hover:bg-gray-750"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-medium text-gray-200">
          Waypoint {index + 1}
          <span className="ml-2 text-gray-500 font-normal">
            t={waypoint.time.toFixed(2)}
          </span>
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move waypoint up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === total - 1}
            className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move waypoint down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            disabled={total <= 2}
            className="p-1 rounded text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Remove waypoint"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 py-2 space-y-2 bg-gray-850">
          <Vec3Input
            label="Position"
            value={waypoint.position}
            onChange={(position) => onChange({ ...waypoint, position })}
          />
          <Vec3Input
            label="Look At"
            value={waypoint.lookAt}
            onChange={(lookAt) => onChange({ ...waypoint, lookAt })}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Duration (s)</span>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={waypoint.duration}
                onChange={(e) => onChange({ ...waypoint, duration: parseFloat(e.target.value) || 1 })}
                className="w-full mt-0.5 px-1.5 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 focus:border-blue-500 focus:outline-none tabular-nums"
              />
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Easing</span>
              <select
                value={waypoint.easing}
                onChange={(e) => onChange({ ...waypoint, easing: e.target.value as EasingType })}
                className="w-full mt-0.5 px-1.5 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-gray-200 focus:border-blue-500 focus:outline-none"
              >
                {EASING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SVG Path Preview
// ============================================================================

interface PathPreviewProps {
  waypoints: WaypointWithMeta[];
}

const PathPreview: React.FC<PathPreviewProps> = ({ waypoints }) => {
  const { path, points, viewBox } = useMemo(() => {
    if (waypoints.length === 0) return { path: '', points: [], viewBox: '-25 -25 50 50' };

    // Use x and z coordinates for top-down view
    const coords = waypoints.map((wp) => ({ x: wp.position[0], z: wp.position[2] }));

    // Calculate bounds
    const xs = coords.map((c) => c.x);
    const zs = coords.map((c) => c.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const rangeX = maxX - minX || 10;
    const rangeZ = maxZ - minZ || 10;
    const padding = Math.max(rangeX, rangeZ) * 0.2;

    const vb = `${minX - padding} ${minZ - padding} ${rangeX + padding * 2} ${rangeZ + padding * 2}`;

    // Build SVG path
    let d = '';
    coords.forEach((c, i) => {
      d += i === 0 ? `M ${c.x} ${c.z}` : ` L ${c.x} ${c.z}`;
    });

    return { path: d, points: coords, viewBox: vb };
  }, [waypoints]);

  return (
    <svg viewBox={viewBox} className="w-full h-28 bg-gray-800 rounded-lg border border-gray-700">
      {/* Grid hint */}
      <line x1="-1000" y1="0" x2="1000" y2="0" stroke="#374151" strokeWidth="0.2" />
      <line x1="0" y1="-1000" x2="0" y2="1000" stroke="#374151" strokeWidth="0.2" />

      {/* Camera path */}
      {path && (
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Waypoint dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.z} r="0.6" fill={i === 0 ? '#22c55e' : i === points.length - 1 ? '#ef4444' : '#3b82f6'} />
          <text x={p.x} y={p.z - 1.2} textAnchor="middle" fontSize="1.2" fill="#9ca3af">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const WaypointEditor: React.FC<WaypointEditorProps> = ({
  preset,
  onPresetChange,
  waypoints,
  onWaypointsChange,
  onPlayPreview,
  onClose,
}) => {
  const handleAddWaypoint = useCallback(() => {
    const last = waypoints[waypoints.length - 1] ?? DEFAULT_WAYPOINT;
    const newWp: WaypointWithMeta = {
      ...DEFAULT_WAYPOINT,
      position: [last.position[0] + 2, last.position[1], last.position[2]],
      lookAt: [...last.lookAt],
    };
    onWaypointsChange(recalculateTimes([...waypoints, newWp]));
  }, [waypoints, onWaypointsChange]);

  const handleRemoveWaypoint = useCallback((index: number) => {
    if (waypoints.length <= 2) return;
    const next = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(recalculateTimes(next));
  }, [waypoints, onWaypointsChange]);

  const handleUpdateWaypoint = useCallback((index: number, updated: WaypointWithMeta) => {
    const next = waypoints.map((wp, i) => (i === index ? updated : wp));
    onWaypointsChange(next);
  }, [waypoints, onWaypointsChange]);

  const handleMoveWaypoint = useCallback((index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= waypoints.length) return;
    const next = [...waypoints];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onWaypointsChange(recalculateTimes(next));
  }, [waypoints, onWaypointsChange]);

  return (
    <div className="w-80 bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">Waypoint Editor</h3>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700"
          aria-label="Close waypoint editor"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Preset selector */}
        <div>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Preset</label>
          <select
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as FlyThroughPreset)}
            className="w-full mt-1 px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:border-blue-500 focus:outline-none"
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* SVG path preview */}
        <div>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Camera Path (Top View)</span>
          <div className="mt-1">
            <PathPreview waypoints={waypoints} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Start</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> End</span>
          </div>
        </div>

        {/* Waypoint list */}
        {preset === 'custom' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Waypoints ({waypoints.length})
              </span>
              <button
                onClick={handleAddWaypoint}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {waypoints.map((wp, i) => (
              <WaypointRow
                key={i}
                index={i}
                waypoint={wp}
                total={waypoints.length}
                onChange={(updated) => handleUpdateWaypoint(i, updated)}
                onRemove={() => handleRemoveWaypoint(i)}
                onMoveUp={() => handleMoveWaypoint(i, -1)}
                onMoveDown={() => handleMoveWaypoint(i, 1)}
              />
            ))}
          </div>
        )}

        {/* Play preview button */}
        {onPlayPreview && (
          <button
            onClick={onPlayPreview}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            Play Preview
          </button>
        )}
      </div>
    </div>
  );
};
