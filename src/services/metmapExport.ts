/**
 * MetMap Video Export Service
 *
 * Renders the MetMap timeline playback as a WebM video using
 * an offscreen canvas + MediaRecorder (following the formationExport.ts pattern).
 */

import type { Section, BeatMap } from '../contexts/metmap/types';
import { getBeatsPerBar } from '../contexts/metmap/types';
import { evaluateAt } from './keyframeEngine';

// Color palette matching TimelineCanvas
const SECTION_COLORS = [
  { fill: 'rgba(99, 102, 241, 0.5)', stroke: '#6366f1' },
  { fill: 'rgba(16, 185, 129, 0.5)', stroke: '#10b981' },
  { fill: 'rgba(245, 158, 11, 0.5)', stroke: '#f59e0b' },
  { fill: 'rgba(244, 63, 94, 0.5)', stroke: '#f43f5e' },
  { fill: 'rgba(6, 182, 212, 0.5)', stroke: '#06b6d4' },
  { fill: 'rgba(168, 85, 247, 0.5)', stroke: '#a855f7' },
  { fill: 'rgba(249, 115, 22, 0.5)', stroke: '#f97316' },
  { fill: 'rgba(20, 184, 166, 0.5)', stroke: '#14b8a6' },
];

const PROPERTY_COLORS: Record<string, string> = {
  tempo: '#818cf8',
  volume: '#34d399',
  pan: '#fbbf24',
  emphasis: '#fb7185',
};

export interface MetMapExportOptions {
  width?: number;
  height?: number;
  fps?: number;
  includeSectionLabels?: boolean;
  includeTempoCurve?: boolean;
  includeBeatMarkers?: boolean;
  includeKeyframes?: boolean;
}

export interface MetMapExportProgress {
  phase: 'rendering' | 'encoding' | 'done';
  percent: number;
}

/**
 * Compute total song duration in seconds from section definitions.
 */
function computeSongDuration(sections: Section[]): number {
  let total = 0;
  for (const section of sections) {
    const avgTempo = section.tempoEnd
      ? (section.tempoStart + section.tempoEnd) / 2
      : section.tempoStart;
    const bpb = getBeatsPerBar(section.timeSignature);
    const totalBeats = section.bars * bpb;
    total += (totalBeats / avgTempo) * 60;
  }
  return total;
}

/**
 * Map a time-in-seconds to a fractional bar position across all sections.
 */
function timeToBars(sections: Section[], timeSeconds: number): number {
  let elapsed = 0;
  let barOffset = 0;
  for (const section of sections) {
    const avgTempo = section.tempoEnd
      ? (section.tempoStart + section.tempoEnd) / 2
      : section.tempoStart;
    const bpb = getBeatsPerBar(section.timeSignature);
    const totalBeats = section.bars * bpb;
    const sectionDuration = (totalBeats / avgTempo) * 60;

    if (timeSeconds <= elapsed + sectionDuration) {
      const progress = (timeSeconds - elapsed) / sectionDuration;
      return barOffset + progress * section.bars;
    }
    elapsed += sectionDuration;
    barOffset += section.bars;
  }
  return barOffset; // past end
}

/**
 * Draw a single frame of the MetMap timeline at the given time position.
 */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  sections: Section[],
  currentBar: number,
  width: number,
  height: number,
  pixelsPerBar: number,
  beatMap: BeatMap | null,
  audioDuration: number | null,
  options: Required<Omit<MetMapExportOptions, 'width' | 'height' | 'fps'>>,
) {
  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0);
  const canvasWidth = totalBars * pixelsPerBar;

  // Compute tempo range
  let minTempo = 300, maxTempo = 20;
  for (const s of sections) {
    minTempo = Math.min(minTempo, s.tempoStart, s.tempoEnd ?? s.tempoStart);
    maxTempo = Math.max(maxTempo, s.tempoStart, s.tempoEnd ?? s.tempoStart);
  }

  const tempoToY = (tempo: number) => {
    const range = maxTempo - minTempo;
    if (range === 0) return height * 0.5;
    const normalized = (tempo - minTempo) / range;
    return height - normalized * (height * 0.8) - height * 0.1;
  };

  // Viewport offset: center the canvas on current bar position
  const cursorX = currentBar * pixelsPerBar;
  const viewportOffset = Math.max(0, Math.min(canvasWidth - width, cursorX - width / 2));

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = 'rgba(23, 23, 23, 0.95)';
  ctx.fillRect(0, 0, width, height);

  ctx.translate(-viewportOffset, 0);

  // Section regions + grid + tempo curves
  let barOffset = 0;
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const sectionWidth = section.bars * pixelsPerBar;
    const color = SECTION_COLORS[si % SECTION_COLORS.length];

    // Section fill
    ctx.fillStyle = color.fill;
    ctx.fillRect(barOffset, 0, sectionWidth, height);

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
    if (options.includeTempoCurve) {
      const tempoStart = section.tempoStart;
      const tempoEnd = section.tempoEnd ?? tempoStart;
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barOffset, tempoToY(tempoStart));
      if (tempoEnd !== tempoStart) {
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
    }

    // Section label
    if (options.includeSectionLabels) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(section.name, barOffset + 6, 18);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px system-ui, sans-serif';
      const tempoLabel = (section.tempoEnd && section.tempoEnd !== section.tempoStart)
        ? `${section.tempoStart}→${section.tempoEnd}`
        : `${section.tempoStart} BPM`;
      ctx.fillText(tempoLabel, barOffset + 6, 32);
    }

    barOffset += sectionWidth;
  }

  // Beat markers
  if (options.includeBeatMarkers && beatMap && audioDuration && audioDuration > 0) {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1;
    for (const beat of beatMap.beats) {
      const x = (beat / audioDuration) * canvasWidth;
      ctx.beginPath();
      ctx.moveTo(x, height - 8);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  // Keyframe interpolation curves + dots
  if (options.includeKeyframes) {
    let kfBarOffset = 0;
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const sectionWidth = section.bars * pixelsPerBar;
      const animations = section.animations || [];

      for (const anim of animations) {
        if (!anim.enabled || anim.keyframes.length === 0) continue;
        const propColor = PROPERTY_COLORS[anim.property] || '#94a3b8';

        ctx.strokeStyle = propColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        for (let px = 0; px <= sectionWidth; px += 2) {
          const progress = px / sectionWidth;
          const kfTime = progress * (anim.keyframes[anim.keyframes.length - 1]?.time ?? 1);
          const val = evaluateAt(anim, kfTime);
          if (val === undefined) continue;
          const normalized = maxTempo !== minTempo
            ? (val - minTempo) / (maxTempo - minTempo)
            : 0.5;
          const y = height - normalized * (height * 0.6) - height * 0.15;
          if (px === 0) ctx.moveTo(kfBarOffset + px, y);
          else ctx.lineTo(kfBarOffset + px, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        for (const kf of anim.keyframes) {
          const kfMaxTime = anim.keyframes[anim.keyframes.length - 1]?.time || 1;
          const xProgress = kfMaxTime > 0 ? kf.time / kfMaxTime : 0;
          const x = kfBarOffset + xProgress * sectionWidth;
          const normalized = maxTempo !== minTempo
            ? (kf.value - minTempo) / (maxTempo - minTempo)
            : 0.5;
          const y = height - normalized * (height * 0.6) - height * 0.15;
          ctx.fillStyle = propColor;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      kfBarOffset += sectionWidth;
    }
  }

  // Playback cursor
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cursorX, 0);
  ctx.lineTo(cursorX, height);
  ctx.stroke();

  // Cursor head triangle
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(cursorX - 5, 0);
  ctx.lineTo(cursorX + 5, 0);
  ctx.lineTo(cursorX, 8);
  ctx.closePath();
  ctx.fill();

  // Progress bar at bottom
  const totalBarsValue = sections.reduce((sum, s) => sum + s.bars, 0);
  const progress = totalBarsValue > 0 ? currentBar / totalBarsValue : 0;
  ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
  ctx.fillRect(0, height - 3, canvasWidth, 3);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, height - 3, canvasWidth * progress, 3);

  ctx.restore();
}

/**
 * Export MetMap playback as WebM video.
 */
export async function exportMetMapVideo(
  sections: Section[],
  beatMap?: BeatMap | null,
  audioDuration?: number | null,
  options: MetMapExportOptions = {},
  onProgress?: (progress: MetMapExportProgress) => void,
): Promise<Blob> {
  const width = options.width ?? 1280;
  const height = options.height ?? 200;
  const fps = options.fps ?? 30;

  const resolvedOptions = {
    includeSectionLabels: options.includeSectionLabels ?? true,
    includeTempoCurve: options.includeTempoCurve ?? true,
    includeBeatMarkers: options.includeBeatMarkers ?? true,
    includeKeyframes: options.includeKeyframes ?? true,
  };

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const duration = audioDuration || computeSongDuration(sections);
  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0);
  const pixelsPerBar = Math.max(40, width / totalBars);
  const frameCount = Math.ceil(duration * fps);

  // Pre-render all frames as ImageData
  onProgress?.({ phase: 'rendering', percent: 0 });
  const frames: ImageData[] = [];

  for (let i = 0; i < frameCount; i++) {
    const time = i / fps;
    const currentBar = timeToBars(sections, time);

    drawFrame(
      ctx, sections, currentBar,
      width, height, pixelsPerBar,
      beatMap ?? null, audioDuration ?? null,
      resolvedOptions,
    );

    frames.push(ctx.getImageData(0, 0, width, height));

    if (i % 10 === 0) {
      onProgress?.({ phase: 'rendering', percent: Math.round((i / frameCount) * 80) });
      // Yield to main thread
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Encode via MediaRecorder
  onProgress?.({ phase: 'encoding', percent: 80 });

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API not available in this browser');
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
  });

  const chunks: Blob[] = [];

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error('MediaRecorder error'));
    recorder.onstop = () => {
      onProgress?.({ phase: 'done', percent: 100 });
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    recorder.start();
    let frameIndex = 0;

    const renderFrame = () => {
      if (frameIndex < frames.length) {
        ctx.putImageData(frames[frameIndex], 0, 0);
        frameIndex++;
        if (frameIndex % 10 === 0) {
          onProgress?.({ phase: 'encoding', percent: 80 + Math.round((frameIndex / frames.length) * 20) });
        }
        requestAnimationFrame(renderFrame);
      } else {
        recorder.stop();
      }
    };
    renderFrame();
  });
}

/**
 * Trigger a browser download of the given blob.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
