/**
 * PDF Export Handler
 *
 * Renders HTML content into a PDF document and uploads it to storage.
 * Input: { html, css?, projectId, format?, pageSize? }
 * Output: { storageKey, mimeType, sizeBytes }
 */
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const storageAdapter = require('../../../lib/storage');

module.exports = async function handlePdfExport(page, job, config) {
  const { html, css, projectId, format, pageSize } = job.input;

  if (!html || !projectId) {
    throw new Error('html and projectId are required');
  }

  // Build a self-contained HTML document
  const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${css || ''}</style></head>
<body>${html}</body>
</html>`;

  // Write to a temp file so Playwright can navigate to file://
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flux-pdf-'));
  const tmpFile = path.join(tmpDir, 'export.html');
  await fs.writeFile(tmpFile, fullHtml, 'utf-8');

  try {
    await page.goto(`file://${tmpFile}`, {
      waitUntil: 'networkidle',
      timeout: config.navigationTimeout || 15000,
    });

    // Determine output format
    const outputFormat = format || 'pdf';
    let buffer;
    let mimeType;
    let ext;

    if (outputFormat === 'pdf') {
      buffer = await page.pdf({
        format: pageSize || 'Letter',
        printBackground: true,
      });
      mimeType = 'application/pdf';
      ext = 'pdf';
    } else {
      // Fallback: screenshot as PNG
      buffer = await page.screenshot({ fullPage: true, type: 'png' });
      mimeType = 'image/png';
      ext = 'png';
    }

    // Upload to storage
    const result = await storageAdapter.saveFile({
      buffer: Buffer.from(buffer),
      mimeType,
      extension: ext,
      userId: job.created_by || 'system',
      originalName: `pdf-export-${job.id}.${ext}`,
    });

    return {
      storageKey: result.storageKey,
      mimeType,
      sizeBytes: result.sizeBytes,
    };
  } finally {
    // Cleanup temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
};
