-- Migration 139: Update agent_sessions default model to claude-sonnet-4-6
-- Non-destructive: existing rows keep their stored model value

ALTER TABLE agent_sessions
  ALTER COLUMN model SET DEFAULT 'claude-sonnet-4-6';
