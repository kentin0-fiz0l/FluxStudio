-- Migration 033: Fix Schema Compatibility Issues
-- Date: 2025-12-12
-- Description: Fixes UUID/TEXT mismatches and ensures required columns exist
--
-- Issues addressed:
-- 1. conversation_id column missing from messages table
-- 2. notifications.user_id expects UUID but receives CUID (TEXT)
-- 3. Other UUID/TEXT mismatches across tables

-- Fix 1: Ensure messages table has conversation_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN conversation_id TEXT;
    RAISE NOTICE 'Added conversation_id column to messages table';
  END IF;
END $$;

-- Create index on conversation_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Fix 2: Recreate notifications table with TEXT user_id for CUID compatibility
-- First, backup existing data if table exists with UUID type
DO $$
BEGIN
  -- Check if notifications table exists and has UUID user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    -- Create temp table with existing data
    CREATE TEMP TABLE notifications_backup AS SELECT * FROM notifications;

    -- Drop and recreate with TEXT user_id
    DROP TABLE notifications CASCADE;

    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMP WITH TIME ZONE,
      action_url TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Restore data (converting UUIDs to text)
    INSERT INTO notifications
    SELECT id::TEXT, user_id::TEXT, type, title, message, data, priority, is_read, read_at, action_url, expires_at, created_at
    FROM notifications_backup;

    DROP TABLE notifications_backup;
    RAISE NOTICE 'Recreated notifications table with TEXT user_id';
  END IF;
END $$;

-- If notifications table doesn't exist at all, create it with TEXT IDs
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Fix 3: Ensure conversation_participants table exists with proper types
CREATE TABLE IF NOT EXISTS conversation_participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  status VARCHAR(50) DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);

-- Fix 4: Ensure user_presence table exists for the conversation query
CREATE TABLE IF NOT EXISTS user_presence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  last_read_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'online',
  UNIQUE(user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_presence_user ON user_presence(user_id);

-- Fix 5: Ensure message_read_receipts table exists
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts(user_id);

-- Fix 6: Ensure tasks table exists for project queries
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  assignee_id TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- Fix 7: Ensure project_members table exists
CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'contributor',
  is_active BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- Verification: Log table structures
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '=== Schema Compatibility Fix Complete ===';

  -- Check messages.conversation_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
    RAISE NOTICE 'messages.conversation_id: EXISTS';
  ELSE
    RAISE NOTICE 'messages.conversation_id: MISSING';
  END IF;

  -- Check notifications.user_id type
  SELECT data_type INTO col_record FROM information_schema.columns
  WHERE table_name = 'notifications' AND column_name = 'user_id';
  IF FOUND THEN
    RAISE NOTICE 'notifications.user_id type: %', col_record.data_type;
  END IF;

  RAISE NOTICE '=========================================';
END $$;
