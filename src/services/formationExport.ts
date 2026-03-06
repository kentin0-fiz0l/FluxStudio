/**
 * Formation Export Utilities
 * Extracted from formationService.ts - handles PDF, image, SVG, and animation export
 */

import type { Formation, FormationExportOptions, ExportProgress, Position, DrillSet, FieldConfig, CoordinateEntry, Performer } from './formationTypes';
import { quantizeFrame, encodeGif } from './gifEncoder';
import { generateCoordinateSheet, generateDrillBookPages } from './coordinateSheetGenerator';
import { NCAA_FOOTBALL_FIELD } from './fieldConfigService';

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const remainingMs = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 100, g: 100, b: 100 };
}

export async function exportToPdf(
  formation: Formation,
  options: FormationExportOptions
): Promise<Blob> {
  const { stageWidth, stageHeight, gridSize, performers, keyframes, name, description } = formation;
  const paperSize = options.paperSize ?? 'letter';
  const orientation = options.orientation ?? 'landscape';

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation, unit: 'mm', format: paperSize });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2 - 30;

  const scaleX = contentWidth / stageWidth;
  const scaleY = contentHeight / stageHeight;
  const scale = Math.min(scaleX, scaleY);

  const stageDrawWidth = stageWidth * scale;
  const stageDrawHeight = stageHeight * scale;
  const offsetX = margin + (contentWidth - stageDrawWidth) / 2;
  const offsetY = margin + 25 + (contentHeight - stageDrawHeight) / 2;

  for (let i = 0; i < keyframes.length; i++) {
    if (i > 0) doc.addPage();
    const keyframe = keyframes[i];

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(name, margin, margin + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (description) doc.text(description, margin, margin + 12);

    const timeStr = formatTime(keyframe.timestamp);
    doc.text(`Keyframe ${i + 1} of ${keyframes.length} - ${timeStr}`, margin, margin + 19);

    if (options.includeTimestamps) {
      doc.setFontSize(8);
      doc.text(timeStr, pageWidth - margin - 15, margin + 5);
    }

    // Page number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i + 1} of ${keyframes.length}`, pageWidth - margin, pageHeight - margin + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Count annotation (for drill charts)
    if (i > 0) {
      const prevTimestamp = keyframes[i - 1].timestamp;
      const countDuration = keyframe.timestamp - prevTimestamp;
      const counts = Math.round(countDuration / 500); // ~120 BPM → 1 count per 500ms
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(`${counts} counts from prev`, pageWidth - margin - 15, margin + 12);
      doc.setTextColor(0, 0, 0);
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(200, 200, 200);
    doc.rect(offsetX, offsetY, stageDrawWidth, stageDrawHeight, 'FD');

    // Field overlay (yard lines)
    if (options.includeFieldOverlay) {
      doc.setDrawColor(180, 200, 180);
      doc.setLineWidth(0.3);
      // Draw 11 yard lines (0 to 100 yards, every 10)
      for (let yard = 0; yard <= 10; yard++) {
        const yardX = offsetX + (yard / 10) * stageDrawWidth;
        doc.line(yardX, offsetY, yardX, offsetY + stageDrawHeight);
        // Yard number labels
        const yardNum = yard <= 5 ? yard * 10 : (10 - yard) * 10;
        if (yardNum > 0) {
          doc.setFontSize(6);
          doc.setTextColor(150, 180, 150);
          doc.text(String(yardNum), yardX + 1, offsetY + stageDrawHeight - 1);
          doc.setTextColor(0, 0, 0);
        }
      }
      // Hash marks (two horizontal lines at ~1/3 and 2/3 height)
      doc.setLineWidth(0.15);
      const hashY1 = offsetY + stageDrawHeight * 0.35;
      const hashY2 = offsetY + stageDrawHeight * 0.65;
      for (let yard = 0; yard <= 100; yard += 5) {
        const hx = offsetX + (yard / 100) * stageDrawWidth;
        doc.line(hx - 1, hashY1, hx + 1, hashY1);
        doc.line(hx - 1, hashY2, hx + 1, hashY2);
      }
    }

    if (options.includeGrid) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      for (let x = 0; x <= stageWidth; x += gridSize) {
        const lineX = offsetX + x * scale;
        doc.line(lineX, offsetY, lineX, offsetY + stageDrawHeight);
      }
      for (let y = 0; y <= stageHeight; y += gridSize) {
        const lineY = offsetY + y * scale;
        doc.line(offsetX, lineY, offsetX + stageDrawWidth, lineY);
      }
    }

    const positions = keyframe.positions;
    for (const performer of performers) {
      const pos = positions.get(performer.id);
      if (!pos) continue;

      const cx = offsetX + (pos.x / 100) * stageDrawWidth;
      const cy = offsetY + (pos.y / 100) * stageDrawHeight;
      const radius = 3;

      const color = hexToRgb(performer.color);
      doc.setFillColor(color.r, color.g, color.b);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.circle(cx, cy, radius, 'FD');

      if (pos.rotation !== undefined && pos.rotation !== 0) {
        const angle = (pos.rotation * Math.PI) / 180;
        const arrowLength = radius + 2;
        doc.setDrawColor(color.r, color.g, color.b);
        doc.setLineWidth(0.8);
        doc.line(cx, cy, cx + Math.cos(angle) * arrowLength, cy + Math.sin(angle) * arrowLength);
      }

      if (options.includeLabels) {
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text(performer.label, cx, cy + 1.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
    }

    doc.setFontSize(8);
    let legendX = margin;
    const legendY = pageHeight - margin;
    for (const performer of performers.slice(0, 10)) {
      const color = hexToRgb(performer.color);
      doc.setFillColor(color.r, color.g, color.b);
      doc.circle(legendX + 2, legendY - 2, 2, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(`${performer.label}: ${performer.name}`, legendX + 6, legendY - 0.5);
      legendX += 40;
      if (legendX > pageWidth - margin - 40) break;
    }
    if (performers.length > 10) {
      doc.text(`... and ${performers.length - 10} more`, legendX + 6, legendY - 0.5);
    }
  }

  return doc.output('blob');
}

export async function exportToImage(
  formation: Formation,
  options: FormationExportOptions
): Promise<Blob> {
  const { stageWidth, stageHeight, gridSize, performers, keyframes } = formation;
  const width = options.resolution?.width ?? 1920;
  const height = options.resolution?.height ?? 1080;
  const quality = (options.quality ?? 90) / 100;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  const margin = Math.min(width, height) * 0.05;
  const contentWidth = width - margin * 2;
  const contentHeight = height - margin * 2;
  const scaleX = contentWidth / stageWidth;
  const scaleY = contentHeight / stageHeight;
  const scale = Math.min(scaleX, scaleY);
  const stageDrawWidth = stageWidth * scale;
  const stageDrawHeight = stageHeight * scale;
  const offsetX = margin + (contentWidth - stageDrawWidth) / 2;
  const offsetY = margin + (contentHeight - stageDrawHeight) / 2;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.fillRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);
  ctx.strokeRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);

  if (options.includeGrid) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= stageWidth; x += gridSize) {
      const lineX = offsetX + x * scale;
      ctx.beginPath(); ctx.moveTo(lineX, offsetY); ctx.lineTo(lineX, offsetY + stageDrawHeight); ctx.stroke();
    }
    for (let y = 0; y <= stageHeight; y += gridSize) {
      const lineY = offsetY + y * scale;
      ctx.beginPath(); ctx.moveTo(offsetX, lineY); ctx.lineTo(offsetX + stageDrawWidth, lineY); ctx.stroke();
    }
  }

  const positions = keyframes[0]?.positions ?? new Map();
  const markerRadius = Math.min(stageDrawWidth, stageDrawHeight) * 0.02;
  for (const performer of performers) {
    const pos = positions.get(performer.id);
    if (!pos) continue;
    const cx = offsetX + (pos.x / 100) * stageDrawWidth;
    const cy = offsetY + (pos.y / 100) * stageDrawHeight;

    ctx.fillStyle = performer.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    if (pos.rotation !== undefined && pos.rotation !== 0) {
      const angle = (pos.rotation * Math.PI) / 180;
      ctx.strokeStyle = performer.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * (markerRadius + 5), cy + Math.sin(angle) * (markerRadius + 5)); ctx.stroke();
    }

    if (options.includeLabels) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(10, markerRadius * 0.8)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(performer.label, cx, cy);
    }
  }

  if (options.includeTimestamps && keyframes.length > 0) {
    ctx.fillStyle = '#1f2937'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(formation.name, margin, margin / 2);
    ctx.font = '16px sans-serif';
    ctx.fillText(formatTime(keyframes[0].timestamp), margin, margin / 2 + 30);
  }

  return new Promise((resolve, reject) => {
    const mimeType = options.format === 'png' ? 'image/png' : 'image/jpeg';
    canvas.toBlob((blob) => {
      if (blob) { resolve(blob); } else { reject(new Error('Failed to create image blob')); }
    }, mimeType, quality);
  });
}

export async function exportToSvg(
  formation: Formation,
  options: FormationExportOptions
): Promise<Blob> {
  const { stageWidth, stageHeight, gridSize, performers, keyframes } = formation;
  const scale = 10;
  const width = stageWidth * scale;
  const height = stageHeight * scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#f8fafc"/>`;

  if (options.includeGrid) {
    svg += '<g stroke="#e2e8f0" stroke-width="0.5">';
    for (let x = 0; x <= stageWidth; x += gridSize) svg += `<line x1="${x * scale}" y1="0" x2="${x * scale}" y2="${height}"/>`;
    for (let y = 0; y <= stageHeight; y += gridSize) svg += `<line x1="0" y1="${y * scale}" x2="${width}" y2="${y * scale}"/>`;
    svg += '</g>';
  }

  const positions = keyframes[0]?.positions ?? new Map();
  for (const performer of performers) {
    const pos = positions.get(performer.id);
    if (pos) {
      const cx = (pos.x / 100) * width;
      const cy = (pos.y / 100) * height;
      svg += `<circle cx="${cx}" cy="${cy}" r="8" fill="${performer.color}"/>`;
      if (options.includeLabels) svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" fill="white">${performer.label}</text>`;
    }
  }

  svg += '</svg>';
  return new Blob([svg], { type: 'image/svg+xml' });
}

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

// ============================================================================
// DRILL BOOK & COORDINATE SHEET PDF EXPORT
// ============================================================================

/**
 * Export a coordinate sheet PDF for a single performer.
 */
export async function exportToCoordinateSheetPdf(
  formation: Formation,
  performerId: string,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
): Promise<Blob> {
  const performer = formation.performers.find((p) => p.id === performerId);
  if (!performer) throw new Error(`Performer ${performerId} not found`);

  const entries = generateCoordinateSheet(formation, performerId, sets, fieldConfig);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formation.name, margin, margin + 5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${performer.name}${performer.drillNumber ? ` (${performer.drillNumber})` : ''}`, margin, margin + 12);
  if (performer.instrument || performer.section) {
    doc.setFontSize(9);
    doc.text(
      [performer.section, performer.instrument].filter(Boolean).join(' - '),
      margin,
      margin + 18,
    );
  }

  // Table header
  let y = margin + 26;
  const colWidths = [22, 16, 42, 42, 28, 28];
  const headers = ['Set', 'Cts', 'Side-to-Side', 'Front-to-Back', 'Step Size', 'Direction'];

  doc.setFillColor(240, 240, 245);
  doc.rect(margin, y - 4, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  let xOff = margin;
  for (let c = 0; c < headers.length; c++) {
    doc.text(headers[c], xOff + 1, y);
    xOff += colWidths[c];
  }
  y += 6;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  for (const entry of entries) {
    if (y > 260) {
      doc.addPage();
      y = margin + 10;
    }

    // Alternating row background
    if (entries.indexOf(entry) % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 3.5, contentWidth, 5.5, 'F');
    }

    xOff = margin;
    const row = [
      entry.set.name,
      String(entry.set.counts),
      entry.coordinateDetails.sideToSide,
      entry.coordinateDetails.frontToBack,
      entry.stepToNext?.stepSizeLabel ?? '-',
      entry.stepToNext?.directionLabel ?? '-',
    ];

    for (let c = 0; c < row.length; c++) {
      doc.text(row[c], xOff + 1, y, { maxWidth: colWidths[c] - 2 });
      xOff += colWidths[c];
    }
    y += 5.5;
  }

  return doc.output('blob');
}

/**
 * Export a full drill book PDF for a single performer.
 * Includes: cover page, field chart per set, coordinate sheet, step size summary.
 */
export async function exportToDrillBookPdf(
  formation: Formation,
  performerId: string,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
): Promise<Blob> {
  const pages = generateDrillBookPages(formation, performerId, sets, fieldConfig);
  if (pages.length === 0) throw new Error('No pages generated for drill book');

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage();
    const page = pages[i];

    switch (page.type) {
      case 'cover': {
        const d = page.data as { showName: string; performerName: string; drillNumber: string; instrument?: string; section?: string; totalSets: number };
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text(d.showName, pageWidth / 2, pageHeight / 3, { align: 'center' });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'normal');
        doc.text(d.performerName, pageWidth / 2, pageHeight / 3 + 16, { align: 'center' });

        doc.setFontSize(14);
        doc.text(`Drill #${d.drillNumber}`, pageWidth / 2, pageHeight / 3 + 28, { align: 'center' });

        if (d.section || d.instrument) {
          doc.setFontSize(12);
          doc.text(
            [d.section, d.instrument].filter(Boolean).join(' - '),
            pageWidth / 2,
            pageHeight / 3 + 38,
            { align: 'center' },
          );
        }

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`${d.totalSets} Sets`, pageWidth / 2, pageHeight / 3 + 50, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        break;
      }

      case 'chart': {
        const d = page.data as { positions: Record<string, Position>; highlightPerformerId: string; set: DrillSet; fieldConfig: FieldConfig };
        // Header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${d.set.name} — ${d.set.counts} counts`, margin, margin + 5);
        if (d.set.rehearsalMark) {
          doc.setFont('helvetica', 'normal');
          doc.text(`[${d.set.rehearsalMark}]`, margin + 80, margin + 5);
        }

        // Draw field
        const chartW = pageWidth - margin * 2;
        const chartH = pageHeight - margin * 2 - 20;
        const chartY = margin + 12;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, chartY, chartW, chartH, 'FD');

        // Draw performers
        const positions = d.positions;
        for (const performer of formation.performers) {
          const pos = positions[performer.id];
          if (!pos) continue;

          const cx = margin + (pos.x / 100) * chartW;
          const cy = chartY + (pos.y / 100) * chartH;
          const isHighlighted = performer.id === d.highlightPerformerId;
          const radius = isHighlighted ? 4 : 2.5;

          if (isHighlighted) {
            // Draw highlight ring
            doc.setDrawColor(255, 0, 0);
            doc.setLineWidth(1);
            doc.circle(cx, cy, radius + 2, 'S');
          }

          const color = hexToRgb(performer.color);
          doc.setFillColor(color.r, color.g, color.b);
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.5);
          doc.circle(cx, cy, radius, 'FD');

          if (isHighlighted) {
            doc.setFontSize(6);
            doc.setTextColor(255, 0, 0);
            doc.text('YOU', cx, cy + radius + 5, { align: 'center' });
            doc.setTextColor(0, 0, 0);
          }
        }
        break;
      }

      case 'coordinates': {
        const d = page.data as { entries: CoordinateEntry[] };
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Coordinate Sheet — ${page.performerName}`, margin, margin + 5);

        let y = margin + 14;
        const cw = [22, 14, 40, 40, 26, 26, 20];
        const ch = ['Set', 'Cts', 'S/S', 'F/B', 'Step Size', 'Direction', 'Diff'];

        doc.setFillColor(230, 230, 240);
        doc.rect(margin, y - 3, pageWidth - margin * 2, 6, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        let xx = margin;
        for (let c = 0; c < ch.length; c++) {
          doc.text(ch[c], xx + 1, y);
          xx += cw[c];
        }
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        for (const entry of d.entries) {
          if (y > pageHeight - margin - 5) {
            doc.addPage();
            y = margin + 10;
          }

          xx = margin;
          const row = [
            entry.set.name,
            String(entry.set.counts),
            entry.coordinateDetails.sideToSide,
            entry.coordinateDetails.frontToBack,
            entry.stepToNext?.stepSizeLabel ?? '-',
            entry.stepToNext?.directionLabel ?? '-',
            entry.stepToNext?.difficulty ?? '-',
          ];
          for (let c = 0; c < row.length; c++) {
            doc.text(row[c], xx + 1, y, { maxWidth: cw[c] - 2 });
            xx += cw[c];
          }
          y += 4.5;
        }
        break;
      }

      case 'summary': {
        const d = page.data as { totalSets: number; totalDistance: string; hardSteps: number; moderateSteps: number; easySteps: number; worstStep: { setName: string; stepSize: string } | null };
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Step Size Summary — ${page.performerName}`, margin, margin + 8);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        let y = margin + 22;

        const summaryRows = [
          ['Total Sets:', String(d.totalSets)],
          ['Total Distance:', `${d.totalDistance} yards`],
          ['Easy Steps (8+ to 5):', String(d.easySteps)],
          ['Moderate Steps (6-7 to 5):', String(d.moderateSteps)],
          ['Hard Steps (<6 to 5):', String(d.hardSteps)],
        ];

        if (d.worstStep) {
          summaryRows.push(['Hardest Transition:', `${d.worstStep.setName} (${d.worstStep.stepSize})`]);
        }

        for (const [label, value] of summaryRows) {
          doc.setFont('helvetica', 'bold');
          doc.text(label, margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(value, margin + 70, y);
          y += 8;
        }
        break;
      }
    }

    // Page number footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i + 1} of ${pages.length}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}

/**
 * Export drill books for all performers as individual PDFs.
 * Returns a Map of performerId -> Blob.
 */
export async function exportAllDrillBooks(
  formation: Formation,
  sets: DrillSet[],
  fieldConfig: FieldConfig = NCAA_FOOTBALL_FIELD,
  onProgress?: (performerIndex: number, total: number) => void,
): Promise<Map<string, { performer: Performer; pdf: Blob }>> {
  const result = new Map<string, { performer: Performer; pdf: Blob }>();

  for (let i = 0; i < formation.performers.length; i++) {
    const performer = formation.performers[i];
    onProgress?.(i, formation.performers.length);

    const pdf = await exportToDrillBookPdf(formation, performer.id, sets, fieldConfig);
    result.set(performer.id, { performer, pdf });
  }

  return result;
}
