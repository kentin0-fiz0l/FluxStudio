-- Migration: Create refresh_tokens table
-- Purpose: Store JWT refresh tokens for secure token rotation
-- Date: 2025-10-14
-- Part of: Week 1 Security Sprint - JWT Refresh Tokens

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,

  -- Device tracking for security
  device_name VARCHAR(255),
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Token lifecycle
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP DEFAULT NULL,

  -- Indexes for performance
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_device_fingerprint ON refresh_tokens(device_fingerprint);

-- Create index for active tokens (not expired, not revoked)
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(user_id, expires_at)
  WHERE revoked_at IS NULL;

-- Add comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT authentication with device tracking';
COMMENT ON COLUMN refresh_tokens.token IS 'Cryptographically secure random token (64 bytes hex)';
COMMENT ON COLUMN refresh_tokens.device_fingerprint IS 'Browser fingerprint for device identification';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When token was manually revoked (logout, security event)';

-- Create function to clean up expired tokens automatically
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to clean up expired tokens (optional - requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_refresh_tokens()');

-- Rollback command (for development):
-- DROP TABLE IF EXISTS refresh_tokens CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens CASCADE;
