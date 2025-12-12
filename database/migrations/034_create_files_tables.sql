-- Migration 034: Add Project Files Join Table
-- Date: 2025-12-12
-- Description: Creates project_files join table for many-to-many file-project linking

-- Project files join table - links files to projects with roles
-- This enables a file to be attached to multiple projects
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  role TEXT DEFAULT 'reference',
  added_by TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, file_id)
);

-- Indexes for project_files table
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_file ON project_files(file_id);
CREATE INDEX IF NOT EXISTS idx_project_files_role ON project_files(role);

-- Add any missing columns to files table for extended functionality
DO $$
BEGIN
  -- Add is_public column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'is_public') THEN
    ALTER TABLE files ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add tags column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'tags') THEN
    ALTER TABLE files ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;

  -- Add width column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'width') THEN
    ALTER TABLE files ADD COLUMN width INTEGER;
  END IF;

  -- Add height column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'height') THEN
    ALTER TABLE files ADD COLUMN height INTEGER;
  END IF;

  -- Add duration column if not exists (for audio/video)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'duration') THEN
    ALTER TABLE files ADD COLUMN duration INTEGER;
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE project_files IS 'Links files to projects with optional role and notes (many-to-many)';
COMMENT ON COLUMN project_files.role IS 'Role of file in project: reference, deliverable, source, asset, etc.';
COMMENT ON COLUMN project_files.notes IS 'Notes about why this file is attached to the project';
COMMENT ON COLUMN project_files.sort_order IS 'Sort order for displaying files within a project';

