-- Add Missing Tables for FluxStudio
-- This is an additive migration that works with existing schemas

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Refresh Tokens table (if not exists)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device_fingerprint JSONB,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Security Events table (if not exists) - without foreign keys for flexibility
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'INFO',
  user_id UUID,
  token_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);

-- Organizations table (if not exists)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'company',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- Conversations table (if not exists) - without foreign key constraints for compatibility
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  description TEXT,
  type VARCHAR(50) DEFAULT 'direct',
  organization_id UUID,
  project_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);

-- Conversation Participants (if not exists) - with flexible foreign keys
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID,
  user_id UUID,
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE
);

-- Add unique constraint separately to avoid conflicts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversation_participants_conversation_id_user_id_key'
  ) THEN
    ALTER TABLE conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_key
    UNIQUE (conversation_id, user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);

-- Update messages table if exists to add missing columns
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
    -- Add reply_to_id if doesn't exist (without foreign key for compatibility)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_to_id') THEN
      ALTER TABLE messages ADD COLUMN reply_to_id UUID;
    END IF;

    -- Add message_type if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
      ALTER TABLE messages ADD COLUMN message_type VARCHAR(50) DEFAULT 'text';
    END IF;

    -- Add deleted_at if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'deleted_at') THEN
      ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
  END IF;
END$$;

-- Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- OAuth Tokens table (if not exists)
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  provider VARCHAR(50) NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_type VARCHAR(50),
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);

-- Add missing columns to users table if they don't exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Add password_hash if doesn't exist (may be called 'password')
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
        -- Rename password to password_hash
        ALTER TABLE users RENAME COLUMN password TO password_hash;
      ELSE
        ALTER TABLE users ADD COLUMN password_hash TEXT;
      END IF;
    END IF;

    -- Add user_type if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_type') THEN
      ALTER TABLE users ADD COLUMN user_type VARCHAR(50) DEFAULT 'client';
    END IF;

    -- Add oauth_provider if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'oauth_provider') THEN
      ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
    END IF;

    -- Add oauth_id if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'oauth_id') THEN
      ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255);
    END IF;

    -- Add profile_picture if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture') THEN
      ALTER TABLE users ADD COLUMN profile_picture TEXT;
    END IF;

    -- Add phone if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
      ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;

    -- Add last_login if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
      ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add is_active if doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
      ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
  END IF;
END$$;

-- Create index on oauth columns
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id);

-- Migrations tracking
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO migrations (filename)
VALUES ('001_add_missing_tables.sql')
ON CONFLICT (filename) DO NOTHING;

SELECT 'Missing tables and columns added successfully!' as status;
