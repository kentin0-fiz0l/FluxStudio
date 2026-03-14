/**
 * Centralized AI Configuration - Single source of truth for model routing
 *
 * Exports:
 * - MODELS: Catalog of available models with metadata
 * - getModelForTask(taskType): Smart routing with env var overrides
 * - getMaxTokensForTask(taskType): Per-task output limits
 * - getExtendedThinkingConfig(taskType): Extended thinking budget or null
 * - buildApiParams(taskType, overrides): Complete API params object
 */

const { createLogger } = require('../logger');
const log = createLogger('AIConfig');

// ============================================================================
// Model Catalog
// ============================================================================

const MODELS = {
  opus: {
    id: 'claude-opus-4-6',
    tier: 'opus',
    maxOutputTokens: 128000,
    capabilities: ['extended-thinking', 'vision', 'tool-use'],
  },
  sonnet: {
    id: 'claude-sonnet-4-6',
    tier: 'sonnet',
    maxOutputTokens: 64000,
    capabilities: ['extended-thinking', 'vision', 'tool-use'],
  },
  haiku: {
    id: 'claude-haiku-4-5-20251001',
    tier: 'haiku',
    maxOutputTokens: 64000,
    capabilities: ['extended-thinking', 'vision', 'tool-use'],
  },
};

// ============================================================================
// Task Routing
// ============================================================================

/** @type {Record<string, { model: keyof typeof MODELS, maxTokens: number, thinkingBudget?: number }>} */
const TASK_ROUTING = {
  // Lightweight tasks -> Haiku (cheapest)
  'search':        { model: 'haiku',  maxTokens: 1024 },
  'summarize':     { model: 'haiku',  maxTokens: 512 },
  'daily-brief':   { model: 'haiku',  maxTokens: 200 },
  'palette':       { model: 'haiku',  maxTokens: 1024 },

  // Interactive tasks -> Sonnet (best speed/quality)
  'chat':            { model: 'sonnet', maxTokens: 8192 },
  'chat-sync':       { model: 'sonnet', maxTokens: 8192 },
  'design-feedback': { model: 'sonnet', maxTokens: 4096 },
  'metmap':          { model: 'sonnet', maxTokens: 4096 },
  'template':        { model: 'sonnet', maxTokens: 2048 },
  'drill-paths':     { model: 'sonnet', maxTokens: 4096 },
  'sets':            { model: 'sonnet', maxTokens: 4096 },
  'critique':        { model: 'sonnet', maxTokens: 4096 },
  'project-structure': { model: 'sonnet', maxTokens: 1024 },
  'agent-chat':      { model: 'sonnet', maxTokens: 1024 },
  'summary':         { model: 'sonnet', maxTokens: 1024 },
  'test':            { model: 'sonnet', maxTokens: 1024 },

  // Complex reasoning tasks -> Opus (extended thinking enabled)
  'design-review':    { model: 'opus', maxTokens: 2048, thinkingBudget: 10000 },
  'code-generate':    { model: 'opus', maxTokens: 32000, thinkingBudget: 15000 },
  'show-generate':    { model: 'opus', maxTokens: 64000, thinkingBudget: 10000 },
  'formation-draft':  { model: 'opus', maxTokens: 4096, thinkingBudget: 12000 },
};

// Legacy env var mappings for backward compatibility
const ENV_VAR_LEGACY = {
  'design-feedback': 'DESIGN_AI_MODEL',
  'search':          'AI_SEARCH_MODEL',
  'metmap':          'METMAP_AI_MODEL',
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the model ID for a given task type.
 * Checks env var overrides first, then falls back to routing table.
 *
 * @param {string} taskType
 * @returns {string} Model ID (e.g. 'claude-sonnet-4-6')
 */
function getModelForTask(taskType) {
  // Check new-style env var: FLUXSTUDIO_MODEL_CHAT, etc.
  const envKey = `FLUXSTUDIO_MODEL_${taskType.toUpperCase().replace(/-/g, '_')}`;
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  // Check legacy env var
  const legacyKey = ENV_VAR_LEGACY[taskType];
  if (legacyKey && process.env[legacyKey]) {
    return process.env[legacyKey];
  }

  const routing = TASK_ROUTING[taskType];
  if (!routing) {
    log.warn(`Unknown task type "${taskType}", falling back to Sonnet`);
    return MODELS.sonnet.id;
  }

  return MODELS[routing.model].id;
}

/**
 * Get max output tokens for a task type.
 *
 * @param {string} taskType
 * @returns {number}
 */
function getMaxTokensForTask(taskType) {
  const routing = TASK_ROUTING[taskType];
  return routing?.maxTokens ?? 4096;
}

/**
 * Get extended thinking configuration for a task type.
 * Returns null if the task doesn't use extended thinking.
 *
 * @param {string} taskType
 * @returns {{ type: 'enabled', budget_tokens: number } | null}
 */
function getExtendedThinkingConfig(taskType) {
  const routing = TASK_ROUTING[taskType];
  if (!routing?.thinkingBudget) return null;

  return {
    type: 'enabled',
    budget_tokens: routing.thinkingBudget,
  };
}

/**
 * Build complete API params for a Claude messages.create() call.
 * Merges task defaults with caller overrides.
 *
 * @param {string} taskType
 * @param {Object} [overrides] - Partial params to merge (system, messages, etc.)
 * @returns {Object} Params ready for anthropic.messages.create()
 */
function buildApiParams(taskType, overrides = {}) {
  const model = overrides.model || getModelForTask(taskType);
  const maxTokens = overrides.max_tokens || getMaxTokensForTask(taskType);
  const thinking = getExtendedThinkingConfig(taskType);

  const params = {
    model,
    max_tokens: maxTokens,
    ...overrides,
  };

  // Add extended thinking if configured and not overridden
  if (thinking && !overrides.thinking) {
    params.thinking = thinking;
  }

  return params;
}

module.exports = {
  MODELS,
  TASK_ROUTING,
  getModelForTask,
  getMaxTokensForTask,
  getExtendedThinkingConfig,
  buildApiParams,
};
