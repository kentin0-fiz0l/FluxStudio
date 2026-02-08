-- Migration 001: Create Initial Schema
-- Date: 2025-01-12
-- Description: Creates the complete FluxStudio database schema
-- Note: This migration is idempotent - it skips if users table already exists

-- Check if this migration has already been applied (users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE 'Schema already exists, skipping migration 001';
        RETURN;
    END IF;

    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Users table
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('client', 'designer', 'admin')),
        avatar_url TEXT,
        phone VARCHAR(20),
        timezone VARCHAR(50) DEFAULT 'America/New_York',
        preferences JSONB DEFAULT '{}',
        oauth_provider VARCHAR(50),
        oauth_id VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Organizations table
    CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        type VARCHAR(100) NOT NULL,
        location TEXT,
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        website VARCHAR(255),
        logo_url TEXT,
        settings JSONB DEFAULT '{}',
        subscription_tier VARCHAR(50) DEFAULT 'free',
        subscription_status VARCHAR(50) DEFAULT 'active',
        billing_email VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Organization members
    CREATE TABLE organization_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
        permissions JSONB DEFAULT '[]',
        invited_by UUID REFERENCES users(id),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(organization_id, user_id)
    );

    -- Teams table
    CREATE TABLE teams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        slug VARCHAR(255) NOT NULL,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        lead_id UUID REFERENCES users(id),
        settings JSONB DEFAULT '{}',
        is_private BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, slug)
    );

    -- Team members
    CREATE TABLE team_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL CHECK (role IN ('lead', 'member', 'viewer')),
        permissions JSONB DEFAULT '[]',
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(team_id, user_id)
    );

    -- Projects table
    CREATE TABLE projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        slug VARCHAR(255) NOT NULL,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id),
        manager_id UUID NOT NULL REFERENCES users(id),
        client_id UUID REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
        priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        project_type VARCHAR(100) NOT NULL,
        service_category VARCHAR(100) NOT NULL,
        service_tier VARCHAR(50) NOT NULL,
        ensemble_type VARCHAR(100) NOT NULL,
        budget DECIMAL(10,2),
        estimated_hours INTEGER,
        actual_hours INTEGER DEFAULT 0,
        start_date DATE,
        due_date DATE,
        completion_date DATE,
        metadata JSONB DEFAULT '{}',
        settings JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        is_template BOOLEAN DEFAULT FALSE,
        template_id UUID REFERENCES projects(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(organization_id, slug)
    );

    -- Create indexes for performance
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
    CREATE INDEX idx_organizations_slug ON organizations(slug);
    CREATE INDEX idx_projects_organization ON projects(organization_id);
    CREATE INDEX idx_projects_status ON projects(status);

    -- Create trigger for updated_at timestamps
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$ language 'plpgsql';

    -- Apply updated_at triggers
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Migration 001: Initial schema created successfully';
END $$;
