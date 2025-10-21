-- Migration 008: GitHub Integration
-- Phase 3 OAuth Integration Ecosystem
-- Created: October 17, 2025

-- ==================================================
-- GitHub Repository Links
-- ==================================================

CREATE TABLE IF NOT EXISTS github_repository_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner VARCHAR(255) NOT NULL,
  repo VARCHAR(255) NOT NULL,
  full_name VARCHAR(511) NOT NULL,
  description TEXT,
  html_url VARCHAR(1024),
  default_branch VARCHAR(255) DEFAULT 'main',
  is_private BOOLEAN DEFAULT FALSE,

  -- Sync configuration
  sync_issues BOOLEAN DEFAULT FALSE,
  sync_pulls BOOLEAN DEFAULT FALSE,
  sync_commits BOOLEAN DEFAULT FALSE,
  auto_create_tasks BOOLEAN DEFAULT FALSE,

  -- Metadata
  linked_at TIMESTAMP DEFAULT NOW(),
  linked_by UUID NOT NULL REFERENCES users(id),
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'error'
  last_error TEXT,

  -- Constraints
  UNIQUE(project_id, owner, repo),
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('idle', 'syncing', 'error'))
);

-- Indexes for performance
CREATE INDEX idx_github_links_user ON github_repository_links(user_id);
CREATE INDEX idx_github_links_project ON github_repository_links(project_id);
CREATE INDEX idx_github_links_repo ON github_repository_links(owner, repo);
CREATE INDEX idx_github_links_full_name ON github_repository_links(full_name);
CREATE INDEX idx_github_links_synced ON github_repository_links(last_synced_at);

-- ==================================================
-- GitHub Issue Synchronization
-- ==================================================

CREATE TABLE IF NOT EXISTS github_issue_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_link_id UUID NOT NULL REFERENCES github_repository_links(id) ON DELETE CASCADE,

  -- GitHub issue data
  issue_number INTEGER NOT NULL,
  issue_id BIGINT,
  issue_title VARCHAR(1024),
  issue_body TEXT,
  issue_state VARCHAR(50), -- 'open', 'closed'
  issue_html_url VARCHAR(1024),
  issue_created_at TIMESTAMP,
  issue_updated_at TIMESTAMP,
  issue_closed_at TIMESTAMP,
  issue_labels JSONB DEFAULT '[]'::jsonb,
  issue_assignees JSONB DEFAULT '[]'::jsonb,

  -- FluxStudio task data
  fluxstudio_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Sync configuration
  sync_direction VARCHAR(50) DEFAULT 'both', -- 'github_to_flux', 'flux_to_github', 'both', 'disabled'
  last_synced_at TIMESTAMP DEFAULT NOW(),
  sync_status VARCHAR(50) DEFAULT 'synced', -- 'synced', 'pending', 'error', 'conflict'
  last_error TEXT,
  conflict_data JSONB, -- Store conflict details for manual resolution

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(github_link_id, issue_number),
  CONSTRAINT valid_sync_direction CHECK (sync_direction IN ('github_to_flux', 'flux_to_github', 'both', 'disabled')),
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('synced', 'pending', 'error', 'conflict')),
  CONSTRAINT valid_issue_state CHECK (issue_state IN ('open', 'closed'))
);

-- Indexes
CREATE INDEX idx_issue_sync_link ON github_issue_sync(github_link_id);
CREATE INDEX idx_issue_sync_task ON github_issue_sync(fluxstudio_task_id);
CREATE INDEX idx_issue_sync_number ON github_issue_sync(issue_number);
CREATE INDEX idx_issue_sync_status ON github_issue_sync(sync_status);
CREATE INDEX idx_issue_sync_updated ON github_issue_sync(updated_at);

-- ==================================================
-- GitHub Pull Request Sync (Future)
-- ==================================================

CREATE TABLE IF NOT EXISTS github_pr_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_link_id UUID NOT NULL REFERENCES github_repository_links(id) ON DELETE CASCADE,

  -- GitHub PR data
  pr_number INTEGER NOT NULL,
  pr_id BIGINT,
  pr_title VARCHAR(1024),
  pr_body TEXT,
  pr_state VARCHAR(50), -- 'open', 'closed', 'merged'
  pr_html_url VARCHAR(1024),
  pr_created_at TIMESTAMP,
  pr_updated_at TIMESTAMP,
  pr_merged_at TIMESTAMP,
  pr_head_ref VARCHAR(255),
  pr_base_ref VARCHAR(255),
  pr_labels JSONB DEFAULT '[]'::jsonb,
  pr_reviewers JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(github_link_id, pr_number),
  CONSTRAINT valid_pr_state CHECK (pr_state IN ('open', 'closed', 'merged'))
);

-- Indexes
CREATE INDEX idx_pr_sync_link ON github_pr_sync(github_link_id);
CREATE INDEX idx_pr_sync_number ON github_pr_sync(pr_number);
CREATE INDEX idx_pr_sync_updated ON github_pr_sync(updated_at);

-- ==================================================
-- GitHub Commit Tracking
-- ==================================================

CREATE TABLE IF NOT EXISTS github_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_link_id UUID NOT NULL REFERENCES github_repository_links(id) ON DELETE CASCADE,

  -- Commit data
  commit_sha VARCHAR(40) NOT NULL,
  commit_message TEXT,
  commit_author_name VARCHAR(255),
  commit_author_email VARCHAR(255),
  commit_date TIMESTAMP,
  commit_html_url VARCHAR(1024),

  -- Task linking (parsed from commit message)
  linked_task_ids UUID[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(github_link_id, commit_sha)
);

-- Indexes
CREATE INDEX idx_commits_link ON github_commits(github_link_id);
CREATE INDEX idx_commits_sha ON github_commits(commit_sha);
CREATE INDEX idx_commits_date ON github_commits(commit_date);
CREATE INDEX idx_commits_tasks ON github_commits USING GIN(linked_task_ids);

-- ==================================================
-- GitHub Webhook Events Log
-- ==================================================

-- Note: integration_webhooks table already exists from Phase 1
-- This migration adds GitHub-specific indexes

CREATE INDEX IF NOT EXISTS idx_webhooks_github
  ON integration_webhooks(provider, event_type, created_at)
  WHERE provider = 'github';

CREATE INDEX IF NOT EXISTS idx_webhooks_unprocessed
  ON integration_webhooks(created_at)
  WHERE processed = FALSE;

-- ==================================================
-- Triggers for Updated Timestamps
-- ==================================================

-- Update github_issue_sync.updated_at on changes
CREATE OR REPLACE FUNCTION update_github_issue_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_github_issue_sync_timestamp
  BEFORE UPDATE ON github_issue_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_github_issue_sync_timestamp();

-- Update github_pr_sync.updated_at on changes
CREATE OR REPLACE FUNCTION update_github_pr_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_github_pr_sync_timestamp
  BEFORE UPDATE ON github_pr_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_github_pr_sync_timestamp();

-- ==================================================
-- Helper Functions
-- ==================================================

-- Function to sync GitHub issue to FluxStudio task
CREATE OR REPLACE FUNCTION sync_github_issue_to_task(
  p_github_link_id UUID,
  p_issue_number INTEGER,
  p_issue_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
  v_project_id UUID;
  v_user_id UUID;
BEGIN
  -- Get project and user from link
  SELECT project_id, user_id INTO v_project_id, v_user_id
  FROM github_repository_links
  WHERE id = p_github_link_id;

  -- Check if task already exists
  SELECT fluxstudio_task_id INTO v_task_id
  FROM github_issue_sync
  WHERE github_link_id = p_github_link_id AND issue_number = p_issue_number;

  IF v_task_id IS NULL THEN
    -- Create new task
    INSERT INTO tasks (
      project_id,
      title,
      description,
      status,
      priority,
      created_by,
      metadata
    ) VALUES (
      v_project_id,
      p_issue_data->>'title',
      p_issue_data->>'body',
      CASE WHEN p_issue_data->>'state' = 'open' THEN 'in_progress' ELSE 'completed' END,
      'medium',
      v_user_id,
      jsonb_build_object(
        'github_issue_number', p_issue_number,
        'github_link_id', p_github_link_id,
        'synced_from_github', TRUE
      )
    ) RETURNING id INTO v_task_id;

    -- Create sync record
    INSERT INTO github_issue_sync (
      github_link_id,
      issue_number,
      issue_id,
      issue_title,
      issue_body,
      issue_state,
      issue_html_url,
      fluxstudio_task_id,
      sync_direction,
      sync_status
    ) VALUES (
      p_github_link_id,
      p_issue_number,
      (p_issue_data->>'id')::BIGINT,
      p_issue_data->>'title',
      p_issue_data->>'body',
      p_issue_data->>'state',
      p_issue_data->>'html_url',
      v_task_id,
      'both',
      'synced'
    );
  ELSE
    -- Update existing task
    UPDATE tasks SET
      title = p_issue_data->>'title',
      description = p_issue_data->>'body',
      status = CASE WHEN p_issue_data->>'state' = 'open' THEN 'in_progress' ELSE 'completed' END,
      updated_at = NOW()
    WHERE id = v_task_id;

    -- Update sync record
    UPDATE github_issue_sync SET
      issue_title = p_issue_data->>'title',
      issue_body = p_issue_data->>'body',
      issue_state = p_issue_data->>'state',
      sync_status = 'synced',
      last_synced_at = NOW()
    WHERE github_link_id = p_github_link_id AND issue_number = p_issue_number;
  END IF;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- Statistics Views
-- ==================================================

-- View for GitHub integration statistics
CREATE OR REPLACE VIEW github_integration_stats AS
SELECT
  u.id AS user_id,
  u.email,
  COUNT(DISTINCT grl.id) AS linked_repositories,
  COUNT(DISTINCT gis.id) AS synced_issues,
  COUNT(DISTINCT gis.id) FILTER (WHERE gis.sync_status = 'error') AS error_issues,
  MAX(grl.last_synced_at) AS last_sync_time
FROM users u
LEFT JOIN github_repository_links grl ON u.id = grl.user_id
LEFT JOIN github_issue_sync gis ON grl.id = gis.github_link_id
GROUP BY u.id, u.email;

-- View for repository activity
CREATE OR REPLACE VIEW github_repository_activity AS
SELECT
  grl.id AS link_id,
  grl.full_name AS repository,
  grl.project_id,
  p.name AS project_name,
  COUNT(DISTINCT gis.id) AS total_issues,
  COUNT(DISTINCT gis.id) FILTER (WHERE gis.issue_state = 'open') AS open_issues,
  COUNT(DISTINCT gps.id) AS total_prs,
  COUNT(DISTINCT gc.id) AS total_commits,
  grl.last_synced_at
FROM github_repository_links grl
JOIN projects p ON grl.project_id = p.id
LEFT JOIN github_issue_sync gis ON grl.id = gis.github_link_id
LEFT JOIN github_pr_sync gps ON grl.id = gps.github_link_id
LEFT JOIN github_commits gc ON grl.id = gc.github_link_id
GROUP BY grl.id, grl.full_name, grl.project_id, p.name, grl.last_synced_at;

-- ==================================================
-- Migration Complete
-- ==================================================

-- Insert migration record
INSERT INTO migrations (version, name, executed_at)
VALUES (
  8,
  'github_integration',
  NOW()
) ON CONFLICT (version) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 008 (GitHub Integration) completed successfully';
  RAISE NOTICE 'Created tables:';
  RAISE NOTICE '  - github_repository_links';
  RAISE NOTICE '  - github_issue_sync';
  RAISE NOTICE '  - github_pr_sync';
  RAISE NOTICE '  - github_commits';
  RAISE NOTICE 'Created 14 indexes for performance';
  RAISE NOTICE 'Created 2 triggers for timestamp updates';
  RAISE NOTICE 'Created 1 helper function: sync_github_issue_to_task()';
  RAISE NOTICE 'Created 2 views: github_integration_stats, github_repository_activity';
END $$;
