-- Migration 106: Add Yjs Collaboration Support for Formations
-- Date: 2026-02-10
-- Description: Adds Yjs CRDT snapshot columns for real-time collaborative formation editing

-- Add yjs_snapshot column to store Yjs document state
ALTER TABLE formations
ADD COLUMN IF NOT EXISTS yjs_snapshot BYTEA;

-- Add last_yjs_sync_at timestamp to track when Yjs state was last persisted
ALTER TABLE formations
ADD COLUMN IF NOT EXISTS last_yjs_sync_at TIMESTAMPTZ;

-- Index for quick lookup of formations with Yjs snapshots
CREATE INDEX IF NOT EXISTS idx_formations_yjs_sync ON formations(last_yjs_sync_at)
WHERE yjs_snapshot IS NOT NULL;

-- Add comments
COMMENT ON COLUMN formations.yjs_snapshot IS 'Yjs CRDT document state for real-time collaboration';
COMMENT ON COLUMN formations.last_yjs_sync_at IS 'Timestamp of last Yjs snapshot sync to database';

-- Create formation_collaboration_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS formation_collaboration_sessions (
  id TEXT PRIMARY KEY,
  formation_id TEXT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_color TEXT NOT NULL DEFAULT '#3B82F6',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  cursor_x NUMERIC,
  cursor_y NUMERIC,
  selected_performer_ids TEXT[]
);

-- Indexes for collaboration sessions
CREATE INDEX IF NOT EXISTS idx_formation_collab_sessions_formation
ON formation_collaboration_sessions(formation_id)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_formation_collab_sessions_user
ON formation_collaboration_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_formation_collab_sessions_activity
ON formation_collaboration_sessions(last_activity_at)
WHERE is_active = TRUE;

-- Unique constraint for one active session per user per formation
CREATE UNIQUE INDEX IF NOT EXISTS idx_formation_collab_sessions_unique
ON formation_collaboration_sessions(formation_id, user_id)
WHERE is_active = TRUE;

-- Add comments for collaboration sessions table
COMMENT ON TABLE formation_collaboration_sessions IS 'Tracks active real-time collaboration sessions for formations';
COMMENT ON COLUMN formation_collaboration_sessions.formation_id IS 'The formation being collaboratively edited';
COMMENT ON COLUMN formation_collaboration_sessions.user_id IS 'The collaborating user ID';
COMMENT ON COLUMN formation_collaboration_sessions.user_name IS 'Display name for presence UI';
COMMENT ON COLUMN formation_collaboration_sessions.user_color IS 'Color for cursor and selection visualization';
COMMENT ON COLUMN formation_collaboration_sessions.is_active IS 'Whether the session is currently active';
COMMENT ON COLUMN formation_collaboration_sessions.cursor_x IS 'Last known cursor X position (0-100 normalized)';
COMMENT ON COLUMN formation_collaboration_sessions.cursor_y IS 'Last known cursor Y position (0-100 normalized)';
COMMENT ON COLUMN formation_collaboration_sessions.selected_performer_ids IS 'Array of currently selected performer IDs';

-- Function to clean up stale collaboration sessions (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_stale_formation_sessions()
RETURNS void AS $$
BEGIN
  UPDATE formation_collaboration_sessions
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND last_activity_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Add comment for cleanup function
COMMENT ON FUNCTION cleanup_stale_formation_sessions IS 'Marks inactive formation collaboration sessions as stale after 1 hour of inactivity';
