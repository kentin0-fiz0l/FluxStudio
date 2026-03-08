/**
 * Email Worker
 *
 * Processes async email sending jobs:
 * - welcome-email: Welcome email after signup
 * - verification-email: Email verification
 * - password-reset-email: Password reset
 * - notification-email: General notifications
 *
 * Usage: Start as a separate process or import and call createWorker()
 */

const { createLogger } = require('../../logger');
const log = createLogger('Worker:Email');

/**
 * Process an email job
 * @param {Object} job - BullMQ job instance
 * @returns {Promise<Object>} Job result
 */
async function processor(job) {
  const { name, data } = job;
  log.info('Processing email job', { jobId: job.id, name, to: data.to });

  let emailService;
  try {
    emailService = require('../../email/emailService').emailService;
  } catch (e) {
    throw new Error('Email service not available');
  }

  switch (name) {
    case 'welcome-email': {
      const { to, userName } = data;
      const sent = await emailService.sendWelcomeEmail(to, userName || 'there');
      if (!sent) throw new Error('Failed to send welcome email');
      return { sent: true, type: 'welcome', to };
    }

    case 'verification-email': {
      const { to, token, userName } = data;
      const sent = await emailService.sendVerificationEmail(to, token, userName || 'there');
      if (!sent) throw new Error('Failed to send verification email');
      return { sent: true, type: 'verification', to };
    }

    case 'password-reset-email': {
      const { to, token, userName } = data;
      const sent = await emailService.sendPasswordResetEmail(to, token, userName || 'there');
      if (!sent) throw new Error('Failed to send password reset email');
      return { sent: true, type: 'password-reset', to };
    }

    case 'notification-email': {
      const { to, subject, body, userName } = data;
      // Use a generic send method if available, or fall back
      if (emailService.sendNotificationEmail) {
        const sent = await emailService.sendNotificationEmail(to, subject, body, userName);
        if (!sent) throw new Error('Failed to send notification email');
      } else {
        log.warn('sendNotificationEmail not available, skipping', { to, subject });
      }
      return { sent: true, type: 'notification', to };
    }

    default:
      throw new Error(`Unknown email job type: ${name}`);
  }
}

/**
 * Create and start the email worker
 * @param {Object} redisConfig - Redis connection config
 * @returns {Object|null} Worker instance or null if bullmq not available
 */
function createWorker(redisConfig) {
  try {
    const { Worker } = require('bullmq');

    const worker = new Worker('email', processor, {
      connection: redisConfig,
      concurrency: 5, // Process 5 emails at a time
      limiter: {
        max: 30,
        duration: 60000, // Max 30 emails per minute
      },
    });

    worker.on('completed', (job) => {
      log.info('Email job completed', { jobId: job.id, name: job.name });
    });

    worker.on('failed', (job, err) => {
      log.error('Email job failed', { jobId: job?.id, name: job?.name, error: err.message });
    });

    log.info('Email worker started');
    return worker;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.info('Email worker disabled: bullmq not installed');
    } else {
      log.error('Failed to create email worker', error);
    }
    return null;
  }
}

module.exports = {
  processor,
  createWorker,
};
