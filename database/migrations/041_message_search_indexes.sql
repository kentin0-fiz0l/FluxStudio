-- Migration 041: Add indexes to support message search
-- Date: 2025-12-13
-- Description:
--   Adds indexes to speed up ILIKE text searches and
--   conversation-scoped message retrieval.

-- ===========================================
-- Messages: lowercase index for ILIKE searches
-- ===========================================
-- Using a functional index on lower(text) to speed up case-insensitive searches
CREATE INDEX IF NOT EXISTS idx_messages_text_lower
  ON messages (LOWER(text));

-- ===========================================
-- Messages: composite index for conversation-scoped queries
-- ===========================================
-- Helps when searching within a specific conversation sorted by time
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);

