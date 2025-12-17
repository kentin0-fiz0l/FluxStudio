-- Migration 048: Enhanced Notifications with Types and User Preferences
-- Date: 2025-12-17
-- Description:
--   Adds structured notification types (mention, decision, blocker, assignment, file_change, system)
--   and user-level notification preferences for reducing spam.
--
--   This migration enforces project-scoped notifications with user-controlled preferences.

-- =============================================================================
-- 1. Add project_id column to notifications (if not exists)
-- =============================================================================
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE CASCADE;

-- Index for project-scoped queries
CREATE INDEX IF NOT EXISTS idx_notifications_project
  ON notifications(project_id) WHERE project_id IS NOT NULL;

-- Composite index for project + user queries
CREATE INDEX IF NOT EXISTS idx_notifications_project_user
  ON notifications(project_id, user_id, created_at DESC)
  WHERE project_id IS NOT NULL;

-- =============================================================================
-- 2. User Notification Preferences Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Per-type toggles (defaults set to recommended values)
  notify_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  notify_decisions BOOLEAN NOT NULL DEFAULT TRUE,
  notify_blockers BOOLEAN NOT NULL DEFAULT TRUE,
  notify_assignments BOOLEAN NOT NULL DEFAULT TRUE,
  notify_file_changes BOOLEAN NOT NULL DEFAULT FALSE,  -- Off by default to reduce noise
  notify_system BOOLEAN NOT NULL DEFAULT TRUE,

  -- Quiet hours (optional)
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',

  -- Email digest settings
  email_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  email_digest_frequency TEXT DEFAULT 'daily' CHECK (email_digest_frequency IN ('instant', 'hourly', 'daily', 'weekly')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One preferences record per user
  UNIQUE(user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user
  ON user_notification_preferences(user_id);

-- =============================================================================
-- 3. Comments for clarity
-- =============================================================================
COMMENT ON TABLE user_notification_preferences IS 'User-level notification preferences to control what notifications they receive';
COMMENT ON COLUMN user_notification_preferences.notify_mentions IS 'Receive notifications when @mentioned in messages';
COMMENT ON COLUMN user_notification_preferences.notify_decisions IS 'Receive notifications for messages starting with "Decision:"';
COMMENT ON COLUMN user_notification_preferences.notify_blockers IS 'Receive notifications for messages starting with "Blocked:" or "Blocker:"';
COMMENT ON COLUMN user_notification_preferences.notify_assignments IS 'Receive notifications when assigned to tasks (future)';
COMMENT ON COLUMN user_notification_preferences.notify_file_changes IS 'Receive notifications when files/assets are added or updated in project';
COMMENT ON COLUMN user_notification_preferences.notify_system IS 'Receive system notifications (announcements, errors, etc.)';
COMMENT ON COLUMN notifications.project_id IS 'Project this notification belongs to for project-scoped filtering';

-- =============================================================================
-- 4. Add notification category column for filtering
-- =============================================================================
-- Note: The existing 'type' column already supports our types (mention, file_shared, etc.)
-- We add a category column for easier filtering in the UI

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'
    CHECK (category IN ('mention', 'decision', 'blocker', 'assignment', 'file_change', 'system', 'other'));

-- Backfill existing notifications with categories based on type
UPDATE notifications SET category = 'mention' WHERE type IN ('mention', 'message_mention') AND category = 'other';
UPDATE notifications SET category = 'file_change' WHERE type IN ('file_shared', 'project_file_uploaded') AND category = 'other';
UPDATE notifications SET category = 'system' WHERE type IN ('system', 'info', 'warning', 'error', 'organization_alert') AND category = 'other';

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(category);

-- Composite index for project + category filtering
CREATE INDEX IF NOT EXISTS idx_notifications_project_category
  ON notifications(project_id, category, created_at DESC)
  WHERE project_id IS NOT NULL;
