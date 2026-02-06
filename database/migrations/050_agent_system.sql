-- Agent System Migration
-- Creates tables for AI agent sessions, audit logging, pending actions, and permissions
-- Date: 2026-02-06

-- Agent sessions - tracks active agent conversations
CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  context JSONB DEFAULT '{}',
  messages JSONB DEFAULT '[]',
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent audit log - records all agent actions for compliance and debugging
CREATE TABLE IF NOT EXISTS agent_audit_log (
  id SERIAL PRIMARY KEY,
  session_id TEXT REFERENCES agent_sessions(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  skill TEXT,
  input JSONB,
  output JSONB,
  latency_ms INTEGER,
  status TEXT DEFAULT 'success', -- success, error, pending
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent pending actions - actions that require user approval before execution
CREATE TABLE IF NOT EXISTS agent_pending_actions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- create_file, update_file, delete_file, send_message, etc.
  target_type TEXT, -- project, asset, message, etc.
  target_id TEXT,
  payload JSONB NOT NULL,
  preview TEXT, -- Human-readable preview of the action
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Agent permissions - user-specific agent capabilities
CREATE TABLE IF NOT EXISTS agent_permissions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT[] DEFAULT ARRAY['read:projects', 'read:assets', 'read:activity'],
  auto_approve TEXT[] DEFAULT ARRAY[]::TEXT[], -- Actions that can be auto-approved
  max_daily_requests INTEGER DEFAULT 100,
  requests_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent quick actions - predefined actions for quick access
CREATE TABLE IF NOT EXISTS agent_quick_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_project ON agent_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_active ON agent_sessions(last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_audit_session ON agent_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_user ON agent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_created ON agent_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_audit_action ON agent_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_agent_pending_user_status ON agent_pending_actions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_pending_session ON agent_pending_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_pending_created ON agent_pending_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_quick_actions_user ON agent_quick_actions(user_id);

-- Function to update last_active_at on session activity
CREATE OR REPLACE FUNCTION update_agent_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_sessions
  SET last_active_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity when audit log is created
DROP TRIGGER IF EXISTS trigger_update_session_activity ON agent_audit_log;
CREATE TRIGGER trigger_update_session_activity
  AFTER INSERT ON agent_audit_log
  FOR EACH ROW
  WHEN (NEW.session_id IS NOT NULL)
  EXECUTE FUNCTION update_agent_session_activity();

-- Function to reset daily request counts
CREATE OR REPLACE FUNCTION reset_agent_daily_requests()
RETURNS void AS $$
BEGIN
  UPDATE agent_permissions
  SET requests_today = 0, last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE agent_sessions IS 'Tracks active AI agent chat sessions with context and message history';
COMMENT ON TABLE agent_audit_log IS 'Comprehensive audit trail of all agent actions for compliance';
COMMENT ON TABLE agent_pending_actions IS 'Queue of agent actions awaiting user approval before execution';
COMMENT ON TABLE agent_permissions IS 'Per-user agent capabilities and usage limits';
COMMENT ON TABLE agent_quick_actions IS 'User-defined quick action templates for the agent';
