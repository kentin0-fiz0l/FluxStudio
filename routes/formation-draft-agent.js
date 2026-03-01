/**
 * Formation Draft Agent Routes - AI Formation Generation API
 *
 * Endpoints:
 * - POST /api/formation-agent/generate       SSE stream for full generation pipeline
 * - POST /api/formation-agent/session/:id/approve   Approve show plan
 * - POST /api/formation-agent/session/:id/refine    Send refinement instruction
 * - POST /api/formation-agent/session/:id/interrupt  Pause/cancel
 * - GET  /api/formation-agent/session/:id           Get session status
 *
 * Date: 2026-02-21
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const {
  agentPermissions,
  auditLog,
  agentRateLimit,
} = require('../lib/agent/middleware');
const draftService = require('../services/formation-draft-service');
const { FormationDraftYjsClient } = require('../services/formation-draft-yjs-client');
const { zodValidate } = require('../middleware/zodValidate');
const { generateFormationSchema, refineFormationSchema, interruptFormationSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('FormationDraftAgent');

// Track active generation sessions for interrupt support
const activeGenerations = new Map();

// ============================================================================
// Helper: Send SSE event
// ============================================================================

function sendSSE(res, type, data) {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }
}

// ============================================================================
// POST /generate - Start formation generation (SSE stream)
// ============================================================================

router.post('/generate',
  authenticateToken,
  agentRateLimit(5, 60000),
  agentPermissions('write:formations'),
  auditLog('formation_draft'),
  zodValidate(generateFormationSchema),
  async (req, res) => {
    const { formationId, songId, showDescription, performerCount, constraints } = req.body;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let yjsClient = null;
    let sessionId = null;

    try {
      // Step 0: Create session
      const session = await draftService.createSession(req.user.id, formationId, {
        songId, showDescription, performerCount, constraints,
      });
      sessionId = session.id;

      activeGenerations.set(sessionId, { status: 'running' });
      sendSSE(res, 'session', { sessionId });

      // Step 1: Music analysis
      await draftService.updateSession(sessionId, { status: 'analyzing' });
      sendSSE(res, 'status', { status: 'analyzing' });

      let musicAnalysis = await draftService.analyzeMusicStructure(songId);
      if (!musicAnalysis.hasSong || musicAnalysis.sections.length === 0) {
        // Fallback: create evenly-spaced sections
        const defaultDuration = 180000; // 3 minutes
        musicAnalysis = {
          sections: draftService.createFallbackSections(defaultDuration),
          totalDurationMs: defaultDuration,
          hasSong: false,
        };
      }

      sendSSE(res, 'music_analysis', {
        sections: musicAnalysis.sections,
        totalDurationMs: musicAnalysis.totalDurationMs,
      });

      // Step 2: Generate show plan
      await draftService.updateSession(sessionId, { status: 'planning' });
      sendSSE(res, 'status', { status: 'planning' });

      const planResult = await draftService.generateShowPlan(
        sessionId, showDescription, musicAnalysis, performerCount, constraints
      );

      sendSSE(res, 'plan', planResult.showPlan);

      // GATE: Wait for plan approval (the stream stays open)
      // The client will call POST /session/:id/approve or /session/:id/interrupt
      sendSSE(res, 'awaiting_approval', { sessionId });

      // Poll for approval (check every 2 seconds, max 5 minutes)
      const approved = await waitForApproval(sessionId, 300000);

      if (!approved) {
        sendSSE(res, 'cancelled', { reason: 'Plan not approved within timeout' });
        res.end();
        return;
      }

      // Step 3: Get performer list
      const performers = await draftService.getPerformerList(formationId);
      if (performers.length === 0) {
        sendSSE(res, 'error', { message: 'No performers found in formation', retryable: false });
        res.end();
        return;
      }

      // Step 4: Connect to Yjs
      yjsClient = new FormationDraftYjsClient();
      const projectIdResult = await require('../database/config').query(
        'SELECT project_id FROM formations WHERE id = $1', [formationId]
      );
      const projectId = projectIdResult.rows[0]?.project_id;

      if (!projectId) {
        sendSSE(res, 'error', { message: 'Formation not found', retryable: false });
        res.end();
        return;
      }

      await yjsClient.connect(formationId, projectId);
      yjsClient.setAgentAwareness('generating', 'Generating keyframes...');

      // Step 5: Generate keyframes section by section
      const showPlan = planResult.showPlan;
      const allKeyframes = [];
      let previousPositions = null;
      let previousToolUseId = planResult.toolUseId;
      let globalKeyframeIndex = 0;

      for (let sectionIdx = 0; sectionIdx < showPlan.sections.length; sectionIdx++) {
        const section = showPlan.sections[sectionIdx];

        // Check for interrupt
        const genState = activeGenerations.get(sessionId);
        if (!genState || genState.status !== 'running') {
          sendSSE(res, 'paused', { completedSections: sectionIdx });
          break;
        }

        sendSSE(res, 'generating', {
          sectionIndex: sectionIdx,
          totalSections: showPlan.sections.length,
          sectionName: section.sectionName,
        });

        const musicSection = musicAnalysis.sections[section.sectionIndex] || musicAnalysis.sections[sectionIdx];
        const sectionDuration = musicSection ? musicSection.durationMs : 30000;
        const keyframeCount = section.keyframeCount || 1;

        for (let kfIdx = 0; kfIdx < keyframeCount; kfIdx++) {
          // Check for interrupt again
          const currentState = activeGenerations.get(sessionId);
          if (!currentState || currentState.status !== 'running') break;

          const timestampMs = musicSection
            ? musicSection.startMs + Math.round((kfIdx / keyframeCount) * sectionDuration)
            : Math.round((globalKeyframeIndex / showPlan.totalKeyframes) * musicAnalysis.totalDurationMs);

          yjsClient.setAgentAwareness('generating', `Keyframe ${globalKeyframeIndex + 1}/${showPlan.totalKeyframes}`);

          const keyframeResult = await draftService.generateKeyframe(sessionId, {
            sectionName: section.sectionName,
            formationConcept: section.formationConcept,
            energy: section.energy,
            keyframeIndexInSection: kfIdx,
            keyframeCount,
            timestampMs,
            durationMs: Math.round(sectionDuration / keyframeCount),
            previousToolUseId,
          }, performers, previousPositions);

          if (keyframeResult.paused) {
            sendSSE(res, 'paused', { completedSections: sectionIdx });
            break;
          }

          // Write to Yjs progressively
          await yjsClient.writePositionsProgressively(keyframeResult, 50);

          allKeyframes.push(keyframeResult);
          previousPositions = keyframeResult.positions;
          previousToolUseId = keyframeResult.toolUseId;
          globalKeyframeIndex++;

          sendSSE(res, 'keyframe', {
            keyframeIndex: globalKeyframeIndex,
            totalKeyframes: showPlan.totalKeyframes,
          });

          await draftService.updateSession(sessionId, {
            currentSectionIndex: sectionIdx,
          });
        }
      }

      // Step 6: Smoothing pass
      if (allKeyframes.length > 1) {
        await draftService.updateSession(sessionId, { status: 'smoothing' });
        sendSSE(res, 'status', { status: 'smoothing' });
        yjsClient.setAgentAwareness('smoothing', 'Smoothing transitions...');

        const smoothResult = await draftService.smoothTransitions(sessionId, allKeyframes, performers);

        // Apply adjustments to Yjs
        if (smoothResult.adjustments && smoothResult.adjustments.length > 0) {
          for (const adj of smoothResult.adjustments) {
            yjsClient.updateKeyframePositions(adj.keyframeId, [{
              performerId: adj.performerId,
              x: adj.newX,
              y: adj.newY,
            }]);
          }
        }

        sendSSE(res, 'smoothing', {
          adjustments: smoothResult.adjustments?.length || 0,
          summary: smoothResult.summary,
        });
      }

      // Step 7: Done
      const finalSession = await draftService.getSession(sessionId);
      await draftService.updateSession(sessionId, {
        status: 'done',
        completedAt: new Date().toISOString(),
      });

      sendSSE(res, 'done', {
        tokensUsed: finalSession?.tokens_used || 0,
        keyframesGenerated: allKeyframes.length,
      });

    } catch (error) {
      log.error('Generation error', error);
      sendSSE(res, 'error', {
        message: error.message || 'Generation failed',
        retryable: true,
      });

      if (sessionId) {
        await draftService.updateSession(sessionId, {
          status: 'error',
          errorMessage: error.message,
        }).catch(() => {});
      }
    } finally {
      // Clean up
      if (yjsClient) {
        yjsClient.setAgentAwareness('done', 'Generation complete');
        // Brief delay so peers see the final status
        await new Promise(resolve => setTimeout(resolve, 1000));
        yjsClient.disconnect();
      }
      if (sessionId) {
        activeGenerations.delete(sessionId);
      }
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
);

// ============================================================================
// POST /session/:id/approve - Approve show plan
// ============================================================================

router.post('/session/:id/approve',
  authenticateToken,
  async (req, res) => {
    try {
      const session = await draftService.getSession(req.params.id);

      if (!session || session.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status !== 'awaiting_approval') {
        return res.status(400).json({ error: 'Session is not awaiting approval' });
      }

      await draftService.approveShowPlan(req.params.id);

      res.json({ success: true, message: 'Plan approved' });
    } catch (error) {
      log.error('Approve error', error);
      res.status(500).json({ error: 'Failed to approve plan' });
    }
  }
);

// ============================================================================
// POST /session/:id/refine - Send refinement instruction
// ============================================================================

router.post('/session/:id/refine',
  authenticateToken,
  agentRateLimit(10, 60000),
  agentPermissions('write:formations'),
  auditLog('formation_draft_refine'),
  zodValidate(refineFormationSchema),
  async (req, res) => {
    const { instruction } = req.body;

    try {
      const session = await draftService.getSession(req.params.id);
      if (!session || session.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status !== 'done' && session.status !== 'paused') {
        return res.status(400).json({ error: 'Session must be done or paused to refine' });
      }

      // Set up SSE for refinement
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      sendSSE(res, 'status', { status: 'refining' });

      const result = await draftService.refineFormation(req.params.id, instruction);

      // Connect to Yjs to apply changes
      if (result.keyframes.length > 0) {
        const yjsClient = new FormationDraftYjsClient();
        const projectIdResult = await require('../database/config').query(
          'SELECT project_id FROM formations WHERE id = $1', [session.formation_id]
        );
        const projectId = projectIdResult.rows[0]?.project_id;

        if (projectId) {
          await yjsClient.connect(session.formation_id, projectId);

          for (const kf of result.keyframes) {
            yjsClient.updateKeyframePositions(kf.keyframeId, kf.positions);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
          yjsClient.disconnect();
        }
      }

      await draftService.updateSession(req.params.id, { status: 'done' });

      sendSSE(res, 'refined', {
        keyframesUpdated: result.keyframes.length,
        tokensUsed: result.tokensUsed,
      });
      sendSSE(res, 'done', { tokensUsed: result.tokensUsed });
      res.end();
    } catch (error) {
      log.error('Refine error', error);
      sendSSE(res, 'error', { message: error.message, retryable: true });
      res.end();
    }
  }
);

// ============================================================================
// POST /session/:id/interrupt - Pause or cancel
// ============================================================================

router.post('/session/:id/interrupt',
  authenticateToken,
  zodValidate(interruptFormationSchema),
  async (req, res) => {
    const { action } = req.body;

    try {
      const session = await draftService.getSession(req.params.id);
      if (!session || session.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (action === 'cancel') {
        await draftService.cancelGeneration(req.params.id);
        activeGenerations.set(req.params.id, { status: 'cancelled' });
      } else {
        await draftService.pauseGeneration(req.params.id);
        activeGenerations.set(req.params.id, { status: 'paused' });
      }

      res.json({ success: true, action });
    } catch (error) {
      log.error('Interrupt error', error);
      res.status(500).json({ error: 'Failed to interrupt generation' });
    }
  }
);

// ============================================================================
// GET /session/:id - Get session status
// ============================================================================

router.get('/session/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const session = await draftService.getSession(req.params.id);

      if (!session || session.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        success: true,
        data: {
          id: session.id,
          formationId: session.formation_id,
          status: session.status,
          showPlan: session.show_plan,
          planApproved: session.plan_approved,
          tokensUsed: session.tokens_used,
          currentSectionIndex: session.current_section_index,
          totalSections: session.total_sections,
          errorMessage: session.error_message,
          createdAt: session.created_at,
          completedAt: session.completed_at,
        },
      });
    } catch (error) {
      log.error('Get session error', error);
      res.status(500).json({ error: 'Failed to get session' });
    }
  }
);

// ============================================================================
// Helper: Wait for plan approval
// ============================================================================

async function waitForApproval(sessionId, timeoutMs = 300000) {
  const pollInterval = 2000;
  const maxPolls = Math.ceil(timeoutMs / pollInterval);

  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const session = await draftService.getSession(sessionId);
    if (!session) return false;

    if (session.plan_approved) return true;
    if (session.status === 'cancelled') return false;
  }

  return false;
}

module.exports = router;
