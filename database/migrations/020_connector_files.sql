-- Migration 020: Connector Files and Imports
-- Stores files imported from external connectors (GitHub, Google Drive, Dropbox, OneDrive)

-- Connector imported files table
CREATE TABLE IF NOT EXISTS connector_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Provider information
  provider VARCHAR(50) NOT NULL, -- 'github', 'google_drive', 'dropbox', 'onedrive'
  provider_file_id VARCHAR(500) NOT NULL, -- ID in the provider's system
  provider_path TEXT, -- Path in the provider's filesystem

  -- File metadata
  name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255),
  size_bytes BIGINT,
  file_type VARCHAR(50), -- 'file', 'folder', 'repo', 'branch'

  -- Sync metadata
  local_path TEXT, -- Local storage path if downloaded
  last_synced_at TIMESTAMP WITH TIME ZONE,
  provider_modified_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'synced', -- 'synced', 'pending', 'error', 'downloading'
  sync_error TEXT,

  -- Provider-specific metadata
  provider_metadata JSONB DEFAULT '{}',

  -- Versioning
  version VARCHAR(100),
  checksum VARCHAR(255),

  -- Parent folder reference (for hierarchy)
  parent_id UUID REFERENCES connector_files(id) ON DELETE CASCADE,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_connector_provider CHECK (provider IN ('github', 'google_drive', 'dropbox', 'onedrive', 'figma')),
  CONSTRAINT unique_provider_file UNIQUE(user_id, provider, provider_file_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connector_files_user_id ON connector_files(user_id);
CREATE INDEX IF NOT EXISTS idx_connector_files_provider ON connector_files(provider);
CREATE INDEX IF NOT EXISTS idx_connector_files_project ON connector_files(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connector_files_org ON connector_files(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connector_files_parent ON connector_files(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connector_files_sync_status ON connector_files(sync_status);
CREATE INDEX IF NOT EXISTS idx_connector_files_deleted ON connector_files(deleted_at) WHERE deleted_at IS NULL;

-- Connector sync jobs table (for tracking sync operations)
CREATE TABLE IF NOT EXISTS connector_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,

  -- Job details
  job_type VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental', 'single_file', 'import'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Job metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for sync jobs
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_id ON connector_sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_provider ON connector_sync_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON connector_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created ON connector_sync_jobs(created_at DESC);

-- Update oauth_tokens provider constraint to include new providers
ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS valid_provider;
ALTER TABLE oauth_tokens ADD CONSTRAINT valid_provider CHECK (
  provider IN ('figma', 'slack', 'github', 'notion', 'asana', 'monday', 'linear', 'google_drive', 'dropbox', 'onedrive')
);

-- Update oauth_integration_settings provider constraint
ALTER TABLE oauth_integration_settings DROP CONSTRAINT IF EXISTS valid_integration_provider;
ALTER TABLE oauth_integration_settings ADD CONSTRAINT valid_integration_provider CHECK (
  provider IN ('figma', 'slack', 'github', 'notion', 'asana', 'monday', 'linear', 'google_drive', 'dropbox', 'onedrive')
);

-- Trigger for updated_at
CREATE TRIGGER update_connector_files_updated_at
  BEFORE UPDATE ON connector_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_jobs_updated_at
  BEFORE UPDATE ON connector_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE connector_files IS 'Files imported from external connectors (GitHub, Google Drive, Dropbox, OneDrive)';
COMMENT ON TABLE connector_sync_jobs IS 'Tracks sync operations for connectors';
