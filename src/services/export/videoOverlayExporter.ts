/**
 * Video Overlay Exporter - FluxStudio
 *
 * Exports formation animation as a transparent video overlay (WebM).
 * Uses the browser's MediaRecorder API with canvas.captureStream()
 * to encode frames in real-time.
 */

import type {
  Formation,
  DrillSet,
  Position,
} from '../formationTypes';
import { hexToRgb } from './exportUtils';

// ============================================================================
// Types
// ============================================================================

export interface VideoOverlayOptions {
  width: number;
  height: number;
  fps: number;
  performerStyle: 'dots' | 'numbers' | 'icons';
  showTrails: boolean;
  showGrid: boolean;
  transparent: boolean;
}

// ============================================================================
// Position interpolation
// ============================================================================

/**
 * Compute interpolated performer positions at a given frame time (in seconds).
 * Walks through sorted sets by cumulative counts to find the current transition,
 * then linearly interpolates between the two keyframe positions.
 */
export function interpolatePositions(
  formation: Formation,
  sets: DrillSet[],
  frameTimeSec: number,
  bpm: number,
): Map<string, Position> {
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);
  const secPerCount = 60 / bpm;
  const result = new Map<string, Position>();

  if (sortedSets.length === 0) return result;

  // Build cumulative time boundaries for each set
  const setTimings: Array<{ set: DrillSet; startSec: number; endSec: number }> = [];
  let cumSec = 0;
  for (const set of sortedSets) {
    const durationSec = set.counts * secPerCount;
    setTimings.push({ set, startSec: cumSec, endSec: cumSec + durationSec });
    cumSec += durationSec;
  }

  // If before first set or at start, return first keyframe positions
  if (frameTimeSec <= 0) {
    const firstKf = formation.keyframes.find((k) => k.id === sortedSets[0].keyframeId);
    return firstKf?.positions ?? result;
  }

  // If past the last set, return last keyframe positions
  if (frameTimeSec >= cumSec) {
    const lastKf = formation.keyframes.find(
      (k) => k.id === sortedSets[sortedSets.length - 1].keyframeId,
    );
    return lastKf?.positions ?? result;
  }

  // Find which transition we're in
  for (let i = 0; i < setTimings.length - 1; i++) {
    const current = setTimings[i];
    const next = setTimings[i + 1];

    if (frameTimeSec >= current.startSec && frameTimeSec < next.startSec) {
      const t =
        current.endSec > current.startSec
          ? (frameTimeSec - current.startSec) / (current.endSec - current.startSec)
          : 0;
      const clampedT = Math.max(0, Math.min(1, t));

      const currentKf = formation.keyframes.find((k) => k.id === current.set.keyframeId);
      const nextKf = formation.keyframes.find((k) => k.id === next.set.keyframeId);

      if (!currentKf || !nextKf) return currentKf?.positions ?? result;

      for (const performer of formation.performers) {
        const fromPos = currentKf.positions.get(performer.id);
        const toPos = nextKf.positions.get(performer.id);

        if (fromPos && toPos) {
          result.set(performer.id, {
            x: fromPos.x + (toPos.x - fromPos.x) * clampedT,
            y: fromPos.y + (toPos.y - fromPos.y) * clampedT,
            rotation: fromPos.rotation,
          });
        } else if (fromPos) {
          result.set(performer.id, fromPos);
        }
      }
      return result;
    }
  }

  // Fallback: return last keyframe
  const lastKf = formation.keyframes.find(
    (k) => k.id === sortedSets[sortedSets.length - 1].keyframeId,
  );
  return lastKf?.positions ?? result;
}

// ============================================================================
// Frame rendering
// ============================================================================

interface TrailEntry {
  positions: Map<string, Position>;
}

function drawOverlayFrame(
  ctx: CanvasRenderingContext2D,
  formation: Formation,
  positions: Map<string, Position>,
  options: VideoOverlayOptions,
  trailHistory: TrailEntry[],
): void {
  const { width, height } = options;

  // Clear with transparency or solid background
  ctx.clearRect(0, 0, width, height);
  if (!options.transparent) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  // Field margins
  const marginX = width * 0.03;
  const marginY = height * 0.03;
  const fieldW = width - marginX * 2;
  const fieldH = height - marginY * 2;

  // Grid overlay
  if (options.showGrid) {
    ctx.strokeStyle = options.transparent
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    // Vertical yard lines (11 lines for 0..100)
    for (let i = 0; i <= 10; i++) {
      const lx = marginX + (i / 10) * fieldW;
      ctx.beginPath();
      ctx.moveTo(lx, marginY);
      ctx.lineTo(lx, marginY + fieldH);
      ctx.stroke();
    }
    // Horizontal hash marks
    const hashY1 = marginY + fieldH * 0.37;
    const hashY2 = marginY + fieldH * 0.63;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 20; i++) {
      const hx = marginX + (i / 20) * fieldW;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hashY1);
      ctx.lineTo(hx + 3, hashY1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx - 3, hashY2);
      ctx.lineTo(hx + 3, hashY2);
      ctx.stroke();
    }
  }

  // Trails (fading dots from previous frames)
  if (options.showTrails && trailHistory.length > 1) {
    const maxTrail = Math.min(trailHistory.length, 10);
    for (let ti = 0; ti < maxTrail; ti++) {
      const trail = trailHistory[trailHistory.length - 1 - ti];
      const alpha = 0.4 * (1 - ti / maxTrail);

      for (const performer of formation.performers) {
        const pos = trail.positions.get(performer.id);
        if (!pos) continue;

        const cx = marginX + (pos.x / 100) * fieldW;
        const cy = marginY + (pos.y / 100) * fieldH;
        const rgb = hexToRgb(performer.color);

        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw performers at current positions
  const markerRadius = Math.max(6, Math.min(width, height) * 0.012);

  for (const performer of formation.performers) {
    const pos = positions.get(performer.id);
    if (!pos) continue;

    const cx = marginX + (pos.x / 100) * fieldW;
    const cy = marginY + (pos.y / 100) * fieldH;
    const rgb = hexToRgb(performer.color);

    switch (options.performerStyle) {
      case 'numbers': {
        // Filled circle with number label
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
        ctx.beginPath();
        ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, markerRadius * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(performer.label, cx, cy);
        break;
      }

      case 'icons': {
        // Shape based on performer's symbolShape
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        drawPerformerIcon(ctx, cx, cy, markerRadius, performer.symbolShape ?? 'circle');
        break;
      }

      case 'dots':
      default: {
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
        ctx.beginPath();
        ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
    }
  }
}

function drawPerformerIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: string,
): void {
  ctx.beginPath();
  switch (shape) {
    case 'square':
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 'diamond':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      break;
    case 'triangle':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y + size * 0.7);
      ctx.lineTo(x - size, y + size * 0.7);
      ctx.closePath();
      break;
    case 'circle':
    default:
      ctx.arc(x, y, size, 0, Math.PI * 2);
      break;
  }
  ctx.fill();
  ctx.stroke();
}

// ============================================================================
// Export function
// ============================================================================

export async function exportVideoOverlay(
  formation: Formation,
  sets: DrillSet[],
  options: VideoOverlayOptions,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API is not available in this browser');
  }

  const { width, height, fps } = options;
  const bpm = formation.drillSettings?.bpm ?? 120;
  const secPerCount = 60 / bpm;
  const sortedSets = [...sets].sort((a, b) => a.sortOrder - b.sortOrder);

  // Calculate total duration from set counts
  const totalCounts = sortedSets.reduce((sum, s) => sum + s.counts, 0);
  const totalDurationSec = totalCounts * secPerCount;
  const totalFrames = Math.ceil(totalDurationSec * fps);
  const frameDurationSec = 1 / fps;

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: options.transparent });
  if (!ctx) throw new Error('Could not create canvas 2D context');

  // Set up MediaRecorder
  const mimeType = options.transparent
    ? 'video/webm;codecs=vp9'
    : 'video/webm;codecs=vp8';
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
  });

  const chunks: Blob[] = [];
  const trailHistory: TrailEntry[] = [];
  const maxTrailLength = options.showTrails ? 10 : 0;

  onProgress?.(0);

  return new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error('MediaRecorder encoding error'));
    recorder.onstop = () => {
      onProgress?.(100);
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    recorder.start();
    let frameIndex = 0;

    const renderNextFrame = () => {
      if (frameIndex >= totalFrames) {
        recorder.stop();
        return;
      }

      const frameTimeSec = frameIndex * frameDurationSec;
      const positions = interpolatePositions(formation, sets, frameTimeSec, bpm);

      // Maintain trail history
      if (maxTrailLength > 0) {
        trailHistory.push({ positions: new Map(positions) });
        if (trailHistory.length > maxTrailLength) {
          trailHistory.shift();
        }
      }

      drawOverlayFrame(ctx, formation, positions, options, trailHistory);

      frameIndex++;
      if (frameIndex % 10 === 0) {
        onProgress?.(Math.round((frameIndex / totalFrames) * 95));
      }

      // Use setTimeout to avoid blocking the main thread
      setTimeout(renderNextFrame, 1000 / fps);
    };

    renderNextFrame();
  });
}
