/**
 * AudienceHeatmap - Canvas2D overlay rendering Gaussian-blurred density.
 *
 * Supports two modes:
 * - 'top-down': standard overhead density view
 * - 'audience': compresses Y-axis by 60% to simulate low-angle audience perspective
 *
 * Uses additive blending with a color ramp from transparent -> blue -> green -> yellow -> red.
 */

import React, { useEffect, useRef } from 'react';
import type { Performer, Position } from '../../services/formationTypes';

interface AudienceHeatmapProps {
  performers: Performer[];
  positions: Map<string, Position>;
  canvasWidth: number;
  canvasHeight: number;
  mode: 'top-down' | 'audience';
  zoom: number;
}

/** Gaussian blob radius in pixels (scaled by zoom) */
const BASE_BLOB_RADIUS = 40;

/**
 * Render the heatmap onto an offscreen canvas, then composite onto the visible canvas.
 */
function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  performers: Performer[],
  positions: Map<string, Position>,
  canvasWidth: number,
  canvasHeight: number,
  mode: 'top-down' | 'audience',
  zoom: number,
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Create offscreen canvas for additive blending
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasWidth;
  offscreen.height = canvasHeight;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  offCtx.globalCompositeOperation = 'lighter';
  const blobRadius = BASE_BLOB_RADIUS * zoom;

  for (const performer of performers) {
    const pos = positions.get(performer.id);
    if (!pos) continue;

    const px = (pos.x / 100) * canvasWidth;
    let py = (pos.y / 100) * canvasHeight;

    // In audience mode, compress Y toward bottom (audience perspective)
    if (mode === 'audience') {
      const centerY = canvasHeight / 2;
      py = centerY + (py - centerY) * 0.4;
    }

    // Draw Gaussian blob via radial gradient
    const gradient = offCtx.createRadialGradient(px, py, 0, px, py, blobRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    offCtx.fillStyle = gradient;
    offCtx.beginPath();
    offCtx.arc(px, py, blobRadius, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Read pixel data and apply color ramp
  const imageData = offCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Use the red channel as the density value (all RGB are the same from white blobs)
    const density = data[i] / 255;
    if (density < 0.01) {
      data[i + 3] = 0;
      continue;
    }

    // Color ramp: transparent -> blue -> green -> yellow -> red
    let r: number, g: number, b: number;
    if (density < 0.25) {
      // transparent -> blue
      const t = density / 0.25;
      r = 0;
      g = 0;
      b = Math.round(t * 200);
    } else if (density < 0.5) {
      // blue -> green
      const t = (density - 0.25) / 0.25;
      r = 0;
      g = Math.round(t * 200);
      b = Math.round((1 - t) * 200);
    } else if (density < 0.75) {
      // green -> yellow
      const t = (density - 0.5) / 0.25;
      r = Math.round(t * 240);
      g = 200;
      b = 0;
    } else {
      // yellow -> red
      const t = (density - 0.75) / 0.25;
      r = 240;
      g = Math.round((1 - t) * 200);
      b = 0;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = Math.round(density * 180); // alpha based on density
  }

  offCtx.putImageData(imageData, 0, 0);

  // Composite onto the main canvas
  ctx.drawImage(offscreen, 0, 0);
}

export const AudienceHeatmap = React.memo<AudienceHeatmapProps>(
  function AudienceHeatmap({ performers, positions, canvasWidth, canvasHeight, mode, zoom }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || performers.length === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvasWidth;
      const h = canvasHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      renderHeatmap(ctx, performers, positions, w, h, mode, zoom);
    }, [performers, positions, canvasWidth, canvasHeight, mode, zoom]);

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 4 }}
        aria-hidden="true"
      />
    );
  },
);
