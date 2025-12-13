-- Migration 042: Add thread support to messages
-- Date: 2025-12-13
-- Description:
--   Adds thread_root_message_id column to messages for full thread support.
--   When a message is part of a thread, this points to the root message.

-- ===========================================
-- Messages: add thread root reference
-- ===========================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS thread_root_message_id TEXT;

-- Index for efficient thread lookups
CREATE INDEX IF NOT EXISTS idx_messages_thread_root
  ON messages (thread_root_message_id)
  WHERE thread_root_message_id IS NOT NULL;

-- Composite index for fetching thread messages in a conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_thread
  ON messages (conversation_id, thread_root_message_id, created_at ASC)
  WHERE thread_root_message_id IS NOT NULL;

