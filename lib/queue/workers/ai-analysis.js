/**
 * AI Analysis Worker
 *
 * Processes async AI analysis jobs:
 * - design-analysis: Analyze design images
 * - formation-ai-suggest: Generate AI formation suggestions
 * - conversation-summary: Generate conversation summaries
 *
 * Usage: Start as a separate process or import and call createWorker()
 */

const { createLogger } = require('../../logger');
const log = createLogger('Worker:AIAnalysis');

/**
 * Process an AI analysis job
 * @param {Object} job - BullMQ job instance
 * @returns {Promise<Object>} Job result
 */
async function processor(job) {
  const { name, data } = job;
  log.info('Processing AI analysis job', { jobId: job.id, name, userId: data.userId });

  switch (name) {
    case 'design-analysis':
      return await processDesignAnalysis(data);

    case 'formation-ai-suggest':
      return await processFormationSuggest(data);

    case 'conversation-summary':
      return await processConversationSummary(data);

    default:
      throw new Error(`Unknown AI analysis job type: ${name}`);
  }
}

async function processDesignAnalysis(data) {
  const { userId, projectId, imageUrl } = data;

  const AIService = require('../../services/AIService');
  const result = await AIService.analyzeDesign(projectId, userId, imageUrl);

  if (!result.success) {
    throw new Error(result.error || 'Design analysis failed');
  }

  log.info('Design analysis completed', { userId, projectId });
  return result.data;
}

async function processFormationSuggest(data) {
  const { userId, startPositions, endPositions, style } = data;

  // Delegate to AI service
  const AIService = require('../../services/AIService');
  const result = await AIService.interpretSearch(userId, `suggest ${style || 'smooth'} drill paths`);

  if (!result.success) {
    throw new Error(result.error || 'Formation suggestion failed');
  }

  log.info('Formation AI suggestion completed', { userId });
  return result.data;
}

async function processConversationSummary(data) {
  const { conversationId } = data;

  try {
    const aiSummaryService = require('../../../services/ai-summary-service').aiSummaryService;

    if (!aiSummaryService || !aiSummaryService.isEnabled()) {
      throw new Error('AI summary service not available');
    }

    const messagingAdapter = require('../../../database/messaging-conversations-adapter');
    const messages = await messagingAdapter.listMessages({
      conversationId,
      limit: 100,
    });

    if (!messages || messages.length < 3) {
      return { skipped: true, reason: 'Not enough messages for summary' };
    }

    const summaryResult = await aiSummaryService.generateSummary({
      conversationId,
      projectId: null,
      projectMeta: {},
      messages: messages.reverse(),
    });

    if (!summaryResult.success) {
      throw new Error(summaryResult.error || 'Summary generation failed');
    }

    const stored = await aiSummaryService.storeSummary(summaryResult);
    log.info('Conversation summary completed', { conversationId });
    return stored;
  } catch (error) {
    log.error('Conversation summary error', error);
    throw error;
  }
}

/**
 * Create and start the AI analysis worker
 * @param {Object} redisConfig - Redis connection config
 * @returns {Object|null} Worker instance or null if bullmq not available
 */
function createWorker(redisConfig) {
  try {
    const { Worker } = require('bullmq');

    const worker = new Worker('ai-analysis', processor, {
      connection: redisConfig,
      concurrency: 2, // Process 2 jobs at a time
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute (API rate limits)
      },
    });

    worker.on('completed', (job) => {
      log.info('AI analysis job completed', { jobId: job.id, name: job.name });
    });

    worker.on('failed', (job, err) => {
      log.error('AI analysis job failed', { jobId: job?.id, name: job?.name, error: err.message });
    });

    log.info('AI analysis worker started');
    return worker;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.info('AI analysis worker disabled: bullmq not installed');
    } else {
      log.error('Failed to create AI analysis worker', error);
    }
    return null;
  }
}

module.exports = {
  processor,
  createWorker,
};
