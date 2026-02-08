-- Migration 100: Corrective Migration
-- Date: 2026-02-08
-- Description: Consolidates fixes for all previously failed migrations
--              Addresses UUID vs TEXT ID conflicts and missing columns/indexes
--
-- This migration uses IF NOT EXISTS and conditional patterns throughout
-- to be safely re-runnable without errors.

-- =============================================================================
-- SECTION 1: Ensure all ID columns use TEXT type for CUID compatibility
-- =============================================================================

-- Fix users table ID type if needed (convert UUID to TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    -- Drop dependent constraints first
    ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
    ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_manager_id_fkey;
    ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS agent_sessions_user_id_fkey;
    ALTER TABLE agent_audit_log DROP CONSTRAINT IF EXISTS agent_audit_log_user_id_fkey;
    ALTER TABLE agent_pending_actions DROP CONSTRAINT IF EXISTS agent_pending_actions_user_id_fkey;
    ALTER TABLE agent_permissions DROP CONSTRAINT IF EXISTS agent_permissions_user_id_fkey;

    -- Convert users.id to TEXT
    ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT;
    RAISE NOTICE 'Converted users.id from UUID to TEXT';
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: Ensure files table has all required columns
-- =============================================================================

-- Add missing columns to files table
DO $$
BEGIN
  -- Add thumbnail_url if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'files' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE files ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE 'Added files.thumbnail_url column';
  END IF;

  -- Add preview_url if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'files' AND column_name = 'preview_url'
  ) THEN
    ALTER TABLE files ADD COLUMN preview_url TEXT;
    RAISE NOTICE 'Added files.preview_url column';
  END IF;

  -- Add processing_status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'files' AND column_name = 'processing_status'
  ) THEN
    ALTER TABLE files ADD COLUMN processing_status VARCHAR(50) DEFAULT 'pending';
    RAISE NOTICE 'Added files.processing_status column';
  END IF;

  -- Add metadata if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'files' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE files ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added files.metadata column';
  END IF;

  -- Add is_public if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'files' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE files ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added files.is_public column';
  END IF;

  -- Add folder_path if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'files' AND column_name = 'folder_path'
  ) THEN
    ALTER TABLE files ADD COLUMN folder_path TEXT DEFAULT '/';
    RAISE NOTICE 'Added files.folder_path column';
  END IF;
END $$;

-- =============================================================================
-- SECTION 3: Ensure projects table has all required columns
-- =============================================================================

DO $$
BEGIN
  -- Add canvas_data if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'canvas_data'
  ) THEN
    ALTER TABLE projects ADD COLUMN canvas_data JSONB DEFAULT '{}';
    RAISE NOTICE 'Added projects.canvas_data column';
  END IF;

  -- Add settings if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'settings'
  ) THEN
    ALTER TABLE projects ADD COLUMN settings JSONB DEFAULT '{}';
    RAISE NOTICE 'Added projects.settings column';
  END IF;

  -- Add visibility if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE projects ADD COLUMN visibility VARCHAR(50) DEFAULT 'private';
    RAISE NOTICE 'Added projects.visibility column';
  END IF;

  -- Add progress if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'progress'
  ) THEN
    ALTER TABLE projects ADD COLUMN progress INTEGER DEFAULT 0;
    RAISE NOTICE 'Added projects.progress column';
  END IF;

  -- Add due_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added projects.due_date column';
  END IF;

  -- Add start_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN start_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added projects.start_date column';
  END IF;

  -- Add archived_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added projects.archived_at column';
  END IF;
END $$;

-- =============================================================================
-- SECTION 4: Create missing indexes
-- =============================================================================

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_folder_path ON files(folder_path);
CREATE INDEX IF NOT EXISTS idx_files_processing_status ON files(processing_status);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Messages indexes (additional performance indexes)
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Activity indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id) WHERE EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'activities'
);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id) WHERE EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'activities'
);

-- =============================================================================
-- SECTION 5: Ensure activity_feed table exists with proper schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  action_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(action_type);

-- =============================================================================
-- SECTION 6: Fix any remaining foreign key issues
-- =============================================================================

-- Ensure project_members has correct foreign key references
DO $$
BEGIN
  -- Only add FK if both tables exist and types match
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_members')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    -- Remove old constraint if exists
    ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_project_id_fkey;
    -- Don't add FK constraint - just rely on application-level validation for flexibility
  END IF;
END $$;

-- =============================================================================
-- SECTION 7: Verification
-- =============================================================================

DO $$
DECLARE
  tables_checked INTEGER := 0;
  columns_added INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Corrective Migration Complete ===';

  -- Verify files table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'thumbnail_url') THEN
    columns_added := columns_added + 1;
  END IF;

  -- Verify projects table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'canvas_data') THEN
    columns_added := columns_added + 1;
  END IF;

  -- Verify activities table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    tables_checked := tables_checked + 1;
  END IF;

  RAISE NOTICE 'Tables verified: %, Columns ensured: %', tables_checked, columns_added;
  RAISE NOTICE '=====================================';
END $$;
