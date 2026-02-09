-- Migration 104: Fix Projects Core Columns
-- Date: 2026-02-09
-- Description: Adds missing core columns to projects table that may be absent
--              in production due to incomplete initial schema
--
-- This migration is idempotent - safe to re-run

-- =============================================================================
-- SECTION 1: Add core columns if missing
-- =============================================================================

-- Add name column if missing (CRITICAL - required for project creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'name'
  ) THEN
    ALTER TABLE projects ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Untitled Project';
    RAISE NOTICE 'Added projects.name column';
  END IF;
END $$;

-- Add description column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'description'
  ) THEN
    ALTER TABLE projects ADD COLUMN description TEXT DEFAULT '';
    RAISE NOTICE 'Added projects.description column';
  END IF;
END $$;

-- Add slug column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'slug'
  ) THEN
    ALTER TABLE projects ADD COLUMN slug VARCHAR(255);
    RAISE NOTICE 'Added projects.slug column';
  END IF;
END $$;

-- Add organization_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN organization_id TEXT;
    RAISE NOTICE 'Added projects.organization_id column';
  END IF;
END $$;

-- Add team_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN team_id TEXT;
    RAISE NOTICE 'Added projects.team_id column';
  END IF;
END $$;

-- Add manager_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN manager_id TEXT;
    RAISE NOTICE 'Added projects.manager_id column';
  END IF;
END $$;

-- Add status column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    ALTER TABLE projects ADD COLUMN status VARCHAR(50) DEFAULT 'planning';
    RAISE NOTICE 'Added projects.status column';
  END IF;
END $$;

-- Add priority column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'priority'
  ) THEN
    ALTER TABLE projects ADD COLUMN priority VARCHAR(50) DEFAULT 'medium';
    RAISE NOTICE 'Added projects.priority column';
  END IF;
END $$;

-- Add project_type column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_type'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_type VARCHAR(100) DEFAULT 'general';
    RAISE NOTICE 'Added projects.project_type column';
  END IF;
END $$;

-- Add service_category column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'service_category'
  ) THEN
    ALTER TABLE projects ADD COLUMN service_category VARCHAR(100) DEFAULT 'general';
    RAISE NOTICE 'Added projects.service_category column';
  END IF;
END $$;

-- Add service_tier column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'service_tier'
  ) THEN
    ALTER TABLE projects ADD COLUMN service_tier VARCHAR(50) DEFAULT 'standard';
    RAISE NOTICE 'Added projects.service_tier column';
  END IF;
END $$;

-- Add ensemble_type column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'ensemble_type'
  ) THEN
    ALTER TABLE projects ADD COLUMN ensemble_type VARCHAR(100) DEFAULT 'general';
    RAISE NOTICE 'Added projects.ensemble_type column';
  END IF;
END $$;

-- Add metadata column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE projects ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added projects.metadata column';
  END IF;
END $$;

-- Add tags column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'tags'
  ) THEN
    ALTER TABLE projects ADD COLUMN tags TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added projects.tags column';
  END IF;
END $$;

-- Add created_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added projects.created_at column';
  END IF;
END $$;

-- Add updated_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added projects.updated_at column';
  END IF;
END $$;

-- =============================================================================
-- SECTION 2: Create indexes for new columns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);

-- =============================================================================
-- SECTION 3: Verification
-- =============================================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'projects' AND column_name IN ('name', 'description', 'slug', 'organization_id', 'status', 'priority');

  RAISE NOTICE '=== Projects Core Columns Migration Complete ===';
  RAISE NOTICE 'Core columns verified: % of 6', col_count;
  RAISE NOTICE '================================================';
END $$;
