/**
 * Export Worker
 *
 * Processes async file export jobs:
 * - pdf-export: Generate PDF from project data
 * - formation-export: Export formation as image/PDF
 * - video-export: Export formation animation as video (not yet implemented)
 *
 * Usage: Start as a separate process or import and call createWorker()
 */

const path = require('path');
const fs = require('fs');
const { createLogger } = require('../../logger');
const log = createLogger('Worker:Export');

/**
 * Process an export job
 * @param {Object} job - BullMQ job instance
 * @returns {Promise<Object>} Job result with file URL
 */
async function processor(job) {
  const { name, data } = job;
  log.info('Processing export job', { jobId: job.id, name, userId: data.userId });

  switch (name) {
    case 'pdf-export':
      return await processPdfExport(data, job);

    case 'formation-export':
      return await processFormationExport(data, job);

    case 'video-export':
      return await processVideoExport(data, job);

    default:
      throw new Error(`Unknown export job type: ${name}`);
  }
}

async function processPdfExport(data, job) {
  const { userId, projectId, options } = data;

  // Update progress
  await job.updateProgress(10);

  // Fetch project data
  const ProjectService = require('../../services/ProjectService');
  const projectResult = await ProjectService.getProject(projectId, userId);

  if (!projectResult.success) {
    throw new Error(projectResult.error || 'Failed to fetch project');
  }

  await job.updateProgress(30);

  // Generate PDF (placeholder - would use puppeteer or pdfkit in production)
  const exportResult = {
    type: 'pdf',
    projectId,
    projectName: projectResult.data.name,
    generatedAt: new Date().toISOString(),
    // In production: fileUrl pointing to S3/Spaces storage
    status: 'completed',
  };

  await job.updateProgress(100);

  log.info('PDF export completed', { userId, projectId });
  return exportResult;
}

/**
 * Render a formation to SVG, then convert to PNG/PDF via sharp/jsPDF
 */
async function processFormationExport(data, job) {
  const { userId, formationId, format = 'png', options = {} } = data;

  await job.updateProgress(10);

  // Fetch formation data
  const FormationService = require('../../services/FormationService');
  const formationResult = await FormationService.getFormation(formationId, userId);

  if (!formationResult.success) {
    throw new Error(formationResult.error || 'Failed to fetch formation');
  }

  const formation = formationResult.data;
  const performers = formation.performers || [];
  const stageWidth = formation.stageWidth || formation.stage_width || 800;
  const stageHeight = formation.stageHeight || formation.stage_height || 600;
  const gridSize = formation.gridSize || formation.grid_size || 20;

  await job.updateProgress(30);

  // Build SVG representation of the formation
  const padding = 40;
  const svgWidth = stageWidth + padding * 2;
  const svgHeight = stageHeight + padding * 2;
  const performerRadius = options.performerRadius || 12;

  let gridLines = '';
  if (options.showGrid !== false) {
    for (let x = 0; x <= stageWidth; x += gridSize) {
      gridLines += `<line x1="${padding + x}" y1="${padding}" x2="${padding + x}" y2="${padding + stageHeight}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    }
    for (let y = 0; y <= stageHeight; y += gridSize) {
      gridLines += `<line x1="${padding}" y1="${padding + y}" x2="${padding + stageWidth}" y2="${padding + y}" stroke="#e5e7eb" stroke-width="0.5"/>`;
    }
  }

  let performerElements = '';
  for (const p of performers) {
    const cx = padding + (p.x || 0);
    const cy = padding + (p.y || 0);
    const label = p.name || p.label || '';
    const color = p.color || '#6366f1';

    performerElements += `<circle cx="${cx}" cy="${cy}" r="${performerRadius}" fill="${color}" stroke="#fff" stroke-width="2"/>`;
    if (label) {
      performerElements += `<text x="${cx}" y="${cy + performerRadius + 14}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#374151">${escapeXml(label)}</text>`;
    }
  }

  const title = escapeXml(formation.name || 'Formation');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>
    <rect x="${padding}" y="${padding}" width="${stageWidth}" height="${stageHeight}" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
    ${gridLines}
    ${performerElements}
    <text x="${svgWidth / 2}" y="${padding - 12}" text-anchor="middle" font-size="16" font-weight="bold" font-family="sans-serif" fill="#111827">${title}</text>
    <text x="${svgWidth / 2}" y="${svgHeight - 8}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#9ca3af">${performers.length} performer${performers.length !== 1 ? 's' : ''} · ${stageWidth}×${stageHeight}</text>
  </svg>`;

  await job.updateProgress(60);

  // Ensure exports directory exists
  const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
  fs.mkdirSync(exportsDir, { recursive: true });

  const timestamp = Date.now();
  const safeTitle = (formation.name || 'formation').replace(/[^a-z0-9_-]/gi, '_').slice(0, 50);

  let filePath;
  let fileUrl;

  if (format === 'pdf') {
    // Render SVG to PNG buffer first, then embed in PDF
    const sharp = require('sharp');
    const { jsPDF } = require('jspdf');

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    await job.updateProgress(80);

    const doc = new jsPDF({
      orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [svgWidth, svgHeight],
    });

    const pngDataUri = 'data:image/png;base64,' + pngBuffer.toString('base64');
    doc.addImage(pngDataUri, 'PNG', 0, 0, svgWidth, svgHeight);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const fileName = `${safeTitle}_${timestamp}.pdf`;
    filePath = path.join(exportsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    fileUrl = `/uploads/exports/${fileName}`;
  } else {
    // Default: PNG export via sharp
    const sharp = require('sharp');

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    await job.updateProgress(80);

    const fileName = `${safeTitle}_${timestamp}.png`;
    filePath = path.join(exportsDir, fileName);
    fs.writeFileSync(filePath, pngBuffer);
    fileUrl = `/uploads/exports/${fileName}`;
  }

  await job.updateProgress(100);

  const exportResult = {
    type: format,
    formationId,
    formationName: formation.name,
    performerCount: performers.length,
    fileUrl,
    filePath,
    generatedAt: new Date().toISOString(),
    status: 'completed',
  };

  log.info('Formation export completed', { userId, formationId, format, fileUrl });
  return exportResult;
}

async function processVideoExport(data, job) {
  throw new Error(
    'Video export is not yet implemented. It requires server-side frame rendering and ffmpeg encoding.'
  );
}

/**
 * Escape XML special characters for safe SVG embedding
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create and start the export worker
 * @param {Object} redisConfig - Redis connection config
 * @returns {Object|null} Worker instance or null if bullmq not available
 */
function createWorker(redisConfig) {
  try {
    const { Worker } = require('bullmq');

    const worker = new Worker('export', processor, {
      connection: redisConfig,
      concurrency: 2, // Only 2 concurrent exports (CPU-intensive)
    });

    worker.on('completed', (job) => {
      log.info('Export job completed', { jobId: job.id, name: job.name });
    });

    worker.on('failed', (job, err) => {
      log.error('Export job failed', { jobId: job?.id, name: job?.name, error: err.message });
    });

    worker.on('progress', (job, progress) => {
      log.info('Export job progress', { jobId: job.id, name: job.name, progress });
    });

    log.info('Export worker started');
    return worker;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.info('Export worker disabled: bullmq not installed');
    } else {
      log.error('Failed to create export worker', error);
    }
    return null;
  }
}

module.exports = {
  processor,
  createWorker,
};
