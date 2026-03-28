/// <reference lib="webworker" />

/**
 * Export Renderer Web Worker
 *
 * Generates SVG markup for formation exports off the main thread.
 * Keeps the UI responsive while building potentially large SVGs
 * (hundreds of performer circles, grid lines, labels).
 *
 * Uses Vite-native worker pattern: import with `?worker` suffix.
 */

// ============================================================================
// Request Types
// ============================================================================

export interface RenderExportRequest {
  type: 'renderFormationSVG';
  id: string;
  data: {
    performers: Array<{
      id: string;
      x: number;
      y: number;
      label?: string;
      color?: string;
    }>;
    width: number;
    height: number;
    title?: string;
    showLabels?: boolean;
    showGrid?: boolean;
    gridSpacing?: number;
  };
}

// ============================================================================
// Message Handler
// ============================================================================

self.addEventListener('message', (event: MessageEvent<RenderExportRequest>) => {
  const { type, id, data } = event.data;

  if (type === 'renderFormationSVG') {
    const svg = renderFormationSVG(data);
    self.postMessage({ type: 'result', id, data: { svg } });
  }
});

// ============================================================================
// SVG Renderer
// ============================================================================

function renderFormationSVG(data: RenderExportRequest['data']) {
  const {
    performers,
    width,
    height,
    title,
    showLabels = true,
    showGrid = false,
    gridSpacing = 20,
  } = data;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#1a1a2e"/>`;

  // Grid
  if (showGrid) {
    svg += '<g stroke="#333" stroke-width="0.5" opacity="0.3">';
    for (let x = 0; x <= width; x += gridSpacing) {
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`;
    }
    for (let y = 0; y <= height; y += gridSpacing) {
      svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`;
    }
    svg += '</g>';
  }

  // Title
  if (title) {
    svg += `<text x="${width / 2}" y="20" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">${escapeXml(title)}</text>`;
  }

  // Performers
  for (const p of performers) {
    const color = p.color || '#3b82f6';
    svg += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${color}" stroke="white" stroke-width="1.5"/>`;
    if (showLabels && p.label) {
      svg += `<text x="${p.x}" y="${p.y - 10}" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif">${escapeXml(p.label)}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

// ============================================================================
// XML Escaping
// ============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
