/**
 * EasingCurveEditor - Interactive SVG Bezier curve editor for transition easing
 *
 * Allows dragging two cubic Bezier control points to define custom easing curves.
 * Includes preset curves (linear, ease-in, ease-out, etc.) and a mini preview animation.
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface EasingControlPoints {
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

interface EasingCurveEditorProps {
  value: EasingControlPoints;
  onChange: (points: EasingControlPoints) => void;
  className?: string;
}

// ============================================================================
// Presets
// ============================================================================

interface EasingPreset {
  name: string;
  points: EasingControlPoints;
}

const EASING_PRESETS: EasingPreset[] = [
  { name: 'Linear', points: { cp1x: 0.25, cp1y: 0.25, cp2x: 0.75, cp2y: 0.75 } },
  { name: 'Ease-in', points: { cp1x: 0.42, cp1y: 0, cp2x: 1, cp2y: 1 } },
  { name: 'Ease-out', points: { cp1x: 0, cp1y: 0, cp2x: 0.58, cp2y: 1 } },
  { name: 'Ease-in-out', points: { cp1x: 0.42, cp1y: 0, cp2x: 0.58, cp2y: 1 } },
  { name: 'Bounce', points: { cp1x: 0.34, cp1y: 1.56, cp2x: 0.64, cp2y: 1 } },
];

// ============================================================================
// Constants
// ============================================================================

const SVG_SIZE = 200;
const PADDING = 16;
const PLOT_SIZE = SVG_SIZE - PADDING * 2;

/** Convert 0-1 value space to SVG pixel space (Y is inverted) */
function toSvgX(val: number): number {
  return PADDING + val * PLOT_SIZE;
}
function toSvgY(val: number): number {
  return PADDING + (1 - val) * PLOT_SIZE;
}

/** Convert SVG pixel space back to 0-1 value space */
function fromSvgX(px: number): number {
  return (px - PADDING) / PLOT_SIZE;
}
function fromSvgY(px: number): number {
  return 1 - (px - PADDING) / PLOT_SIZE;
}

// ============================================================================
// Component
// ============================================================================

export function EasingCurveEditor({ value, onChange, className = '' }: EasingCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'cp1' | 'cp2' | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const animStartRef = useRef<number>(0);

  // Compute SVG coordinates for the control points
  const origin = { x: toSvgX(0), y: toSvgY(0) };
  const endpoint = { x: toSvgX(1), y: toSvgY(1) };
  const cp1 = { x: toSvgX(value.cp1x), y: toSvgY(value.cp1y) };
  const cp2 = { x: toSvgX(value.cp2x), y: toSvgY(value.cp2y) };

  // Evaluate the cubic bezier at parameter t to get the Y output
  const evaluateEasing = useCallback((t: number): number => {
    // Simple Newton's method to find the t that gives us our x
    // For the preview dot, we just evaluate directly at t for y
    const mt = 1 - t;
    return mt * mt * mt * 0 + 3 * mt * mt * t * value.cp1y + 3 * mt * t * t * value.cp2y + t * t * t * 1;
  }, [value.cp1y, value.cp2y]);

  // Preview animation loop
  useEffect(() => {
    const DURATION = 1500; // ms per cycle
    const PAUSE = 500; // ms pause at end

    const animate = (now: number) => {
      if (!animStartRef.current) animStartRef.current = now;
      const elapsed = (now - animStartRef.current) % (DURATION + PAUSE);
      const t = Math.min(1, elapsed / DURATION);
      setPreviewProgress(t);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Pointer event handling for dragging control points
  const handlePointerDown = useCallback((cp: 'cp1' | 'cp2') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(cp);
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_SIZE;
    const svgY = ((e.clientY - rect.top) / rect.height) * SVG_SIZE;

    const nx = Math.max(0, Math.min(1, fromSvgX(svgX)));
    // Allow Y to extend slightly beyond 0-1 for overshoot effects (like bounce)
    const ny = Math.max(-0.5, Math.min(1.5, fromSvgY(svgY)));

    if (dragging === 'cp1') {
      onChange({ ...value, cp1x: nx, cp1y: ny });
    } else {
      onChange({ ...value, cp2x: nx, cp2y: ny });
    }
  }, [dragging, onChange, value]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Generate curve path data
  const curvePath = `M ${origin.x} ${origin.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endpoint.x} ${endpoint.y}`;

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75];

  // Preview dot position
  const easedY = evaluateEasing(previewProgress);
  const previewDotX = toSvgX(previewProgress);
  const previewDotY = toSvgY(easedY);

  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      {/* SVG curve editor */}
      <svg
        ref={svgRef}
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Background grid */}
        {gridLines.map((v) => (
          <g key={v}>
            <line
              x1={toSvgX(v)} y1={toSvgY(0)} x2={toSvgX(v)} y2={toSvgY(1)}
              stroke="#e5e7eb" strokeWidth={0.5}
              className="dark:stroke-gray-700"
            />
            <line
              x1={toSvgX(0)} y1={toSvgY(v)} x2={toSvgX(1)} y2={toSvgY(v)}
              stroke="#e5e7eb" strokeWidth={0.5}
              className="dark:stroke-gray-700"
            />
          </g>
        ))}

        {/* Axis border */}
        <rect
          x={PADDING} y={PADDING}
          width={PLOT_SIZE} height={PLOT_SIZE}
          fill="none" stroke="#d1d5db" strokeWidth={1}
          className="dark:stroke-gray-600"
        />

        {/* Diagonal reference (linear) */}
        <line
          x1={origin.x} y1={origin.y} x2={endpoint.x} y2={endpoint.y}
          stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 3"
          className="dark:stroke-gray-700"
        />

        {/* Control point lines */}
        <line
          x1={origin.x} y1={origin.y} x2={cp1.x} y2={cp1.y}
          stroke="#ec4899" strokeWidth={1.5} strokeOpacity={0.6}
        />
        <line
          x1={endpoint.x} y1={endpoint.y} x2={cp2.x} y2={cp2.y}
          stroke="#ec4899" strokeWidth={1.5} strokeOpacity={0.6}
        />

        {/* Bezier curve */}
        <path
          d={curvePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Preview dot */}
        <circle
          cx={previewDotX}
          cy={previewDotY}
          r={4}
          fill="#3b82f6"
          fillOpacity={0.8}
        />

        {/* Control point 1 handle */}
        <circle
          cx={cp1.x}
          cy={cp1.y}
          r={7}
          fill="white"
          stroke="#ec4899"
          strokeWidth={2}
          style={{ cursor: 'grab' }}
          onPointerDown={handlePointerDown('cp1')}
        />

        {/* Control point 2 handle */}
        <circle
          cx={cp2.x}
          cy={cp2.y}
          r={7}
          fill="white"
          stroke="#ec4899"
          strokeWidth={2}
          style={{ cursor: 'grab' }}
          onPointerDown={handlePointerDown('cp2')}
        />

        {/* Origin and endpoint indicators */}
        <circle cx={origin.x} cy={origin.y} r={3} fill="#6b7280" />
        <circle cx={endpoint.x} cy={endpoint.y} r={3} fill="#6b7280" />
      </svg>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {EASING_PRESETS.map((preset) => {
          const isActive =
            Math.abs(value.cp1x - preset.points.cp1x) < 0.01 &&
            Math.abs(value.cp1y - preset.points.cp1y) < 0.01 &&
            Math.abs(value.cp2x - preset.points.cp2x) < 0.01 &&
            Math.abs(value.cp2y - preset.points.cp2y) < 0.01;
          return (
            <button
              key={preset.name}
              onClick={() => onChange(preset.points)}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default EasingCurveEditor;
