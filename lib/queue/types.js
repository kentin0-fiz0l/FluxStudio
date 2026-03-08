/**
 * Job Queue Type Definitions
 *
 * Defines job types, queue names, and configuration for BullMQ workers.
 */

/**
 * Queue names - each maps to a separate BullMQ queue
 */
const QUEUES = {
  AI_ANALYSIS: 'ai-analysis',
  EMAIL: 'email',
  EXPORT: 'export',
};

/**
 * Job type definitions with default options
 */
const JOB_TYPES = {
  // AI Analysis jobs
  DESIGN_ANALYSIS: {
    queue: QUEUES.AI_ANALYSIS,
    name: 'design-analysis',
    defaultOpts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 }, // Keep completed jobs for 24h
      removeOnFail: { age: 604800 },    // Keep failed jobs for 7 days
    },
  },
  FORMATION_AI_SUGGEST: {
    queue: QUEUES.AI_ANALYSIS,
    name: 'formation-ai-suggest',
    defaultOpts: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  },
  CONVERSATION_SUMMARY: {
    queue: QUEUES.AI_ANALYSIS,
    name: 'conversation-summary',
    defaultOpts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  },

  // Email jobs
  WELCOME_EMAIL: {
    queue: QUEUES.EMAIL,
    name: 'welcome-email',
    defaultOpts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  },
  VERIFICATION_EMAIL: {
    queue: QUEUES.EMAIL,
    name: 'verification-email',
    defaultOpts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  },
  PASSWORD_RESET_EMAIL: {
    queue: QUEUES.EMAIL,
    name: 'password-reset-email',
    defaultOpts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  },
  NOTIFICATION_EMAIL: {
    queue: QUEUES.EMAIL,
    name: 'notification-email',
    defaultOpts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  },

  // Export jobs
  PDF_EXPORT: {
    queue: QUEUES.EXPORT,
    name: 'pdf-export',
    defaultOpts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
      timeout: 120000, // 2 minute timeout for exports
    },
  },
  FORMATION_EXPORT: {
    queue: QUEUES.EXPORT,
    name: 'formation-export',
    defaultOpts: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
      timeout: 180000, // 3 minute timeout
    },
  },
  VIDEO_EXPORT: {
    queue: QUEUES.EXPORT,
    name: 'video-export',
    defaultOpts: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
      timeout: 600000, // 10 minute timeout for video
    },
  },
};

module.exports = {
  QUEUES,
  JOB_TYPES,
};
