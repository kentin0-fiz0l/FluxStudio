-- Migration 038: Message Reactions
-- Date: 2025-12-13
-- Description:
--   Adds message_reactions table for emoji reactions on messages.
--   Supports real-time sync with aggregated reaction counts.

-- ===========================================
-- Message Reactions: emoji reactions on messages
-- ===========================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Denormalized columns for fast queries without JOINs
  conversation_id TEXT,
  project_id TEXT
);

-- Ensure single reaction per (message, user, emoji) combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reactions_unique
  ON message_reactions (message_id, user_id, emoji);

-- Query helpers for fetching reactions by message
CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON message_reactions (message_id);

-- Query helpers for fetching reactions by conversation
CREATE INDEX IF NOT EXISTS idx_message_reactions_conversation
  ON message_reactions (conversation_id);

-- Query helpers for fetching user's reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_user
  ON message_reactions (user_id);

-- Composite index for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_emoji
  ON message_reactions (message_id, emoji);
