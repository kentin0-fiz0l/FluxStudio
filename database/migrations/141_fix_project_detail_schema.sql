-- Migration 141: Fix Project Detail Page Schema Issues
-- Date: 2026-03-10
-- Description: Fixes schema issues causing 500 errors on project detail page:
--   1. Creates conversation_members table (missing due to UUID/TEXT FK mismatch in migration 037)
--   2. Fixes notifications.user_id from UUID to TEXT for CUID compatibility
--   3. Adds archived_at column to conversations for counts query
--   4. Ensures messages has sender_id alias column

-- =============================================================================
-- SECTION 1: Create conversation_members table
-- Migration 037 likely failed to create this because it referenced users(id)
-- with TEXT type when users.id was still UUID at that point.
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversation_members (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  last_read_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key to conversations only if that table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'conversation_members_conversation_id_fkey'
      AND table_name = 'conversation_members'
  ) THEN
    BEGIN
      ALTER TABLE conversation_members
        ADD CONSTRAINT conversation_members_conversation_id_fkey
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add conversation_members FK to conversations: %', SQLERRM;
    END;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_members_unique
  ON conversation_members (conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON conversation_members (user_id);

-- =============================================================================
-- SECTION 2: Fix notifications.user_id type (UUID -> TEXT for CUID)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'user_id' AND data_type = 'uuid'
  ) THEN
    -- Drop FK constraint if exists
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
    -- Convert to TEXT
    ALTER TABLE notifications ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE 'Converted notifications.user_id from UUID to TEXT';
  END IF;
END $$;

-- =============================================================================
-- SECTION 3: Add archived_at to conversations (needed by counts query)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN archived_at TIMESTAMPTZ;
    RAISE NOTICE 'Added conversations.archived_at column';
  END IF;

  -- Also ensure project_id exists on conversations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN project_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
    RAISE NOTICE 'Added conversations.project_id column';
  END IF;
END $$;

-- =============================================================================
-- SECTION 4: Ensure messages has sender_id (alias for author_id)
-- Some queries use sender_id while the original schema used author_id
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'sender_id'
  ) THEN
    -- If author_id exists, add sender_id as a generated column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'author_id'
    ) THEN
      ALTER TABLE messages ADD COLUMN sender_id TEXT;
      -- Backfill from author_id
      UPDATE messages SET sender_id = author_id::TEXT WHERE sender_id IS NULL;
      RAISE NOTICE 'Added messages.sender_id column (backfilled from author_id)';
    ELSE
      ALTER TABLE messages ADD COLUMN sender_id TEXT;
      RAISE NOTICE 'Added messages.sender_id column';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- SECTION 5: Ensure conversations has all columns needed by messaging queries
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'is_group'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT FALSE;
    RAISE NOTICE 'Added conversations.is_group column';
  END IF;
END $$;

-- =============================================================================
-- SECTION 6: Verification
-- =============================================================================

DO $$
DECLARE
  cm_exists BOOLEAN;
  notif_type TEXT;
BEGIN
  -- Check conversation_members
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_members'
  ) INTO cm_exists;

  -- Check notifications.user_id type
  SELECT data_type INTO notif_type
  FROM information_schema.columns
  WHERE table_name = 'notifications' AND column_name = 'user_id';

  RAISE NOTICE '=== Migration 141 Verification ===';
  RAISE NOTICE 'conversation_members exists: %', cm_exists;
  RAISE NOTICE 'notifications.user_id type: %', notif_type;
  RAISE NOTICE '==================================';
END $$;
