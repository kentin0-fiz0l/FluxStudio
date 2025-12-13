-- Migration: 044_fix_projects_schema.sql
-- Fixes missing columns in projects table that may occur due to incomplete migrations

-- Add organization_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'organization_id') THEN
        -- First check if organizations table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
            ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
            -- Set a default for existing rows if there's a default org
            UPDATE projects SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL;
        END IF;
    END IF;
END $$;

-- Add team_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'team_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
            ALTER TABLE projects ADD COLUMN team_id UUID REFERENCES teams(id);
        END IF;
    END IF;
END $$;

-- Add manager_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'manager_id') THEN
        ALTER TABLE projects ADD COLUMN manager_id UUID REFERENCES users(id);
    END IF;
END $$;

-- Add status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'status') THEN
        ALTER TABLE projects ADD COLUMN status VARCHAR(50) DEFAULT 'planning';
    END IF;
END $$;

-- Add priority if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'priority') THEN
        ALTER TABLE projects ADD COLUMN priority VARCHAR(50) DEFAULT 'medium';
    END IF;
END $$;

-- Add updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'updated_at') THEN
        ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add created_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'projects' AND column_name = 'created_at') THEN
        ALTER TABLE projects ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create index on organization_id if column exists and index doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'projects' AND column_name = 'organization_id') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_organization_id') THEN
            CREATE INDEX idx_projects_organization_id ON projects(organization_id);
        END IF;
    END IF;
END $$;

-- Create index on team_id if column exists and index doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'projects' AND column_name = 'team_id') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_team_id') THEN
            CREATE INDEX idx_projects_team_id ON projects(team_id);
        END IF;
    END IF;
END $$;
