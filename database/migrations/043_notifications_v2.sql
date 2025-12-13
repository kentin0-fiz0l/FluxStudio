-- Migration 043: Notifications v2 - Enhanced for messaging events
-- Date: 2025-12-13
-- Description:
--   Adds additional columns to notifications table for better
--   tracking of messaging events (mentions, replies, thread replies, file shares)
--   and improved deep linking support.

-- Add new columns for actor, conversation, message, thread, and asset tracking
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_user_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS thread_root_message_id TEXT,
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}';

-- Create index for conversation-based lookups
CREATE INDEX IF NOT EXISTS idx_notifications_conversation
  ON notifications(conversation_id) WHERE conversation_id IS NOT NULL;

-- Create index for message-based lookups
CREATE INDEX IF NOT EXISTS idx_notifications_message
  ON notifications(message_id) WHERE message_id IS NOT NULL;

-- Create index for faster user + created_at queries (for listing)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- Update is_read to read_at: when marking read, also set read_at
-- (This is handled in application code, but we add a comment for clarity)
-- The is_read boolean remains for quick filtering, read_at provides timestamp

COMMENT ON COLUMN notifications.actor_user_id IS 'User who triggered the notification';
COMMENT ON COLUMN notifications.conversation_id IS 'Related conversation for deep linking';
COMMENT ON COLUMN notifications.message_id IS 'Related message for deep linking';
COMMENT ON COLUMN notifications.thread_root_message_id IS 'Thread root for opening thread panel';
COMMENT ON COLUMN notifications.asset_id IS 'Related asset for file_shared notifications';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read';
COMMENT ON COLUMN notifications.metadata_json IS 'Additional metadata for future extensibility';
