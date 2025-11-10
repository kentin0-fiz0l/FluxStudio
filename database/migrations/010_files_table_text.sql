-- Migration 010: Create Files Table (TEXT ID Version)
-- Compatible with existing Prisma schema using TEXT IDs

-- Files table for storing uploaded media
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  folder_path TEXT DEFAULT '/',

  -- HLS columns (added here to avoid separate migration)
  hls_manifest_url TEXT,
  transcoding_status VARCHAR(50) DEFAULT 'pending',

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
CREATE INDEX IF NOT EXISTS idx_files_transcoding_status ON files(transcoding_status)
  WHERE transcoding_status IN ('pending', 'processing');

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
DROP TRIGGER IF EXISTS trigger_files_updated_at ON files;
CREATE TRIGGER trigger_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- Comments for documentation
COMMENT ON TABLE files IS 'Stores uploaded media files with metadata and HLS streaming status';
COMMENT ON COLUMN files.file_url IS 'URL to file in storage (DigitalOcean Spaces)';
COMMENT ON COLUMN files.thumbnail_url IS 'URL to generated thumbnail';
COMMENT ON COLUMN files.hls_manifest_url IS 'URL to HLS master manifest (m3u8) for adaptive streaming';
COMMENT ON COLUMN files.transcoding_status IS 'Status: pending, processing, completed, failed';
COMMENT ON COLUMN files.folder_path IS 'Virtual folder path for organization';
COMMENT ON COLUMN files.metadata IS 'Additional file metadata (dimensions, duration, etc.)';
