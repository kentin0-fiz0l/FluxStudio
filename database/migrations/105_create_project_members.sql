-- Migration 105: Create project_members table
-- Date: 2026-02-09
-- Description: Creates the project_members table required for project membership
--
-- This migration is idempotent - safe to re-run

-- =============================================================================
-- SECTION 1: Create ProjectRole enum if it doesn't exist
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectRole') THEN
    CREATE TYPE "ProjectRole" AS ENUM ('manager', 'contributor', 'reviewer', 'viewer');
    RAISE NOTICE 'Created ProjectRole enum';
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: Create project_members table (using TEXT for ID columns to match existing tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'contributor',
  permissions JSONB DEFAULT '[]',
  hourly_rate DECIMAL(8, 2),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  -- Foreign keys
  CONSTRAINT fk_project_members_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_members_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Unique constraint
  CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);

-- =============================================================================
-- SECTION 3: Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);
CREATE INDEX IF NOT EXISTS idx_project_members_is_active ON project_members(is_active);

-- =============================================================================
-- SECTION 4: Verification
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_members') THEN
    RAISE NOTICE '=== project_members table created/verified ===';
  ELSE
    RAISE NOTICE 'ERROR: project_members table was not created!';
  END IF;
END $$;
