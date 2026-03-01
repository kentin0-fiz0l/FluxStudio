/**
 * AI MetMap Routes — Song analysis, chord suggestions, practice insights.
 *
 * Sprint 34: Phase 3.1 AI Creative Co-Pilot.
 * Streaming SSE responses grounded in actual song data.
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const metmapAdapter = require('../database/metmap-adapter');
const { buildMetMapContext } = require('../lib/metmap-ai-context');
const { createLogger } = require('../lib/logger');
const log = createLogger('AIMetMap');

const router = express.Router();

if (!process.env.ANTHROPIC_API_KEY) {
  log.error('ANTHROPIC_API_KEY is not set — AI endpoints will return 503');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.METMAP_AI_MODEL || 'claude-sonnet-4-20250514';

/**
 * Load full song context from DB for a given songId + userId.
 */
async function loadSongContext(songId, userId, options = {}) {
  const song = await metmapAdapter.getSongById(songId, userId);
  if (!song) return null;

  const sections = (await metmapAdapter.getSections(songId, userId)) || [];
  const chords = (await metmapAdapter.getChordsForSong(songId, userId)) || [];

  let practiceHistory = null;
  if (options.includePractice) {
    const result = await metmapAdapter.getPracticeHistory(songId, userId, { limit: 50 });
    practiceHistory = result?.sessions || [];
  }

  const context = buildMetMapContext(song, sections, chords, {
    practiceHistory,
    includeAnimations: options.includeAnimations,
  });

  return { song, sections, chords, practiceHistory, context };
}

/**
 * Stream a Claude response as SSE events.
 */
async function streamAnalysis(req, res, systemPrompt, userMessage) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const controller = new AbortController();
  req.on('close', () => controller.abort());
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  try {
    const stream = await anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

    let fullContent = '';
    for await (const event of stream) {
      if (controller.signal.aborted) break;
      if (event.type === 'content_block_delta' && event.delta?.text) {
        const chunk = event.delta.text;
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
    }

    if (!controller.signal.aborted) {
      res.write(`data: ${JSON.stringify({ type: 'done', length: fullContent.length })}\n\n`);
    }
    res.end();
  } catch (error) {
    if (controller.signal.aborted) {
      res.end();
      return;
    }
    log.error('Stream error', error);
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

// ========================================
// SONG ANALYSIS
// ========================================

/**
 * POST /api/ai/metmap/analyze-song
 * Comprehensive song analysis — structure, harmony, arrangement feedback.
 */
router.post('/analyze-song', authenticateToken, rateLimitByUser(15, 60000), async (req, res) => {
  const { songId, focus = 'all' } = req.body;

  if (!songId) {
    return res.status(400).json({ error: 'songId is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const data = await loadSongContext(songId, req.user.id, { includePractice: false });
  if (!data) {
    return res.status(404).json({ error: 'Song not found' });
  }

  const focusMap = {
    structure: 'Focus on song structure: section arrangement, pacing, transitions, form analysis.',
    harmony: 'Focus on harmonic analysis: chord progressions, key centers, modulations, voice leading.',
    arrangement: 'Focus on arrangement: dynamics, texture, instrumentation suggestions, section contrast.',
    all: 'Analyze structure, harmony, and arrangement comprehensively.',
  };

  const systemPrompt = `You are a music theory and arrangement expert integrated into FluxStudio's MetMap timeline editor. You analyze songs and provide actionable, specific feedback grounded in the actual composition data.

Guidelines:
- Reference specific section names in **bold** and chord symbols in \`code\` formatting
- Reference specific bar numbers when suggesting changes
- Keep music theory accessible to intermediate musicians
- Be encouraging while being specific about improvements
- Provide 3-5 concrete, actionable suggestions
- If the song has few or no chords, focus on structure and arrangement

${focusMap[focus] || focusMap.all}`;

  const userMessage = `Please analyze this song:\n\n${data.context}`;

  await streamAnalysis(req, res, systemPrompt, userMessage);
});

// ========================================
// CHORD SUGGESTIONS
// ========================================

/**
 * POST /api/ai/metmap/suggest-chords
 * Context-aware chord suggestions for a specific section.
 */
router.post('/suggest-chords', authenticateToken, rateLimitByUser(15, 60000), async (req, res) => {
  const { songId, sectionId, style, request } = req.body;

  if (!songId) {
    return res.status(400).json({ error: 'songId is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const data = await loadSongContext(songId, req.user.id);
  if (!data) {
    return res.status(404).json({ error: 'Song not found' });
  }

  // Find target section
  const targetSection = sectionId
    ? data.sections.find(s => s.id === sectionId)
    : data.sections[0];

  const sectionName = targetSection?.name || 'first section';
  const sectionBars = targetSection?.bars || 8;
  const ts = targetSection?.timeSignature || targetSection?.time_signature || '4/4';
  const beatsPerBar = parseInt(ts.split('/')[0]) || 4;

  // Get current chords for this section
  const sectionChords = data.chords.filter(c =>
    (c.sectionId || c.section_id) === targetSection?.id
  );
  const currentChordsStr = sectionChords.length > 0
    ? sectionChords.map(c => `${c.symbol} (bar ${c.bar}, beat ${c.beat})`).join(', ')
    : 'none';

  const systemPrompt = `You are a chord progression specialist integrated into FluxStudio's MetMap timeline editor.

Given the full song context, suggest chord progression alternatives for the specified section.

IMPORTANT — format each suggestion as a bar grid using this exact format:
| Cmaj7 . . . | Am7 . . . | Dm7 . G7 . | Cmaj7 . . . |

Rules for bar grids:
- Each bar has exactly ${beatsPerBar} positions separated by spaces
- Bars are separated by |
- Use . for held/empty beats
- The grid must have exactly ${sectionBars} bars
- Group bars into lines of 4 (use line breaks)
- Label each option: "**Option 1: ...**", "**Option 2: ...**", etc.

Guidelines:
- Provide 2-3 distinct options
- Explain the harmonic logic briefly after each option
- Consider how the chords connect to surrounding sections
- Use standard chord symbols: C, Cm, C7, Cmaj7, Cdim, Caug, Csus4, C/E (slash), etc.`;

  const userMessage = `${data.context}

---

TARGET SECTION: **${sectionName}** (${sectionBars} bars, ${ts})
Current chords: ${currentChordsStr}
Style preference: ${style || 'match the existing style'}
${request ? `User request: ${request}` : 'Suggest improvements or creative variations.'}

Please suggest 2-3 chord progression options for this section.`;

  await streamAnalysis(req, res, systemPrompt, userMessage);
});

// ========================================
// PRACTICE INSIGHTS
// ========================================

/**
 * POST /api/ai/metmap/practice-insights
 * Analyze practice history and provide coaching feedback.
 */
router.post('/practice-insights', authenticateToken, rateLimitByUser(15, 60000), async (req, res) => {
  const { songId } = req.body;

  if (!songId) {
    return res.status(400).json({ error: 'songId is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const data = await loadSongContext(songId, req.user.id, { includePractice: true });
  if (!data) {
    return res.status(404).json({ error: 'Song not found' });
  }

  if (!data.practiceHistory || data.practiceHistory.length === 0) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: 'No practice sessions found for this song yet. Start practicing and come back for personalized insights!' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', length: 0 })}\n\n`);
    res.end();
    return;
  }

  const systemPrompt = `You are a practice coach integrated into FluxStudio's MetMap timeline editor.

Analyze this musician's practice data and provide encouraging, actionable coaching advice.

Guidelines:
- Be warm and encouraging — celebrate progress
- Reference specific section names in **bold**
- Provide concrete practice strategies (not generic advice)
- Suggest tempo targets based on their progression
- If they've been using auto-ramp, comment on their tempo building strategy
- Keep it concise: 4-6 key insights with actionable next steps`;

  const userMessage = `Please analyze my practice data and give me coaching advice:\n\n${data.context}`;

  await streamAnalysis(req, res, systemPrompt, userMessage);
});

module.exports = router;
