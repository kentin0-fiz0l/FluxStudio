/**
 * Link Preview Handler
 *
 * Navigates to a URL, extracts Open Graph metadata and a screenshot,
 * then stores the screenshot via StorageAdapter.
 *
 * Input: { url, messageId, conversationId }
 * Output: { title, description, image, domain, favicon }
 */

const { URL } = require('url');
const storageAdapter = require('../../../lib/storage');

async function handleLinkPreview(page, job, config) {
  const { url, messageId, conversationId } = job.input;

  // Navigate with timeout
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

  // Extract metadata
  const meta = await page.evaluate(() => {
    const getMeta = (property) => {
      const el =
        document.querySelector(`meta[property="${property}"]`) ||
        document.querySelector(`meta[name="${property}"]`);
      return el ? el.getAttribute('content') : null;
    };

    const faviconEl =
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]');

    return {
      title: getMeta('og:title') || document.title || '',
      description: getMeta('og:description') || getMeta('description') || '',
      ogImage: getMeta('og:image') || null,
      favicon: faviconEl ? faviconEl.getAttribute('href') : null,
    };
  });

  // Resolve relative favicon URL
  let favicon = meta.favicon;
  if (favicon && !favicon.startsWith('http')) {
    const parsed = new URL(url);
    favicon = new URL(favicon, parsed.origin).href;
  }

  const domain = new URL(url).hostname;

  // Take viewport screenshot
  await page.setViewportSize({ width: 1200, height: 630 });
  const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 80 });

  // Store screenshot
  const saved = await storageAdapter.saveFile({
    buffer: screenshotBuffer,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    userId: job.created_by,
    originalName: `link-preview-${domain}.jpg`,
  });
  const imageKey = saved.storageKey;

  return {
    title: meta.title,
    description: meta.description,
    image: imageKey || meta.ogImage,
    domain,
    favicon,
    messageId,
    conversationId,
  };
}

module.exports = handleLinkPreview;
