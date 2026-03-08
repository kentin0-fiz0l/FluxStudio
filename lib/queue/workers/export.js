/**
 * Export Worker
 *
 * Processes async file export jobs:
 * - pdf-export: Generate PDF from project data
 * - formation-export: Export formation as image/PDF
 * - video-export: Export formation animation as video
 *
 * Usage: Start as a separate process or import and call createWorker()
 */

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

async function processFormationExport(data, job) {
  const { userId, formationId, format, options } = data;

  await job.updateProgress(10);

  // Fetch formation data
  const FormationService = require('../../services/FormationService');
  const formationResult = await FormationService.getFormation(formationId, userId);

  if (!formationResult.success) {
    throw new Error(formationResult.error || 'Failed to fetch formation');
  }

  await job.updateProgress(40);

  // Generate export (placeholder)
  const exportResult = {
    type: format || 'png',
    formationId,
    formationName: formationResult.data.name,
    performerCount: (formationResult.data.performers || []).length,
    generatedAt: new Date().toISOString(),
    status: 'completed',
  };

  await job.updateProgress(100);

  log.info('Formation export completed', { userId, formationId, format });
  return exportResult;
}

async function processVideoExport(data, job) {
  const { userId, formationId, options } = data;

  await job.updateProgress(5);

  // Fetch formation data
  const FormationService = require('../../services/FormationService');
  const formationResult = await FormationService.getFormation(formationId, userId);

  if (!formationResult.success) {
    throw new Error(formationResult.error || 'Failed to fetch formation');
  }

  await job.updateProgress(20);

  // Video export is typically long-running
  // In production, this would:
  // 1. Render each frame server-side
  // 2. Encode frames to video (ffmpeg)
  // 3. Upload to object storage
  // 4. Return URL

  const exportResult = {
    type: 'video',
    formationId,
    formationName: formationResult.data.name,
    duration: options?.duration || 'auto',
    generatedAt: new Date().toISOString(),
    status: 'completed',
  };

  await job.updateProgress(100);

  log.info('Video export completed', { userId, formationId });
  return exportResult;
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
