-- Migration 010: Create Files Table (Prerequisite for HLS)
-- This migration must run before 011_hls_streaming.sql

-- Files table for storing uploaded media
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  folder_path TEXT DEFAULT '/',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search on file names
CREATE INDEX IF NOT EXISTS idx_files_name_search ON files USING gin(to_tsvector('english', name));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- Comments for documentation
COMMENT ON TABLE files IS 'Stores uploaded media files with metadata';
COMMENT ON COLUMN files.file_url IS 'URL to file in storage (Spaces/S3)';
COMMENT ON COLUMN files.thumbnail_url IS 'URL to generated thumbnail';
COMMENT ON COLUMN files.folder_path IS 'Virtual folder path for organization';
COMMENT ON COLUMN files.metadata IS 'Additional file metadata (dimensions, duration, etc.)';
