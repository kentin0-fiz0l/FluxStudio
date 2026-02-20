/**
 * KeyframeEditor - Interactive overlay for adding, moving, and deleting keyframes.
 *
 * Renders as collapsible property tracks below the main timeline canvas.
 * Each track represents an AnimatableProperty and shows keyframe dots
 * that can be double-clicked to add, dragged to move, or deleted.
 */

import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Section, Animation, AnimatableProperty, EasingType, Keyframe, BezierHandles } from '../../contexts/metmap/types';
import { addKeyframe, removeKeyframe, updateKeyframe } from '../../services/keyframeEngine';

interface KeyframeEditorProps {
  sections: Section[];
  activeSectionIndex: number;
  pixelsPerBar: number;
  selectedKeyframeId: string | null;
  onSelectKeyframe: (id: string | null) => void;
  onUpdateAnimations: (sectionIndex: number, animations: Animation[]) => void;
  className?: string;
}

const PROPERTY_CONFIG: Record<AnimatableProperty, { label: string; color: string; min: number; max: number; unit: string }> = {
  tempo: { label: 'Tempo', color: '#818cf8', min: 20, max: 300, unit: 'BPM' },
  volume: { label: 'Volume', color: '#34d399', min: 0, max: 100, unit: '%' },
  pan: { label: 'Pan', color: '#fbbf24', min: -100, max: 100, unit: '' },
  emphasis: { label: 'Emphasis', color: '#fb7185', min: 0, max: 100, unit: '%' },
};

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In-Out' },
  { value: 'step', label: 'Step' },
  { value: 'bezier', label: 'Bezier' },
];

const DEFAULT_BEZIER_HANDLES: BezierHandles = { cp1x: 0.42, cp1y: 0, cp2x: 0.58, cp2y: 1 };

const TRACK_HEIGHT = 48;

let nextId = 0;
function generateId(): string {
  return `kf_${Date.now()}_${nextId++}`;
}

export const KeyframeEditor = memo(function KeyframeEditor({
  sections,
  activeSectionIndex,
  pixelsPerBar,
  selectedKeyframeId,
  onSelectKeyframe,
  onUpdateAnimations,
  className = '',
}: KeyframeEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [dragging, setDragging] = useState<{ animId: string; kfId: string; startX: number; startTime: number } | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<{
    animId: string; kfId: string; handle: 'cp1' | 'cp2';
    startX: number; startY: number;
    startCpx: number; startCpy: number;
  } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const section = sections[activeSectionIndex] ?? null;
  const animations = useMemo(() => section?.animations || [], [section?.animations]);
  const sectionWidth = (section?.bars ?? 4) * pixelsPerBar;

  // Compute the section's time duration in seconds based on average tempo
  const sectionDuration = useMemo(() => {
    if (!section) return 1;
    const avgTempo = section.tempoEnd
      ? (section.tempoStart + section.tempoEnd) / 2
      : section.tempoStart;
    const bpb = parseInt(section.timeSignature?.split('/')[0] || '4', 10);
    const totalBeats = section.bars * bpb;
    return (totalBeats / avgTempo) * 60;
  }, [section]);

  const timeToX = useCallback((time: number) => {
    return (time / sectionDuration) * sectionWidth;
  }, [sectionDuration, sectionWidth]);

  const xToTime = useCallback((x: number) => {
    return Math.max(0, Math.min(sectionDuration, (x / sectionWidth) * sectionDuration));
  }, [sectionDuration, sectionWidth]);

  const getOrCreateAnimation = useCallback((property: AnimatableProperty): Animation => {
    const existing = animations.find(a => a.property === property);
    if (existing) return existing;
    return { id: generateId(), property, keyframes: [], enabled: true };
  }, [animations]);

  const handleDoubleClick = useCallback((property: AnimatableProperty, e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const time = xToTime(x);
    const config = PROPERTY_CONFIG[property];

    // Y position maps to value
    const trackEl = (e.target as HTMLElement).closest('[data-track]');
    if (!trackEl) return;
    const trackRect = trackEl.getBoundingClientRect();
    const yProgress = 1 - ((e.clientY - trackRect.top) / TRACK_HEIGHT);
    const value = config.min + yProgress * (config.max - config.min);

    const anim = getOrCreateAnimation(property);
    const newKf: Keyframe = { id: generateId(), time, value: Math.round(value), easing: 'linear' };
    const newKeyframes = addKeyframe(anim, newKf);
    const updatedAnim = { ...anim, keyframes: newKeyframes };

    const newAnimations = animations.some(a => a.property === property)
      ? animations.map(a => a.property === property ? updatedAnim : a)
      : [...animations, updatedAnim];

    onUpdateAnimations(activeSectionIndex, newAnimations);
    onSelectKeyframe(newKf.id);
  }, [xToTime, getOrCreateAnimation, animations, activeSectionIndex, onUpdateAnimations, onSelectKeyframe]);

  const handlePointerDown = useCallback((animId: string, kfId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;

    const anim = animations.find(a => a.id === animId);
    const kf = anim?.keyframes.find(k => k.id === kfId);
    if (!kf) return;

    onSelectKeyframe(kfId);
    setDragging({ animId, kfId, startX: e.clientX, startTime: kf.time });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [animations, onSelectKeyframe]);

  const handleBezierHandleDown = useCallback((animId: string, kfId: string, handle: 'cp1' | 'cp2', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const anim = animations.find(a => a.id === animId);
    const kf = anim?.keyframes.find(k => k.id === kfId);
    if (!kf?.bezierHandles) return;

    const h = kf.bezierHandles;
    setDraggingHandle({
      animId, kfId, handle,
      startX: e.clientX, startY: e.clientY,
      startCpx: handle === 'cp1' ? h.cp1x : h.cp2x,
      startCpy: handle === 'cp1' ? h.cp1y : h.cp2y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [animations]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Handle bezier control point drag
    if (draggingHandle) {
      const dx = (e.clientX - draggingHandle.startX) / sectionWidth;
      const dy = -(e.clientY - draggingHandle.startY) / TRACK_HEIGHT;

      const newCpx = Math.max(0, Math.min(1, draggingHandle.startCpx + dx));
      const newCpy = Math.max(-0.5, Math.min(1.5, draggingHandle.startCpy + dy));

      const anim = animations.find(a => a.id === draggingHandle.animId);
      const kf = anim?.keyframes.find(k => k.id === draggingHandle.kfId);
      if (!anim || !kf?.bezierHandles) return;

      const newHandles = { ...kf.bezierHandles };
      if (draggingHandle.handle === 'cp1') {
        newHandles.cp1x = newCpx;
        newHandles.cp1y = newCpy;
      } else {
        newHandles.cp2x = newCpx;
        newHandles.cp2y = newCpy;
      }

      const newKeyframes = updateKeyframe(anim, draggingHandle.kfId, { bezierHandles: newHandles });
      const newAnimations = animations.map(a => a.id === draggingHandle.animId ? { ...a, keyframes: newKeyframes } : a);
      onUpdateAnimations(activeSectionIndex, newAnimations);
      return;
    }

    // Handle keyframe dot drag
    if (!dragging) return;
    const dx = e.clientX - dragging.startX;
    const dtTime = (dx / sectionWidth) * sectionDuration;
    const newTime = Math.max(0, Math.min(sectionDuration, dragging.startTime + dtTime));

    const anim = animations.find(a => a.id === dragging.animId);
    if (!anim) return;

    const newKeyframes = updateKeyframe(anim, dragging.kfId, { time: newTime });
    const newAnimations = animations.map(a => a.id === dragging.animId ? { ...a, keyframes: newKeyframes } : a);
    onUpdateAnimations(activeSectionIndex, newAnimations);
  }, [dragging, draggingHandle, sectionWidth, sectionDuration, animations, activeSectionIndex, onUpdateAnimations]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
    setDraggingHandle(null);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedKeyframeId) return;
    for (const anim of animations) {
      if (anim.keyframes.some(kf => kf.id === selectedKeyframeId)) {
        const newKeyframes = removeKeyframe(anim, selectedKeyframeId);
        const newAnimations = animations.map(a => a.id === anim.id ? { ...a, keyframes: newKeyframes } : a);
        onUpdateAnimations(activeSectionIndex, newAnimations);
        onSelectKeyframe(null);
        return;
      }
    }
  }, [selectedKeyframeId, animations, activeSectionIndex, onUpdateAnimations, onSelectKeyframe]);

  const handleEasingChange = useCallback((animId: string, kfId: string, easing: EasingType) => {
    const anim = animations.find(a => a.id === animId);
    if (!anim) return;
    const changes: Partial<Pick<Keyframe, 'easing' | 'bezierHandles'>> = { easing };
    // Set default handles when switching to bezier
    if (easing === 'bezier') {
      const kf = anim.keyframes.find(k => k.id === kfId);
      if (kf && !kf.bezierHandles) {
        changes.bezierHandles = { ...DEFAULT_BEZIER_HANDLES };
      }
    }
    const newKeyframes = updateKeyframe(anim, kfId, changes);
    const newAnimations = animations.map(a => a.id === animId ? { ...a, keyframes: newKeyframes } : a);
    onUpdateAnimations(activeSectionIndex, newAnimations);
  }, [animations, activeSectionIndex, onUpdateAnimations]);

  const handleToggleTrack = useCallback((property: AnimatableProperty) => {
    const anim = animations.find(a => a.property === property);
    if (!anim) return;
    const newAnimations = animations.map(a =>
      a.property === property ? { ...a, enabled: !a.enabled } : a
    );
    onUpdateAnimations(activeSectionIndex, newAnimations);
  }, [animations, activeSectionIndex, onUpdateAnimations]);

  const handleAddTrack = useCallback((property: AnimatableProperty) => {
    const config = PROPERTY_CONFIG[property];
    const anim: Animation = {
      id: generateId(),
      property,
      keyframes: [
        { id: generateId(), time: 0, value: config.min + (config.max - config.min) * 0.5, easing: 'linear' },
      ],
      enabled: true,
    };
    onUpdateAnimations(activeSectionIndex, [...animations, anim]);
  }, [animations, activeSectionIndex, onUpdateAnimations]);

  // Find selected keyframe's animation for easing dropdown
  const selectedKfInfo = (() => {
    for (const anim of animations) {
      const kf = anim.keyframes.find(k => k.id === selectedKeyframeId);
      if (kf) return { anim, kf };
    }
    return null;
  })();

  const availableProperties = (['tempo', 'volume', 'pan', 'emphasis'] as AnimatableProperty[])
    .filter(p => !animations.some(a => a.property === p));

  if (!section) return null;

  return (
    <div className={`border-t border-neutral-700 bg-neutral-900/80 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Keyframes
          {animations.length > 0 && (
            <span className="text-neutral-500">({animations.reduce((n, a) => n + a.keyframes.length, 0)})</span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {selectedKeyframeId && selectedKfInfo && (
            <>
              <select
                value={selectedKfInfo.kf.easing}
                onChange={(e) => handleEasingChange(selectedKfInfo.anim.id, selectedKfInfo.kf.id, e.target.value as EasingType)}
                className="text-xs bg-neutral-800 text-neutral-300 border border-neutral-600 rounded px-1.5 py-0.5"
              >
                {EASING_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={handleDeleteSelected}
                className="p-0.5 text-neutral-500 hover:text-red-400"
                aria-label="Delete keyframe"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {availableProperties.length > 0 && (
            <div className="relative group">
              <button className="p-0.5 text-neutral-500 hover:text-neutral-300" aria-label="Add property track">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-neutral-800 border border-neutral-600 rounded shadow-lg z-10">
                {availableProperties.map(p => (
                  <button
                    key={p}
                    onClick={() => handleAddTrack(p)}
                    className="block w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 whitespace-nowrap"
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: PROPERTY_CONFIG[p].color }} />
                    {PROPERTY_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tracks */}
      {expanded && (
        <div
          ref={trackRef}
          className="overflow-x-auto"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {animations.map(anim => {
            const config = PROPERTY_CONFIG[anim.property];
            return (
              <div
                key={anim.id}
                data-track={anim.property}
                className="relative border-t border-neutral-700/50"
                style={{ height: TRACK_HEIGHT, width: sectionWidth }}
                onDoubleClick={(e) => handleDoubleClick(anim.property, e)}
              >
                {/* Track label */}
                <div className="absolute left-1 top-0.5 z-10 flex items-center gap-1">
                  <button
                    onClick={() => handleToggleTrack(anim.property)}
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
                {anim.keyframes.map(kf => {
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
                              onPointerDown={(e) => handleBezierHandleDown(anim.id, kf.id, 'cp1', e)}
                              className="absolute w-[7px] h-[7px] rounded-sm cursor-grab active:cursor-grabbing border border-indigo-400 bg-indigo-500"
                              style={{ left: cp1x - 3, top: cp1y - 3 }}
                              title={`CP1: (${h.cp1x.toFixed(2)}, ${h.cp1y.toFixed(2)})`}
                            />
                            {/* CP2 handle */}
                            <div
                              onPointerDown={(e) => handleBezierHandleDown(anim.id, kf.id, 'cp2', e)}
                              className="absolute w-[7px] h-[7px] rounded-sm cursor-grab active:cursor-grabbing border border-pink-400 bg-pink-500"
                              style={{ left: cp2x - 3, top: cp2y - 3 }}
                              title={`CP2: (${h.cp2x.toFixed(2)}, ${h.cp2y.toFixed(2)})`}
                            />
                          </>
                        );
                      })()}
                      {/* Keyframe dot */}
                      <div
                        onPointerDown={(e) => handlePointerDown(anim.id, kf.id, e)}
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
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {animations.length === 0 && (
            <div className="px-3 py-3 text-xs text-neutral-500 text-center">
              No animation tracks. Click + to add one.
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default KeyframeEditor;
