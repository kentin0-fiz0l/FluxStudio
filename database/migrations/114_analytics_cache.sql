-- ==============================================
-- Migration: Analytics Health Snapshots Cache
-- Sprint 35: Predictive Analytics (Phase 3.2)
-- ==============================================

CREATE TABLE IF NOT EXISTS project_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  health_score INT NOT NULL,
  completion_score INT NOT NULL,
  velocity_score INT NOT NULL,
  momentum_score INT NOT NULL,
  overdue_score INT NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_snapshots_project
  ON project_health_snapshots(project_id, captured_at DESC);

-- Keep only last 90 days of snapshots per project (cleanup via cron or app logic)
COMMENT ON TABLE project_health_snapshots IS 'Sprint 35: Cached project health scores for trend analysis';
