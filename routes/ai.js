/**
 * AI Routes - AI Design Assistant API
 *
 * Provides endpoints for:
 * - Chat with Claude AI (streaming)
 * - Conversation management
 * - Design review
 * - Code generation
 *
 * All endpoints require authentication.
 */

const express = require('express');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const { logAiUsage, getAiUsageLogs, sanitizeApiError } = require('../services/ai-summary-service');
const { createLogger } = require('../lib/logger');
const log = createLogger('AI');
const { zodValidate } = require('../middleware/zodValidate');
const { aiChatSchema, aiChatSyncSchema, aiDesignReviewSchema, aiGenerateCodeSchema, aiDesignFeedbackSchema, aiGenerateProjectStructureSchema, aiGenerateTemplateSchema, aiSuggestDrillPathsSchema, aiGenerateShowSchema, aiSuggestSetsSchema } = require('../lib/schemas');
const { getClient } = require('../lib/ai/client');
const { getModelForTask, getMaxTokensForTask, buildApiParams } = require('../lib/ai/config');
const { extractTextContent } = require('../lib/ai/response-handlers');

// Quota check middleware (Sprint 38)
let checkAiQuota = (_req, _res, next) => next();
try {
  const { checkQuota } = require('../middleware/quotaCheck');
  checkAiQuota = checkQuota('aiCalls');
} catch { /* quotaCheck may not be available yet */ }

// Tier-based feature gating (Phase 3)
let checkAiTier = (_req, _res, next) => next();
try {
  const { requireFeature } = require('../middleware/requireTier');
  checkAiTier = requireFeature('ai_drill_writing');
} catch { /* requireTier may not be available yet */ }

const router = express.Router();

// ============================================================================
// IP-based rate limiting for sandbox (unauthenticated) endpoints
// ============================================================================
const sandboxRateLimits = new Map(); // ip -> { count, windowStart }
const SANDBOX_MAX_CALLS = 3;
const SANDBOX_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup stale entries every 10 minutes
const sandboxCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of sandboxRateLimits.entries()) {
    if (now - data.windowStart > SANDBOX_WINDOW_MS) {
      sandboxRateLimits.delete(ip);
    }
  }
}, 10 * 60 * 1000);
if (sandboxCleanup.unref) sandboxCleanup.unref();

function rateLimitByIP(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = sandboxRateLimits.get(ip);

  if (!entry || now - entry.windowStart > SANDBOX_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    sandboxRateLimits.set(ip, entry);
  }

  entry.count++;

  if (entry.count > SANDBOX_MAX_CALLS) {
    return res.status(429).json({
      success: false,
      error: 'Sandbox limit reached',
      message: `You've used all ${SANDBOX_MAX_CALLS} free AI tries today. Create a free account to get more!`,
      code: 'SANDBOX_RATE_LIMIT',
      remainingCalls: 0,
    });
  }

  req.sandboxCallsRemaining = SANDBOX_MAX_CALLS - entry.count;
  next();
}

/**
 * Middleware to check that the Anthropic client is available.
 * Returns a helpful error if the API key is not configured.
 */
function requireAnthropicClient(req, res, next) {
  if (!getClient()) {
    return res.status(503).json({
      success: false,
      error: 'AI service not configured',
      message: 'The ANTHROPIC_API_KEY environment variable is not set. Please configure it to enable AI features.',
      code: 'AI_NOT_CONFIGURED',
    });
  }
  next();
}

/**
 * Handle Anthropic API errors with proper status codes and safe messages.
 * Never exposes the API key in error responses.
 *
 * @param {Error} error - The caught error
 * @param {Object} res - Express response
 * @param {string} context - Context string for logging (e.g. 'Chat', 'Design review')
 */
function handleAnthropicError(error, res, context = 'AI') {
  const safeMessage = sanitizeApiError(error);
  log.error('Anthropic API error', { context, error: safeMessage });

  const status = error.status || error.statusCode;
  if (status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: safeMessage,
      code: 'AI_RATE_LIMIT',
      retryAfter: parseInt(error.headers?.['retry-after']) || 60,
    });
  }
  if (status === 401) {
    return res.status(503).json({
      success: false,
      error: 'AI service configuration error',
      message: safeMessage,
      code: 'AI_AUTH_FAILED',
    });
  }
  if (status === 529 || status === 503 || status === 500) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable',
      message: safeMessage,
      code: 'AI_SERVICE_UNAVAILABLE',
    });
  }

  return res.status(500).json({
    success: false,
    error: 'AI service error',
    message: safeMessage,
    code: 'AI_SERVICE_ERROR',
  });
}

// In-memory conversation storage (replace with database in production)
const conversations = new Map();

/**
 * Build system prompt with project context
 */
function buildSystemPrompt(context = {}) {
  const { project, files, assets, page, recentActions } = context;

  let prompt = `You are FluxStudio's AI Design Assistant. You help designers and developers with:
- Design feedback and critiques
- Color palette and typography suggestions
- React/TypeScript component generation
- UX improvement recommendations
- Creative brainstorming and ideation

Guidelines:
- Be concise and actionable
- When generating code, use TypeScript and modern React patterns
- Reference specific project files/assets when relevant
- Suggest improvements without being prescriptive
- Format code blocks with proper syntax highlighting`;

  if (project) {
    prompt += `\n\n## Current Project
Name: ${project.name || 'Untitled'}
Description: ${project.description || 'No description provided'}
Status: ${project.status || 'Unknown'}`;
  }

  if (files && files.length > 0) {
    const fileList = files.slice(0, 10).map(f => `- ${f.name} (${f.type || 'file'})`).join('\n');
    prompt += `\n\n## Project Files (${files.length} total)\n${fileList}`;
  }

  if (assets && assets.length > 0) {
    const assetList = assets.slice(0, 5).map(a => `- ${a.name}`).join('\n');
    prompt += `\n\n## Design Assets\n${assetList}`;
  }

  if (page) {
    prompt += `\n\n## User Activity\nCurrently on: ${page}`;
  }

  if (recentActions && recentActions.length > 0) {
    prompt += `\nRecent actions: ${recentActions.slice(0, 3).join(', ')}`;
  }

  return prompt;
}

/**
 * POST /api/ai/chat
 * Send message and stream response (SSE)
 */
router.post('/chat', authenticateToken, requireAnthropicClient, rateLimitByUser(30, 60000), checkAiQuota, zodValidate(aiChatSchema), async (req, res) => {
  const { message, context, conversationId, model = getModelForTask('chat') } = req.body;
  const userId = req.user.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  try {
    // Get or create conversation
    let conversation = conversationId ? conversations.get(conversationId) : null;

    if (!conversation) {
      conversation = {
        id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        messages: [],
        systemPrompt: buildSystemPrompt(context),
        createdAt: new Date().toISOString(),
      };
      conversations.set(conversation.id, conversation);
    }

    // Add user message to history
    conversation.messages.push({
      role: 'user',
      content: message,
    });

    // Build messages for API (limit context to last 20 messages)
    const messagesForAPI = conversation.messages.slice(-20);

    // Stream response from Claude
    const stream = await getClient().messages.stream({
      model,
      max_tokens: getMaxTokensForTask('chat'),
      system: conversation.systemPrompt,
      messages: messagesForAPI,
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    // Send conversation ID first
    res.write(`data: ${JSON.stringify({ type: 'start', conversationId: conversation.id })}\n\n`);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const chunk = event.delta.text;
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      } else if (event.type === 'message_start' && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens || 0;
      } else if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens || 0;
      }
    }

    // Log token usage for cost tracking
    logAiUsage({
      userId,
      model,
      inputTokens,
      outputTokens,
      endpoint: 'chat',
    });

    // Add assistant response to history
    conversation.messages.push({
      role: 'assistant',
      content: fullContent,
    });

    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: 'done',
      conversationId: conversation.id,
      tokensUsed: inputTokens + outputTokens,
    })}\n\n`);

    res.end();

  } catch (error) {
    const safeMessage = sanitizeApiError(error);
    log.error('Chat error', { error: safeMessage });
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: safeMessage,
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/ai/chat/sync
 * Non-streaming chat endpoint
 */
router.post('/chat/sync', authenticateToken, requireAnthropicClient, rateLimitByUser(30, 60000), zodValidate(aiChatSyncSchema), async (req, res) => {
  const { message, context, model = getModelForTask('chat-sync') } = req.body;
  const userId = req.user.id;

  try {
    const systemPrompt = buildSystemPrompt(context);

    const response = await getClient().messages.create({
      model,
      max_tokens: getMaxTokensForTask('chat-sync'),
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const content = response.content[0]?.text || '';
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;

    // Log token usage for cost tracking
    logAiUsage({
      userId,
      model,
      inputTokens,
      outputTokens,
      endpoint: 'chat-sync',
    });

    res.json({
      content,
      tokensUsed: inputTokens + outputTokens,
      model: response.model,
    });

  } catch (error) {
    handleAnthropicError(error, res, 'AI Sync Chat');
  }
});

/**
 * GET /api/ai/conversations
 * List user's conversations
 */
router.get('/conversations', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const userConversations = Array.from(conversations.values())
    .filter(c => c.userId === userId)
    .map(c => ({
      id: c.id,
      title: c.messages[0]?.content.slice(0, 50) + '...' || 'New Conversation',
      messageCount: c.messages.length,
      createdAt: c.createdAt,
      updatedAt: c.messages[c.messages.length - 1]?.timestamp || c.createdAt,
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.json({ conversations: userConversations });
});

/**
 * GET /api/ai/conversations/:id
 * Get a specific conversation
 */
router.get('/conversations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const conversation = conversations.get(id);

  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found', code: 'AI_CONVERSATION_NOT_FOUND' });
  }

  if (conversation.userId !== userId) {
    return res.status(403).json({ success: false, error: 'Access denied', code: 'AI_ACCESS_DENIED' });
  }

  res.json({ success: true, conversation });
});

/**
 * DELETE /api/ai/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const conversation = conversations.get(id);

  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found', code: 'AI_CONVERSATION_NOT_FOUND' });
  }

  if (conversation.userId !== userId) {
    return res.status(403).json({ success: false, error: 'Access denied', code: 'AI_ACCESS_DENIED' });
  }

  conversations.delete(id);

  res.json({ success: true, message: 'Conversation deleted' });
});

/**
 * POST /api/ai/design-review
 * Get AI feedback on a design
 */
router.post('/design-review', authenticateToken, requireAnthropicClient, rateLimitByUser(10, 60000), zodValidate(aiDesignReviewSchema), async (req, res) => {
  const { description, imageUrl, aspects = ['overall', 'accessibility', 'usability'] } = req.body;
  const userId = req.user.id;

  try {
    const aspectsText = aspects.join(', ');
    const prompt = `Please review this design and provide feedback on the following aspects: ${aspectsText}.

Design description: ${description}
${imageUrl ? `Image URL: ${imageUrl}` : ''}

Provide specific, actionable feedback for each aspect. Format your response with clear headings.`;

    const params = buildApiParams('design-review', {
      system: 'You are an expert UI/UX designer providing constructive feedback on designs. Be specific and actionable.',
      messages: [{ role: 'user', content: prompt }],
    });
    const response = await getClient().messages.create(params);

    // Log token usage for cost tracking
    logAiUsage({
      userId,
      model: params.model,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'design-review',
    });

    res.json({
      feedback: extractTextContent(response),
      aspects,
    });

  } catch (error) {
    handleAnthropicError(error, res, 'Design Review');
  }
});

/**
 * POST /api/ai/generate-code
 * Generate React component code
 */
router.post('/generate-code', authenticateToken, requireAnthropicClient, rateLimitByUser(20, 60000), zodValidate(aiGenerateCodeSchema), async (req, res) => {
  const { description, componentType = 'component', style = 'modern' } = req.body;
  const userId = req.user.id;

  try {
    const prompt = `Generate a React TypeScript component based on this description:

${description}

Requirements:
- Use TypeScript with proper type definitions
- Use functional components with hooks
- Follow the "${style}" design style
- Include proper accessibility attributes
- Use Tailwind CSS for styling
- Export the component as default

Return ONLY the code, no explanations.`;

    const codeParams = buildApiParams('code-generate', {
      system: 'You are an expert React/TypeScript developer. Generate clean, well-typed, accessible components.',
      messages: [{ role: 'user', content: prompt }],
    });
    const response = await getClient().messages.create(codeParams);

    const code = extractTextContent(response);

    // Log token usage for cost tracking
    logAiUsage({
      userId,
      model: codeParams.model,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'generate-code',
    });

    res.json({
      code,
      componentType,
      style,
    });

  } catch (error) {
    handleAnthropicError(error, res, 'Code Generation');
  }
});

/**
 * GET /api/ai/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ai-design-assistant',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    defaultModel: getModelForTask('chat'),
    clientInitialized: !!getClient(),
  });
});

/**
 * GET /api/ai/usage
 * Get AI usage logs for the authenticated user
 */
router.get('/usage', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  const logs = getAiUsageLogs(userId, limit);

  // Calculate totals
  const totals = logs.reduce((acc, log) => {
    acc.totalInputTokens += log.inputTokens;
    acc.totalOutputTokens += log.outputTokens;
    acc.totalTokens += log.totalTokens;
    acc.requestCount++;
    return acc;
  }, { totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, requestCount: 0 });

  res.json({
    usage: logs,
    totals,
  });
});

/**
 * POST /api/ai/test
 * Development-only test endpoint (no auth required)
 * WARNING: Only available in development mode
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', async (req, res) => {
    const client = getClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        message: 'Set ANTHROPIC_API_KEY environment variable to enable AI features.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required', code: 'AI_MISSING_MESSAGE' });
    }

    try {
      const systemPrompt = buildSystemPrompt(context);
      const testModel = getModelForTask('test');

      const response = await client.messages.create({
        model: testModel,
        max_tokens: getMaxTokensForTask('test'),
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      });

      const content = response.content[0]?.text || '';
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;

      // Log token usage for cost tracking
      logAiUsage({
        userId: 'dev-test',
        model: testModel,
        inputTokens,
        outputTokens,
        endpoint: 'test',
      });

      res.json({
        content,
        tokensUsed: inputTokens + outputTokens,
        model: response.model,
        warning: 'This is a development-only endpoint. Do not use in production.',
      });

    } catch (error) {
      handleAnthropicError(error, res, 'AI Test');
    }
  });
  log.info('Test endpoint enabled (development mode only): POST /api/ai/test');
}

/**
 * POST /design-feedback/analyze
 * Analyze a design image using Claude Vision
 * Body: { imageUrl: string, context?: { projectType, industry, targetAudience, brandGuidelines, focusAreas } }
 */
router.post('/design-feedback/analyze', authenticateToken, rateLimitByUser(10, 60), zodValidate(aiDesignFeedbackSchema), async (req, res) => {
  try {
    const { imageUrl, context } = req.body;
    const userId = req.user.id;

    if (!getClient()) {
      return res.status(200).json({ success: true, data: null, mock: true });
    }

    const contextStr = context
      ? `Design Context:\n- Project Type: ${context.projectType || 'General'}\n- Industry: ${context.industry || 'Not specified'}\n- Target Audience: ${context.targetAudience || 'General'}\n- Brand Guidelines: ${context.brandGuidelines || 'None provided'}\n- Specific Areas to Focus: ${(context.focusAreas || []).join(', ') || 'All aspects'}`
      : '';

    const prompt = `Analyze this design image and provide detailed feedback. ${contextStr}

Please analyze the following aspects and respond in JSON format:
{
  "elements": [{ "type": "color|typography|layout|imagery|spacing|composition", "description": "string", "confidence": 0.0-1.0 }],
  "overallScore": 0.0-1.0,
  "strengths": ["string"],
  "improvements": ["string"],
  "brandAlignment": 0.0-1.0,
  "accessibilityScore": 0.0-1.0,
  "moodAnalysis": { "mood": "string", "confidence": 0.0-1.0, "emotions": ["string"] }
}

Be specific, actionable, and constructive in your feedback.`;

    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return res.status(400).json({ success: false, error: `Failed to fetch image: ${imageResponse.status}`, code: 'AI_IMAGE_FETCH_FAILED' });
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64 = imageBuffer.toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    let mediaType = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    const dfModel = getModelForTask('design-feedback');
    const response = await getClient().messages.create({
      model: dfModel,
      max_tokens: getMaxTokensForTask('design-feedback'),
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    // Log token usage for cost tracking
    logAiUsage({
      userId,
      model: dfModel,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'design-feedback-analyze',
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ success: false, error: 'No text response from AI', code: 'AI_NO_RESPONSE' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'Could not parse AI response as JSON', code: 'AI_PARSE_ERROR' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: parsed });
  } catch (error) {
    handleAnthropicError(error, res, 'Design Feedback Analysis');
  }
});

/**
 * POST /api/ai/generate-project-structure
 * Generate project structure from natural language description
 */
router.post('/generate-project-structure', authenticateToken, rateLimitByUser(10, 60000), zodValidate(aiGenerateProjectStructureSchema), async (req, res) => {
  const { description, category, complexity } = req.body;
  const userId = req.user.id;

  // Fall back to local generation if AI is not configured
  if (!getClient()) {
    const fallback = generateLocalStructure(description, category);
    return res.json({ success: true, data: fallback, fallback: true });
  }

  try {
    const systemPrompt = `You are a project planning assistant for FluxStudio, a creative collaboration platform.
Given a project description, generate a structured project scaffold.

Respond with ONLY valid JSON in this exact shape:
{
  "name": "Short project name (2-5 words)",
  "folders": ["array of folder paths like /assets, /designs, /docs"],
  "tasks": [
    { "title": "Task title", "week": 1, "description": "Brief task description" }
  ],
  "teamRoles": ["Designer", "Developer", etc.],
  "tags": ["relevant", "tags"],
  "projectType": "one of: design, development, marketing, music, video, photography, branding, social-media, presentation, documentation, general"
}

Rules:
- Generate 4-8 realistic folders
- Generate 5-12 tasks spread across 2-6 weeks
- Suggest 2-5 team roles
- Keep names concise and professional
- Match the complexity level: ${complexity || 'basic'}
${category ? `- The project category is: ${category}` : ''}`;

    const psModel = getModelForTask('project-structure');
    const response = await getClient().messages.create({
      model: psModel,
      max_tokens: getMaxTokensForTask('project-structure'),
      system: systemPrompt,
      messages: [{ role: 'user', content: description.trim() }],
    });

    // Log token usage for cost tracking
    logAiUsage({
      userId,
      model: psModel,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'generate-project-structure',
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ success: false, error: 'No response from AI', code: 'AI_NO_RESPONSE' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'Could not parse AI response', code: 'AI_PARSE_ERROR' });
    }

    const suggestion = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    log.error('Project structure generation error', { error: sanitizeApiError(error) });

    // Fallback: generate locally if AI fails
    const fallback = generateLocalStructure(description, category);
    res.json({ success: true, data: fallback, fallback: true });
  }
});

/**
 * POST /api/ai/generate-template
 * AI-generate a full project template from description
 */
router.post('/generate-template', authenticateToken, requireAnthropicClient, rateLimitByUser(5, 60000), zodValidate(aiGenerateTemplateSchema), async (req, res) => {
  const { description, category, complexity } = req.body;
  const userId = req.user.id;

  try {
    const systemPrompt = `You are a project template generator for FluxStudio.
Generate a reusable project template from the description.

Respond with ONLY valid JSON:
{
  "name": "Template name",
  "description": "Template description",
  "category": "one of: design, development, marketing, music, video, photography, branding, social-media, presentation, documentation, custom",
  "complexity": "one of: starter, basic, advanced, enterprise",
  "tags": ["tag1", "tag2"],
  "structure": {
    "projectType": "category value",
    "folders": [{ "path": "/folder", "name": "Folder Name", "description": "Purpose" }],
    "files": [{ "path": "/README.md", "name": "README", "type": "markdown", "templateContent": "# {{projectName}}\\n\\n{{description}}" }],
    "entities": [{ "type": "board|document|task|timeline", "name": "Entity Name", "data": {} }]
  },
  "variables": [
    { "id": "projectName", "name": "Project Name", "type": "text", "defaultValue": "My Project", "required": true },
    { "id": "description", "name": "Description", "type": "text", "defaultValue": "", "required": false }
  ],
  "suggestedTasks": [
    { "title": "Task", "week": 1, "description": "Description" }
  ],
  "teamRoles": ["Role1", "Role2"]
}

Rules:
- Generate 3-6 folders, 1-3 template files with {{variable}} placeholders
- Generate 2-4 meaningful variables
- Include 3-8 entities (mix of boards, documents, tasks)
- Complexity: ${complexity || 'basic'}
${category ? `- Category: ${category}` : ''}`;

    const tplModel = getModelForTask('template');
    const response = await getClient().messages.create({
      model: tplModel,
      max_tokens: getMaxTokensForTask('template'),
      system: systemPrompt,
      messages: [{ role: 'user', content: description.trim() }],
    });

    // Log token usage for cost tracking
    logAiUsage({
      userId,
      model: tplModel,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'generate-template',
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ success: false, error: 'No response from AI', code: 'AI_NO_RESPONSE' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'Could not parse AI response', code: 'AI_PARSE_ERROR' });
    }

    const template = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: { template, confidence: 0.85 } });
  } catch (error) {
    handleAnthropicError(error, res, 'Template Generation');
  }
});

/**
 * Local fallback for project structure generation
 */
function generateLocalStructure(description, category) {
  const lower = (description || '').toLowerCase();

  // Infer category
  const inferredCategory = category ||
    (lower.includes('design') || lower.includes('ui') ? 'design' :
    lower.includes('music') || lower.includes('audio') ? 'music' :
    lower.includes('video') || lower.includes('film') ? 'video' :
    lower.includes('brand') || lower.includes('logo') ? 'branding' :
    lower.includes('market') || lower.includes('campaign') ? 'marketing' :
    'general');

  // Generate name from first few words
  const words = description.split(' ').slice(0, 4);
  const name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const baseFolders = ['/assets', '/docs', '/exports'];
  const categoryFolders = {
    design: ['/designs', '/mockups', '/brand'],
    music: ['/tracks', '/samples', '/mixes'],
    video: ['/footage', '/edits', '/graphics'],
    branding: ['/logos', '/guidelines', '/brand-assets'],
    marketing: ['/campaigns', '/analytics', '/creatives'],
    general: ['/resources', '/drafts'],
  };

  const baseTasks = [
    { title: 'Set up project structure', week: 1, description: 'Initialize folders and configuration' },
    { title: 'Gather requirements', week: 1, description: 'Document project scope and goals' },
    { title: 'Create initial drafts', week: 2, description: 'First pass at deliverables' },
    { title: 'Review and iterate', week: 3, description: 'Collect feedback and refine' },
    { title: 'Final delivery', week: 4, description: 'Polish and deliver final assets' },
  ];

  return {
    name,
    folders: [...baseFolders, ...(categoryFolders[inferredCategory] || categoryFolders.general)],
    tasks: baseTasks,
    teamRoles: ['Project Lead', 'Designer', 'Reviewer'],
    tags: [inferredCategory],
    projectType: inferredCategory,
  };
}

// ============================================================================
// DRILL AI ENDPOINTS (Sprint 89)
// ============================================================================

/**
 * POST /api/ai/suggest-drill-paths
 * Suggest curved paths (Bezier control points) between two sets of positions.
 * Non-streaming (like /design-review).
 */
router.post('/suggest-drill-paths', authenticateToken, requireAnthropicClient, rateLimitByUser(20, 60000), checkAiTier, checkAiQuota, zodValidate(aiSuggestDrillPathsSchema), async (req, res) => {
  const { startPositions, endPositions, minSpacing = 2, maintainShape = false, style = 'smooth' } = req.body;
  const userId = req.user.id;

  try {
    const performerIds = Object.keys(startPositions);
    const positionSummary = performerIds.map(id => {
      const s = startPositions[id];
      const e = endPositions[id];
      return `${id}: (${s.x.toFixed(1)},${s.y.toFixed(1)}) → (${e.x.toFixed(1)},${e.y.toFixed(1)})`;
    }).join('\n');

    const prompt = `Given these performer movements on a 0-100 normalized field:\n${positionSummary}\n\nGenerate cubic Bezier control points (cp1, cp2) for each performer so they follow ${style} curved paths. Ensure minimum spacing of ${minSpacing} units between performers during the transition. ${maintainShape ? 'Maintain relative formation shape during the move.' : ''}\n\nRespond with ONLY valid JSON:\n{\n  "curves": { "performerId": { "cp1": { "x": number, "y": number }, "cp2": { "x": number, "y": number } } },\n  "confidence": 0.0-1.0,\n  "description": "brief description of the suggested paths"\n}`;

    const dpModel = getModelForTask('drill-paths');
    const response = await getClient().messages.create({
      model: dpModel,
      max_tokens: getMaxTokensForTask('drill-paths'),
      system: 'You are an expert marching band drill designer specializing in smooth transition paths. Generate cubic Bezier control points that create visually appealing, collision-free curved paths between formations. Coordinates are normalized 0-100.',
      messages: [{ role: 'user', content: prompt }],
    });

    logAiUsage({ userId, model: dpModel, inputTokens: response.usage?.input_tokens || 0, outputTokens: response.usage?.output_tokens || 0, endpoint: 'suggest-drill-paths' });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ success: false, error: 'No response from AI', code: 'AI_NO_RESPONSE' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'Could not parse AI response', code: 'AI_PARSE_ERROR' });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json({ success: true, ...result });

  } catch (error) {
    handleAnthropicError(error, res, 'Suggest Drill Paths');
  }
});

/**
 * POST /api/ai/drill/generate-show
 * Generate a full show of formations from music structure (SSE streaming).
 * Streams individual sets as JSON: {type: 'set', data: {name, counts, positions}}
 */
router.post('/drill/generate-show', authenticateToken, requireAnthropicClient, rateLimitByUser(5, 60000), checkAiTier, checkAiQuota, zodValidate(aiGenerateShowSchema), async (req, res) => {
  const { performers, sections, fieldType = 'ncaa_football', defaultCounts = 8 } = req.body;
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const performerSummary = performers.map(p => `${p.id}: ${p.name}${p.section ? ` (${p.section})` : ''}${p.instrument ? ` - ${p.instrument}` : ''}`).join('\n');
    const sectionSummary = sections.map(s => `"${s.name}": ${s.bars} bars, ${s.timeSignature}, ${s.tempoStart} BPM${s.tempoEnd ? ` → ${s.tempoEnd} BPM` : ''}`).join('\n');

    const prompt = `Design a marching band drill show for these performers:\n${performerSummary}\n\nMusic structure:\n${sectionSummary}\n\nField type: ${fieldType}. Default counts per set: ${defaultCounts}.\n\nFor each music section, generate 1-3 sets. Each set must include positions for ALL performers (x,y coordinates 0-100).\n\nReturn each set as a separate JSON block on its own line, formatted exactly as:\n{"type":"set","data":{"name":"Set N","counts":8,"sectionName":"section","positions":{"performerId":{"x":50,"y":50}}}}\n\nGenerate all sets sequentially. After the last set, output:\n{"type":"done","totalSets":N}`;

    const showParams = buildApiParams('show-generate', {
      system: 'You are an expert marching band drill designer. Generate formations that are visually effective, have safe spacing, and create smooth transitions. Positions are normalized 0-100 (x=left-right, y=front-back). Output each set as a separate JSON object on its own line. Do not wrap in markdown code blocks.',
      messages: [{ role: 'user', content: prompt }],
    });
    const stream = await getClient().messages.stream(showParams);

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let lineBuffer = '';

    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        lineBuffer += event.delta.text;

        // Try to parse complete JSON lines from the buffer
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'set' || parsed.type === 'done') {
              res.write(`data: ${JSON.stringify(parsed)}\n\n`);
            }
          } catch {
            // Not valid JSON yet, continue
          }
        }

        fullContent += event.delta.text;
      } else if (event.type === 'message_start' && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens || 0;
      } else if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens || 0;
      }
    }

    // Process remaining buffer
    if (lineBuffer.trim()) {
      try {
        const parsed = JSON.parse(lineBuffer.trim());
        if (parsed.type === 'set' || parsed.type === 'done') {
          res.write(`data: ${JSON.stringify(parsed)}\n\n`);
        }
      } catch { /* ignore */ }
    }

    logAiUsage({ userId, model: showParams.model, inputTokens, outputTokens, endpoint: 'drill-generate-show' });

    res.write(`data: ${JSON.stringify({ type: 'complete', tokensUsed: inputTokens + outputTokens })}\n\n`);
    res.end();

  } catch (error) {
    const safeMessage = sanitizeApiError(error);
    log.error('Drill show generation error', { error: safeMessage });
    res.write(`data: ${JSON.stringify({ type: 'error', error: safeMessage })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/ai/drill/suggest-sets
 * Stream natural language advice about set placement for a song (SSE streaming).
 */
router.post('/drill/suggest-sets', authenticateToken, requireAnthropicClient, rateLimitByUser(10, 60000), checkAiTier, checkAiQuota, zodValidate(aiSuggestSetsSchema), async (req, res) => {
  const { songId, formationContext } = req.body;
  const userId = req.user.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const contextStr = formationContext
      ? `\n\nCurrent formation context:\n${JSON.stringify(formationContext, null, 2)}`
      : '';

    const prompt = `I'm designing drill for a marching band show linked to song ${songId}.${contextStr}\n\nPlease suggest where to place sets (formation changes) in the music. Consider:\n- Musical phrases and sections\n- Tempo changes that affect step sizes\n- Dynamic contrasts (loud/soft) for visual impact\n- Rehearsal marks as natural set boundaries\n\nProvide specific, actionable advice about set placement, counts per set, and formation ideas for each section.`;

    const setsModel = getModelForTask('sets');
    const stream = await getClient().messages.stream({
      model: setsModel,
      max_tokens: getMaxTokensForTask('sets'),
      system: 'You are an experienced marching band drill designer advising on set placement within music. Give practical, specific advice tied to musical structure. Be concise and use band terminology.',
      messages: [{ role: 'user', content: prompt }],
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const chunk = event.delta.text;
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      } else if (event.type === 'message_start' && event.message?.usage) {
        inputTokens = event.message.usage.input_tokens || 0;
      } else if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens || 0;
      }
    }

    logAiUsage({ userId, model: setsModel, inputTokens, outputTokens, endpoint: 'drill-suggest-sets' });

    res.write(`data: ${JSON.stringify({ type: 'done', tokensUsed: inputTokens + outputTokens })}\n\n`);
    res.end();

  } catch (error) {
    const safeMessage = sanitizeApiError(error);
    log.error('Drill set suggestion error', { error: safeMessage });
    res.write(`data: ${JSON.stringify({ type: 'error', error: safeMessage })}\n\n`);
    res.end();
  }
});

// ============================================================================
// SANDBOX ENDPOINT (Phase 4 — unauthenticated, IP rate-limited)
// ============================================================================

/**
 * POST /api/ai/sandbox-generate
 * Unauthenticated AI formation generation for TryEditor.
 * Limited to 3 calls per IP per 24 hours.
 */
router.post('/sandbox-generate', requireAnthropicClient, rateLimitByIP, async (req, res) => {
  const { prompt, performers } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Invalid prompt',
      message: 'Prompt is required and must be under 200 characters.',
      code: 'INVALID_INPUT',
    });
  }

  if (!Array.isArray(performers) || performers.length === 0 || performers.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'Invalid performers',
      message: 'Performers array is required (1-20 performers).',
      code: 'INVALID_INPUT',
    });
  }

  try {
    const performerList = performers.map(p => `${p.id}: "${p.name}"`).join(', ');

    const systemPrompt = `You are a marching band drill designer. Given a formation description and a list of performers, generate x,y positions (0-100 normalized field coordinates, x=left-right, y=front-back) for each performer.

Respond with ONLY valid JSON:
{"positions":{"performerId":{"x":number,"y":number}}}

Keep positions well-spaced (minimum 3 units apart). Be creative with the formation.`;

    const sandboxModel = getModelForTask('chat-sync');
    const response = await getClient().messages.create({
      model: sandboxModel,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Formation: "${prompt}"\nPerformers: ${performerList}`,
      }],
    });

    logAiUsage({
      userId: 'sandbox',
      model: sandboxModel,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      endpoint: 'sandbox-generate',
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ success: false, error: 'No response from AI', code: 'AI_NO_RESPONSE' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: 'Could not parse AI response', code: 'AI_PARSE_ERROR' });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json({
      success: true,
      positions: result.positions,
      remainingCalls: req.sandboxCallsRemaining,
    });

  } catch (error) {
    handleAnthropicError(error, res, 'Sandbox Generate');
  }
});

module.exports = router;
