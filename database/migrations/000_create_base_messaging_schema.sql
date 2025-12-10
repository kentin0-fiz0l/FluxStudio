-- Base Migration: Create core messaging schema
-- Created: 2025-10-12
-- Sprint 8: Database Setup for Messaging System

-- Create users table (normalized from Prisma User table)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table (TEXT id for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table (TEXT ids for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table (TEXT ids for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    team_id TEXT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table (TEXT ids for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'group', -- 'group', 'direct', 'channel'
    organization_id TEXT,
    project_id TEXT,
    team_id TEXT,
    created_by VARCHAR(255) NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table (TEXT ids for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    author_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'file', 'image', 'system'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'read', 'failed'
    reply_to_id TEXT,
    thread_id TEXT,
    mentions TEXT[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_reactions table (TEXT ids for MetMap CUID compatibility)
CREATE TABLE IF NOT EXISTS message_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    reaction VARCHAR(50) NOT NULL, -- emoji or reaction type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
);

-- Add basic indexes (conditionally - only if columns exist)
DO $$
BEGIN
  -- Users indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  END IF;

  -- Conversations indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'organization_id') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations(organization_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'project_id') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'team_id') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_team ON conversations(team_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'created_by') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
  END IF;

  -- Messages indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'author_id') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  END IF;

  -- Message reactions indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_reactions' AND column_name = 'message_id') THEN
    CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_reactions' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);
  END IF;
END $$;

-- Populate users table from existing Prisma User table (if both tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
    INSERT INTO users (id, name, email, created_at, updated_at)
    SELECT "id", "name", "email", "createdAt", "updatedAt"
    FROM "User"
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = EXCLUDED.updated_at;
    RAISE NOTICE 'Users synced from MetMap User table';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not sync users: %', SQLERRM;
END $$;

-- Create a default organization and project if they don't exist
DO $$
BEGIN
  -- Only create defaults if organizations table exists and has required columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'slug') THEN
    INSERT INTO organizations (id, name, slug, description)
    VALUES ('fluxstudio-default-org', 'FluxStudio', 'fluxstudio', 'Default FluxStudio organization')
    ON CONFLICT (slug) DO NOTHING;
    RAISE NOTICE 'Default organization created/verified';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create default organization: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Only create default project if projects table exists with required columns
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'organization_id') THEN
    INSERT INTO projects (id, organization_id, name, description)
    SELECT 'fluxstudio-default-project', o.id, 'Default Project', 'Default project for FluxStudio'
    FROM organizations o
    WHERE o.slug = 'fluxstudio'
    AND NOT EXISTS (SELECT 1 FROM projects WHERE id = 'fluxstudio-default-project');
    RAISE NOTICE 'Default project created/verified';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create default project: %', SQLERRM;
END $$;

-- Add helpful comments (conditionally)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    COMMENT ON TABLE users IS 'User accounts for the messaging system';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    COMMENT ON TABLE conversations IS 'Chat conversations/channels';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    COMMENT ON TABLE messages IS 'Individual messages within conversations';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reactions') THEN
    COMMENT ON TABLE message_reactions IS 'User reactions to messages (emojis, etc.)';
  END IF;
END $$;