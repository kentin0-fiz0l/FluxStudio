-- Migration 103: Activities Table for Real-Time Activity Feed
-- FluxStudio User Adoption Roadmap - Phase 3

-- Activities table for tracking all user actions
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'file', 'task', 'comment', 'project', 'member', 'milestone'
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'uploaded', 'completed', 'joined', 'left'
  entity_type TEXT, -- 'file', 'task', 'comment', 'project', 'formation', 'board'
  entity_id TEXT, -- ID of the entity being acted upon
  entity_title TEXT, -- Human-readable title/name of the entity
  description TEXT, -- Full description of the activity
  metadata JSONB DEFAULT '{}', -- Additional context (file size, old/new values, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_created ON activities(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_org_created ON activities(organization_id, created_at DESC);

-- Composite index for dashboard queries (recent activity across projects)
CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE activities IS 'Tracks all user actions for activity feeds and audit trails';
COMMENT ON COLUMN activities.type IS 'Category of activity: file, task, comment, project, member, milestone';
COMMENT ON COLUMN activities.action IS 'Action performed: created, updated, deleted, uploaded, completed, joined, left';
COMMENT ON COLUMN activities.entity_type IS 'Type of entity being acted upon';
COMMENT ON COLUMN activities.entity_id IS 'ID of the entity for linking';
COMMENT ON COLUMN activities.metadata IS 'Additional context like file sizes, old/new values, etc.';
