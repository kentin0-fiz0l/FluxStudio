/**
 * Project Thumbnail Handler
 *
 * Captures a page screenshot, resizes it to a thumbnail, and uploads both sizes.
 * Input: { projectId, url? }
 * Output: { thumbnailUrl, fullImageUrl, storageKey }
 */
const sharp = require('sharp');
const storageAdapter = require('../../../lib/storage');

const FULL_WIDTH = 1280;
const FULL_HEIGHT = 720;
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 225;
const JPEG_QUALITY = 85;

module.exports = async function handleThumbnail(page, job, config) {
  const { projectId, url } = job.input;

  if (!projectId) {
    throw new Error('projectId is required');
  }

  // Navigate to the provided URL or construct a default project URL
  const targetUrl = url || `${config.appBaseUrl || 'http://localhost:5173'}/projects/${projectId}`;

  await page.setViewportSize({ width: FULL_WIDTH, height: FULL_HEIGHT });

  await page.goto(targetUrl, {
    waitUntil: 'networkidle',
    timeout: config.navigationTimeout || 30000,
  });

  // Full-size screenshot at 1280x720, JPEG quality 85
  const fullScreenshot = await page.screenshot({
    type: 'jpeg',
    quality: JPEG_QUALITY,
  });

  const fullBuffer = Buffer.from(fullScreenshot);

  // Resize to 400x225 thumbnail with Sharp
  const thumbBuffer = await sharp(fullBuffer)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover' })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  const userId = job.created_by || 'system';

  // Upload both sizes in parallel
  const [fullResult, thumbResult] = await Promise.all([
    storageAdapter.saveFile({
      buffer: fullBuffer,
      mimeType: 'image/jpeg',
      extension: 'jpg',
      userId,
      originalName: `thumbnail-full-${projectId}.jpg`,
    }),
    storageAdapter.saveFile({
      buffer: thumbBuffer,
      mimeType: 'image/jpeg',
      extension: 'jpg',
      userId,
      originalName: `thumbnail-${projectId}.jpg`,
    }),
  ]);

  return {
    thumbnailUrl: thumbResult.storageKey,
    fullImageUrl: fullResult.storageKey,
    storageKey: thumbResult.storageKey,
  };
};
