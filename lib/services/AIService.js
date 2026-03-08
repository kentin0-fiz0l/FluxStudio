/**
 * AIService - Domain service for AI-powered operations
 *
 * Extracts business logic from route handlers into a testable,
 * reusable service layer. Accepts only primitives/plain objects,
 * handles validation and authorization, returns standardized results.
 */

const { createLogger } = require('../logger');
const log = createLogger('AIService');

// Lazy-load Anthropic client
let anthropic = null;
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

function getClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    } catch (e) {
      log.warn('Anthropic SDK not available');
    }
  }
  return anthropic;
}

// Lazy-load usage logger
let logAiUsage = null;
let sanitizeApiError = null;

function getUsageLogger() {
  if (!logAiUsage) {
    try {
      const aiService = require('../../services/ai-summary-service');
      logAiUsage = aiService.logAiUsage;
      sanitizeApiError = aiService.sanitizeApiError;
    } catch (e) {
      logAiUsage = () => {};
      sanitizeApiError = (err) => err.message || 'Unknown error';
    }
  }
  return { logAiUsage, sanitizeApiError };
}

/**
 * Analyze a design image using Claude Vision
 * @param {string} projectId - Project ID for context
 * @param {string} userId - Requesting user ID
 * @param {string} imageUrl - URL of the design image
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function analyzeDesign(projectId, userId, imageUrl) {
  try {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'AI service not configured' };
    }

    if (!imageUrl) {
      return { success: false, error: 'Image URL is required' };
    }

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return { success: false, error: `Failed to fetch image: ${imageResponse.status}` };
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64 = imageBuffer.toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    let mediaType = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    const prompt = `Analyze this design image and provide detailed feedback.

Please analyze the following aspects and respond in JSON format:
{
  "elements": [{ "type": "color|typography|layout|imagery|spacing|composition", "description": "string", "confidence": 0.0-1.0 }],
  "overallScore": 0.0-1.0,
  "strengths": ["string"],
  "improvements": ["string"],
  "accessibilityScore": 0.0-1.0,
  "moodAnalysis": { "mood": "string", "confidence": 0.0-1.0, "emotions": ["string"] }
}

Be specific, actionable, and constructive in your feedback.`;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const { logAiUsage: logUsage } = getUsageLogger();
    logUsage({
      userId,
      model: DEFAULT_MODEL,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'analyze-design',
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No response from AI' };
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse AI response' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: parsed };
  } catch (error) {
    const { sanitizeApiError: sanitize } = getUsageLogger();
    log.error('Analyze design error', { error: sanitize(error) });
    return { success: false, error: 'AI analysis failed' };
  }
}

/**
 * Generate a color palette based on parameters
 * @param {string} userId - Requesting user ID
 * @param {Object} params - Palette parameters (mood, industry, count)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function generatePalette(userId, params) {
  try {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'AI service not configured' };
    }

    const { mood = 'modern', industry = 'general', count = 5 } = params;

    const prompt = `Generate a color palette with exactly ${count} colors for a ${industry} project with a ${mood} mood.

Respond with ONLY valid JSON:
{
  "colors": [
    { "hex": "#RRGGBB", "name": "Color Name", "usage": "suggested usage" }
  ],
  "mood": "${mood}",
  "description": "brief description of why these colors work together"
}`;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: 'You are an expert color theory designer. Generate harmonious, accessible color palettes.',
      messages: [{ role: 'user', content: prompt }],
    });

    const { logAiUsage: logUsage } = getUsageLogger();
    logUsage({
      userId,
      model: DEFAULT_MODEL,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'generate-palette',
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No response from AI' };
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse AI response' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: parsed };
  } catch (error) {
    const { sanitizeApiError: sanitize } = getUsageLogger();
    log.error('Generate palette error', { error: sanitize(error) });
    return { success: false, error: 'Palette generation failed' };
  }
}

/**
 * Interpret a natural language search query into structured filters
 * @param {string} userId - Requesting user ID
 * @param {string} query - Natural language search query
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function interpretSearch(userId, query) {
  try {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'AI service not configured' };
    }

    if (!query || query.trim().length < 2) {
      return { success: false, error: 'Search query must be at least 2 characters' };
    }

    const prompt = `Interpret this search query and extract structured filters:

Query: "${query}"

Respond with ONLY valid JSON:
{
  "intent": "search type (files, projects, messages, designs, all)",
  "keywords": ["extracted keywords"],
  "filters": {
    "type": "file type filter or null",
    "dateRange": "recent/week/month/year or null",
    "owner": "mentioned person or null"
  },
  "reformulated": "cleaner version of the query for full-text search"
}`;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 512,
      system: 'You are a search query interpreter. Extract structured filters from natural language queries. Be concise.',
      messages: [{ role: 'user', content: prompt }],
    });

    const { logAiUsage: logUsage } = getUsageLogger();
    logUsage({
      userId,
      model: DEFAULT_MODEL,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'interpret-search',
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No response from AI' };
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Could not parse AI response' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, data: parsed };
  } catch (error) {
    const { sanitizeApiError: sanitize } = getUsageLogger();
    log.error('Interpret search error', { error: sanitize(error) });
    return { success: false, error: 'Search interpretation failed' };
  }
}

/**
 * Stream a chat response (returns an async generator of events)
 * @param {string} userId - Requesting user ID
 * @param {Array} messages - Array of { role, content } message objects
 * @param {Object} context - Optional context (project, files, assets)
 * @returns {Promise<{success: boolean, data?: AsyncGenerator, error?: string}>}
 */
async function streamChat(userId, messages, context = {}) {
  try {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'AI service not configured' };
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { success: false, error: 'Messages array is required' };
    }

    // Build system prompt from context
    let systemPrompt = 'You are FluxStudio\'s AI Design Assistant. Be concise and actionable.';
    if (context.project) {
      systemPrompt += `\n\nCurrent Project: ${context.project.name || 'Untitled'}`;
    }

    const stream = await client.messages.stream({
      model: context.model || DEFAULT_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.slice(-20), // Limit context window
    });

    return { success: true, data: stream };
  } catch (error) {
    const { sanitizeApiError: sanitize } = getUsageLogger();
    log.error('Stream chat error', { error: sanitize(error) });
    return { success: false, error: 'Chat streaming failed' };
  }
}

module.exports = {
  analyzeDesign,
  generatePalette,
  interpretSearch,
  streamChat,
};
