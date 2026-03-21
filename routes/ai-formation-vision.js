/**
 * AI Formation Vision Routes
 *
 * POST /api/ai/formation/analyze-screenshot
 * Accepts a base64-encoded image of a formation and returns structured
 * analysis including spacing, alignment, visual impact, and collision detection.
 */

const express = require('express');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const { logAiUsage, sanitizeApiError } = require('../services/ai-summary-service');
const { createLogger } = require('../lib/logger');
const { getClient } = require('../lib/ai/client');
const { getModelForTask, getMaxTokensForTask } = require('../lib/ai/config');
const { asyncHandler } = require('../middleware/errorHandler');

const log = createLogger('AIFormationVision');

// Quota check middleware
let checkAiQuota = (_req, _res, next) => next();
try {
  const { checkQuota } = require('../middleware/quotaCheck');
  checkAiQuota = checkQuota('aiCalls');
} catch { /* quotaCheck may not be available yet */ }

const router = express.Router();

/**
 * Middleware to check that the Anthropic client is available.
 */
function requireAnthropicClient(req, res, next) {
  if (!getClient()) {
    return res.status(503).json({
      success: false,
      error: 'AI service not configured',
      message: 'The ANTHROPIC_API_KEY environment variable is not set.',
      code: 'AI_NOT_CONFIGURED',
    });
  }
  next();
}

/**
 * POST /analyze-screenshot
 * Analyze a formation screenshot using Claude Vision.
 */
router.post('/analyze-screenshot', authenticateToken, requireAnthropicClient, rateLimitByUser(10, 60000), checkAiQuota, asyncHandler(async (req, res) => {
  const { image, formationId, analysisType = 'general' } = req.body;
  const userId = req.user.id;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'image (base64 string) is required',
      code: 'INVALID_INPUT',
    });
  }

  // Strip data URL prefix if present
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

  // Detect media type from data URL prefix or default to png
  let mediaType = 'image/png';
  const dataUrlMatch = image.match(/^data:(image\/\w+);base64,/);
  if (dataUrlMatch) {
    mediaType = dataUrlMatch[1];
  }

  const focusInstructions = {
    general: 'Provide a comprehensive analysis covering spacing, alignment, visual impact, and collisions.',
    spacing: 'Focus primarily on performer spacing: are performers evenly distributed? Are there clusters or gaps?',
    alignment: 'Focus primarily on alignment: are rows/columns straight? Are performers on consistent reference lines?',
    collisions: 'Focus primarily on collision detection: are any performers overlapping or dangerously close (under 2 step spacing)?',
  };

  const systemPrompt = `You are an expert marching band drill analyst with decades of experience evaluating formations from press box and bird's eye views.

Analyze the formation image and return a JSON response with this exact structure:
{
  "overallScore": <1-10 integer>,
  "spacing": {
    "score": <1-10>,
    "issues": [
      { "performers": "description of which performers", "description": "the spacing issue", "suggestion": "how to fix it" }
    ]
  },
  "alignment": {
    "score": <1-10>,
    "issues": [
      { "performers": "description of which performers", "description": "the alignment issue", "suggestion": "how to fix it" }
    ]
  },
  "visualImpact": {
    "score": <1-10>,
    "suggestions": ["suggestion for improving visual effectiveness"]
  },
  "collisions": {
    "detected": <boolean>,
    "pairs": [
      { "performer1": "description", "performer2": "description", "distance": "estimated distance" }
    ]
  }
}

${focusInstructions[analysisType] || focusInstructions.general}

Be specific and actionable. Reference performer positions by their visual location (e.g., "3rd performer from left in front row"). Always respond with valid JSON only.`;

  const visionModel = getModelForTask('design-feedback');
  const response = await getClient().messages.create({
    model: visionModel,
    max_tokens: getMaxTokensForTask('design-feedback'),
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: `Analyze this marching band formation${formationId ? ` (Formation ID: ${formationId})` : ''}. Analysis focus: ${analysisType}.`,
        },
      ],
    }],
  });

  logAiUsage({
    userId,
    model: visionModel,
    inputTokens: response.usage?.input_tokens || 0,
    outputTokens: response.usage?.output_tokens || 0,
    endpoint: 'formation-analyze-screenshot',
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return res.status(500).json({ success: false, error: 'No response from AI', code: 'AI_NO_RESPONSE' });
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return res.status(500).json({ success: false, error: 'Could not parse AI response', code: 'AI_PARSE_ERROR' });
  }

  const analysis = JSON.parse(jsonMatch[0]);
  res.json({ success: true, data: analysis });
}));

module.exports = router;
