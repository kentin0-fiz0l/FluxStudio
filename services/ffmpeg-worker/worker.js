/**
 * FFmpeg HLS Transcoding Worker for FluxStudio
 *
 * Lightweight transcoding service using FFmpeg on DigitalOcean
 *
 * Features:
 * - Polls database for pending transcoding jobs
 * - Downloads videos from DigitalOcean Spaces
 * - Transcodes to HLS (multi-bitrate adaptive streaming)
 * - Uploads HLS segments back to Spaces
 * - Updates job status in real-time
 *
 * Cost: Runs on $6/month DigitalOcean droplet
 */

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
// UUID removed - not used in worker (jobs have IDs assigned by database)

// Configuration
const CONFIG = {
  pollInterval: 10000, // Check for jobs every 10 seconds
  workDir: process.env.WORK_DIR || '/tmp/transcoding',
  spacesEndpoint: process.env.SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com',
  spacesBucket: process.env.SPACES_BUCKET || 'fluxstudio',
  spacesRegion: process.env.SPACES_REGION || 'nyc3',
  spacesCdn: process.env.SPACES_CDN || 'https://fluxstudio.nyc3.cdn.digitaloceanspaces.com',
  concurrentJobs: parseInt(process.env.CONCURRENT_JOBS || '1'),
};

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// DigitalOcean Spaces client (S3-compatible)
const spaces = new AWS.S3({
  endpoint: new AWS.Endpoint(CONFIG.spacesEndpoint),
  accessKeyId: process.env.SPACES_ACCESS_KEY,
  secretAccessKey: process.env.SPACES_SECRET_KEY,
  region: CONFIG.spacesRegion
});

// Active jobs tracker
const activeJobs = new Map();

// HTTP server for health checks (required by DigitalOcean App Platform)
const app = express();
const port = process.env.PORT || 8080;

app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1');

    res.status(200).json({
      status: 'healthy',
      service: 'ffmpeg-worker',
      activeJobs: activeJobs.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'ffmpeg-worker',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(port, () => {
  console.log(`[Health] HTTP server listening on port ${port}`);
});

/**
 * Main worker loop
 */
async function startWorker() {
  console.log('[Worker] Starting FFmpeg transcoding worker');
  console.log(`[Worker] Work directory: ${CONFIG.workDir}`);
  console.log(`[Worker] Spaces bucket: ${CONFIG.spacesBucket}`);
  console.log(`[Worker] Poll interval: ${CONFIG.pollInterval}ms`);
  console.log(`[Worker] Max concurrent jobs: ${CONFIG.concurrentJobs}`);

  // Ensure work directory exists
  if (!fs.existsSync(CONFIG.workDir)) {
    fs.mkdirSync(CONFIG.workDir, { recursive: true });
  }

  // Start polling for jobs
  setInterval(async () => {
    try {
      if (activeJobs.size >= CONFIG.concurrentJobs) {
        return; // Already at capacity
      }

      const availableSlots = CONFIG.concurrentJobs - activeJobs.size;
      const jobs = await getNextJobs(availableSlots);

      for (const job of jobs) {
        processJob(job).catch(error => {
          console.error(`[Worker] Job ${job.id} failed:`, error);
          updateJobStatus(job.id, 'failed', 0, error.message);
          activeJobs.delete(job.id);
        });
      }
    } catch (error) {
      console.error('[Worker] Poll error:', error);
    }
  }, CONFIG.pollInterval);

  console.log('[Worker] Polling started');
}

/**
 * Get next pending jobs from database
 */
async function getNextJobs(limit = 1) {
  const result = await db.query(
    `UPDATE transcoding_jobs
     SET status = 'processing', started_at = NOW()
     WHERE id IN (
       SELECT id FROM transcoding_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, file_id, input_url, output_prefix, settings`,
    [limit]
  );

  return result.rows;
}

/**
 * Process a single transcoding job
 */
async function processJob(job) {
  const { id, file_id, input_url, output_prefix, settings } = job;

  console.log(`[Job ${id}] Starting transcoding for file ${file_id}`);
  activeJobs.set(id, { startTime: Date.now(), progress: 0 });

  try {
    // 1. Create job-specific directories
    const jobDir = path.join(CONFIG.workDir, id);
    const inputPath = path.join(jobDir, 'input.mp4');
    const outputDir = path.join(jobDir, 'output');

    fs.mkdirSync(jobDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    // 2. Download video from Spaces
    console.log(`[Job ${id}] Downloading from Spaces: ${input_url}`);
    await updateJobStatus(id, 'processing', 5, null);
    await downloadFromSpaces(input_url, inputPath);

    // 3. Transcode to HLS
    console.log(`[Job ${id}] Starting FFmpeg transcoding`);
    await updateJobStatus(id, 'processing', 10, null);

    await transcodeToHLS(inputPath, outputDir, (progress) => {
      // Progress callback (10-90%)
      const adjustedProgress = 10 + Math.floor(progress * 0.8);
      updateJobStatus(id, 'processing', adjustedProgress, null);
      activeJobs.get(id).progress = adjustedProgress;
    });

    // 4. Upload HLS files to Spaces
    console.log(`[Job ${id}] Uploading HLS files to Spaces`);
    await updateJobStatus(id, 'processing', 90, null);

    const manifestUrl = await uploadHLSToSpaces(outputDir, output_prefix || `hls/${file_id}/`);

    // 5. Update files table with HLS manifest URL
    await db.query(
      `UPDATE files
       SET hls_manifest_url = $1, transcoding_status = 'completed'
       WHERE id = $2`,
      [manifestUrl, file_id]
    );

    // 6. Mark job as complete
    await updateJobStatus(id, 'completed', 100, null);
    console.log(`[Job ${id}] Completed successfully`);

    // 7. Cleanup
    fs.rmSync(jobDir, { recursive: true, force: true });
    activeJobs.delete(id);

  } catch (error) {
    console.error(`[Job ${id}] Error:`, error);
    await updateJobStatus(id, 'failed', activeJobs.get(id)?.progress || 0, error.message);
    activeJobs.delete(id);
    throw error;
  }
}

/**
 * Download file from DigitalOcean Spaces
 */
async function downloadFromSpaces(url, localPath) {
  // Extract key from URL (e.g., https://bucket.nyc3.digitaloceanspaces.com/path/file.mp4 -> path/file.mp4)
  const key = url.split(`${CONFIG.spacesBucket}/`)[1] || url.split('.com/')[1];

  const params = {
    Bucket: CONFIG.spacesBucket,
    Key: key
  };

  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(localPath);

    spaces.getObject(params)
      .createReadStream()
      .on('error', reject)
      .pipe(fileStream)
      .on('error', reject)
      .on('finish', resolve);
  });
}

/**
 * Transcode video to HLS using FFmpeg
 */
async function transcodeToHLS(inputPath, outputDir, onProgress) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, 'master.m3u8');

    // FFmpeg HLS transcoding settings
    // Outputs: 1080p, 720p, 480p
    const command = ffmpeg(inputPath)
      .outputOptions([
        // General HLS settings
        '-c:v libx264',           // H.264 codec
        '-c:a aac',               // AAC audio codec
        '-strict -2',
        '-hls_time 6',            // 6-second segments
        '-hls_list_size 0',       // Keep all segments
        '-hls_segment_filename', path.join(outputDir, 'segment_%v_%03d.ts'),
        '-master_pl_name', 'master.m3u8',

        // Multi-bitrate ladder
        '-map 0:v:0',             // Video stream
        '-map 0:a:0',             // Audio stream
        '-map 0:v:0',
        '-map 0:a:0',
        '-map 0:v:0',
        '-map 0:a:0',

        // 1080p variant
        '-filter:v:0', 'scale=-2:1080',
        '-b:v:0', '5000k',
        '-maxrate:v:0', '5350k',
        '-bufsize:v:0', '7500k',

        // 720p variant
        '-filter:v:1', 'scale=-2:720',
        '-b:v:1', '3000k',
        '-maxrate:v:1', '3300k',
        '-bufsize:v:1', '4500k',

        // 480p variant
        '-filter:v:2', 'scale=-2:480',
        '-b:v:2', '1500k',
        '-maxrate:v:2', '1650k',
        '-bufsize:v:2', '2250k',

        // Variant stream mapping
        '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2',

        // Format
        '-f', 'hls',
      ])
      .output(outputPath);

    // Progress tracking
    command.on('progress', (progress) => {
      if (progress.percent) {
        onProgress(progress.percent / 100);
      }
    });

    command.on('end', () => {
      console.log('[FFmpeg] Transcoding finished');
      resolve();
    });

    command.on('error', (err) => {
      console.error('[FFmpeg] Error:', err);
      reject(err);
    });

    command.run();
  });
}

/**
 * Upload HLS files to DigitalOcean Spaces
 */
async function uploadHLSToSpaces(outputDir, prefix) {
  const files = fs.readdirSync(outputDir);

  console.log(`[Upload] Uploading ${files.length} files to Spaces`);

  for (const file of files) {
    const filePath = path.join(outputDir, file);
    const key = `${prefix}${file}`;

    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: CONFIG.spacesBucket,
      Key: key,
      Body: fileContent,
      ACL: 'public-read',
      ContentType: file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T'
    };

    await spaces.putObject(params).promise();
    console.log(`[Upload] Uploaded ${key}`);
  }

  // Return CDN URL for master playlist
  const manifestUrl = `${CONFIG.spacesCdn}/${prefix}master.m3u8`;
  return manifestUrl;
}

/**
 * Update job status in database
 */
async function updateJobStatus(jobId, status, progress, errorMessage) {
  await db.query(
    `UPDATE transcoding_jobs
     SET status = $1,
         progress = $2,
         error_message = $3,
         completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
     WHERE id = $4`,
    [status, progress, errorMessage, jobId]
  );
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully');

  // Wait for active jobs to finish (with timeout)
  const timeout = setTimeout(() => {
    console.log('[Worker] Shutdown timeout, forcing exit');
    process.exit(1);
  }, 60000); // 1 minute timeout

  while (activeJobs.size > 0) {
    console.log(`[Worker] Waiting for ${activeJobs.size} active jobs to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  clearTimeout(timeout);
  await db.end();
  console.log('[Worker] Shutdown complete');
  process.exit(0);
});

// Start the worker
startWorker().catch(error => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
