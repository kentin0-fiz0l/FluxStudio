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

// ---------------------------------------------------------------------------
// GIF Export (no external dependencies)
// ---------------------------------------------------------------------------

/** Quantize an RGBA ImageData to a 256-color palette using median cut. */
function quantizeFrame(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { indexedPixels: Uint8Array; palette: Uint8Array } {
  // Collect unique colors (sample for speed)
  const colorMap = new Map<number, [number, number, number, number]>();
  const step = Math.max(1, Math.floor((width * height) / 4096));
  for (let i = 0; i < data.length; i += 4 * step) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (!colorMap.has(key)) {
      colorMap.set(key, [data[i], data[i + 1], data[i + 2], 1]);
    } else {
      colorMap.get(key)![3]++;
    }
  }

  // Median cut into 256 buckets
  type ColorBox = { colors: [number, number, number, number][] };
  const boxes: ColorBox[] = [{ colors: Array.from(colorMap.values()) }];

  while (boxes.length < 256) {
    // Find box with largest range
    let bestIdx = 0;
    let bestRange = -1;
    for (let bi = 0; bi < boxes.length; bi++) {
      const box = boxes[bi];
      if (box.colors.length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let min = 255, max = 0;
        for (const c of box.colors) {
          if (c[ch] < min) min = c[ch];
          if (c[ch] > max) max = c[ch];
        }
        const range = max - min;
        if (range > bestRange) {
          bestRange = range;
          bestIdx = bi;
        }
      }
    }
    if (bestRange <= 0) break;

    const box = boxes[bestIdx];
    // Find channel with widest range
    let splitCh = 0, splitRange = 0;
    for (let ch = 0; ch < 3; ch++) {
      let min = 255, max = 0;
      for (const c of box.colors) {
        if (c[ch] < min) min = c[ch];
        if (c[ch] > max) max = c[ch];
      }
      if (max - min > splitRange) {
        splitRange = max - min;
        splitCh = ch;
      }
    }

    box.colors.sort((a, b) => a[splitCh] - b[splitCh]);
    const mid = Math.floor(box.colors.length / 2);
    boxes.splice(bestIdx, 1, { colors: box.colors.slice(0, mid) }, { colors: box.colors.slice(mid) });
  }

  // Build palette from box averages
  const palette = new Uint8Array(256 * 3);
  const paletteColors: [number, number, number][] = [];
  for (let bi = 0; bi < Math.min(boxes.length, 256); bi++) {
    const box = boxes[bi];
    let r = 0, g = 0, b = 0, total = 0;
    for (const c of box.colors) {
      r += c[0] * c[3];
      g += c[1] * c[3];
      b += c[2] * c[3];
      total += c[3];
    }
    const pr = total > 0 ? Math.round(r / total) : 0;
    const pg = total > 0 ? Math.round(g / total) : 0;
    const pb = total > 0 ? Math.round(b / total) : 0;
    palette[bi * 3] = pr;
    palette[bi * 3 + 1] = pg;
    palette[bi * 3 + 2] = pb;
    paletteColors.push([pr, pg, pb]);
  }

  // Map each pixel to nearest palette entry
  const pixelCount = width * height;
  const indexedPixels = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const off = i * 4;
    const pr = data[off], pg = data[off + 1], pb = data[off + 2];
    let bestDist = Infinity, bestPi = 0;
    for (let pi = 0; pi < paletteColors.length; pi++) {
      const [cr, cg, cb] = paletteColors[pi];
      const dist = (pr - cr) ** 2 + (pg - cg) ** 2 + (pb - cb) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestPi = pi;
        if (dist === 0) break;
      }
    }
    indexedPixels[i] = bestPi;
  }

  return { indexedPixels, palette };
}

/** LZW encoder for GIF. */
function lzwEncode(indexedPixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const output: number[] = [];

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxCode = 4096;

  // Use string-keyed map for the code table
  const codeTable = new Map<string, number>();
  function resetTable() {
    codeTable.clear();
    for (let i = 0; i < clearCode; i++) {
      codeTable.set(String(i), i);
    }
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  }

  // Bit packing
  let curByte = 0;
  let curBit = 0;
  const bytes: number[] = [];

  function writeBits(code: number, size: number) {
    curByte |= (code << curBit);
    curBit += size;
    while (curBit >= 8) {
      bytes.push(curByte & 0xff);
      curByte >>= 8;
      curBit -= 8;
    }
  }

  resetTable();
  writeBits(clearCode, codeSize);

  if (indexedPixels.length === 0) {
    writeBits(eoiCode, codeSize);
    if (curBit > 0) bytes.push(curByte & 0xff);
    // Pack into sub-blocks
    for (let i = 0; i < bytes.length; ) {
      const blockSize = Math.min(255, bytes.length - i);
      output.push(blockSize);
      for (let j = 0; j < blockSize; j++) output.push(bytes[i + j]);
      i += blockSize;
    }
    output.push(0);
    return new Uint8Array(output);
  }

  let current = String(indexedPixels[0]);

  for (let i = 1; i < indexedPixels.length; i++) {
    const pixel = indexedPixels[i];
    const combined = current + ',' + pixel;

    if (codeTable.has(combined)) {
      current = combined;
    } else {
      writeBits(codeTable.get(current)!, codeSize);

      if (nextCode < maxCode) {
        codeTable.set(combined, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        writeBits(clearCode, codeSize);
        resetTable();
      }

      current = String(pixel);
    }
  }

  writeBits(codeTable.get(current)!, codeSize);
  writeBits(eoiCode, codeSize);
  if (curBit > 0) bytes.push(curByte & 0xff);

  // Pack into sub-blocks (max 255 bytes each)
  for (let i = 0; i < bytes.length; ) {
    const blockSize = Math.min(255, bytes.length - i);
    output.push(blockSize);
    for (let j = 0; j < blockSize; j++) output.push(bytes[i + j]);
    i += blockSize;
  }
  output.push(0); // block terminator

  return new Uint8Array(output);
}

/** Encode frames into GIF89a binary. */
function encodeGif(
  frames: { indexedPixels: Uint8Array; palette: Uint8Array }[],
  width: number,
  height: number,
  delayCs: number, // delay in centiseconds
): Uint8Array {
  const parts: Uint8Array[] = [];

  function pushBytes(...bytes: number[]) {
    parts.push(new Uint8Array(bytes));
  }

  // Header
  parts.push(new TextEncoder().encode('GIF89a'));

  // Logical Screen Descriptor
  pushBytes(
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0xf7, // GCT flag, 8 bits color resolution, 256 colors (2^(7+1))
    0,    // background color index
    0,    // pixel aspect ratio
  );

  // Global Color Table (use first frame's palette)
  parts.push(frames[0].palette);

  // Netscape application extension for looping
  pushBytes(0x21, 0xff, 0x0b);
  parts.push(new TextEncoder().encode('NETSCAPE2.0'));
  pushBytes(0x03, 0x01, 0x00, 0x00, 0x00); // loop forever

  for (const frame of frames) {
    // Graphic Control Extension
    pushBytes(
      0x21, 0xf9, 0x04,
      0x00,          // no disposal, no transparency
      delayCs & 0xff, (delayCs >> 8) & 0xff,
      0x00,          // transparent color index (unused)
      0x00,          // block terminator
    );

    // Image Descriptor
    pushBytes(
      0x2c,
      0x00, 0x00, 0x00, 0x00, // left, top
      width & 0xff, (width >> 8) & 0xff,
      height & 0xff, (height >> 8) & 0xff,
      0x00, // no local color table
    );

    // LZW minimum code size
    const minCodeSize = 8;
    pushBytes(minCodeSize);

    // LZW compressed data
    parts.push(lzwEncode(frame.indexedPixels, minCodeSize));
  }

  // Trailer
  pushBytes(0x3b);

  // Concatenate
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/**
 * Export MetMap playback as an animated GIF.
 */
export async function exportMetMapGif(
  sections: Section[],
  beatMap?: BeatMap | null,
  audioDuration?: number | null,
  options: MetMapExportOptions = {},
  onProgress?: (progress: MetMapExportProgress) => void,
): Promise<Blob> {
  const width = options.width ?? 800;
  const height = options.height ?? 150;
  const fps = options.fps ?? 10; // lower fps for GIF

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

  // Phase 1: Render frames (0-60%)
  onProgress?.({ phase: 'rendering', percent: 0 });
  const rawFrames: ImageData[] = [];

  for (let i = 0; i < frameCount; i++) {
    const time = i / fps;
    const currentBar = timeToBars(sections, time);

    drawFrame(
      ctx, sections, currentBar,
      width, height, pixelsPerBar,
      beatMap ?? null, audioDuration ?? null,
      resolvedOptions,
    );

    rawFrames.push(ctx.getImageData(0, 0, width, height));

    if (i % 5 === 0) {
      onProgress?.({ phase: 'rendering', percent: Math.round((i / frameCount) * 60) });
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Phase 2: Quantize to 256 colors (60-80%)
  onProgress?.({ phase: 'encoding', percent: 60 });
  const quantizedFrames: { indexedPixels: Uint8Array; palette: Uint8Array }[] = [];

  for (let i = 0; i < rawFrames.length; i++) {
    const frame = rawFrames[i];
    quantizedFrames.push(quantizeFrame(frame.data, width, height));

    if (i % 5 === 0) {
      onProgress?.({ phase: 'encoding', percent: 60 + Math.round((i / rawFrames.length) * 20) });
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Phase 3: Encode GIF binary (80-100%)
  onProgress?.({ phase: 'encoding', percent: 80 });
  const delayCs = Math.round(100 / fps); // centiseconds per frame
  const gifData = encodeGif(quantizedFrames, width, height, delayCs);

  onProgress?.({ phase: 'done', percent: 100 });
  return new Blob([gifData.buffer as ArrayBuffer], { type: 'image/gif' });
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
