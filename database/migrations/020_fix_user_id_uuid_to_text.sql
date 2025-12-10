-- Migration: Fix user_id columns from UUID to TEXT
-- Part of: Production Fix for Google OAuth
-- Date: 2025-12-10
-- Description: Change user_id columns from UUID to TEXT to support CUID user IDs
-- This migration handles the case where init-production.sql created UUID columns
-- but the application uses CUID-formatted user IDs (e.g., cmiz5x2v00trBtgvh9Io5kdWi)

-- First, drop the foreign key constraint on refresh_tokens (if it exists)
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS fk_refresh_tokens_user_id;

-- Drop the foreign key constraint on security_events (if it exists)
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_user_id_fkey;
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS fk_security_events_user_id;

-- Change refresh_tokens.user_id from UUID to TEXT
-- Using a conditional approach to handle both UUID and VARCHAR types
DO $$
BEGIN
  -- Check if the column is UUID type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refresh_tokens'
    AND column_name = 'user_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE refresh_tokens ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE 'refresh_tokens.user_id converted from UUID to TEXT';
  ELSE
    RAISE NOTICE 'refresh_tokens.user_id is already TEXT or VARCHAR';
  END IF;
END $$;

-- Change security_events.user_id from UUID to TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'security_events'
    AND column_name = 'user_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE security_events ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    RAISE NOTICE 'security_events.user_id converted from UUID to TEXT';
  ELSE
    RAISE NOTICE 'security_events.user_id is already TEXT or VARCHAR';
  END IF;
END $$;

-- Drop the token_id FK constraint on security_events (if referencing refresh_tokens)
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_token_id_fkey;

-- Update comments for documentation
COMMENT ON COLUMN refresh_tokens.user_id IS 'User ID (TEXT to support CUID format from MetMap integration)';
COMMENT ON COLUMN security_events.user_id IS 'User ID (TEXT to support CUID format from MetMap integration)';
