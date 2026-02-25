/**
 * Playwright Browser Worker for FluxStudio
 *
 * Headless browser service for link previews, screenshots, PDF export,
 * project thumbnails, and design QA diffing.
 *
 * Features:
 * - Polls database for pending browser jobs
 * - Single Chromium instance with concurrent page pool
 * - Routes jobs to type-specific handlers
 * - Updates job status in real-time
 */

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  pollInterval: 5000,
  concurrentPages: 3,
  timeout: 30000,
};

// Database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Browser instance (initialized on startup)
let browser = null;

// Active pages tracker
const activePages = new Map();

// Handler registry - loaded lazily by job type
// DB type uses underscores (link_preview), filenames use hyphens (link-preview.js)
const handlers = {};

function getHandler(type) {
  if (!handlers[type]) {
    const filename = type.replace(/_/g, '-');
    try {
      handlers[type] = require(`./handlers/${filename}`);
    } catch (err) {
      throw new Error(`No handler found for job type: ${type} (handlers/${filename}.js)`);
    }
  }
  return handlers[type];
}

// HTTP server for health checks
const app = express();
const port = process.env.PORT || 8081;

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');

    res.status(200).json({
      status: 'healthy',
      service: 'browser-worker',
      browserConnected: browser !== null && browser.isConnected(),
      activePages: activePages.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'browser-worker',
      error: error.message,
      timestamp: new Date().toISOString(),
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
  console.log('[Worker] Starting Playwright browser worker');
  console.log(`[Worker] Poll interval: ${CONFIG.pollInterval}ms`);
  console.log(`[Worker] Max concurrent pages: ${CONFIG.concurrentPages}`);
  console.log(`[Worker] Job timeout: ${CONFIG.timeout}ms`);

  // Launch shared Chromium instance
  browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  console.log('[Worker] Chromium browser launched');

  // Start polling for jobs
  setInterval(async () => {
    try {
      if (activePages.size >= CONFIG.concurrentPages) {
        return;
      }

      const availableSlots = CONFIG.concurrentPages - activePages.size;
      const jobs = await getNextJobs(availableSlots);

      for (const job of jobs) {
        processJob(job).catch(error => {
          console.error(`[Worker] Job ${job.id} failed:`, error);
          updateJobStatus(job.id, 'failed', null, error.message);
          activePages.delete(job.id);
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
    `UPDATE browser_jobs
     SET status = 'processing', started_at = NOW()
     WHERE id IN (
       SELECT id FROM browser_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, type, input, created_by`,
    [limit]
  );

  return result.rows;
}

/**
 * Process a single browser job
 */
async function processJob(job) {
  const { id, type, input, created_by } = job;

  console.log(`[Job ${id}] Starting browser job type=${type}`);
  activePages.set(id, { startTime: Date.now(), type });

  let page = null;
  try {
    const handler = getHandler(type);

    // Create a new page from the shared browser
    page = await browser.newPage();

    // Set default timeout
    page.setDefaultTimeout(CONFIG.timeout);

    // Run the handler with (page, job, config) signature
    const output = await handler(page, { id, type, input, created_by }, CONFIG);

    // Mark job as complete with output
    await updateJobStatus(id, 'completed', output, null);
    console.log(`[Job ${id}] Completed successfully`);
  } catch (error) {
    console.error(`[Job ${id}] Error:`, error);
    await updateJobStatus(id, 'failed', null, error.message);
    throw error;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    activePages.delete(id);
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(jobId, status, output, errorMessage) {
  await db.query(
    `UPDATE browser_jobs
     SET status = $1,
         output = $2,
         error = $3,
         completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completed_at END
     WHERE id = $4`,
    [status, output ? JSON.stringify(output) : null, errorMessage, jobId]
  );
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully');

  const timeout = setTimeout(() => {
    console.log('[Worker] Shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);

  // Wait for active pages to finish
  while (activePages.size > 0) {
    console.log(`[Worker] Waiting for ${activePages.size} active pages to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  clearTimeout(timeout);

  if (browser) {
    await browser.close().catch(() => {});
    console.log('[Worker] Browser closed');
  }

  await db.end();
  console.log('[Worker] Shutdown complete');
  process.exit(0);
});

// Start the worker
startWorker().catch(error => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
