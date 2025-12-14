-- Migration 045: Project Context Everywhere
-- Date: 2025-12-14
-- Description:
--   Adds project context to conversations and notifications tables
--   to support "Projects are the home for everything" UX principle.
--
-- This migration adds:
-- 1. project_id FK on conversations table
-- 2. project_id and project_name on notifications table
--
-- All columns are nullable to maintain backwards compatibility.
-- Existing rows will have NULL values (no project context).

-- ===========================================
-- 1. Conversations: Add project context
-- ===========================================

-- Add project_id to conversations (nullable FK)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for project-scoped conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_project
  ON conversations(project_id) WHERE project_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN conversations.project_id IS 'Optional project scope for project-scoped conversations';

-- ===========================================
-- 2. Notifications: Add project context
-- ===========================================

-- Add project_id to notifications (nullable, no FK to allow denormalization)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS project_id TEXT;

-- Add project_name denormalized for display (avoids join on read)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Create index for project-scoped notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_project
  ON notifications(project_id) WHERE project_id IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN notifications.project_id IS 'Project ID for project-scoped notifications';
COMMENT ON COLUMN notifications.project_name IS 'Denormalized project name at notification creation time';
