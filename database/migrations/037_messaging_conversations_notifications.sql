-- Migration 037: Messaging conversations + notifications
-- Date: 2025-12-12
-- Description:
--   Adds conversations and conversation_members tables,
--   expands messages for conversation threading & attachments,
--   and introduces notifications.

-- ===========================================
-- Conversations: top-level threads
-- ===========================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org
  ON conversations (organization_id);

-- ===========================================
-- Conversation members: participants + read state
-- ===========================================
CREATE TABLE IF NOT EXISTS conversation_members (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id),
  role TEXT NOT NULL DEFAULT 'member',
  last_read_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_members_unique
  ON conversation_members (conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON conversation_members (user_id);

-- ===========================================
-- Messages: add conversation + threading + attachments
-- NOTE: assumes an existing messages table; we only extend it.
-- ===========================================
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_id TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_message_id TEXT,
  ADD COLUMN IF NOT EXISTS asset_id TEXT,
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_project
  ON messages (project_id);

-- ===========================================
-- Notifications: stored alerts for users
-- ===========================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  type TEXT NOT NULL,
  entity_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read, created_at DESC);
