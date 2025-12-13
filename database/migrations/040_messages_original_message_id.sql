-- Migration 040: Add original_message_id for message forwarding
-- Date: 2025-12-13
-- Description:
--   Adds original_message_id column to messages table to track
--   forwarded messages and link back to their source.

-- ===========================================
-- Messages: add original_message_id for forwarding
-- ===========================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS original_message_id TEXT;

-- Index for looking up messages by their original source
CREATE INDEX IF NOT EXISTS idx_messages_original_message_id
  ON messages (original_message_id)
  WHERE original_message_id IS NOT NULL;
