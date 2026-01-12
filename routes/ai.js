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
const Anthropic = require('@anthropic-ai/sdk');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');

const router = express.Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
router.post('/chat', authenticateToken, rateLimitByUser(30, 60000), async (req, res) => {
  const { message, context, conversationId, model = 'claude-sonnet-4-20250514' } = req.body;
  const userId = req.user.id;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

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
    const stream = await anthropic.messages.stream({
      model,
      max_tokens: 4096,
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
    console.error('[AI] Chat error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message || 'Failed to get AI response',
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/ai/chat/sync
 * Non-streaming chat endpoint
 */
router.post('/chat/sync', authenticateToken, rateLimitByUser(30, 60000), async (req, res) => {
  const { message, context, model = 'claude-sonnet-4-20250514' } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const systemPrompt = buildSystemPrompt(context);

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const content = response.content[0]?.text || '';
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    res.json({
      content,
      tokensUsed,
      model: response.model,
    });

  } catch (error) {
    console.error('[AI] Sync chat error:', error);
    res.status(500).json({
      error: 'Failed to get AI response',
      details: error.message,
    });
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
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (conversation.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ conversation });
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
    return res.status(404).json({ error: 'Conversation not found' });
  }

  if (conversation.userId !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  conversations.delete(id);

  res.json({ message: 'Conversation deleted' });
});

/**
 * POST /api/ai/design-review
 * Get AI feedback on a design
 */
router.post('/design-review', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  const { description, imageUrl, aspects = ['overall', 'accessibility', 'usability'] } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    const aspectsText = aspects.join(', ');
    const prompt = `Please review this design and provide feedback on the following aspects: ${aspectsText}.

Design description: ${description}
${imageUrl ? `Image URL: ${imageUrl}` : ''}

Provide specific, actionable feedback for each aspect. Format your response with clear headings.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: 'You are an expert UI/UX designer providing constructive feedback on designs. Be specific and actionable.',
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({
      feedback: response.content[0]?.text || '',
      aspects,
    });

  } catch (error) {
    console.error('[AI] Design review error:', error);
    res.status(500).json({
      error: 'Failed to review design',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/generate-code
 * Generate React component code
 */
router.post('/generate-code', authenticateToken, rateLimitByUser(20, 60000), async (req, res) => {
  const { description, componentType = 'component', style = 'modern' } = req.body;

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: 'You are an expert React/TypeScript developer. Generate clean, well-typed, accessible components.',
      messages: [{ role: 'user', content: prompt }],
    });

    const code = response.content[0]?.text || '';

    res.json({
      code,
      componentType,
      style,
    });

  } catch (error) {
    console.error('[AI] Code generation error:', error);
    res.status(500).json({
      error: 'Failed to generate code',
      details: error.message,
    });
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
  });
});

module.exports = router;
