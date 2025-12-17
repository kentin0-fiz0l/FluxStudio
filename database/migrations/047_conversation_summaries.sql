-- Migration 047: Conversation Summaries - AI-generated summaries with pulse/clarity state
-- Date: 2025-12-17
-- Description:
--   Adds conversation_summaries table for storing AI-generated conversation summaries
--   with pulse tone and clarity state metadata for "alive" messaging experience.

-- ===========================================
-- Conversation Summaries Table
-- ===========================================
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Foreign keys
  project_id TEXT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Summary content (structured JSON)
  summary_json JSONB NOT NULL DEFAULT '{}',
  -- Expected structure:
  -- {
  --   "summary": ["bullet1", "bullet2", ...],  // 3-6 bullets
  --   "decisions": [{"text": "...", "messageId": "...", "timestamp": "..."}],  // 0-5
  --   "openQuestions": [{"text": "...", "messageId": "...", "askedBy": "..."}],  // 0-5
  --   "nextSteps": [{"text": "...", "priority": "high|medium|low"}],  // 0-5
  --   "sentiment": "productive|neutral|blocked|energetic"  // informational
  -- }

  -- Pulse and Clarity state
  pulse_tone TEXT NOT NULL DEFAULT 'calm' CHECK (pulse_tone IN ('calm', 'neutral', 'intense')),
  clarity_state TEXT NOT NULL DEFAULT 'focused' CHECK (clarity_state IN ('focused', 'mixed', 'uncertain')),

  -- Signal metrics used for derivation (for debugging/tuning)
  signal_metrics JSONB DEFAULT '{}',
  -- Example structure:
  -- {
  --   "messageCount": 42,
  --   "participantCount": 4,
  --   "questionRatio": 0.3,
  --   "nextStepsCount": 2,
  --   "unresolvedQuestions": 1,
  --   "hoursSinceLastDecision": 24,
  --   "activityBurstiness": 0.7
  -- }

  -- Metadata
  generated_by TEXT NOT NULL DEFAULT 'system',  -- 'system', 'ai-anthropic', 'ai-openai', 'disabled'
  message_window_start TEXT,  -- First message ID in the summarized window
  message_window_end TEXT,    -- Last message ID in the summarized window
  message_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one summary per conversation (can be refreshed)
  UNIQUE(conversation_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_conv_summaries_project
  ON conversation_summaries(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_summaries_conversation
  ON conversation_summaries(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conv_summaries_updated
  ON conversation_summaries(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_summaries_pulse_clarity
  ON conversation_summaries(pulse_tone, clarity_state);

-- Comments
COMMENT ON TABLE conversation_summaries IS 'AI-generated conversation summaries with pulse tone and clarity state';
COMMENT ON COLUMN conversation_summaries.pulse_tone IS 'Activity intensity: calm (steady), neutral, intense (bursty)';
COMMENT ON COLUMN conversation_summaries.clarity_state IS 'Conversation clarity: focused (clear direction), mixed, uncertain (many questions)';
COMMENT ON COLUMN conversation_summaries.summary_json IS 'Structured summary with bullets, decisions, questions, next steps';
COMMENT ON COLUMN conversation_summaries.signal_metrics IS 'Heuristic inputs used to derive pulse/clarity states';
COMMENT ON COLUMN conversation_summaries.generated_by IS 'Source of summary: system, ai-anthropic, ai-openai, or disabled';
