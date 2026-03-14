/**
 * AI Search Routes — Natural language search interpretation and result summarization
 *
 * POST /interpret   - Interpret a natural language query into structured search params
 * POST /summarize   - Stream an AI-generated summary of search results (SSE)
 *
 * All routes require JWT authentication.
 * Follows the same pattern as routes/ai-design-feedback.js.
 */

const express = require('express');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const { logAiUsage, sanitizeApiError } = require('../services/ai-summary-service');
const { createLogger } = require('../lib/logger');
const { getClient } = require('../lib/ai/client');
const { getModelForTask, getMaxTokensForTask } = require('../lib/ai/config');
const log = createLogger('AISearch');

const router = express.Router();

// ============================================================================
// POST /interpret — Interpret natural language query
// ============================================================================

router.post('/interpret', authenticateToken, rateLimitByUser(20, 60000), async (req, res) => {
  const { query } = req.body;
  const userId = req.user.id;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query is required' });
  }

  const anthropic = getClient();
  if (!anthropic) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  try {
    const model = getModelForTask('search');
    const systemPrompt = `You are a search query interpreter for FluxStudio, a creative collaboration platform.
Given a natural language query, extract structured search parameters.

Return JSON matching this exact format:
{
  "originalQuery": "the user's original query",
  "interpretedQuery": {
    "keywords": ["keyword1", "keyword2"],
    "filters": {
      "type": ["project", "file", "task", "message"],
      "dateRange": { "start": "ISO date", "end": "ISO date" },
      "project": "project name if mentioned",
      "author": "author name if mentioned"
    },
    "intent": "brief description of what the user is looking for"
  },
  "confidence": 0.0-1.0
}

Rules:
- Extract meaningful keywords, removing stop words
- Only include filter fields that are actually mentioned or implied
- For "type", only include types that are relevant to the query
- For date references like "last week", "yesterday", "this month", calculate relative to today
- Today's date is ${new Date().toISOString().split('T')[0]}
- confidence should reflect how well you understood the query
- Respond ONLY with the JSON object, no other text`;

    const response = await anthropic.messages.create({
      model,
      max_tokens: getMaxTokensForTask('search'),
      system: systemPrompt,
      messages: [{ role: 'user', content: query }],
    });

    const content = response.content[0]?.text || '{}';

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      log.error('Failed to parse AI search interpretation', { content });
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Log usage
    logAiUsage({
      userId,
      model,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'ai-search-interpret',
    });

    res.json(parsed);
  } catch (error) {
    log.error('AI search interpret error', { error: sanitizeApiError(error) });
    if (error.status === 429 || error?.error?.type === 'rate_limit_error') {
      return res.status(429).json({ error: 'Rate limit reached — try again in 30 seconds' });
    }
    res.status(500).json({ error: 'AI interpretation failed' });
  }
});

// ============================================================================
// POST /summarize — Stream AI summary of search results (SSE)
// ============================================================================

router.post('/summarize', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  const { results, query } = req.body;
  const userId = req.user.id;

  if (!results || !Array.isArray(results) || !query) {
    return res.status(400).json({ error: 'results (array) and query (string) are required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const anthropic = getClient();
  if (!anthropic) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI service not configured' })}\n\n`);
    res.end();
    return;
  }

  const controller = new AbortController();
  req.on('close', () => controller.abort());
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    const model = getModelForTask('summarize');

    // Build a compact summary of results for the AI
    const resultSummary = results.slice(0, 20).map((r, i) => ({
      index: i + 1,
      type: r.type,
      title: r.title,
      description: r.description?.substring(0, 200),
      project: r.metadata?.projectName,
      date: r.metadata?.createdAt,
    }));

    const systemPrompt = `You are a helpful search assistant for FluxStudio, a creative collaboration platform.
Summarize the search results concisely for the user. Be direct and helpful.
- Start with "Found X results." where X is the actual count
- Highlight the most relevant findings
- Group by type if there are mixed results
- Keep it brief (2-4 sentences)
- Do not use markdown headers, just plain text`;

    const userMessage = `User searched for: "${query}"

Found ${results.length} result(s):
${JSON.stringify(resultSummary, null, 2)}

Provide a brief, helpful summary of these results.`;

    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Generating summary...' })}\n\n`);

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: getMaxTokensForTask('summarize'),
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (controller.signal.aborted) break;
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const chunk = event.delta.text;
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
      if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens || 0;
      }
      if (event.type === 'message_start' && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens || 0;
      }
    }

    if (!controller.signal.aborted) {
      res.write(`data: ${JSON.stringify({ type: 'done', length: fullContent.length })}\n\n`);
      logAiUsage({
        userId,
        model,
        inputTokens,
        outputTokens,
        endpoint: 'ai-search-summarize',
      });
    }
    res.end();
  } catch (error) {
    if (controller.signal.aborted) {
      res.end();
      return;
    }
    log.error('AI search summarize error', { error: sanitizeApiError(error) });
    let errorMessage = error.message || 'AI summary failed';
    if (error.status === 429 || error?.error?.type === 'rate_limit_error') {
      errorMessage = 'Rate limit reached — try again in 30 seconds';
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
    res.end();
  } finally {
    clearTimeout(timeoutId);
  }
});

module.exports = router;
