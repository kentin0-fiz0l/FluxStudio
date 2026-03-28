-- Migration 157: Add performance indexes for common query patterns
-- These indexes improve query performance for messaging, conversation lookup,
-- project listing, full-text search, and refresh token queries.
-- Uses CONCURRENTLY to avoid blocking writes on production tables.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conv_created
  ON messages(conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_reply_to
  ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conv_members_user
  ON conversation_members(user_id, conversation_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_by
  ON projects(created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_fts
  ON messages USING GIN(to_tsvector('english', content));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_expires
  ON refresh_tokens(user_id, expires_at);
