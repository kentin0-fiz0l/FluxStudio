/**
 * Formation Draft Service - AI Agent Orchestration
 *
 * Core business logic for the Formation Draft Agent:
 * - Session management (create, pause, cancel)
 * - Music analysis from MetMap song/sections
 * - Claude tool_use pipeline: plan → generate → smooth
 * - Refinement via multi-turn conversation
 *
 * Date: 2026-02-21
 */

const { query, generateCuid } = require('../database/config');
const Anthropic = require('@anthropic-ai/sdk');

// Lazy-init Anthropic client
let anthropic = null;
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 2;
const TOKEN_BUDGET_DEFAULT = 100000;

function getAnthropicClient() {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

// ============================================================================
// System Prompt
// ============================================================================

const FORMATION_SYSTEM_PROMPT = `You are a marching arts formation designer for FluxStudio. You create drill formations for marching bands, drum corps, and indoor ensembles.

DOMAIN KNOWLEDGE:
- Football field: 100 yards long, 53.33 yards wide. Positions are normalized 0-100 for both axes.
- Hash marks at roughly y=35 and y=65 (college). Sidelines at y=0 and y=100. End zones at x=0 and x=100.
- "Press box view" is the primary viewing angle (looking from y=0 toward y=100).
- Standard step sizes: 8-to-5 (22.5 inches per step), 6-to-5, 4-to-5, 12-to-5.
- Maximum comfortable step size per count: ~2.5 units in normalized space at 120 BPM.
- Minimum spacing between performers: ~1.5 units (to avoid collisions).

DESIGN PRINCIPLES:
- Symmetry creates visual impact. Use center (x=50) as axis of symmetry when possible.
- Shapes should be recognizable from press box view.
- Smooth transitions: minimize individual step sizes between keyframes.
- Use the full field for impact, but cluster for intimate moments.
- Match formation energy to music energy (loud = spread, soft = tight).

CONSTRAINTS:
- All positions must be in range [0, 100] for both x and y.
- Each performer needs a unique position (no two performers at the same x,y).
- Rotation values are in degrees (0-360), default 0 (facing press box).

When generating positions, be precise with numbers. Use 1-2 decimal places.`;

// ============================================================================
// Claude Tool Definitions
// ============================================================================

const FORMATION_TOOLS = [
  {
    name: 'plan_show_structure',
    description: 'Create a high-level plan for the show structure, mapping music sections to formation concepts. Call this once after receiving the music analysis.',
    input_schema: {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sectionIndex: { type: 'integer', description: 'Index matching the music section' },
              sectionName: { type: 'string', description: 'Name from the music analysis' },
              formationConcept: { type: 'string', description: 'What shape/formation to create (e.g., "diagonal lines", "company front", "scatter to circle")' },
              energy: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Visual energy level' },
              keyframeCount: { type: 'integer', description: 'Number of keyframes for this section (1-4)' },
              designNotes: { type: 'string', description: 'Additional design notes' },
            },
            required: ['sectionIndex', 'sectionName', 'formationConcept', 'energy', 'keyframeCount'],
          },
          description: 'One entry per music section with formation concept',
        },
        overallTheme: { type: 'string', description: 'Overall visual theme of the show' },
        totalKeyframes: { type: 'integer', description: 'Total keyframes across all sections' },
      },
      required: ['sections', 'overallTheme', 'totalKeyframes'],
    },
  },
  {
    name: 'generate_keyframe_positions',
    description: 'Generate exact x,y positions for all performers in a single keyframe. Positions are normalized 0-100.',
    input_schema: {
      type: 'object',
      properties: {
        keyframeId: { type: 'string', description: 'Unique ID for this keyframe' },
        sectionIndex: { type: 'integer', description: 'Which music section this belongs to' },
        keyframeIndexInSection: { type: 'integer', description: 'Which keyframe within the section (0-based)' },
        timestampMs: { type: 'integer', description: 'Timestamp in milliseconds' },
        transitionType: { type: 'string', enum: ['linear', 'ease-in', 'ease-out', 'ease-in-out'], default: 'ease-in-out' },
        durationMs: { type: 'integer', description: 'Transition duration in ms' },
        positions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              performerId: { type: 'string' },
              x: { type: 'number', minimum: 0, maximum: 100 },
              y: { type: 'number', minimum: 0, maximum: 100 },
              rotation: { type: 'number', minimum: 0, maximum: 360, default: 0 },
            },
            required: ['performerId', 'x', 'y'],
          },
        },
      },
      required: ['keyframeId', 'sectionIndex', 'keyframeIndexInSection', 'timestampMs', 'positions'],
    },
  },
  {
    name: 'validate_transitions',
    description: 'Validate all transitions between consecutive keyframes. Check step sizes, collisions, and suggest position adjustments.',
    input_schema: {
      type: 'object',
      properties: {
        adjustments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              keyframeId: { type: 'string', description: 'Keyframe to adjust' },
              performerId: { type: 'string', description: 'Performer to adjust' },
              newX: { type: 'number', minimum: 0, maximum: 100 },
              newY: { type: 'number', minimum: 0, maximum: 100 },
              reason: { type: 'string', description: 'Why this adjustment is needed' },
            },
            required: ['keyframeId', 'performerId', 'newX', 'newY', 'reason'],
          },
        },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['step_size', 'collision', 'out_of_bounds'] },
              keyframeId: { type: 'string' },
              performerId: { type: 'string' },
              severity: { type: 'string', enum: ['warning', 'error'] },
              description: { type: 'string' },
            },
            required: ['type', 'keyframeId', 'severity', 'description'],
          },
        },
        summary: { type: 'string', description: 'Overall assessment of transitions' },
      },
      required: ['adjustments', 'issues', 'summary'],
    },
  },
];

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new draft session
 */
async function createSession(userId, formationId, params) {
  const id = generateCuid();
  const { songId, showDescription, performerCount, constraints } = params;

  await query(`
    INSERT INTO formation_draft_sessions
      (id, formation_id, user_id, song_id, show_description, performer_count, constraints, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
  `, [id, formationId, userId, songId || null, showDescription, performerCount, JSON.stringify(constraints || {})]);

  return { id, formationId, status: 'pending' };
}

/**
 * Get session by ID
 */
async function getSession(sessionId) {
  const result = await query('SELECT * FROM formation_draft_sessions WHERE id = $1', [sessionId]);
  return result.rows[0] || null;
}

/**
 * Update session status and data
 */
async function updateSession(sessionId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (typeof value === 'object' && value !== null) {
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(JSON.stringify(value));
    } else {
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
    }
    paramIndex++;
  }

  if (fields.length === 0) return;

  values.push(sessionId);
  await query(
    `UPDATE formation_draft_sessions SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

// ============================================================================
// Music Analysis (No Claude call)
// ============================================================================

/**
 * Analyze music structure from MetMap song data
 */
async function analyzeMusicStructure(songId) {
  if (!songId) {
    return { sections: [], totalDurationMs: 0, hasSong: false };
  }

  const songResult = await query(
    'SELECT * FROM metmap_songs WHERE id = $1',
    [songId]
  );

  if (songResult.rows.length === 0) {
    return { sections: [], totalDurationMs: 0, hasSong: false };
  }

  const song = songResult.rows[0];
  const sectionsResult = await query(
    'SELECT * FROM metmap_sections WHERE song_id = $1 ORDER BY order_index',
    [songId]
  );

  const sections = [];
  let currentMs = 0;

  for (const section of sectionsResult.rows) {
    const bpm = section.tempo_start || song.bpm_default || 120;
    const timeSig = section.time_signature || song.time_signature_default || '4/4';
    const beatsPerBar = parseInt(timeSig.split('/')[0]) || 4;
    const totalBeats = section.bars * beatsPerBar;
    const msPerBeat = 60000 / bpm;
    const durationMs = Math.round(totalBeats * msPerBeat);

    sections.push({
      name: section.name,
      startMs: currentMs,
      endMs: currentMs + durationMs,
      durationMs,
      tempo: bpm,
      timeSignature: timeSig,
      bars: section.bars,
    });

    currentMs += durationMs;
  }

  return {
    sections,
    totalDurationMs: currentMs,
    hasSong: true,
    songTitle: song.title,
    defaultBpm: song.bpm_default,
  };
}

/**
 * Create evenly-spaced fallback sections when no song is linked
 */
function createFallbackSections(durationMs, bpm = 120) {
  const sectionCount = Math.max(1, Math.round(durationMs / 30000)); // ~30s per section
  const sectionDuration = Math.round(durationMs / sectionCount);

  return Array.from({ length: sectionCount }, (_, i) => ({
    name: `Section ${i + 1}`,
    startMs: i * sectionDuration,
    endMs: (i + 1) * sectionDuration,
    durationMs: sectionDuration,
    tempo: bpm,
    timeSignature: '4/4',
    bars: Math.round(sectionDuration / (60000 / bpm * 4)),
  }));
}

// ============================================================================
// Claude Tool-Use Pipeline
// ============================================================================

/**
 * Call Claude with tool_use and process the response
 */
async function callClaude(conversationHistory, retryCount = 0) {
  try {
    const response = await getAnthropicClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: FORMATION_SYSTEM_PROMPT,
      tools: FORMATION_TOOLS,
      messages: conversationHistory,
    });

    return response;
  } catch (error) {
    if (retryCount < MAX_RETRIES && (error.status === 429 || error.status >= 500)) {
      const delay = Math.pow(2, retryCount + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return callClaude(conversationHistory, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Extract tool_use result from Claude response
 */
function extractToolUse(response, toolName) {
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === toolName) {
      return { toolUseBlock: block, input: block.input };
    }
  }
  return null;
}

/**
 * Calculate tokens used from a response
 */
function getTokensUsed(response) {
  return (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
}

// ============================================================================
// Step 2: Generate Show Plan
// ============================================================================

async function generateShowPlan(sessionId, showDescription, musicAnalysis, performerCount, constraints) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const musicContext = musicAnalysis.hasSong
    ? `Music: "${musicAnalysis.songTitle}" (${musicAnalysis.totalDurationMs}ms total)\nSections:\n${musicAnalysis.sections.map((s, i) => `  ${i}. "${s.name}" (${s.startMs}-${s.endMs}ms, ${s.tempo} BPM, ${s.timeSignature})`).join('\n')}`
    : `No music linked. Using ${musicAnalysis.sections.length} evenly-spaced sections.`;

  const userMessage = `Create a show plan for ${performerCount} performers.

Show description: ${showDescription}

${musicContext}

${constraints && Object.keys(constraints).length > 0 ? `Constraints: ${JSON.stringify(constraints)}` : ''}

Call the plan_show_structure tool with your plan.`;

  const conversationHistory = [{ role: 'user', content: userMessage }];

  const response = await callClaude(conversationHistory);
  const toolResult = extractToolUse(response, 'plan_show_structure');

  if (!toolResult) {
    throw new Error('Claude did not call plan_show_structure tool');
  }

  const tokensUsed = getTokensUsed(response);

  // Save to session
  conversationHistory.push({ role: 'assistant', content: response.content });
  await updateSession(sessionId, {
    status: 'awaiting_approval',
    showPlan: toolResult.input,
    conversationHistory,
    tokensUsed: (session.tokens_used || 0) + tokensUsed,
    totalSections: toolResult.input.sections.length,
  });

  return {
    showPlan: toolResult.input,
    tokensUsed,
    toolUseId: toolResult.toolUseBlock.id,
  };
}

// ============================================================================
// Step 3: Generate Keyframes
// ============================================================================

/**
 * Generate a single keyframe for a section
 */
async function generateKeyframe(sessionId, sectionContext, performerList, previousPositions) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status === 'paused' || session.status === 'cancelled') {
    return { paused: true };
  }

  const conversationHistory = session.conversation_history || [];

  const previousContext = previousPositions
    ? `Previous keyframe positions:\n${previousPositions.map(p => `  ${p.performerId}: (${p.x}, ${p.y})`).join('\n')}`
    : 'This is the first keyframe.';

  const performerListStr = performerList.map(p => `  ${p.id}: "${p.name}" (${p.label})`).join('\n');

  const userMessage = `Generate keyframe positions for section "${sectionContext.sectionName}" (concept: "${sectionContext.formationConcept}", energy: ${sectionContext.energy}).

Keyframe ${sectionContext.keyframeIndexInSection + 1} of ${sectionContext.keyframeCount} in this section.
Timestamp: ${sectionContext.timestampMs}ms
Duration: ${sectionContext.durationMs}ms

Performers (${performerList.length} total):
${performerListStr}

${previousContext}

Call generate_keyframe_positions with exact positions for all ${performerList.length} performers.`;

  // Continue conversation
  conversationHistory.push({
    role: 'user',
    content: [{
      type: 'tool_result',
      tool_use_id: sectionContext.previousToolUseId || 'init',
      content: 'Acknowledged. Proceed with next keyframe.',
    }],
  });

  // Replace the tool_result message with a plain user message if first keyframe
  if (!sectionContext.previousToolUseId) {
    conversationHistory[conversationHistory.length - 1] = { role: 'user', content: userMessage };
  } else {
    conversationHistory.push({ role: 'user', content: userMessage });
  }

  const response = await callClaude(conversationHistory);
  const toolResult = extractToolUse(response, 'generate_keyframe_positions');

  if (!toolResult) {
    throw new Error('Claude did not call generate_keyframe_positions tool');
  }

  const tokensUsed = getTokensUsed(response);

  // Validate and clamp positions
  const positions = (toolResult.input.positions || []).map(pos => ({
    performerId: pos.performerId,
    x: Math.max(0, Math.min(100, pos.x || 50)),
    y: Math.max(0, Math.min(100, pos.y || 50)),
    rotation: pos.rotation || 0,
  }));

  // Save conversation state
  conversationHistory.push({ role: 'assistant', content: response.content });
  await updateSession(sessionId, {
    conversationHistory,
    tokensUsed: (session.tokens_used || 0) + tokensUsed,
  });

  return {
    keyframeId: toolResult.input.keyframeId || generateCuid(),
    timestampMs: toolResult.input.timestampMs,
    transitionType: toolResult.input.transitionType || 'ease-in-out',
    durationMs: toolResult.input.durationMs || sectionContext.durationMs,
    positions,
    tokensUsed,
    toolUseId: toolResult.toolUseBlock.id,
  };
}

// ============================================================================
// Step 4: Validate Transitions (Smoothing)
// ============================================================================

async function smoothTransitions(sessionId, allKeyframes, performerList) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  // Build transition analysis
  const issues = [];
  for (let i = 1; i < allKeyframes.length; i++) {
    const prev = allKeyframes[i - 1];
    const curr = allKeyframes[i];

    for (const performer of performerList) {
      const prevPos = prev.positions.find(p => p.performerId === performer.id);
      const currPos = curr.positions.find(p => p.performerId === performer.id);

      if (!prevPos || !currPos) continue;

      const dx = currPos.x - prevPos.x;
      const dy = currPos.y - prevPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check for excessive step size (>3.5 units per keyframe transition)
      if (distance > 3.5) {
        issues.push({
          fromKeyframe: prev.keyframeId,
          toKeyframe: curr.keyframeId,
          performerId: performer.id,
          performerName: performer.name,
          distance: distance.toFixed(2),
        });
      }
    }
  }

  if (issues.length === 0) {
    return { adjustments: [], issues: [], summary: 'All transitions are smooth.' };
  }

  const conversationHistory = session.conversation_history || [];

  const issuesSummary = issues.map(iss =>
    `  ${iss.performerName}: ${iss.distance} units from keyframe ${iss.fromKeyframe} to ${iss.toKeyframe}`
  ).join('\n');

  const userMessage = `Review transitions and call validate_transitions. These performers have large step sizes:
${issuesSummary}

Current keyframe data:
${allKeyframes.map(kf => `Keyframe ${kf.keyframeId} (${kf.timestampMs}ms): ${kf.positions.length} positions`).join('\n')}

Suggest position adjustments to smooth transitions while maintaining the overall formation shapes.`;

  conversationHistory.push({ role: 'user', content: userMessage });

  const response = await callClaude(conversationHistory);
  const toolResult = extractToolUse(response, 'validate_transitions');

  const tokensUsed = getTokensUsed(response);

  conversationHistory.push({ role: 'assistant', content: response.content });
  await updateSession(sessionId, {
    conversationHistory,
    tokensUsed: (session.tokens_used || 0) + tokensUsed,
  });

  if (!toolResult) {
    return { adjustments: [], issues: [], summary: 'Smoothing pass completed without adjustments.' };
  }

  return {
    adjustments: toolResult.input.adjustments || [],
    issues: toolResult.input.issues || [],
    summary: toolResult.input.summary || '',
    tokensUsed,
  };
}

// ============================================================================
// Refinement
// ============================================================================

/**
 * Refine the formation based on a user instruction.
 * Claude auto-detects scope from the instruction.
 */
async function refineFormation(sessionId, instruction) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const conversationHistory = session.conversation_history || [];

  const userMessage = `The user wants to refine the formation: "${instruction}"

Based on the instruction, determine the scope (whole show, specific section, or specific keyframe) and regenerate the affected keyframes. Call generate_keyframe_positions for each keyframe that needs to change.`;

  conversationHistory.push({ role: 'user', content: userMessage });

  const response = await callClaude(conversationHistory);
  const tokensUsed = getTokensUsed(response);

  // Collect all keyframe tool calls
  const keyframes = [];
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'generate_keyframe_positions') {
      const positions = (block.input.positions || []).map(pos => ({
        performerId: pos.performerId,
        x: Math.max(0, Math.min(100, pos.x || 50)),
        y: Math.max(0, Math.min(100, pos.y || 50)),
        rotation: pos.rotation || 0,
      }));
      keyframes.push({
        keyframeId: block.input.keyframeId,
        timestampMs: block.input.timestampMs,
        positions,
      });
    }
  }

  conversationHistory.push({ role: 'assistant', content: response.content });
  await updateSession(sessionId, {
    status: 'refining',
    conversationHistory,
    tokensUsed: (session.tokens_used || 0) + tokensUsed,
  });

  return { keyframes, tokensUsed };
}

// ============================================================================
// Session Control
// ============================================================================

async function pauseGeneration(sessionId) {
  await updateSession(sessionId, { status: 'paused' });
}

async function cancelGeneration(sessionId) {
  await updateSession(sessionId, { status: 'cancelled' });
}

async function approveShowPlan(sessionId) {
  await updateSession(sessionId, { planApproved: true, status: 'generating' });
}

// ============================================================================
// Performer List Helper
// ============================================================================

/**
 * Get performer list for a formation from the Yjs state or database
 */
async function getPerformerList(formationId) {
  const result = await query(
    'SELECT id, name, label, color, group_name FROM formation_performers WHERE formation_id = $1 ORDER BY sort_order',
    [formationId]
  );
  return result.rows;
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  createSession,
  getSession,
  updateSession,
  analyzeMusicStructure,
  createFallbackSections,
  generateShowPlan,
  generateKeyframe,
  smoothTransitions,
  refineFormation,
  pauseGeneration,
  cancelGeneration,
  approveShowPlan,
  getPerformerList,
  FORMATION_TOOLS,
  FORMATION_SYSTEM_PROMPT,
};
