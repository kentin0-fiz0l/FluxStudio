-- ==============================================
-- Migration: Add Tasks and Activities Tables
-- Sprint 3: Project Management Database
-- ==============================================

-- Tasks table for project management
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10, 2),
  actual_hours DECIMAL(10, 2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  attachments JSONB DEFAULT '[]',

  CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in-progress', 'review', 'blocked', 'completed')),
  CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Activities table for audit trail
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_avatar TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_title VARCHAR(500),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT activities_entity_type_check CHECK (entity_type IN ('task', 'milestone', 'project', 'comment', 'file', 'member', 'team'))
);

-- Add updated_at trigger for tasks
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);

-- Indexes for activities table
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_organization_id ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity_type_id ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_timestamp ON activities(project_id, timestamp DESC);

-- Update existing project_milestones table to match our naming convention
ALTER TABLE IF EXISTS project_milestones RENAME TO milestones;

-- Add status column to milestones if it doesn't exist
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;
ALTER TABLE milestones ADD CONSTRAINT milestones_status_check CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled'));
ALTER TABLE milestones ADD CONSTRAINT milestones_progress_check CHECK (progress >= 0 AND progress <= 100);

-- Add trigger for milestones updated_at
CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for project task statistics
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

-- Create view for user task statistics
CREATE OR REPLACE VIEW user_task_stats AS
SELECT
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  COUNT(t.id) as total_assigned_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in-progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as pending_tasks,
  COUNT(CASE WHEN t.due_date < NOW() AND t.status != 'completed' THEN 1 END) as overdue_tasks,
  SUM(COALESCE(t.estimated_hours, 0)) as total_estimated_hours,
  SUM(COALESCE(t.actual_hours, 0)) as total_actual_hours
FROM users u
LEFT JOIN tasks t ON t.assigned_to = u.id
GROUP BY u.id, u.name, u.email;

-- Add helper function to log activities automatically
CREATE OR REPLACE FUNCTION log_activity(
  p_project_id UUID,
  p_type VARCHAR,
  p_user_id UUID,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_entity_title VARCHAR,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
  v_user_name VARCHAR;
  v_user_email VARCHAR;
  v_user_avatar TEXT;
  v_org_id UUID;
BEGIN
  -- Get user info
  SELECT name, email, avatar_url INTO v_user_name, v_user_email, v_user_avatar
  FROM users WHERE id = p_user_id;

  -- Get organization from project
  SELECT organization_id INTO v_org_id
  FROM projects WHERE id = p_project_id;

  -- Insert activity
  INSERT INTO activities (
    project_id, organization_id, type, user_id, user_name, user_email, user_avatar,
    entity_type, entity_id, entity_title, action, metadata
  ) VALUES (
    p_project_id, v_org_id, p_type, p_user_id, v_user_name, v_user_email, v_user_avatar,
    p_entity_type, p_entity_id, p_entity_title, p_action, p_metadata
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment to track migration
COMMENT ON TABLE tasks IS 'Sprint 3: Project task management table';
COMMENT ON TABLE activities IS 'Sprint 3: Activity audit trail for all entity changes';
