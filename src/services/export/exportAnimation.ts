/**
 * Animation export functions: GIF and WebM video export.
 */

import type { Formation, FormationExportOptions, ExportProgress, Position } from '../formationTypes';
import { quantizeFrame, encodeGif } from '../gifEncoder';
import { formatTime } from './exportUtils';

interface FrameLayout {
  width: number;
  height: number;
  margin: number;
  scale: number;
  stageDrawWidth: number;
  stageDrawHeight: number;
  offsetX: number;
  offsetY: number;
  markerRadius: number;
}

function computeLayout(width: number, height: number, stageWidth: number, stageHeight: number): FrameLayout {
  const margin = Math.min(width, height) * 0.05;
  const contentWidth = width - margin * 2;
  const contentHeight = height - margin * 2;
  const scaleX = contentWidth / stageWidth;
  const scaleY = contentHeight / stageHeight;
  const scale = Math.min(scaleX, scaleY);
  const stageDrawWidth = stageWidth * scale;
  const stageDrawHeight = stageHeight * scale;
  return {
    width, height, margin, scale,
    stageDrawWidth, stageDrawHeight,
    offsetX: margin + (contentWidth - stageDrawWidth) / 2,
    offsetY: margin + (contentHeight - stageDrawHeight) / 2,
    markerRadius: Math.min(stageDrawWidth, stageDrawHeight) * 0.02,
  };
}

function drawFormationFrame(
  ctx: CanvasRenderingContext2D,
  formation: Formation,
  positions: Map<string, Position>,
  time: number,
  duration: number,
  layout: FrameLayout,
  options: FormationExportOptions,
) {
  const { width, height, margin, scale, stageDrawWidth, stageDrawHeight, offsetX, offsetY, markerRadius } = layout;
  const { stageWidth, stageHeight, gridSize, performers } = formation;

  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
  ctx.fillRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);
  ctx.strokeRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);

  if (options.includeFieldOverlay) {
    ctx.strokeStyle = 'rgba(180, 200, 180, 0.6)'; ctx.lineWidth = 1;
    for (let yard = 0; yard <= 10; yard++) {
      const yardX = offsetX + (yard / 10) * stageDrawWidth;
      ctx.beginPath(); ctx.moveTo(yardX, offsetY); ctx.lineTo(yardX, offsetY + stageDrawHeight); ctx.stroke();
      const yardNum = yard <= 5 ? yard * 10 : (10 - yard) * 10;
      if (yardNum > 0) {
        ctx.fillStyle = 'rgba(150, 180, 150, 0.8)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(String(yardNum), yardX + 2, offsetY + stageDrawHeight - 4);
      }
    }
    ctx.lineWidth = 0.5;
    const hashY1 = offsetY + stageDrawHeight * 0.35;
    const hashY2 = offsetY + stageDrawHeight * 0.65;
    for (let yard = 0; yard <= 100; yard += 5) {
      const hx = offsetX + (yard / 100) * stageDrawWidth;
      ctx.beginPath(); ctx.moveTo(hx - 2, hashY1); ctx.lineTo(hx + 2, hashY1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - 2, hashY2); ctx.lineTo(hx + 2, hashY2); ctx.stroke();
    }
  }

  if (options.includeGrid) {
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.5;
    for (let x = 0; x <= stageWidth; x += gridSize) {
      const lineX = offsetX + x * scale;
      ctx.beginPath(); ctx.moveTo(lineX, offsetY); ctx.lineTo(lineX, offsetY + stageDrawHeight); ctx.stroke();
    }
    for (let y = 0; y <= stageHeight; y += gridSize) {
      const lineY = offsetY + y * scale;
      ctx.beginPath(); ctx.moveTo(offsetX, lineY); ctx.lineTo(offsetX + stageDrawWidth, lineY); ctx.stroke();
    }
  }

  for (const performer of performers) {
    const pos = positions.get(performer.id);
    if (!pos) continue;
    const cx = offsetX + (pos.x / 100) * stageDrawWidth;
    const cy = offsetY + (pos.y / 100) * stageDrawHeight;
    ctx.fillStyle = performer.color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (options.includeLabels) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, markerRadius * 0.8)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(performer.label, cx, cy);
    }
  }

  if (options.includeTimestamps) {
    ctx.fillStyle = '#1f2937'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(formatTime(time), width - margin, margin / 2);
  }

  const progress = duration > 0 ? time / duration : 0;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
  ctx.fillRect(0, height - 4, width, 4);
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(0, height - 4, width * progress, 4);
}

async function encodeAsWebM(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  formation: Formation,
  options: FormationExportOptions,
  layout: FrameLayout,
  getPositionsAtTime: (formationId: string, time: number) => Map<string, Position>,
  duration: number,
  fps: number,
  onProgress?: (progress: ExportProgress) => void,
): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API not available in this browser');
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  const chunks: Blob[] = [];
  const frameCount = Math.ceil((duration / 1000) * fps);
  const frameDuration = 1000 / fps;

  onProgress?.({ phase: 'rendering', percent: 0 });

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onerror = () => reject(new Error('MediaRecorder error'));
    recorder.onstop = () => {
      onProgress?.({ phase: 'done', percent: 100 });
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    recorder.start();
    let frameIndex = 0;

    const renderNext = () => {
      if (frameIndex >= frameCount) { recorder.stop(); return; }
      const time = frameIndex * frameDuration;
      const positions = getPositionsAtTime(formation.id, time);
      drawFormationFrame(ctx, formation, positions, time, duration, layout, options);
      frameIndex++;
      if (frameIndex % 10 === 0) {
        onProgress?.({ phase: 'rendering', percent: Math.round((frameIndex / frameCount) * 95) });
      }
      setTimeout(renderNext, 1000 / fps);
    };
    renderNext();
  });
}

async function encodeAsGif(
  ctx: CanvasRenderingContext2D,
  formation: Formation,
  options: FormationExportOptions,
  layout: FrameLayout,
  getPositionsAtTime: (formationId: string, time: number) => Map<string, Position>,
  duration: number,
  fps: number,
  onProgress?: (progress: ExportProgress) => void,
): Promise<Blob> {
  const { width, height } = layout;
  const frameCount = Math.ceil((duration / 1000) * fps);
  const frameDuration = 1000 / fps;

  onProgress?.({ phase: 'rendering', percent: 0 });
  const quantizedFrames: { indexedPixels: Uint8Array; palette: Uint8Array }[] = [];

  for (let i = 0; i < frameCount; i++) {
    const time = i * frameDuration;
    const positions = getPositionsAtTime(formation.id, time);
    drawFormationFrame(ctx, formation, positions, time, duration, layout, options);

    const imageData = ctx.getImageData(0, 0, width, height);
    quantizedFrames.push(quantizeFrame(imageData.data, width, height));

    if (i % 5 === 0) {
      onProgress?.({ phase: 'rendering', percent: Math.round((i / frameCount) * 80) });
      await new Promise(r => setTimeout(r, 0));
    }
  }

  onProgress?.({ phase: 'encoding', percent: 80 });
  const delayCs = Math.round(100 / fps);
  const gifData = encodeGif(quantizedFrames, width, height, delayCs);

  onProgress?.({ phase: 'done', percent: 100 });
  return new Blob([gifData.buffer as ArrayBuffer], { type: 'image/gif' });
}

export async function exportToAnimation(
  formation: Formation,
  options: FormationExportOptions,
  getPositionsAtTime: (formationId: string, time: number) => Map<string, Position>,
  getFormationDuration: (formationId: string) => number
): Promise<Blob> {
  const { stageWidth, stageHeight, keyframes } = formation;
  const width = options.resolution?.width ?? 1280;
  const height = options.resolution?.height ?? 720;
  const fps = options.fps ?? 30;

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const layout = computeLayout(width, height, stageWidth, stageHeight);
  const duration = getFormationDuration(formation.id) ||
    (keyframes.length > 0 ? keyframes[keyframes.length - 1].timestamp + 1000 : 5000);

  if (options.format === 'gif') {
    return encodeAsGif(ctx, formation, options, layout, getPositionsAtTime, duration, fps, options.onProgress);
  }
  return encodeAsWebM(canvas, ctx, formation, options, layout, getPositionsAtTime, duration, fps, options.onProgress);
}
