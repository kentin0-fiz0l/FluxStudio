-- Migration 046: Pulse State - Per-user per-project last-seen tracking
-- Date: 2025-12-14
-- Description:
--   Adds pulse_state table for tracking when a user last viewed
--   project pulse data. This enables "unseen count" badges and
--   "new" markers in the Activity/Attention feeds.

-- ===========================================
-- Pulse State: last-seen timestamp per user per project
-- ===========================================
CREATE TABLE IF NOT EXISTS pulse_state (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Index for fast lookups by user + project
CREATE INDEX IF NOT EXISTS idx_pulse_state_user_project
  ON pulse_state(user_id, project_id);

-- Index for cleanup queries (find stale entries)
CREATE INDEX IF NOT EXISTS idx_pulse_state_updated
  ON pulse_state(updated_at);

COMMENT ON TABLE pulse_state IS 'Tracks when a user last viewed pulse data for a project';
COMMENT ON COLUMN pulse_state.user_id IS 'User who viewed the pulse';
COMMENT ON COLUMN pulse_state.project_id IS 'Project the pulse was viewed for';
COMMENT ON COLUMN pulse_state.last_seen_at IS 'When the user last marked pulse as seen';

-- ===========================================
-- Add project_id to notifications if not present
-- This enables project-scoped notification queries
-- ===========================================
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS project_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_project_created
  ON notifications(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

COMMENT ON COLUMN notifications.project_id IS 'Project this notification belongs to (for pulse filtering)';
