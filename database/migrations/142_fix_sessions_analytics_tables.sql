-- Migration 142: Create missing sessions & analytics tables
-- Date: 2026-03-13
-- Description: Migrations 114 and 119 failed because they used UUID REFERENCES
--   users(id) after migration 100 converted users.id to TEXT. This migration
--   recreates those tables with TEXT types and no FK constraints.

-- =============================================================================
-- SECTION 1: Active Sessions (from failed migration 119)
-- =============================================================================

CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_id TEXT UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions (token_id);

-- =============================================================================
-- SECTION 2: Project Health Snapshots (from failed migration 114)
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_health_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  health_score INT NOT NULL,
  completion_score INT NOT NULL DEFAULT 0,
  velocity_score INT NOT NULL DEFAULT 0,
  momentum_score INT NOT NULL DEFAULT 0,
  overdue_score INT NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_snapshots_project
  ON project_health_snapshots(project_id, captured_at DESC);

-- =============================================================================
-- SECTION 3: Ensure project_task_stats view exists
-- This view was created by migration 006 and should exist, but recreate if not.
-- =============================================================================

CREATE OR REPLACE VIEW project_task_stats AS
SELECT
  p.id as project_id,
  p.name as project_name,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in-progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
  COUNT(CASE WHEN t.status = 'blocked' THEN 1 END) as blocked_tasks,
  COUNT(CASE WHEN t.due_date < NOW() AND t.status != 'completed' THEN 1 END) as overdue_tasks,
  CASE
    WHEN COUNT(t.id) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::DECIMAL / COUNT(t.id)) * 100)
  END as completion_percentage
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id, p.name;

-- =============================================================================
-- SECTION 4: Audit logs (from failed migration 119) - needed for compliance
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs (resource_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id, created_at);

-- =============================================================================
-- SECTION 5: Verification
-- =============================================================================

DO $$
DECLARE
  sessions_exist BOOLEAN;
  snapshots_exist BOOLEAN;
  view_exist BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'active_sessions') INTO sessions_exist;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_health_snapshots') INTO snapshots_exist;
  SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'project_task_stats') INTO view_exist;

  RAISE NOTICE '=== Migration 142 Verification ===';
  RAISE NOTICE 'active_sessions exists: %', sessions_exist;
  RAISE NOTICE 'project_health_snapshots exists: %', snapshots_exist;
  RAISE NOTICE 'project_task_stats view exists: %', view_exist;
  RAISE NOTICE '==================================';
END $$;
