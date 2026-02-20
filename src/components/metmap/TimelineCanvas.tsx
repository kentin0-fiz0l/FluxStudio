/**
 * TimelineCanvas - Canvas-based timeline renderer for MetMap.
 *
 * Replaces the CSS bar-graph approach with a <canvas> element for
 * smooth zoom, pan, playback cursor animation, and future keyframe overlays.
 *
 * Renders (bottom to top):
 * 1. Background grid (bars, beats)
 * 2. Section color regions
 * 3. Tempo curve lines
 * 4. Beat detection markers (if available)
 * 5. Playback cursor
 */

import { useRef, useEffect, useCallback, memo } from 'react';
import type { Section, BeatMap } from '../../contexts/metmap/types';
import { getBeatsPerBar } from '../../contexts/metmap/types';
import { evaluateAt } from '../../services/keyframeEngine';
import type { MetMapPresence } from '../../services/metmapCollaboration';

// Color palette matching VisualTimeline's Tailwind colors
const SECTION_COLORS = [
  { fill: 'rgba(99, 102, 241, 0.5)', stroke: '#6366f1' },   // indigo
  { fill: 'rgba(16, 185, 129, 0.5)', stroke: '#10b981' },   // emerald
  { fill: 'rgba(245, 158, 11, 0.5)', stroke: '#f59e0b' },   // amber
  { fill: 'rgba(244, 63, 94, 0.5)',  stroke: '#f43f5e' },    // rose
  { fill: 'rgba(6, 182, 212, 0.5)',  stroke: '#06b6d4' },    // cyan
  { fill: 'rgba(168, 85, 247, 0.5)', stroke: '#a855f7' },    // purple
  { fill: 'rgba(249, 115, 22, 0.5)', stroke: '#f97316' },    // orange
  { fill: 'rgba(20, 184, 166, 0.5)', stroke: '#14b8a6' },    // teal
];

/** Canvas comment (Sprint 32) — rendered as pin markers. */
export interface CanvasCommentPin {
  id: string;
  color: string;
  barStart: number;
  barEnd?: number;
  resolved: boolean;
}

/** Helper: draw a rounded rectangle path. */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

interface TimelineCanvasProps {
  sections: Section[];
  currentBar: number;
  currentTimeSeconds: number;
  isPlaying: boolean;
  beatMap?: BeatMap | null;
  audioDuration?: number;
  loopSection?: number | null;
  /** Pixels per bar — controls horizontal zoom */
  pixelsPerBar?: number;
  height?: number;
  /** Selected keyframe ID for highlight */
  selectedKeyframeId?: string | null;
  onBarClick?: (bar: number) => void;
  onTimeClick?: (timeInSeconds: number) => void;
  /** Remote peers for ghost cursor rendering */
  remotePeers?: MetMapPresence[];
  /** Called on mouse-move over canvas with the current bar position */
  onCursorMove?: (bar: number) => void;
  /** Called when mouse leaves the canvas */
  onCursorLeave?: () => void;
  /** Comment pins to render on the canvas */
  comments?: CanvasCommentPin[];
  className?: string;
}

export const TimelineCanvas = memo(function TimelineCanvas({
  sections,
  currentBar,
  currentTimeSeconds: _currentTimeSeconds,
  isPlaying,
  beatMap,
  audioDuration,
  loopSection,
  pixelsPerBar = 40,
  height = 120,
  onBarClick,
  selectedKeyframeId,
  onTimeClick,
  remotePeers,
  onCursorMove,
  onCursorLeave,
  comments,
  className = '',
}: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0);
  const canvasWidth = Math.max(totalBars * pixelsPerBar, 300);

  // Compute tempo range for height mapping
  const { minTempo, maxTempo } = sections.reduce(
    (acc, s) => ({
      minTempo: Math.min(acc.minTempo, s.tempoStart, s.tempoEnd ?? s.tempoStart),
      maxTempo: Math.max(acc.maxTempo, s.tempoStart, s.tempoEnd ?? s.tempoStart),
    }),
    { minTempo: 300, maxTempo: 20 },
  );

  const tempoToY = useCallback((tempo: number) => {
    const range = maxTempo - minTempo;
    if (range === 0) return height * 0.5;
    const normalized = (tempo - minTempo) / range;
    return height - normalized * (height * 0.8) - height * 0.1;
  }, [minTempo, maxTempo, height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvasWidth, height);

    // --- Background ---
    ctx.fillStyle = 'rgba(23, 23, 23, 0.6)';
    ctx.fillRect(0, 0, canvasWidth, height);

    let barOffset = 0;

    // --- Section regions + grid ---
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const sectionWidth = section.bars * pixelsPerBar;
      const color = SECTION_COLORS[si % SECTION_COLORS.length];
      const isLooped = loopSection === si;

      // Section fill
      ctx.fillStyle = color.fill;
      ctx.fillRect(barOffset, 0, sectionWidth, height);

      // Loop highlight
      if (isLooped) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(barOffset + 1, 1, sectionWidth - 2, height - 2);
        ctx.setLineDash([]);
      }

      // Bar grid lines
      const beatsPerBar = getBeatsPerBar(section.timeSignature);
      for (let b = 0; b < section.bars; b++) {
        const x = barOffset + b * pixelsPerBar;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Beat subdivisions (lighter)
        for (let beat = 1; beat < beatsPerBar; beat++) {
          const bx = x + (beat / beatsPerBar) * pixelsPerBar;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.lineTo(bx, height);
          ctx.stroke();
        }
      }

      // Tempo curve
      const tempoStart = section.tempoStart;
      const tempoEnd = section.tempoEnd ?? tempoStart;
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barOffset, tempoToY(tempoStart));
      if (tempoEnd !== tempoStart) {
        // Draw curve with segments
        const steps = Math.max(section.bars * 4, 20);
        for (let step = 1; step <= steps; step++) {
          const progress = step / steps;
          let tempo: number;
          if (section.tempoCurve === 'exponential') {
            tempo = tempoStart * Math.pow(tempoEnd / tempoStart, progress);
          } else if (section.tempoCurve === 'step') {
            tempo = tempoStart;
          } else {
            tempo = tempoStart + (tempoEnd - tempoStart) * progress;
          }
          ctx.lineTo(barOffset + sectionWidth * progress, tempoToY(tempo));
        }
      } else {
        ctx.lineTo(barOffset + sectionWidth, tempoToY(tempoStart));
      }
      ctx.stroke();

      // Section label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(section.name, barOffset + 4, 14);

      // Tempo label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '9px system-ui, sans-serif';
      const tempoLabel = tempoEnd !== tempoStart
        ? `${tempoStart}→${tempoEnd}`
        : `${tempoStart} BPM`;
      ctx.fillText(tempoLabel, barOffset + 4, 26);

      barOffset += sectionWidth;
    }

    // --- Beat markers ---
    if (beatMap && audioDuration && audioDuration > 0) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 1;
      for (const beat of beatMap.beats) {
        const x = (beat / audioDuration) * canvasWidth;
        ctx.beginPath();
        ctx.moveTo(x, height - 6);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // --- Keyframe dots + interpolation curves ---
    const PROPERTY_COLORS: Record<string, string> = {
      tempo: '#818cf8',    // indigo-400
      volume: '#34d399',   // emerald-400
      pan: '#fbbf24',      // amber-400
      emphasis: '#fb7185', // rose-400
    };

    let kfBarOffset = 0;
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const sectionWidth = section.bars * pixelsPerBar;
      const animations = section.animations || [];

      for (const anim of animations) {
        if (!anim.enabled || anim.keyframes.length === 0) continue;
        const propColor = PROPERTY_COLORS[anim.property] || '#94a3b8';

        // Draw connecting lines between keyframes
        ctx.strokeStyle = propColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();

        for (let px = 0; px <= sectionWidth; px += 2) {
          const progress = px / sectionWidth;
          // Map section progress to keyframe time range
          const kfTime = progress * (anim.keyframes[anim.keyframes.length - 1]?.time ?? 1);
          const val = evaluateAt(anim, kfTime);
          if (val === undefined) continue;
          // Normalize value to [0,1] for Y mapping (use tempo range as reference)
          const normalized = maxTempo !== minTempo
            ? (val - minTempo) / (maxTempo - minTempo)
            : 0.5;
          const y = height - normalized * (height * 0.6) - height * 0.15;
          if (px === 0) ctx.moveTo(kfBarOffset + px, y);
          else ctx.lineTo(kfBarOffset + px, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Draw keyframe dots
        for (const kf of anim.keyframes) {
          const kfMaxTime = anim.keyframes[anim.keyframes.length - 1]?.time || 1;
          const xProgress = kfMaxTime > 0 ? kf.time / kfMaxTime : 0;
          const x = kfBarOffset + xProgress * sectionWidth;
          const normalized = maxTempo !== minTempo
            ? (kf.value - minTempo) / (maxTempo - minTempo)
            : 0.5;
          const y = height - normalized * (height * 0.6) - height * 0.15;
          const isSelected = kf.id === selectedKeyframeId;

          // Outer ring for selected
          if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Keyframe dot
          ctx.fillStyle = propColor;
          ctx.beginPath();
          ctx.arc(x, y, isSelected ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      kfBarOffset += sectionWidth;
    }

    // --- Comment pins (Sprint 32) ---
    if (comments && comments.length > 0) {
      for (const comment of comments) {
        if (comment.resolved) continue;
        const pinX = (comment.barStart - 1) * pixelsPerBar;

        // Bar range highlight
        if (comment.barEnd && comment.barEnd > comment.barStart) {
          const rangeWidth = (comment.barEnd - comment.barStart) * pixelsPerBar;
          ctx.fillStyle = `${comment.color}15`;
          ctx.fillRect(pinX, 0, rangeWidth, height);
        }

        // Pin circle
        ctx.fillStyle = comment.color;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(pinX + pixelsPerBar * 0.5, 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Pin stem
        ctx.strokeStyle = comment.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(pinX + pixelsPerBar * 0.5, 15);
        ctx.lineTo(pinX + pixelsPerBar * 0.5, height);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // --- Ghost cursors (remote peers, Sprint 32) ---
    if (remotePeers && remotePeers.length > 0) {
      for (const peer of remotePeers) {
        if (peer.cursorBar == null || peer.cursorBar < 1) continue;
        const ghostX = (peer.cursorBar - 1) * pixelsPerBar;

        // Semi-transparent vertical line
        ctx.strokeStyle = peer.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(ghostX, 0);
        ctx.lineTo(ghostX, height);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Name label pill
        const label = peer.username.split(' ')[0];
        ctx.font = '9px system-ui, sans-serif';
        const textWidth = ctx.measureText(label).width;
        const pillX = ghostX - textWidth / 2 - 4;
        const pillY = height - 18;

        ctx.fillStyle = peer.color;
        ctx.globalAlpha = 0.8;
        roundRect(ctx, pillX, pillY, textWidth + 8, 14, 3);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(label, ghostX, height - 8);
        ctx.textAlign = 'left';
      }
    }

    // --- Playback cursor (rendered on top of ghost cursors) ---
    if (isPlaying || currentBar > 1) {
      const cursorX = (currentBar - 1) * pixelsPerBar;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();

      // Cursor head triangle
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cursorX - 4, 0);
      ctx.lineTo(cursorX + 4, 0);
      ctx.lineTo(cursorX, 6);
      ctx.closePath();
      ctx.fill();
    }
  }, [sections, currentBar, isPlaying, beatMap, audioDuration, loopSection, pixelsPerBar, height, canvasWidth, tempoToY, selectedKeyframeId, minTempo, maxTempo, remotePeers, comments]);

  // Animate on playback
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        draw();
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    } else {
      draw();
    }
  }, [isPlaying, draw]);

  // Redraw on section/data changes
  useEffect(() => {
    draw();
  }, [draw]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const bar = Math.floor(x / pixelsPerBar) + 1;

    if (audioDuration && audioDuration > 0 && onTimeClick) {
      const time = (x / canvasWidth) * audioDuration;
      onTimeClick(time);
    } else if (onBarClick) {
      onBarClick(bar);
    }
  }, [pixelsPerBar, canvasWidth, audioDuration, onBarClick, onTimeClick]);

  // Handle mouse-move for ghost cursor broadcasting
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCursorMove) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const bar = Math.floor(x / pixelsPerBar) + 1;
    onCursorMove(bar);
  }, [pixelsPerBar, onCursorMove]);

  // Handle mouse-leave to clear ghost cursor
  const handleMouseLeave = useCallback(() => {
    onCursorLeave?.();
  }, [onCursorLeave]);

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto rounded-lg ${className}`}
      role="img"
      aria-label={`Timeline: ${totalBars} bars across ${sections.length} sections`}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
        style={{ display: 'block' }}
      />
    </div>
  );
});

export default TimelineCanvas;
