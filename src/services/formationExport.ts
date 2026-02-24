/**
 * Formation Export Utilities
 * Extracted from formationService.ts - handles PDF, image, SVG, and animation export
 */

import type { Formation, FormationExportOptions, Position } from './formationTypes';

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

export async function exportToAnimation(
  formation: Formation,
  options: FormationExportOptions,
  getPositionsAtTime: (formationId: string, time: number) => Map<string, Position>,
  getFormationDuration: (formationId: string) => number
): Promise<Blob> {
  const { stageWidth, stageHeight, gridSize, performers, keyframes } = formation;
  const width = options.resolution?.width ?? 1280;
  const height = options.resolution?.height ?? 720;
  const fps = options.fps ?? 30;

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
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
  const markerRadius = Math.min(stageDrawWidth, stageDrawHeight) * 0.02;

  const duration = getFormationDuration(formation.id) ||
    (keyframes.length > 0 ? keyframes[keyframes.length - 1].timestamp + 1000 : 5000);
  const frameCount = Math.ceil((duration / 1000) * fps);
  const frameDuration = 1000 / fps;
  const frames: ImageData[] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const time = frameIndex * frameDuration;
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
    ctx.fillRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);
    ctx.strokeRect(offsetX, offsetY, stageDrawWidth, stageDrawHeight);

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

    const positions = getPositionsAtTime(formation.id, time);
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
    frames.push(ctx.getImageData(0, 0, width, height));
  }

  if (options.format === 'gif') {
    return new Blob(['GIF animation data'], { type: 'image/gif' });
  } else {
    if (typeof MediaRecorder !== 'undefined') {
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      return new Promise((resolve) => {
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => { resolve(new Blob(chunks, { type: 'video/webm' })); };
        recorder.start();
        let frameIndex = 0;
        const renderFrame = () => {
          if (frameIndex < frames.length) { ctx.putImageData(frames[frameIndex], 0, 0); frameIndex++; requestAnimationFrame(renderFrame); }
          else { recorder.stop(); }
        };
        renderFrame();
      });
    }
    return new Blob(['Video export placeholder'], { type: 'video/mp4' });
  }
}
