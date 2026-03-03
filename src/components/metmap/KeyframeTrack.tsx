import React from 'react';
import type { Animation, AnimatableProperty, Keyframe } from '../../contexts/metmap/types';
import { PROPERTY_CONFIG, TRACK_HEIGHT } from './keyframeEditorConstants';

interface KeyframeTrackProps {
  anim: Animation;
  sectionWidth: number;
  selectedKeyframeId: string | null;
  timeToX: (time: number) => number;
  onDoubleClick: (property: AnimatableProperty, e: React.MouseEvent) => void;
  onToggleTrack: (property: AnimatableProperty) => void;
  onPointerDown: (animId: string, kfId: string, e: React.PointerEvent) => void;
  onBezierHandleDown: (animId: string, kfId: string, handle: 'cp1' | 'cp2', e: React.PointerEvent) => void;
}

export function KeyframeTrack({
  anim,
  sectionWidth,
  selectedKeyframeId,
  timeToX,
  onDoubleClick,
  onToggleTrack,
  onPointerDown,
  onBezierHandleDown,
}: KeyframeTrackProps) {
  const config = PROPERTY_CONFIG[anim.property];

  return (
    <div
      key={anim.id}
      data-track={anim.property}
      className="relative border-t border-neutral-700/50"
      style={{ height: TRACK_HEIGHT, width: sectionWidth }}
      onDoubleClick={(e) => onDoubleClick(anim.property, e)}
    >
      {/* Track label */}
      <div className="absolute left-1 top-0.5 z-10 flex items-center gap-1">
        <button
          onClick={() => onToggleTrack(anim.property)}
          className={`text-[10px] font-medium px-1 rounded ${anim.enabled ? 'text-neutral-300' : 'text-neutral-600 line-through'}`}
          style={{ color: anim.enabled ? config.color : undefined }}
        >
          {config.label}
        </button>
      </div>

      {/* Grid background */}
      <div className="absolute inset-0 opacity-20">
        {/* Horizontal center line */}
        <div className="absolute left-0 right-0 top-1/2 border-t border-neutral-600" />
      </div>

      {/* Keyframe dots + bezier handles */}
      {anim.keyframes.map((kf: Keyframe) => {
        const x = timeToX(kf.time);
        const yProgress = (kf.value - config.min) / (config.max - config.min);
        const y = TRACK_HEIGHT - yProgress * (TRACK_HEIGHT - 8) - 4;
        const isSelected = kf.id === selectedKeyframeId;
        const showHandles = isSelected && kf.easing === 'bezier' && kf.bezierHandles;

        return (
          <div key={kf.id}>
            {/* Bezier control handles */}
            {showHandles && kf.bezierHandles && (() => {
              const h = kf.bezierHandles;
              // Control point positions relative to track
              // cp1 is relative to keyframe position (start of curve segment)
              const cp1x = x + h.cp1x * 60; // Scale handle distance for visibility
              const cp1y = y - h.cp1y * (TRACK_HEIGHT - 8);
              const cp2x = x + h.cp2x * 60;
              const cp2y = y - (h.cp2y - 1) * (TRACK_HEIGHT - 8);

              return (
                <>
                  {/* Line from keyframe to cp1 */}
                  <svg className="absolute inset-0 pointer-events-none" style={{ width: sectionWidth, height: TRACK_HEIGHT }}>
                    <line x1={x} y1={y} x2={cp1x} y2={cp1y} stroke="#818cf8" strokeWidth={1} opacity={0.6} />
                    <line x1={x} y1={y} x2={cp2x} y2={cp2y} stroke="#f472b6" strokeWidth={1} opacity={0.6} />
                  </svg>
                  {/* CP1 handle */}
                  <div
                    onPointerDown={(e) => onBezierHandleDown(anim.id, kf.id, 'cp1', e)}
                    className="absolute w-[7px] h-[7px] rounded-sm cursor-grab active:cursor-grabbing border border-indigo-400 bg-indigo-500"
                    style={{ left: cp1x - 3, top: cp1y - 3 }}
                    title={`CP1: (${h.cp1x.toFixed(2)}, ${h.cp1y.toFixed(2)})`}
                  />
                  {/* CP2 handle */}
                  <div
                    onPointerDown={(e) => onBezierHandleDown(anim.id, kf.id, 'cp2', e)}
                    className="absolute w-[7px] h-[7px] rounded-sm cursor-grab active:cursor-grabbing border border-pink-400 bg-pink-500"
                    style={{ left: cp2x - 3, top: cp2y - 3 }}
                    title={`CP2: (${h.cp2x.toFixed(2)}, ${h.cp2y.toFixed(2)})`}
                  />
                </>
              );
            })()}
            {/* Keyframe dot */}
            <div
              onPointerDown={(e) => onPointerDown(anim.id, kf.id, e)}
              className={`absolute rounded-full cursor-grab active:cursor-grabbing transition-shadow ${
                isSelected ? 'ring-2 ring-white shadow-lg' : 'hover:ring-1 hover:ring-white/50'
              }`}
              style={{
                left: x - (isSelected ? 5 : 4),
                top: y - (isSelected ? 5 : 4),
                width: isSelected ? 10 : 8,
                height: isSelected ? 10 : 8,
                backgroundColor: config.color,
              }}
              title={`${config.label}: ${kf.value}${config.unit} @ ${kf.time.toFixed(2)}s (${kf.easing})`}
              aria-label={`${config.label} keyframe: ${kf.value}${config.unit} at ${kf.time.toFixed(2)} seconds, ${kf.easing} easing`}
            />
          </div>
        );
      })}
    </div>
  );
}
