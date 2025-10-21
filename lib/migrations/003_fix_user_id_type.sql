-- Migration: Fix user_id column type in refresh_tokens
-- Part of: Week 2 Security Sprint - Bug Fix
-- Date: 2025-10-15
-- Description: Change user_id from UUID to VARCHAR to support file-based user IDs

-- Drop the foreign key constraint if it exists (it doesn't but good practice)
-- ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS fk_refresh_tokens_user_id;

-- Change user_id column type from UUID to VARCHAR(255)
ALTER TABLE refresh_tokens
  ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR(255);

-- Update comment
COMMENT ON COLUMN refresh_tokens.user_id IS 'User ID (supports both UUID and timestamp-based IDs from file storage)';
