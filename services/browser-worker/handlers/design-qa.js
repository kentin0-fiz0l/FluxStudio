/**
 * Design QA Handler
 *
 * Compares a live page screenshot against a stored baseline image using
 * pixel-level diffing (pixelmatch). Uploads the current screenshot and
 * the diff overlay, then returns comparison metrics.
 *
 * Input: { url, baselineAssetId, viewport?, threshold? }
 * Output: { diffPercentage, diffImageUrl, currentImageUrl, matchScore }
 */
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const storageAdapter = require('../../../lib/storage');

module.exports = async function handleDesignQa(page, job, config) {
  const { url, baselineAssetId, viewport, threshold } = job.input;

  if (!url || !baselineAssetId) {
    throw new Error('url and baselineAssetId are required');
  }

  // 1. Retrieve the baseline image from storage
  const baselineBuffer = await storageAdapter.getFileBuffer(baselineAssetId);
  const baselinePng = PNG.sync.read(baselineBuffer);
  const { width, height } = baselinePng;

  // 2. Navigate to the live URL at the same viewport dimensions
  await page.setViewportSize({
    width: viewport?.width || width,
    height: viewport?.height || height,
  });

  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: config.navigationTimeout || 30000,
  });

  // 3. Screenshot the current state as PNG
  const currentScreenshot = await page.screenshot({ type: 'png' });
  const currentBuffer = Buffer.from(currentScreenshot);
  const currentPng = PNG.sync.read(currentBuffer);

  // 4. Ensure dimensions match -- resize current if needed
  if (currentPng.width !== width || currentPng.height !== height) {
    throw new Error(
      `Viewport mismatch: baseline is ${width}x${height} but current is ${currentPng.width}x${currentPng.height}. ` +
      'Set the viewport input to match the baseline dimensions.'
    );
  }

  // 5. Run pixel diff
  const diffPng = new PNG({ width, height });
  const diffThreshold = threshold ?? 0.1;

  const mismatchedPixels = pixelmatch(
    baselinePng.data,
    currentPng.data,
    diffPng.data,
    width,
    height,
    { threshold: diffThreshold }
  );

  const totalPixels = width * height;
  const diffPercentage = parseFloat(((mismatchedPixels / totalPixels) * 100).toFixed(2));
  const matchScore = parseFloat((100 - diffPercentage).toFixed(2));

  // 6. Encode the diff overlay to PNG buffer
  const diffBuffer = PNG.sync.write(diffPng);

  const userId = job.created_by || 'system';

  // 7. Upload current screenshot and diff image in parallel
  const [currentResult, diffResult] = await Promise.all([
    storageAdapter.saveFile({
      buffer: currentBuffer,
      mimeType: 'image/png',
      extension: 'png',
      userId,
      originalName: `design-qa-current-${job.id}.png`,
    }),
    storageAdapter.saveFile({
      buffer: diffBuffer,
      mimeType: 'image/png',
      extension: 'png',
      userId,
      originalName: `design-qa-diff-${job.id}.png`,
    }),
  ]);

  return {
    diffPercentage,
    diffImageUrl: diffResult.storageKey,
    currentImageUrl: currentResult.storageKey,
    matchScore,
  };
};
