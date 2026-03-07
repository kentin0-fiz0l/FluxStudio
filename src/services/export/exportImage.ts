/**
 * Image export functions: PNG/JPG raster and SVG vector export.
 */

import type { Formation, FormationExportOptions } from '../formationTypes';
import { formatTime } from './exportUtils';

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
