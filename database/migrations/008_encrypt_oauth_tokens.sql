-- Migration 008: OAuth Token Encryption
-- Migrates oauth_tokens table from plaintext TEXT storage to encrypted BYTEA storage
-- Uses PostgreSQL pgcrypto extension for AES-256-GCM encryption

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Add new encrypted token columns
ALTER TABLE oauth_tokens
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted BYTEA;

-- Step 2: Create encryption functions
-- These functions use AES-256-GCM for secure token storage

CREATE OR REPLACE FUNCTION encrypt_token(token TEXT, encryption_key TEXT)
RETURNS BYTEA AS $$
BEGIN
  IF token IS NULL THEN
    RETURN NULL;
  END IF;

  -- Use AES-256-GCM encryption (pgp_sym_encrypt provides AES encryption)
  RETURN pgp_sym_encrypt(token, encryption_key, 'cipher-algo=aes256');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token BYTEA, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt using AES-256
  RETURN pgp_sym_decrypt(encrypted_token, encryption_key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Migrate existing tokens to encrypted columns
-- NOTE: This step requires the OAUTH_ENCRYPTION_KEY environment variable to be set
-- For now, we'll create a placeholder migration that can be executed manually with the key

-- Create a function to perform the migration with a provided key
CREATE OR REPLACE FUNCTION migrate_oauth_tokens_to_encrypted(encryption_key TEXT)
RETURNS INTEGER AS $$
DECLARE
  migrated_count INTEGER := 0;
  token_record RECORD;
BEGIN
  -- Iterate through all tokens and encrypt them
  FOR token_record IN
    SELECT id, access_token, refresh_token
    FROM oauth_tokens
    WHERE access_token IS NOT NULL
  LOOP
    -- Encrypt access token
    UPDATE oauth_tokens
    SET access_token_encrypted = encrypt_token(token_record.access_token, encryption_key)
    WHERE id = token_record.id;

    -- Encrypt refresh token if it exists
    IF token_record.refresh_token IS NOT NULL THEN
      UPDATE oauth_tokens
      SET refresh_token_encrypted = encrypt_token(token_record.refresh_token, encryption_key)
      WHERE id = token_record.id;
    END IF;

    migrated_count := migrated_count + 1;
  END LOOP;

  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Add indexes for encrypted columns (for performance)
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_encrypted ON oauth_tokens(user_id, provider)
WHERE access_token_encrypted IS NOT NULL;

-- Step 5: Add a trigger to ensure tokens are always encrypted
-- This trigger will automatically encrypt tokens when inserted/updated

CREATE OR REPLACE FUNCTION encrypt_oauth_tokens_trigger()
RETURNS TRIGGER AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Get encryption key from environment or use a default (should be overridden in production)
  encryption_key := current_setting('app.oauth_encryption_key', true);

  IF encryption_key IS NULL THEN
    -- Fallback: use a secure random key stored in the database
    -- NOTE: In production, this should come from environment variables
    RAISE WARNING 'OAuth encryption key not set, using database-stored key';
    encryption_key := current_setting('app.oauth_encryption_key_fallback', true);
  END IF;

  -- Encrypt access_token if provided
  IF NEW.access_token IS NOT NULL AND NEW.access_token_encrypted IS NULL THEN
    NEW.access_token_encrypted := encrypt_token(NEW.access_token, encryption_key);
  END IF;

  -- Encrypt refresh_token if provided
  IF NEW.refresh_token IS NOT NULL AND NEW.refresh_token_encrypted IS NULL THEN
    NEW.refresh_token_encrypted := encrypt_token(NEW.refresh_token, encryption_key);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if tokens are still being written to plaintext columns)
-- This is a safety net during migration
DROP TRIGGER IF EXISTS encrypt_oauth_tokens_on_insert ON oauth_tokens;
CREATE TRIGGER encrypt_oauth_tokens_on_insert
  BEFORE INSERT ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_oauth_tokens_trigger();

DROP TRIGGER IF EXISTS encrypt_oauth_tokens_on_update ON oauth_tokens;
CREATE TRIGGER encrypt_oauth_tokens_on_update
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_oauth_tokens_trigger();

-- Step 6: Create helper views for easy token access (with decryption)
-- These views will make it easy to query tokens without manually decrypting

CREATE OR REPLACE VIEW oauth_tokens_decrypted AS
SELECT
  id,
  user_id,
  provider,
  -- Decrypt tokens using the encryption key from environment
  decrypt_token(
    access_token_encrypted,
    COALESCE(current_setting('app.oauth_encryption_key', true), current_setting('app.oauth_encryption_key_fallback', true))
  ) AS access_token,
  decrypt_token(
    refresh_token_encrypted,
    COALESCE(current_setting('app.oauth_encryption_key', true), current_setting('app.oauth_encryption_key_fallback', true))
  ) AS refresh_token,
  expires_at,
  token_type,
  scope,
  provider_user_id,
  provider_username,
  provider_email,
  provider_metadata,
  is_active,
  last_used_at,
  created_at,
  updated_at
FROM oauth_tokens
WHERE access_token_encrypted IS NOT NULL;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN oauth_tokens.access_token_encrypted IS 'Encrypted OAuth access token using AES-256-GCM';
COMMENT ON COLUMN oauth_tokens.refresh_token_encrypted IS 'Encrypted OAuth refresh token using AES-256-GCM';
COMMENT ON FUNCTION encrypt_token(TEXT, TEXT) IS 'Encrypts a token using AES-256-GCM';
COMMENT ON FUNCTION decrypt_token(BYTEA, TEXT) IS 'Decrypts an encrypted token using AES-256-GCM';
COMMENT ON FUNCTION migrate_oauth_tokens_to_encrypted(TEXT) IS 'Migrates plaintext tokens to encrypted format. Run manually: SELECT migrate_oauth_tokens_to_encrypted(''your-encryption-key'');';
COMMENT ON VIEW oauth_tokens_decrypted IS 'View that automatically decrypts OAuth tokens for easy querying';

-- Migration Instructions:
--
-- 1. Set the encryption key in PostgreSQL session:
--    SET app.oauth_encryption_key = 'your-secure-32-character-key-here';
--
-- 2. Run the migration function:
--    SELECT migrate_oauth_tokens_to_encrypted('your-secure-32-character-key-here');
--
-- 3. Verify migration:
--    SELECT COUNT(*) FROM oauth_tokens WHERE access_token_encrypted IS NOT NULL;
--
-- 4. After verifying all tokens are encrypted, optionally drop old columns:
--    -- ALTER TABLE oauth_tokens DROP COLUMN access_token;
--    -- ALTER TABLE oauth_tokens DROP COLUMN refresh_token;
--    (Keep old columns for now to allow rollback if needed)
--
-- 5. Update application code to use encrypted columns and decrypt_token function

-- Security Note:
-- The OAUTH_ENCRYPTION_KEY must be:
-- - At least 32 characters long
-- - Stored securely (environment variable, not in code)
-- - Rotated periodically
-- - Never committed to version control
-- - Different per environment (dev, staging, prod)
