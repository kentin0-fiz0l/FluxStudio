/**
 * Job Queue Setup
 *
 * BullMQ queue infrastructure with Redis connection.
 * Creates named queues for async job processing:
 * - ai-analysis: Async AI analysis jobs (design review, summarization)
 * - email: Email sending (welcome, verification, notifications)
 * - export: File export processing (PDF, formation, video)
 *
 * Each queue is configured with retry logic (3 retries, exponential backoff).
 * Workers are started separately via worker files in lib/queue/workers/.
 */

const { createLogger } = require('../logger');
const log = createLogger('JobQueue');
const { QUEUES, JOB_TYPES } = require('./types');

// Queue instances (lazy-initialized)
let queues = null;
let isInitialized = false;

// Redis connection config
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;

  if (!redisUrl) {
    return null;
  }

  try {
    const url = new URL(redisUrl);
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
    };

    if (url.password) {
      config.password = url.password;
    }

    if (url.username && url.username !== 'default') {
      config.username = url.username;
    }

    // Enable TLS for production Redis (DigitalOcean uses rediss:// protocol)
    if (url.protocol === 'rediss:' || process.env.REDIS_TLS === 'true') {
      config.tls = { rejectUnauthorized: false };
    }

    return config;
  } catch (error) {
    log.error('Failed to parse REDIS_URL', error);
    return null;
  }
}

/**
 * Initialize queues (lazy - only when first needed)
 * @returns {Object|null} Map of queue name to Queue instance, or null if Redis not available
 */
function initializeQueues() {
  if (isInitialized) return queues;
  isInitialized = true;

  const redisConfig = getRedisConfig();
  if (!redisConfig) {
    log.info('Job queue disabled: Redis not configured. Set REDIS_URL to enable.');
    return null;
  }

  try {
    // BullMQ is an optional dependency - gracefully handle if not installed
    const { Queue } = require('bullmq');

    queues = {};

    // Create a queue for each defined queue name
    for (const [key, queueName] of Object.entries(QUEUES)) {
      queues[queueName] = new Queue(queueName, {
        connection: redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: { age: 86400 }, // Keep completed for 24h
          removeOnFail: { age: 604800 },    // Keep failed for 7 days
        },
      });

      log.info('Queue created', { queue: queueName });
    }

    return queues;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.info('Job queue disabled: bullmq package not installed. Run npm install bullmq to enable.');
    } else {
      log.error('Failed to initialize job queues', error);
    }
    return null;
  }
}

/**
 * Add a job to a queue
 * @param {string} jobType - Job type key from JOB_TYPES
 * @param {Object} data - Job payload data
 * @param {Object} opts - Optional BullMQ job options override
 * @returns {Promise<Object|null>} Job instance or null if queue not available
 */
async function addJob(jobType, data, opts = {}) {
  const jobDef = JOB_TYPES[jobType];
  if (!jobDef) {
    log.error('Unknown job type', { jobType });
    return null;
  }

  const queueMap = initializeQueues();
  if (!queueMap) {
    log.warn('Job queue not available, skipping job', { jobType });
    return null;
  }

  const queue = queueMap[jobDef.queue];
  if (!queue) {
    log.error('Queue not found', { queue: jobDef.queue, jobType });
    return null;
  }

  try {
    const jobOpts = { ...jobDef.defaultOpts, ...opts };
    const job = await queue.add(jobDef.name, data, jobOpts);
    log.info('Job added', { jobType, jobId: job.id, queue: jobDef.queue });
    return job;
  } catch (error) {
    log.error('Failed to add job', error, { jobType });
    return null;
  }
}

/**
 * Health check for job queue system
 * @returns {Promise<Object>} Health status
 */
async function healthCheck() {
  const queueMap = initializeQueues();

  if (!queueMap) {
    return {
      status: 'disabled',
      message: 'Job queue not configured (Redis not available)',
    };
  }

  const queueStats = {};

  try {
    for (const [name, queue] of Object.entries(queueMap)) {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        queueStats[name] = { waiting, active, completed, failed };
      } catch (err) {
        queueStats[name] = { error: err.message };
      }
    }

    return {
      status: 'healthy',
      queues: queueStats,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

/**
 * Gracefully close all queues
 */
async function closeAll() {
  if (!queues) return;

  const closePromises = Object.values(queues).map(queue =>
    queue.close().catch(err => log.error('Error closing queue', err))
  );

  await Promise.all(closePromises);
  log.info('All queues closed');
}

module.exports = {
  initializeQueues,
  addJob,
  healthCheck,
  closeAll,
  QUEUES,
  JOB_TYPES,
};
