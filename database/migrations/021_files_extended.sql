-- Migration 021: Extend Files Table for Unified File Management
-- Adds support for connector imports, source tracking, and enhanced metadata

-- Add new columns to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'upload';
ALTER TABLE files ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE files ADD COLUMN IF NOT EXISTS connector_file_id UUID;
ALTER TABLE files ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_key TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS extension VARCHAR(50);
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
ALTER TABLE files ADD COLUMN IF NOT EXISTS original_name VARCHAR(500);
ALTER TABLE files ADD COLUMN IF NOT EXISTS description TEXT;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_files_connector_file' AND table_name = 'files'
  ) THEN
    ALTER TABLE files ADD CONSTRAINT fk_files_connector_file
      FOREIGN KEY (connector_file_id) REFERENCES connector_files(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_files_organization' AND table_name = 'files'
  ) THEN
    ALTER TABLE files ADD CONSTRAINT fk_files_organization
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add source check constraint
ALTER TABLE files DROP CONSTRAINT IF EXISTS valid_file_source;
ALTER TABLE files ADD CONSTRAINT valid_file_source CHECK (
  source IN ('upload', 'connector', 'generated', 'system')
);

-- Add provider check constraint (nullable)
ALTER TABLE files DROP CONSTRAINT IF EXISTS valid_file_provider;
ALTER TABLE files ADD CONSTRAINT valid_file_provider CHECK (
  provider IS NULL OR provider IN ('github', 'google_drive', 'dropbox', 'onedrive', 'figma', 'local')
);

-- Add file_type check constraint
ALTER TABLE files DROP CONSTRAINT IF EXISTS valid_file_type;
ALTER TABLE files ADD CONSTRAINT valid_file_type CHECK (
  file_type IS NULL OR file_type IN ('image', 'video', 'audio', 'document', 'pdf', 'text', 'code', 'archive', 'other')
);

-- Create additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_files_source ON files(source);
CREATE INDEX IF NOT EXISTS idx_files_provider ON files(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_connector_file ON files(connector_file_id) WHERE connector_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_organization ON files(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type) WHERE file_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_user_created ON files(uploaded_by, created_at DESC);

-- Update column comments
COMMENT ON COLUMN files.source IS 'Source of the file: upload, connector, generated, system';
COMMENT ON COLUMN files.provider IS 'External provider if source is connector';
COMMENT ON COLUMN files.connector_file_id IS 'Reference to connector_files if imported';
COMMENT ON COLUMN files.organization_id IS 'Organization the file belongs to';
COMMENT ON COLUMN files.storage_key IS 'Storage backend key/path for the file';
COMMENT ON COLUMN files.extension IS 'File extension without the dot';
COMMENT ON COLUMN files.file_type IS 'Categorized file type for filtering';
COMMENT ON COLUMN files.original_name IS 'Original filename before sanitization';
COMMENT ON COLUMN files.description IS 'User-provided file description';

-- Function to determine file_type from mime_type
CREATE OR REPLACE FUNCTION determine_file_type(mime_type TEXT)
RETURNS VARCHAR(50) AS $$
BEGIN
  IF mime_type IS NULL THEN
    RETURN 'other';
  ELSIF mime_type LIKE 'image/%' THEN
    RETURN 'image';
  ELSIF mime_type LIKE 'video/%' THEN
    RETURN 'video';
  ELSIF mime_type LIKE 'audio/%' THEN
    RETURN 'audio';
  ELSIF mime_type = 'application/pdf' THEN
    RETURN 'pdf';
  ELSIF mime_type LIKE 'text/%' OR mime_type = 'application/json' THEN
    RETURN 'text';
  ELSIF mime_type IN (
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) THEN
    RETURN 'document';
  ELSIF mime_type IN (
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar'
  ) THEN
    RETURN 'archive';
  ELSE
    RETURN 'other';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-set file_type based on mime_type
CREATE OR REPLACE FUNCTION set_file_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.file_type IS NULL AND NEW.mime_type IS NOT NULL THEN
    NEW.file_type := determine_file_type(NEW.mime_type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_file_type ON files;
CREATE TRIGGER trigger_set_file_type
  BEFORE INSERT OR UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION set_file_type();

-- Backfill file_type for existing records
UPDATE files SET file_type = determine_file_type(mime_type) WHERE file_type IS NULL;

-- Backfill storage_key from file_url for existing records
UPDATE files SET storage_key = file_url WHERE storage_key IS NULL AND file_url IS NOT NULL;

-- Backfill original_name from name for existing records
UPDATE files SET original_name = name WHERE original_name IS NULL;
