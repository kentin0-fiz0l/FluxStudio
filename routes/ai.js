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

/**
 * POST /api/ai/test
 * Development-only test endpoint (no auth required)
 * WARNING: Only available in development mode
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', async (req, res) => {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    try {
      const systemPrompt = buildSystemPrompt(context);

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      });

      const content = response.content[0]?.text || '';
      const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

      res.json({
        content,
        tokensUsed,
        model: response.model,
        warning: 'This is a development-only endpoint. Do not use in production.',
      });

    } catch (error) {
      console.error('[AI] Test endpoint error:', error);
      res.status(500).json({
        error: 'Failed to get AI response',
        details: error.message,
      });
    }
  });
  console.log('⚠️  AI test endpoint enabled (development mode only): POST /api/ai/test');
}

/**
 * POST /design-feedback/analyze
 * Analyze a design image using Claude Vision
 * Body: { imageUrl: string, context?: { projectType, industry, targetAudience, brandGuidelines, focusAreas } }
 */
router.post('/design-feedback/analyze', authenticateToken, rateLimitByUser(10, 60), async (req, res) => {
  try {
    const { imageUrl, context } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
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
      return res.status(400).json({ error: `Failed to fetch image: ${imageResponse.status}` });
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64 = imageBuffer.toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    let mediaType = 'image/jpeg';
    if (contentType.includes('png')) mediaType = 'image/png';
    else if (contentType.includes('gif')) mediaType = 'image/gif';
    else if (contentType.includes('webp')) mediaType = 'image/webp';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ error: 'No text response from AI' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response as JSON' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('[AI] Design feedback analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze design', details: error.message });
  }
});

/**
 * POST /api/ai/generate-project-structure
 * Generate project structure from natural language description
 */
router.post('/generate-project-structure', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  const { description, category, complexity } = req.body;

  if (!description || description.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide a project description (at least 10 characters)' });
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: description.trim() }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' });
    }

    const suggestion = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    console.error('[AI] Project structure generation error:', error);

    // Fallback: generate locally if AI fails
    const fallback = generateLocalStructure(description, category);
    res.json({ success: true, data: fallback, fallback: true });
  }
});

/**
 * POST /api/ai/generate-template
 * AI-generate a full project template from description
 */
router.post('/generate-template', authenticateToken, rateLimitByUser(5, 60000), async (req, res) => {
  const { description, category, complexity } = req.body;

  if (!description || description.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide a template description (at least 10 characters)' });
  }

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: description.trim() }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' });
    }

    const template = JSON.parse(jsonMatch[0]);
    res.json({ success: true, data: { template, confidence: 0.85 } });
  } catch (error) {
    console.error('[AI] Template generation error:', error);
    res.status(500).json({ error: 'Failed to generate template', details: error.message });
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

module.exports = router;
