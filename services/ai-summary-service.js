/**
 * AI Summary Service - Pulse-aware Conversation Summaries
 *
 * Provides:
 * - Signal derivation (ClarityState + PulseTone) from conversation metrics
 * - Prompt building for AI summary generation
 * - Provider interface with graceful fallback when AI is disabled
 *
 * Design Philosophy:
 * - AI should feel like a calm collaborator: concise, non-judgmental, action-oriented
 * - Summaries adapt to conversation "pulse" (activity intensity)
 * - Detail level adapts to "clarity" (how focused vs uncertain the discussion is)
 */

const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../database/config');

// =============================================================================
// AI USAGE TRACKING & RATE LIMITING
// =============================================================================

/**
 * In-memory AI usage log for cost tracking.
 * Each entry: { userId, model, inputTokens, outputTokens, timestamp, endpoint }
 * Can be persisted to DB later.
 */
const ai_usage_logs = [];

/**
 * Log token usage for an AI request
 *
 * @param {Object} params
 * @param {string} params.userId - User who made the request
 * @param {string} params.model - Model used (e.g. 'claude-sonnet-4-5-20250929')
 * @param {number} params.inputTokens - Input tokens consumed
 * @param {number} params.outputTokens - Output tokens consumed
 * @param {string} [params.endpoint] - Which endpoint/feature triggered the call
 */
function logAiUsage({ userId, model, inputTokens, outputTokens, endpoint = 'summary' }) {
  const entry = {
    userId: userId || 'system',
    model,
    inputTokens: inputTokens || 0,
    outputTokens: outputTokens || 0,
    totalTokens: (inputTokens || 0) + (outputTokens || 0),
    timestamp: new Date().toISOString(),
    endpoint,
  };
  ai_usage_logs.push(entry);

  // Keep log bounded to last 10,000 entries to prevent memory growth
  if (ai_usage_logs.length > 10000) {
    ai_usage_logs.splice(0, ai_usage_logs.length - 10000);
  }

  console.log(
    `[AI Usage] user=${entry.userId} model=${entry.model} ` +
    `input=${entry.inputTokens} output=${entry.outputTokens} ` +
    `total=${entry.totalTokens} endpoint=${entry.endpoint}`
  );
}

/**
 * Get usage logs, optionally filtered by userId
 *
 * @param {string} [userId] - Filter by user
 * @param {number} [limit=100] - Max entries to return
 * @returns {Array} Usage log entries
 */
function getAiUsageLogs(userId, limit = 100) {
  let logs = ai_usage_logs;
  if (userId) {
    logs = logs.filter(l => l.userId === userId);
  }
  return logs.slice(-limit);
}

/**
 * In-memory rate limiter for AI summary requests.
 * Map of userId -> array of request timestamps.
 * 10 requests per minute per user.
 */
const summaryRateLimiter = new Map();
const SUMMARY_RATE_LIMIT_MAX = 10;
const SUMMARY_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

/**
 * Check if a user is rate limited for summary generation
 *
 * @param {string} userId
 * @returns {{ allowed: boolean, retryAfterMs?: number, remaining: number }}
 */
function checkSummaryRateLimit(userId) {
  if (!userId) return { allowed: true, remaining: SUMMARY_RATE_LIMIT_MAX };

  const now = Date.now();
  let timestamps = summaryRateLimiter.get(userId) || [];

  // Remove timestamps outside the window
  timestamps = timestamps.filter(t => now - t < SUMMARY_RATE_LIMIT_WINDOW_MS);
  summaryRateLimiter.set(userId, timestamps);

  if (timestamps.length >= SUMMARY_RATE_LIMIT_MAX) {
    const oldestInWindow = timestamps[0];
    const retryAfterMs = SUMMARY_RATE_LIMIT_WINDOW_MS - (now - oldestInWindow);
    return {
      allowed: false,
      retryAfterMs,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: SUMMARY_RATE_LIMIT_MAX - timestamps.length,
  };
}

/**
 * Record a rate limit hit for a user
 * @param {string} userId
 */
function recordSummaryRequest(userId) {
  if (!userId) return;
  const timestamps = summaryRateLimiter.get(userId) || [];
  timestamps.push(Date.now());
  summaryRateLimiter.set(userId, timestamps);
}

// Periodically clean up stale rate limiter entries (every 5 minutes)
const _rateLimiterCleanup = setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of summaryRateLimiter.entries()) {
    const active = timestamps.filter(t => now - t < SUMMARY_RATE_LIMIT_WINDOW_MS);
    if (active.length === 0) {
      summaryRateLimiter.delete(userId);
    } else {
      summaryRateLimiter.set(userId, active);
    }
  }
}, 5 * 60 * 1000);
if (_rateLimiterCleanup.unref) _rateLimiterCleanup.unref();

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

/**
 * Pulse Tone - derived from activity intensity signals
 * @typedef {'calm' | 'neutral' | 'intense'} PulseTone
 *
 * - calm: Steady, measured pace (good for reflective summaries)
 * - neutral: Normal activity (balanced summary style)
 * - intense: Bursty, high-volume activity (more terse, action-focused)
 */

/**
 * Clarity State - derived from conversation heuristics
 * @typedef {'focused' | 'mixed' | 'uncertain'} ClarityState
 *
 * - focused: Clear direction, few open questions, recent decisions
 * - mixed: Some clarity but also some uncertainty
 * - uncertain: Many questions, no recent decisions, unclear direction
 */

/**
 * Signal Metrics - raw inputs for derivation
 * @typedef {Object} SignalMetrics
 * @property {number} messageCount - Total messages in analysis window
 * @property {number} participantCount - Number of unique participants
 * @property {number} questionRatio - Ratio of questions (?) to statements
 * @property {number} nextStepsCount - Detected "next steps" markers
 * @property {number} unresolvedQuestions - Questions without follow-up answers
 * @property {number} hoursSinceLastDecision - Time since last detected decision
 * @property {number} activityBurstiness - 0-1 score of how bursty activity is
 * @property {number} avgMessagesPerHour - Average message rate
 */

/**
 * Summary Output Structure
 * @typedef {Object} SummaryOutput
 * @property {string[]} summary - 3-6 bullet points
 * @property {Array<{text: string, messageId?: string, timestamp?: string}>} decisions - 0-5 decisions
 * @property {Array<{text: string, messageId?: string, askedBy?: string}>} openQuestions - 0-5 questions
 * @property {Array<{text: string, priority?: string}>} nextSteps - 0-5 action items
 * @property {string} sentiment - One of: productive, neutral, blocked, energetic
 */

// Heuristic thresholds (tunable)
const THRESHOLDS = {
  // Clarity derivation
  QUESTION_RATIO_HIGH: 0.4,      // >40% questions = uncertain
  QUESTION_RATIO_LOW: 0.15,     // <15% questions = focused
  HOURS_SINCE_DECISION_STALE: 48, // >48h since decision = less focused
  UNRESOLVED_QUESTIONS_HIGH: 3,  // >3 unresolved = uncertain

  // Pulse derivation
  BURSTINESS_HIGH: 0.7,         // >0.7 = intense
  BURSTINESS_LOW: 0.3,          // <0.3 = calm
  MESSAGES_PER_HOUR_HIGH: 10,   // >10 msg/hr = intense
  MESSAGES_PER_HOUR_LOW: 2,     // <2 msg/hr = calm

  // Summary window
  MAX_MESSAGES_FOR_SUMMARY: 100,
  MIN_MESSAGES_FOR_SUMMARY: 3,
};

// =============================================================================
// SIGNAL EXTRACTION
// =============================================================================

/**
 * Extract signal metrics from conversation messages
 *
 * @param {Array} messages - Array of message objects with {id, userId, text, createdAt}
 * @param {Object} options - Optional configuration
 * @returns {SignalMetrics}
 */
function extractSignalMetrics(messages, options = {}) {
  if (!messages || messages.length === 0) {
    return {
      messageCount: 0,
      participantCount: 0,
      questionRatio: 0,
      nextStepsCount: 0,
      unresolvedQuestions: 0,
      hoursSinceLastDecision: 999,
      activityBurstiness: 0,
      avgMessagesPerHour: 0,
    };
  }

  // Basic counts
  const messageCount = messages.length;
  const participants = new Set(messages.map(m => m.userId || m.user_id));
  const participantCount = participants.size;

  // Question detection (simple heuristic: ends with ?)
  const questions = messages.filter(m => {
    const text = m.text || m.content || '';
    return text.trim().endsWith('?');
  });
  const questionRatio = questions.length / messageCount;

  // Next steps detection (pattern matching)
  const nextStepsPatterns = [
    /next steps?/i,
    /action items?/i,
    /to-?do/i,
    /we (should|need to|will|can)/i,
    /let'?s /i,
    /i'?ll /i,
    /follow[- ]up/i,
  ];
  const nextStepsCount = messages.filter(m => {
    const text = m.text || m.content || '';
    return nextStepsPatterns.some(p => p.test(text));
  }).length;

  // Decision detection (pattern matching)
  const decisionPatterns = [
    /decided/i,
    /we'?ll go with/i,
    /agreed/i,
    /confirmed/i,
    /let'?s do/i,
    /final (decision|call)/i,
    /approved/i,
  ];

  let lastDecisionTime = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].text || messages[i].content || '';
    if (decisionPatterns.some(p => p.test(text))) {
      lastDecisionTime = new Date(messages[i].createdAt || messages[i].created_at);
      break;
    }
  }

  const hoursSinceLastDecision = lastDecisionTime
    ? (Date.now() - lastDecisionTime.getTime()) / (1000 * 60 * 60)
    : 999;

  // Unresolved questions: questions not followed by non-question from others
  let unresolvedQuestions = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const text = m.text || m.content || '';
    if (text.trim().endsWith('?')) {
      // Check if there's a follow-up from someone else
      let resolved = false;
      for (let j = i + 1; j < Math.min(i + 5, messages.length); j++) {
        const followUp = messages[j];
        const followUpText = followUp.text || followUp.content || '';
        const differentUser = (followUp.userId || followUp.user_id) !== (m.userId || m.user_id);
        if (differentUser && !followUpText.trim().endsWith('?')) {
          resolved = true;
          break;
        }
      }
      if (!resolved) unresolvedQuestions++;
    }
  }

  // Activity burstiness: variance in time between messages
  // Higher variance = more bursty
  let activityBurstiness = 0;
  if (messages.length >= 3) {
    const timestamps = messages.map(m => new Date(m.createdAt || m.created_at).getTime());
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, b) => a + Math.pow(b - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    // Normalize: high stdDev relative to avg = bursty
    activityBurstiness = Math.min(1, stdDev / (avgGap + 1));
  }

  // Average messages per hour
  let avgMessagesPerHour = 0;
  if (messages.length >= 2) {
    const first = new Date(messages[0].createdAt || messages[0].created_at).getTime();
    const last = new Date(messages[messages.length - 1].createdAt || messages[messages.length - 1].created_at).getTime();
    const hours = (last - first) / (1000 * 60 * 60);
    avgMessagesPerHour = hours > 0 ? messageCount / hours : messageCount;
  }

  return {
    messageCount,
    participantCount,
    questionRatio: Math.round(questionRatio * 100) / 100,
    nextStepsCount,
    unresolvedQuestions,
    hoursSinceLastDecision: Math.round(hoursSinceLastDecision * 10) / 10,
    activityBurstiness: Math.round(activityBurstiness * 100) / 100,
    avgMessagesPerHour: Math.round(avgMessagesPerHour * 10) / 10,
  };
}

// =============================================================================
// STATE DERIVATION
// =============================================================================

/**
 * Derive ClarityState from signal metrics
 *
 * Heuristics:
 * - High question ratio + many unresolved questions = uncertain
 * - Low question ratio + recent decisions = focused
 * - Otherwise = mixed
 *
 * @param {SignalMetrics} metrics
 * @returns {ClarityState}
 */
function deriveClarityState(metrics) {
  let score = 0; // Higher = more focused

  // Question ratio contribution
  if (metrics.questionRatio < THRESHOLDS.QUESTION_RATIO_LOW) {
    score += 2; // Low questions = focused
  } else if (metrics.questionRatio > THRESHOLDS.QUESTION_RATIO_HIGH) {
    score -= 2; // Many questions = uncertain
  }

  // Unresolved questions contribution
  if (metrics.unresolvedQuestions === 0) {
    score += 1;
  } else if (metrics.unresolvedQuestions >= THRESHOLDS.UNRESOLVED_QUESTIONS_HIGH) {
    score -= 2;
  }

  // Time since decision contribution
  if (metrics.hoursSinceLastDecision < 24) {
    score += 1; // Recent decision = focused
  } else if (metrics.hoursSinceLastDecision > THRESHOLDS.HOURS_SINCE_DECISION_STALE) {
    score -= 1; // Stale = less focused
  }

  // Next steps detected = more focused
  if (metrics.nextStepsCount >= 2) {
    score += 1;
  }

  // Derive state from score
  if (score >= 2) return 'focused';
  if (score <= -2) return 'uncertain';
  return 'mixed';
}

/**
 * Derive PulseTone from signal metrics
 *
 * Heuristics:
 * - High burstiness + high message rate = intense
 * - Low burstiness + low message rate = calm
 * - Otherwise = neutral
 *
 * @param {SignalMetrics} metrics
 * @returns {PulseTone}
 */
function derivePulseTone(metrics) {
  let intensityScore = 0;

  // Burstiness contribution
  if (metrics.activityBurstiness > THRESHOLDS.BURSTINESS_HIGH) {
    intensityScore += 2;
  } else if (metrics.activityBurstiness < THRESHOLDS.BURSTINESS_LOW) {
    intensityScore -= 1;
  }

  // Message rate contribution
  if (metrics.avgMessagesPerHour > THRESHOLDS.MESSAGES_PER_HOUR_HIGH) {
    intensityScore += 2;
  } else if (metrics.avgMessagesPerHour < THRESHOLDS.MESSAGES_PER_HOUR_LOW) {
    intensityScore -= 1;
  }

  // Participant count: more participants can indicate intensity
  if (metrics.participantCount >= 4) {
    intensityScore += 1;
  }

  // Derive tone
  if (intensityScore >= 2) return 'intense';
  if (intensityScore <= -1) return 'calm';
  return 'neutral';
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

/**
 * Build AI prompt for summary generation
 *
 * The prompt adapts based on pulse/clarity states:
 * - Intense pulse: Request more terse, action-focused output
 * - Calm pulse: Allow more reflective, detailed summary
 * - Uncertain clarity: Emphasize surfacing open questions
 * - Focused clarity: Emphasize decisions and next steps
 *
 * @param {Object} params
 * @param {Array} params.messages - Messages to summarize (bounded window)
 * @param {Object} params.projectMeta - Project metadata {name, goal}
 * @param {PulseTone} params.pulseTone
 * @param {ClarityState} params.clarityState
 * @returns {Object} {systemPrompt, userPrompt}
 */
function buildSummaryPrompt({ messages, projectMeta = {}, pulseTone, clarityState }) {
  // Tone modifiers based on pulse
  const toneInstructions = {
    calm: 'Take a measured, reflective approach. It\'s okay to include context.',
    neutral: 'Be clear and balanced in your summary.',
    intense: 'Be extremely concise. Focus on actions and blockers. Skip pleasantries.',
  };

  // Detail modifiers based on clarity
  const clarityInstructions = {
    focused: 'The conversation has clear direction. Emphasize decisions made and concrete next steps.',
    mixed: 'The conversation has some clarity but also open threads. Balance decisions with outstanding questions.',
    uncertain: 'The conversation seems uncertain. Prioritize surfacing open questions and unresolved issues. Be honest if direction is unclear.',
  };

  const systemPrompt = `You are a calm, helpful assistant summarizing a team conversation.
Your role is to be a non-judgmental collaborator who helps teams stay aligned.

TONE: ${toneInstructions[pulseTone]}
FOCUS: ${clarityInstructions[clarityState]}

CRITICAL RULES:
1. Never hallucinate decisions. If something was discussed but not confirmed, say "Discussed (not confirmed)".
2. Use neutral, non-judgmental language. Avoid words like "failed", "bad", "wrong".
3. If you're uncertain about something, acknowledge it honestly.
4. Keep bullets concise (one sentence each).
5. For decisions and questions, reference the speaker name if available.
6. Sentiment should be one of: productive, neutral, blocked, energetic

OUTPUT FORMAT (JSON):
{
  "summary": ["bullet1", "bullet2", ...],
  "decisions": [{"text": "Decision text", "decidedBy": "Name (if known)"}],
  "openQuestions": [{"text": "Question text", "askedBy": "Name (if known)"}],
  "nextSteps": [{"text": "Action text", "priority": "high|medium|low"}],
  "sentiment": "productive|neutral|blocked|energetic"
}`;

  // Format messages for the prompt
  const formattedMessages = messages.slice(-THRESHOLDS.MAX_MESSAGES_FOR_SUMMARY).map(m => {
    const userName = m.userName || m.user_name || 'Unknown';
    const text = m.text || m.content || '';
    const time = m.createdAt || m.created_at;
    return `[${userName}]: ${text}`;
  }).join('\n');

  const projectContext = projectMeta.name
    ? `Project: ${projectMeta.name}${projectMeta.goal ? ` - Goal: ${projectMeta.goal}` : ''}\n\n`
    : '';

  const userPrompt = `${projectContext}Summarize this conversation:

${formattedMessages}

Provide your response as valid JSON matching the specified format. Include 3-6 summary bullets, up to 5 decisions, up to 5 open questions, and up to 5 next steps.`;

  return { systemPrompt, userPrompt };
}

// =============================================================================
// AI PROVIDER INTERFACE
// =============================================================================

/**
 * AI Provider Interface
 *
 * Implementations must provide:
 * - name: Provider identifier
 * - isEnabled(): Check if provider is available
 * - generateSummary(params): Generate summary from messages
 */

class DisabledAIProvider {
  constructor() {
    this.name = 'disabled';
  }

  isEnabled() {
    return false;
  }

  /**
   * Returns a placeholder summary when AI is disabled
   */
  async generateSummary({ messages, projectMeta, pulseTone, clarityState }) {
    const metrics = extractSignalMetrics(messages);

    return {
      success: true,
      generatedBy: 'disabled',
      summary: {
        summary: [
          'AI summaries are currently disabled.',
          `Conversation contains ${metrics.messageCount} messages from ${metrics.participantCount} participants.`,
          metrics.unresolvedQuestions > 0
            ? `There appear to be ${metrics.unresolvedQuestions} unresolved questions.`
            : 'No obvious unresolved questions detected.',
        ],
        decisions: [],
        openQuestions: [],
        nextSteps: [],
        sentiment: 'neutral',
      },
      pulseTone,
      clarityState,
      signalMetrics: metrics,
    };
  }
}

class AnthropicAIProvider {
  constructor(apiKey) {
    this.name = 'ai-anthropic';
    this.apiKey = apiKey;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = 'claude-sonnet-4-5-20250929';
  }

  isEnabled() {
    return !!this.apiKey && !!this.client && process.env.AI_SUMMARIES_ENABLED === 'true';
  }

  async generateSummary({ messages, projectMeta, pulseTone, clarityState, userId }) {
    if (!this.isEnabled()) {
      // Fallback to disabled provider
      const disabled = new DisabledAIProvider();
      return disabled.generateSummary({ messages, projectMeta, pulseTone, clarityState });
    }

    // Check rate limit
    const rateLimitResult = checkSummaryRateLimit(userId);
    if (!rateLimitResult.allowed) {
      const retryAfterSec = Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000);
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
        generatedBy: 'rate-limited',
      };
    }

    const metrics = extractSignalMetrics(messages);
    const { systemPrompt, userPrompt } = buildSummaryPrompt({
      messages,
      projectMeta,
      pulseTone,
      clarityState,
    });

    try {
      // Record the request for rate limiting
      recordSummaryRequest(userId);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content?.[0]?.text || '{}';

      // Log token usage
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      logAiUsage({
        userId,
        model: this.model,
        inputTokens,
        outputTokens,
        endpoint: 'summary',
      });

      // Parse JSON response
      let summary;
      try {
        summary = JSON.parse(content);
      } catch {
        // If JSON parse fails, create structured response from text
        summary = {
          summary: [content.slice(0, 200)],
          decisions: [],
          openQuestions: [],
          nextSteps: [],
          sentiment: 'neutral',
        };
      }

      return {
        success: true,
        generatedBy: this.name,
        summary,
        pulseTone,
        clarityState,
        signalMetrics: metrics,
        tokensUsed: { input: inputTokens, output: outputTokens },
      };
    } catch (error) {
      // Classify and handle specific API errors
      const errorMessage = sanitizeApiError(error);
      console.error('[AI Summary] Anthropic API error:', errorMessage);

      // Graceful fallback
      const disabled = new DisabledAIProvider();
      const fallback = await disabled.generateSummary({ messages, projectMeta, pulseTone, clarityState });
      return {
        ...fallback,
        error: errorMessage,
        generatedBy: 'disabled-fallback',
      };
    }
  }
}

/**
 * Sanitize API errors to never expose the API key or sensitive details
 *
 * @param {Error} error
 * @returns {string} Safe error message
 */
function sanitizeApiError(error) {
  if (!error) return 'Unknown AI service error';

  const message = error.message || '';
  const status = error.status || error.statusCode;

  // Handle specific Anthropic SDK error types
  if (status === 401) {
    return 'AI service authentication failed. Please check the API key configuration.';
  }
  if (status === 429) {
    return 'AI service rate limit exceeded. Please try again later.';
  }
  if (status === 500 || status === 503) {
    return 'AI service is temporarily unavailable. Please try again later.';
  }
  if (status === 529) {
    return 'AI service is overloaded. Please try again later.';
  }
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return 'Unable to reach AI service. Please check network connectivity.';
  }

  // Strip any potential API key leaks from error messages
  const sanitized = message
    .replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[REDACTED]')
    .replace(/x-api-key[:\s]*[^\s]+/gi, 'x-api-key: [REDACTED]')
    .replace(/api[_-]?key[:\s]*[^\s]+/gi, 'api_key: [REDACTED]');

  return sanitized || 'AI service error';
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

class AISummaryService {
  constructor() {
    // Initialize provider based on environment
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && process.env.AI_SUMMARIES_ENABLED === 'true') {
      this.provider = new AnthropicAIProvider(anthropicKey);
    } else {
      this.provider = new DisabledAIProvider();
    }
  }

  /**
   * Check if AI summaries are enabled
   */
  isEnabled() {
    return this.provider.isEnabled();
  }

  /**
   * Generate a summary for a conversation
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} [params.projectId]
   * @param {Object} [params.projectMeta] - {name, goal}
   * @param {Array} params.messages - Messages to summarize
   * @param {string} [params.userId] - User requesting the summary (for rate limiting & tracking)
   * @returns {Promise<Object>} Summary result
   */
  async generateSummary({ conversationId, projectId, projectMeta, messages, userId }) {
    if (!messages || messages.length < THRESHOLDS.MIN_MESSAGES_FOR_SUMMARY) {
      return {
        success: false,
        error: `Need at least ${THRESHOLDS.MIN_MESSAGES_FOR_SUMMARY} messages to generate summary`,
        generatedBy: 'system',
      };
    }

    // Extract signals and derive states
    const metrics = extractSignalMetrics(messages);
    const pulseTone = derivePulseTone(metrics);
    const clarityState = deriveClarityState(metrics);

    // Generate summary via provider
    const result = await this.provider.generateSummary({
      messages,
      projectMeta,
      pulseTone,
      clarityState,
      userId,
    });

    return {
      ...result,
      conversationId,
      projectId,
      messageCount: messages.length,
      messageWindowStart: messages[0]?.id,
      messageWindowEnd: messages[messages.length - 1]?.id,
    };
  }

  /**
   * Store a generated summary in the database
   *
   * @param {Object} summary - Summary result from generateSummary
   * @returns {Promise<Object>} Stored summary record
   */
  async storeSummary(summary) {
    const {
      conversationId,
      projectId,
      summary: summaryContent,
      pulseTone,
      clarityState,
      signalMetrics,
      generatedBy,
      messageWindowStart,
      messageWindowEnd,
      messageCount,
    } = summary;

    const result = await query(`
      INSERT INTO conversation_summaries (
        conversation_id, project_id, summary_json, pulse_tone, clarity_state,
        signal_metrics, generated_by, message_window_start, message_window_end,
        message_count, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (conversation_id) DO UPDATE SET
        project_id = EXCLUDED.project_id,
        summary_json = EXCLUDED.summary_json,
        pulse_tone = EXCLUDED.pulse_tone,
        clarity_state = EXCLUDED.clarity_state,
        signal_metrics = EXCLUDED.signal_metrics,
        generated_by = EXCLUDED.generated_by,
        message_window_start = EXCLUDED.message_window_start,
        message_window_end = EXCLUDED.message_window_end,
        message_count = EXCLUDED.message_count,
        updated_at = NOW()
      RETURNING *
    `, [
      conversationId,
      projectId || null,
      JSON.stringify(summaryContent || {}),
      pulseTone || 'calm',
      clarityState || 'mixed',
      JSON.stringify(signalMetrics || {}),
      generatedBy || 'system',
      messageWindowStart || null,
      messageWindowEnd || null,
      messageCount || 0,
    ]);

    return result.rows[0];
  }

  /**
   * Get stored summary for a conversation
   *
   * @param {string} conversationId
   * @returns {Promise<Object|null>}
   */
  async getSummary(conversationId) {
    const result = await query(`
      SELECT * FROM conversation_summaries
      WHERE conversation_id = $1
    `, [conversationId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      conversationId: row.conversation_id,
      projectId: row.project_id,
      summary: row.summary_json,
      pulseTone: row.pulse_tone,
      clarityState: row.clarity_state,
      signalMetrics: row.signal_metrics,
      generatedBy: row.generated_by,
      messageWindowStart: row.message_window_start,
      messageWindowEnd: row.message_window_end,
      messageCount: row.message_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Delete summary for a conversation
   *
   * @param {string} conversationId
   * @returns {Promise<boolean>}
   */
  async deleteSummary(conversationId) {
    const result = await query(`
      DELETE FROM conversation_summaries
      WHERE conversation_id = $1
    `, [conversationId]);
    return result.rowCount > 0;
  }
}

// Export singleton instance and utilities
const aiSummaryService = new AISummaryService();

module.exports = {
  aiSummaryService,
  AISummaryService,
  DisabledAIProvider,
  AnthropicAIProvider,
  extractSignalMetrics,
  deriveClarityState,
  derivePulseTone,
  buildSummaryPrompt,
  THRESHOLDS,
  // Rate limiting & usage tracking
  checkSummaryRateLimit,
  recordSummaryRequest,
  logAiUsage,
  getAiUsageLogs,
  ai_usage_logs,
  sanitizeApiError,
};
