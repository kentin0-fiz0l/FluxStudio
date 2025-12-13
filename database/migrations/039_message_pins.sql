-- Migration 039: Message Pins
-- Date: 2025-12-13
-- Description:
--   Adds message_pins table to track pinned messages per conversation.
--   Supports real-time sync and conversation-scoped pin lists.

-- ===========================================
-- Message Pins: pinned messages per conversation
-- ===========================================
CREATE TABLE IF NOT EXISTS message_pins (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  project_id TEXT,
  pinned_by TEXT NOT NULL,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A message can only be pinned once per conversation
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_pins_unique
  ON message_pins (message_id, conversation_id);

-- Query helpers for fetching pins by conversation (ordered by most recent)
CREATE INDEX IF NOT EXISTS idx_message_pins_conversation
  ON message_pins (conversation_id, pinned_at DESC);

-- Query helpers for fetching pins by project
CREATE INDEX IF NOT EXISTS idx_message_pins_project
  ON message_pins (project_id, pinned_at DESC);

-- Query helpers for checking if a message is pinned
CREATE INDEX IF NOT EXISTS idx_message_pins_message
  ON message_pins (message_id);
