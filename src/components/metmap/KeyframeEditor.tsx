import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Section, Animation, AnimatableProperty, EasingType, Keyframe } from '../../contexts/metmap/types';
import { addKeyframe, removeKeyframe, updateKeyframe } from '../../services/keyframeEngine';
import { PROPERTY_CONFIG, DEFAULT_BEZIER_HANDLES, TRACK_HEIGHT, generateId } from './keyframeEditorConstants';
import { KeyframeTrack } from './KeyframeTrack';
import { KeyframeInspector } from './KeyframeInspector';

interface KeyframeEditorProps {
  sections: Section[];
  activeSectionIndex: number;
  pixelsPerBar: number;
  selectedKeyframeId: string | null;
  onSelectKeyframe: (id: string | null) => void;
  onUpdateAnimations: (sectionIndex: number, animations: Animation[]) => void;
  className?: string;
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

  const sectionDuration = useMemo(() => {
    if (!section) return 1;
    const avgTempo = section.tempoEnd ? (section.tempoStart + section.tempoEnd) / 2 : section.tempoStart;
    const bpb = parseInt(section.timeSignature?.split('/')[0] || '4', 10);
    return (section.bars * bpb / avgTempo) * 60;
  }, [section]);

  const timeToX = useCallback((time: number) => (time / sectionDuration) * sectionWidth, [sectionDuration, sectionWidth]);
  const xToTime = useCallback((x: number) => Math.max(0, Math.min(sectionDuration, (x / sectionWidth) * sectionDuration)), [sectionDuration, sectionWidth]);

  const getOrCreateAnimation = useCallback((property: AnimatableProperty): Animation => {
    const existing = animations.find(a => a.property === property);
    if (existing) return existing;
    return { id: generateId(), property, keyframes: [], enabled: true };
  }, [animations]);

  // Helper: find animation containing a keyframe by ID, apply an update, and dispatch
  const updateSelectedKeyframe = useCallback((kfId: string, getChanges: (anim: Animation, kf: Keyframe) => Partial<Keyframe> | null) => {
    for (const anim of animations) {
      const kf = anim.keyframes.find(k => k.id === kfId);
      if (!kf) continue;
      const changes = getChanges(anim, kf);
      if (!changes) return;
      const newKeyframes = updateKeyframe(anim, kfId, changes);
      onUpdateAnimations(activeSectionIndex, animations.map(a => a.id === anim.id ? { ...a, keyframes: newKeyframes } : a));
      return;
    }
  }, [animations, activeSectionIndex, onUpdateAnimations]);

  const handleDoubleClick = useCallback((property: AnimatableProperty, e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const time = xToTime(e.clientX - rect.left);
    const config = PROPERTY_CONFIG[property];
    const trackEl = (e.target as HTMLElement).closest('[data-track]');
    if (!trackEl) return;
    const yProgress = 1 - ((e.clientY - trackEl.getBoundingClientRect().top) / TRACK_HEIGHT);
    const value = config.min + yProgress * (config.max - config.min);
    const anim = getOrCreateAnimation(property);
    const newKf: Keyframe = { id: generateId(), time, value: Math.round(value), easing: 'linear' };
    const updatedAnim = { ...anim, keyframes: addKeyframe(anim, newKf) };
    const newAnimations = animations.some(a => a.property === property)
      ? animations.map(a => a.property === property ? updatedAnim : a)
      : [...animations, updatedAnim];
    onUpdateAnimations(activeSectionIndex, newAnimations);
    onSelectKeyframe(newKf.id);
  }, [xToTime, getOrCreateAnimation, animations, activeSectionIndex, onUpdateAnimations, onSelectKeyframe]);

  const handlePointerDown = useCallback((animId: string, kfId: string, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!trackRef.current?.getBoundingClientRect()) return;
    const anim = animations.find(a => a.id === animId);
    const kf = anim?.keyframes.find(k => k.id === kfId);
    if (!kf) return;
    onSelectKeyframe(kfId);
    setDragging({ animId, kfId, startX: e.clientX, startTime: kf.time });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [animations, onSelectKeyframe]);

  const handleBezierHandleDown = useCallback((animId: string, kfId: string, handle: 'cp1' | 'cp2', e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const anim = animations.find(a => a.id === animId);
    const kf = anim?.keyframes.find(k => k.id === kfId);
    if (!kf?.bezierHandles) return;
    const h = kf.bezierHandles;
    setDraggingHandle({
      animId, kfId, handle, startX: e.clientX, startY: e.clientY,
      startCpx: handle === 'cp1' ? h.cp1x : h.cp2x, startCpy: handle === 'cp1' ? h.cp1y : h.cp2y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [animations]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingHandle) {
      const dx = (e.clientX - draggingHandle.startX) / sectionWidth;
      const dy = -(e.clientY - draggingHandle.startY) / TRACK_HEIGHT;
      const newCpx = Math.max(0, Math.min(1, draggingHandle.startCpx + dx));
      const newCpy = Math.max(-0.5, Math.min(1.5, draggingHandle.startCpy + dy));
      const anim = animations.find(a => a.id === draggingHandle.animId);
      const kf = anim?.keyframes.find(k => k.id === draggingHandle.kfId);
      if (!anim || !kf?.bezierHandles) return;
      const newHandles = { ...kf.bezierHandles };
      if (draggingHandle.handle === 'cp1') { newHandles.cp1x = newCpx; newHandles.cp1y = newCpy; }
      else { newHandles.cp2x = newCpx; newHandles.cp2y = newCpy; }
      const newKeyframes = updateKeyframe(anim, draggingHandle.kfId, { bezierHandles: newHandles });
      onUpdateAnimations(activeSectionIndex, animations.map(a => a.id === draggingHandle.animId ? { ...a, keyframes: newKeyframes } : a));
      return;
    }
    if (!dragging) return;
    const dtTime = ((e.clientX - dragging.startX) / sectionWidth) * sectionDuration;
    const newTime = Math.max(0, Math.min(sectionDuration, dragging.startTime + dtTime));
    const anim = animations.find(a => a.id === dragging.animId);
    if (!anim) return;
    const newKeyframes = updateKeyframe(anim, dragging.kfId, { time: newTime });
    onUpdateAnimations(activeSectionIndex, animations.map(a => a.id === dragging.animId ? { ...a, keyframes: newKeyframes } : a));
  }, [dragging, draggingHandle, sectionWidth, sectionDuration, animations, activeSectionIndex, onUpdateAnimations]);

  const handlePointerUp = useCallback(() => { setDragging(null); setDraggingHandle(null); }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedKeyframeId) return;
    for (const anim of animations) {
      if (anim.keyframes.some(kf => kf.id === selectedKeyframeId)) {
        const newKeyframes = removeKeyframe(anim, selectedKeyframeId);
        onUpdateAnimations(activeSectionIndex, animations.map(a => a.id === anim.id ? { ...a, keyframes: newKeyframes } : a));
        onSelectKeyframe(null);
        return;
      }
    }
  }, [selectedKeyframeId, animations, activeSectionIndex, onUpdateAnimations, onSelectKeyframe]);

  const handleEasingChange = useCallback((animId: string, kfId: string, easing: EasingType) => {
    const anim = animations.find(a => a.id === animId);
    if (!anim) return;
    const changes: Partial<Pick<Keyframe, 'easing' | 'bezierHandles'>> = { easing };
    if (easing === 'bezier') {
      const kf = anim.keyframes.find(k => k.id === kfId);
      if (kf && !kf.bezierHandles) changes.bezierHandles = { ...DEFAULT_BEZIER_HANDLES };
    }
    const newKeyframes = updateKeyframe(anim, kfId, changes);
    onUpdateAnimations(activeSectionIndex, animations.map(a => a.id === animId ? { ...a, keyframes: newKeyframes } : a));
  }, [animations, activeSectionIndex, onUpdateAnimations]);

  const handleToggleTrack = useCallback((property: AnimatableProperty) => {
    const anim = animations.find(a => a.property === property);
    if (!anim) return;
    onUpdateAnimations(activeSectionIndex, animations.map(a => a.property === property ? { ...a, enabled: !a.enabled } : a));
  }, [animations, activeSectionIndex, onUpdateAnimations]);

  const handleAddTrack = useCallback((property: AnimatableProperty) => {
    const config = PROPERTY_CONFIG[property];
    const anim: Animation = {
      id: generateId(), property, enabled: true,
      keyframes: [{ id: generateId(), time: 0, value: config.min + (config.max - config.min) * 0.5, easing: 'linear' }],
    };
    onUpdateAnimations(activeSectionIndex, [...animations, anim]);
  }, [animations, activeSectionIndex, onUpdateAnimations]);

  const allKeyframes = useMemo(() =>
    animations.flatMap(anim => anim.keyframes.map(kf => ({ animId: anim.id, kf, property: anim.property })))
      .sort((a, b) => a.kf.time - b.kf.time),
    [animations]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!expanded) return;

    const EASING_CYCLE: EasingType[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'bezier', 'step'];

    switch (e.key) {
      case 'Tab': {
        if (allKeyframes.length === 0) return;
        e.preventDefault();
        const currentIdx = allKeyframes.findIndex(k => k.kf.id === selectedKeyframeId);
        let nextIdx: number;
        if (e.shiftKey) {
          nextIdx = currentIdx <= 0 ? allKeyframes.length - 1 : currentIdx - 1;
        } else {
          nextIdx = currentIdx >= allKeyframes.length - 1 ? 0 : currentIdx + 1;
        }
        onSelectKeyframe(allKeyframes[nextIdx].kf.id);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (!selectedKeyframeId) return;
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 0.05;
        const delta = e.key === 'ArrowLeft' ? -step : step;
        updateSelectedKeyframe(selectedKeyframeId, (_a, kf) => ({
          time: Math.max(0, Math.min(sectionDuration, kf.time + delta))
        }));
        break;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        if (!selectedKeyframeId) return;
        e.preventDefault();
        const valStep = e.shiftKey ? 10 : 1;
        const valDelta = e.key === 'ArrowUp' ? valStep : -valStep;
        updateSelectedKeyframe(selectedKeyframeId, (anim, kf) => {
          const config = PROPERTY_CONFIG[anim.property];
          return { value: Math.max(config.min, Math.min(config.max, kf.value + valDelta)) };
        });
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (!selectedKeyframeId) return;
        e.preventDefault();
        handleDeleteSelected();
        break;
      }
      case 'a':
      case 'A': {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        // Add keyframe at midpoint of section on first active track
        const targetAnim = animations.find(a => a.enabled) || animations[0];
        if (!targetAnim) return;
        const config = PROPERTY_CONFIG[targetAnim.property];
        const midTime = sectionDuration / 2;
        const newKf: Keyframe = { id: generateId(), time: midTime, value: Math.round((config.min + config.max) / 2), easing: 'linear' };
        const newKeyframes = addKeyframe(targetAnim, newKf);
        const newAnims = animations.map(a => a.id === targetAnim.id ? { ...a, keyframes: newKeyframes } : a);
        onUpdateAnimations(activeSectionIndex, newAnims);
        onSelectKeyframe(newKf.id);
        break;
      }
      case 'e':
      case 'E': {
        if (e.ctrlKey || e.metaKey || !selectedKeyframeId) return;
        e.preventDefault();
        updateSelectedKeyframe(selectedKeyframeId, (anim, kf) => {
          const curIdx = EASING_CYCLE.indexOf(kf.easing);
          const nextEasing = EASING_CYCLE[(curIdx + 1) % EASING_CYCLE.length];
          handleEasingChange(anim.id, kf.id, nextEasing);
          return null; // easing change handled by handleEasingChange
        });
        break;
      }
      case 'Enter': {
        // Focus the easing dropdown if there's a selected keyframe
        if (!selectedKeyframeId) return;
        e.preventDefault();
        const selectEl = trackRef.current?.closest('.border-t')?.querySelector('select');
        if (selectEl) (selectEl as HTMLSelectElement).focus();
        break;
      }
    }
  }, [expanded, allKeyframes, selectedKeyframeId, animations, sectionDuration,
      activeSectionIndex, onUpdateAnimations, onSelectKeyframe, handleDeleteSelected, handleEasingChange, updateSelectedKeyframe]);

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
          {expanded ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
          Keyframes
          {animations.length > 0 && (
            <span className="text-neutral-500">({animations.reduce((n, a) => n + a.keyframes.length, 0)})</span>
          )}
        </button>
        <KeyframeInspector
          selectedKfInfo={selectedKfInfo}
          availableProperties={availableProperties}
          onEasingChange={handleEasingChange}
          onDeleteSelected={handleDeleteSelected}
          onAddTrack={handleAddTrack}
        />
      </div>

      {/* Tracks */}
      {expanded && (
        <div
          ref={trackRef}
          className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-inset"
          tabIndex={0}
          role="application"
          aria-label="Keyframe editor tracks"
          onKeyDown={handleKeyDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {animations.map(anim => (
            <KeyframeTrack
              key={anim.id}
              anim={anim}
              sectionWidth={sectionWidth}
              selectedKeyframeId={selectedKeyframeId}
              timeToX={timeToX}
              onDoubleClick={handleDoubleClick}
              onToggleTrack={handleToggleTrack}
              onPointerDown={handlePointerDown}
              onBezierHandleDown={handleBezierHandleDown}
            />
          ))}

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
