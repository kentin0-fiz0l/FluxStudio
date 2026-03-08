/**
 * AI Design Feedback Routes — Streaming SSE endpoints for design analysis
 *
 * POST /api/ai/design-feedback/stream/analyze       - Analyze design with Claude vision
 * POST /api/ai/design-feedback/stream/palette        - Generate color palette
 * POST /api/ai/design-feedback/stream/layout         - Analyze layout
 * POST /api/ai/design-feedback/stream/accessibility  - Generate accessibility report
 *
 * All routes use SSE streaming and require authentication.
 * Follows the same pattern as routes/ai-metmap.js.
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const { logAiUsage, sanitizeApiError } = require('../services/ai-summary-service');
const { createLogger } = require('../lib/logger');
const log = createLogger('AIDesignFeedback');

const router = express.Router();

const MODEL = process.env.DESIGN_AI_MODEL || 'claude-sonnet-4-5-20250929';

// Initialize Anthropic client
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} else {
  log.warn('ANTHROPIC_API_KEY not configured. Design feedback streaming endpoints will return errors.');
}

// ============================================================================
// SHARED SSE STREAMING HELPER
// ============================================================================

/**
 * Stream a Claude response as SSE events.
 * Replicates the pattern from ai-metmap.js streamAnalysis().
 */
async function streamResponse(req, res, systemPrompt, userMessage, endpoint, userId, options = {}) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!anthropic) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI service not configured — ANTHROPIC_API_KEY is not set' })}\n\n`);
    res.end();
    return;
  }

  const controller = new AbortController();
  req.on('close', () => controller.abort());
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  try {
    // Send initial status
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Analyzing design...' })}\n\n`);

    const messages = [];

    // For vision requests with images
    if (options.imageContent) {
      messages.push({
        role: 'user',
        content: options.imageContent,
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: options.maxTokens || 4096,
      system: systemPrompt,
      messages,
    });

    res.write(`data: ${JSON.stringify({ type: 'status', message: 'AI is generating response...' })}\n\n`);

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

      // Log usage
      logAiUsage({
        userId,
        model: MODEL,
        inputTokens,
        outputTokens,
        endpoint,
      });
    }
    res.end();
  } catch (error) {
    if (controller.signal.aborted) {
      res.end();
      return;
    }
    log.error('Stream error', { endpoint, error: sanitizeApiError(error) });
    let errorMessage = error.message || 'AI analysis failed';
    if (error.status === 429 || error?.error?.type === 'rate_limit_error') {
      errorMessage = 'Rate limit reached — try again in 30 seconds';
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
    res.end();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /stream/analyze
 * Analyze a design image or description using Claude.
 * Streams the response as SSE events containing structured JSON.
 */
router.post('/stream/analyze', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  const { imageUrl, designElements, context } = req.body;
  const userId = req.user.id;

  const systemPrompt = `You are an expert design analyst integrated into FluxStudio, a creative collaboration platform.
Analyze the provided design and return structured JSON matching this exact format:

[
  {
    "id": "unique-id",
    "type": "color" | "layout" | "typography" | "spacing" | "accessibility",
    "title": "Short title",
    "description": "Detailed description of the suggestion",
    "confidence": 0.0-1.0,
    "impact": "low" | "medium" | "high",
    "implementation": {
      "css": "optional CSS code",
      "instructions": "How to implement",
      "codeExample": "optional code example"
    },
    "reasoning": "Why this suggestion matters",
    "tags": ["relevant", "tags"]
  }
]

Rules:
- Return a JSON array of 3-6 specific, actionable suggestions
- Be specific and reference actual design elements
- Include practical CSS examples where appropriate
- Prioritize accessibility and usability
- Respond ONLY with the JSON array, no other text`;

  let userMessage = '';
  if (context) {
    userMessage += `Design context: ${context}\n\n`;
  }
  if (designElements && designElements.length > 0) {
    userMessage += `Design elements: ${JSON.stringify(designElements)}\n\n`;
  }
  if (!imageUrl) {
    userMessage += 'Analyze this design based on the context and elements provided. Provide suggestions for improvement.';
  } else {
    userMessage += 'Analyze this design image and provide specific, actionable suggestions.';
  }

  // If there's an image URL, fetch and include as vision content
  if (imageUrl) {
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ type: 'error', error: `Failed to fetch image: ${imageResponse.status}` })}\n\n`);
        res.end();
        return;
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const base64 = imageBuffer.toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      let mediaType = 'image/jpeg';
      if (contentType.includes('png')) mediaType = 'image/png';
      else if (contentType.includes('gif')) mediaType = 'image/gif';
      else if (contentType.includes('webp')) mediaType = 'image/webp';

      await streamResponse(req, res, systemPrompt, userMessage, 'design-feedback-stream-analyze', userId, {
        imageContent: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: userMessage },
        ],
      });
    } catch (error) {
      log.error('Image fetch error', { error: error.message });
      res.setHeader('Content-Type', 'text/event-stream');
      res.flushHeaders();
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process image' })}\n\n`);
      res.end();
    }
  } else {
    await streamResponse(req, res, systemPrompt, userMessage, 'design-feedback-stream-analyze', userId);
  }
});

/**
 * POST /stream/palette
 * Generate a color palette based on industry, mood, and brand context.
 */
router.post('/stream/palette', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  const { industry, mood, brand } = req.body;
  const userId = req.user.id;

  const systemPrompt = `You are an expert color theory consultant integrated into FluxStudio.
Generate color palettes and return structured JSON matching this exact format:

[
  {
    "id": "unique-id",
    "name": "Palette Name",
    "colors": [
      {
        "hex": "#hexcode",
        "name": "Color Name",
        "role": "primary" | "secondary" | "accent" | "neutral" | "background",
        "accessibility": { "contrastRatio": number, "wcagCompliant": boolean }
      }
    ],
    "mood": ["mood1", "mood2"],
    "industry": ["industry1"],
    "harmony": "monochromatic" | "analogous" | "complementary" | "triadic" | "split-complementary"
  }
]

Rules:
- Generate 2-3 palette options
- Each palette should have exactly 5 colors (primary, secondary, accent, neutral, background)
- Ensure WCAG AA compliance for text colors against backgrounds
- Calculate realistic contrast ratios
- Respond ONLY with the JSON array, no other text`;

  let userMessage = 'Generate color palettes';
  if (industry) userMessage += ` for the ${industry} industry`;
  if (mood && mood.length > 0) userMessage += ` with a ${mood.join(', ')} mood`;
  if (brand) userMessage += ` aligned with the brand: ${brand}`;
  userMessage += '.';

  await streamResponse(req, res, systemPrompt, userMessage, 'design-feedback-stream-palette', userId);
});

/**
 * POST /stream/layout
 * Analyze layout elements and provide improvement suggestions.
 */
router.post('/stream/layout', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  const { elements, viewport } = req.body;
  const userId = req.user.id;

  const systemPrompt = `You are an expert layout and UX analyst integrated into FluxStudio.
Analyze the provided layout data and return structured JSON matching this exact format:

{
  "id": "unique-id",
  "score": 0.0-10.0,
  "issues": [
    {
      "type": "hierarchy" | "spacing" | "alignment" | "balance" | "contrast",
      "severity": "low" | "medium" | "high",
      "description": "Issue description",
      "suggestion": "How to fix it",
      "location": { "x": number, "y": number, "width": number, "height": number }
    }
  ],
  "strengths": ["strength1", "strength2"],
  "improvements": [
    {
      "id": "unique-id",
      "type": "layout",
      "title": "Improvement title",
      "description": "Description",
      "confidence": 0.0-1.0,
      "impact": "low" | "medium" | "high",
      "implementation": {
        "css": "CSS code",
        "instructions": "How to implement",
        "codeExample": "Code example"
      },
      "reasoning": "Why this matters",
      "tags": ["tag1"]
    }
  ]
}

Rules:
- Provide a score from 0-10 based on layout quality
- Identify 2-4 specific issues with actionable suggestions
- List 2-4 strengths
- Provide 1-3 improvement suggestions with CSS examples
- Respond ONLY with the JSON object, no other text`;

  const userMessage = `Analyze this layout:
Viewport: ${viewport.width}x${viewport.height}
Elements: ${JSON.stringify(elements)}

Evaluate spacing, alignment, visual hierarchy, balance, and contrast.`;

  await streamResponse(req, res, systemPrompt, userMessage, 'design-feedback-stream-layout', userId);
});

/**
 * POST /stream/accessibility
 * Generate an accessibility report for a design.
 */
router.post('/stream/accessibility', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  const { designData } = req.body;
  const userId = req.user.id;

  const systemPrompt = `You are a WCAG accessibility expert integrated into FluxStudio.
Analyze the provided design data and return structured JSON matching this exact format:

{
  "score": 0.0-10.0,
  "issues": [
    {
      "type": "contrast" | "focus" | "aria" | "semantic" | "keyboard" | "screen-reader",
      "severity": "low" | "medium" | "high",
      "element": "element identifier",
      "description": "Issue description",
      "fix": "How to fix it"
    }
  ],
  "recommendations": [
    {
      "id": "unique-id",
      "type": "accessibility",
      "title": "Recommendation title",
      "description": "Description",
      "confidence": 0.0-1.0,
      "impact": "low" | "medium" | "high",
      "implementation": {
        "css": "CSS code if applicable",
        "instructions": "Implementation steps",
        "codeExample": "Code example"
      },
      "reasoning": "Why this matters for accessibility",
      "tags": ["accessibility", "wcag"]
    }
  ]
}

Rules:
- Score based on WCAG 2.1 AA compliance
- Focus on contrast ratios, keyboard navigation, ARIA labels, semantic HTML
- Provide specific, actionable fixes
- Reference WCAG success criteria where relevant
- Respond ONLY with the JSON object, no other text`;

  const userMessage = `Analyze the accessibility of this design:
${JSON.stringify(designData)}

Evaluate WCAG 2.1 AA compliance including color contrast, keyboard navigation, screen reader compatibility, and semantic structure.`;

  await streamResponse(req, res, systemPrompt, userMessage, 'design-feedback-stream-accessibility', userId);
});

module.exports = router;
