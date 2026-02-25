/**
 * Web Capture Handler
 *
 * Navigates to a URL, takes a full-page screenshot, and uploads it to storage.
 * Input: { url, projectId, boardId?, viewport? }
 * Output: { storageKey, sizeBytes }
 */
const storageAdapter = require('../../../lib/storage');

module.exports = async function handleWebCapture(page, job, config) {
  const { url, projectId, viewport } = job.input;

  if (!url || !projectId) {
    throw new Error('url and projectId are required');
  }

  // Apply viewport if specified
  if (viewport) {
    await page.setViewportSize({
      width: viewport.width || 1280,
      height: viewport.height || 720,
    });
  }

  // Navigate and wait for network to settle
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: config.navigationTimeout || 30000,
  });

  // Full-page screenshot as PNG
  const screenshotBuffer = await page.screenshot({
    fullPage: true,
    type: 'png',
  });

  // Upload via StorageAdapter
  const result = await storageAdapter.saveFile({
    buffer: Buffer.from(screenshotBuffer),
    mimeType: 'image/png',
    extension: 'png',
    userId: job.created_by || 'system',
    originalName: `web-capture-${job.id}.png`,
  });

  return {
    storageKey: result.storageKey,
    sizeBytes: result.sizeBytes,
  };
};
