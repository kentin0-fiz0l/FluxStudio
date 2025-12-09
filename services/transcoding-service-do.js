/**
 * HLS Transcoding Service for FluxStudio (DigitalOcean Version)
 * Simplified service that submits jobs to database for FFmpeg worker
 *
 * Features:
 * - Job submission to PostgreSQL database
 * - DigitalOcean Spaces (S3-compatible) support
 * - Multi-bitrate adaptive streaming (1080p, 720p, 480p)
 * - Job status monitoring
 * - No DRM/encryption (simplified for cost savings)
 */

const { query } = require('../database/config');
const { cuid } = require('cuid');

// Configuration
const CONFIG = {
  spacesBucket: process.env.SPACES_BUCKET || 'fluxstudio',
  spacesCdn: process.env.SPACES_CDN || 'https://fluxstudio.nyc3.cdn.digitaloceanspaces.com',
};

/**
 * Create HLS transcoding job
 * This simply inserts a job into the database for the FFmpeg worker to process
 */
async function createTranscodingJob({ fileId, fileName, spacesKey, userId }) {
  try {
    console.log(`[Transcoding] Creating job for file ${fileId}`);

    const jobId = cuid();
    const outputPrefix = `hls/${fileId}/`;

    // Construct input URL from Spaces bucket and key
    const inputUrl = spacesKey.startsWith('http')
      ? spacesKey
      : `https://${CONFIG.spacesBucket}.nyc3.digitaloceanspaces.com/${spacesKey}`;

    // Insert job into database with status='pending'
    // The FFmpeg worker will poll for pending jobs and process them
    await query(
      `INSERT INTO transcoding_jobs
       (id, file_id, status, input_url, output_prefix, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id`,
      [jobId, fileId, 'pending', inputUrl, outputPrefix]
    );

    console.log(`[Transcoding] Job ${jobId} created for file ${fileId}`);

    // Update file record with transcoding status
    await query(
      `UPDATE files
       SET transcoding_status = $1
       WHERE id = $2`,
      ['pending', fileId]
    );

    // Expected manifest URL (will be set when transcoding completes)
    const manifestUrl = `${CONFIG.spacesCdn}/${outputPrefix}master.m3u8`;

    return {
      jobId,
      status: 'pending',
      outputUrl: manifestUrl
    };

  } catch (error) {
    console.error('[Transcoding] Job creation failed:', error);

    // Update file status to failed
    await query(
      `UPDATE files
       SET transcoding_status = $1
       WHERE id = $2`,
      ['failed', fileId]
    );

    throw error;
  }
}

/**
 * Check transcoding job status
 * Queries the database for current job status
 */
async function checkJobStatus(jobId) {
  try {
    const result = await query(
      `SELECT status, progress, error_message, completed_at
       FROM transcoding_jobs
       WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      throw new Error('Job not found');
    }

    const job = result.rows[0];

    return {
      status: job.status,
      progress: job.progress || 0,
      completedAt: job.completed_at,
      errorMessage: job.error_message
    };
  } catch (error) {
    console.error('[Transcoding] Status check failed:', error);
    throw error;
  }
}

/**
 * Get transcoding status for a file
 */
async function getTranscodingStatus(fileId) {
  const result = await query(
    `SELECT
      f.id,
      f.name,
      f.transcoding_status,
      f.hls_manifest_url,
      tj.id as job_id,
      tj.status as job_status,
      tj.progress,
      tj.error_message,
      tj.created_at,
      tj.completed_at
     FROM files f
     LEFT JOIN transcoding_jobs tj ON f.id = tj.file_id
     WHERE f.id = $1
     ORDER BY tj.created_at DESC
     LIMIT 1`,
    [fileId]
  );

  if (result.rows.length === 0) {
    throw new Error('File not found');
  }

  return result.rows[0];
}

/**
 * Monitor all in-progress transcoding jobs
 * This can be called periodically to check all jobs, but the FFmpeg worker
 * handles most of the monitoring automatically
 */
async function monitorJobs() {
  try {
    // Get all jobs in processing state
    const result = await query(
      `SELECT tj.id, tj.file_id, tj.status, tj.progress
       FROM transcoding_jobs tj
       WHERE tj.status IN ('pending', 'processing')
       ORDER BY tj.created_at ASC
       LIMIT 50`
    );

    console.log(`[Transcoding Monitor] Found ${result.rows.length} active jobs`);

    // Note: The FFmpeg worker automatically updates job status
    // This function is mainly for observability

    return { checked: result.rows.length, jobs: result.rows };

  } catch (error) {
    console.error('[Transcoding Monitor] Monitor failed:', error);
    throw error;
  }
}

/**
 * Cancel a transcoding job
 * Marks job as canceled so worker will skip it
 */
async function cancelJob(jobId) {
  try {
    await query(
      `UPDATE transcoding_jobs
       SET status = 'canceled', completed_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'processing')`,
      [jobId]
    );

    console.log(`[Transcoding] Job ${jobId} canceled`);

    return { success: true };
  } catch (error) {
    console.error('[Transcoding] Cancel failed:', error);
    throw error;
  }
}

/**
 * Retry a failed transcoding job
 * Creates a new job for the same file
 */
async function retryJob(jobId) {
  try {
    // Get original job details
    const result = await query(
      `SELECT file_id, input_url, output_prefix
       FROM transcoding_jobs
       WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      throw new Error('Job not found');
    }

    const originalJob = result.rows[0];

    // Create new job
    const newJobId = cuid();
    await query(
      `INSERT INTO transcoding_jobs
       (id, file_id, status, input_url, output_prefix, created_at)
       VALUES ($1, $2, 'pending', $3, $4, NOW())`,
      [newJobId, originalJob.file_id, originalJob.input_url, originalJob.output_prefix]
    );

    // Update file status
    await query(
      `UPDATE files
       SET transcoding_status = 'pending'
       WHERE id = $1`,
      [originalJob.file_id]
    );

    console.log(`[Transcoding] Retry job ${newJobId} created for file ${originalJob.file_id}`);

    return { jobId: newJobId, status: 'pending' };

  } catch (error) {
    console.error('[Transcoding] Retry failed:', error);
    throw error;
  }
}

/**
 * Get transcoding statistics
 */
async function getStatistics() {
  try {
    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) FILTER (WHERE status = 'completed') as avg_duration_seconds
       FROM transcoding_jobs
       WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Transcoding] Statistics failed:', error);
    throw error;
  }
}

module.exports = {
  createTranscodingJob,
  checkJobStatus,
  getTranscodingStatus,
  monitorJobs,
  cancelJob,
  retryJob,
  getStatistics
};
