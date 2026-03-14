/**
 * Shared Anthropic Client - Singleton factory
 *
 * Replaces 6+ separate client initializations across the codebase.
 * Lazily initializes when first requested; returns null if API key is missing.
 */

const { createLogger } = require('../logger');
const log = createLogger('AIClient');

let anthropic = null;
let initialized = false;

/**
 * Get the shared Anthropic client instance.
 * Returns null if ANTHROPIC_API_KEY is not set.
 *
 * @returns {import('@anthropic-ai/sdk') | null}
 */
function getClient() {
  if (initialized) return anthropic;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn('ANTHROPIC_API_KEY not configured. AI features will be unavailable.');
    initialized = true;
    return null;
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey });
    initialized = true;
    return anthropic;
  } catch (e) {
    log.error('Failed to initialize Anthropic SDK', { error: e.message });
    initialized = true;
    return null;
  }
}

/**
 * Check if the Anthropic client is available.
 * @returns {boolean}
 */
function isAvailable() {
  return !!getClient();
}

/**
 * Require the Anthropic client, throwing if unavailable.
 * Useful for services that cannot operate without AI.
 *
 * @returns {import('@anthropic-ai/sdk')}
 * @throws {Error} if client is not configured
 */
function requireClient() {
  const client = getClient();
  if (!client) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.');
  }
  return client;
}

/**
 * Reset the client singleton (for testing).
 */
function _resetForTesting() {
  anthropic = null;
  initialized = false;
}

module.exports = {
  getClient,
  isAvailable,
  requireClient,
  _resetForTesting,
};
