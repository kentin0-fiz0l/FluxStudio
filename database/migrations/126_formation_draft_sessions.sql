-- Migration 126: Formation Draft Agent Sessions
-- Date: 2026-02-21
-- Description: Creates formation_draft_sessions table for tracking AI-powered
--              formation generation sessions, and seeds the agent system user.

-- Formation draft sessions - tracks agent-generated formation drafts
CREATE TABLE IF NOT EXISTS formation_draft_sessions (
  id TEXT PRIMARY KEY,
  formation_id TEXT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  song_id TEXT,
  show_description TEXT NOT NULL,
  performer_count INTEGER NOT NULL,
  constraints JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'analyzing', 'planning', 'awaiting_approval',
                      'generating', 'smoothing', 'refining', 'paused', 'done',
                      'error', 'cancelled')),
  show_plan JSONB,
  plan_approved BOOLEAN DEFAULT FALSE,
  conversation_history JSONB DEFAULT '[]',
  tokens_used INTEGER DEFAULT 0,
  current_section_index INTEGER DEFAULT 0,
  total_sections INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_formation_draft_sessions_formation
  ON formation_draft_sessions(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_draft_sessions_user
  ON formation_draft_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_formation_draft_sessions_status
  ON formation_draft_sessions(status);
CREATE INDEX IF NOT EXISTS idx_formation_draft_sessions_created
  ON formation_draft_sessions(created_at DESC);

-- Seed the agent system user (idempotent)
INSERT INTO users (id, name, email, role)
VALUES (
  'system-formation-agent',
  'Formation Draft Agent',
  'formation-agent@system.fluxstudio',
  'agent'
)
ON CONFLICT (id) DO NOTHING;

-- Auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_formation_draft_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_formation_draft_sessions_updated_at
      BEFORE UPDATE ON formation_draft_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Comments
COMMENT ON TABLE formation_draft_sessions IS 'Tracks AI agent sessions that generate formation drafts from show descriptions';
COMMENT ON COLUMN formation_draft_sessions.show_plan IS 'JSON plan of show structure with sections and formation concepts';
COMMENT ON COLUMN formation_draft_sessions.conversation_history IS 'Full Claude conversation history for multi-turn refinement';
COMMENT ON COLUMN formation_draft_sessions.tokens_used IS 'Total Anthropic API tokens consumed by this session';
