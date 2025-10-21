-- Migration: Create refresh_tokens table
-- Part of: Week 2 Security Sprint
-- Date: 2025-10-15
-- Description: Stores JWT refresh tokens with device tracking for multi-device session management

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  device_name VARCHAR(255),
  device_fingerprint VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);

-- Composite index for active session queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_sessions
  ON refresh_tokens(user_id, expires_at, revoked_at)
  WHERE revoked_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores JWT refresh tokens for secure token rotation and multi-device session management';
COMMENT ON COLUMN refresh_tokens.user_id IS 'Foreign key to users table';
COMMENT ON COLUMN refresh_tokens.token IS 'Cryptographically secure random token (128 hex characters)';
COMMENT ON COLUMN refresh_tokens.device_name IS 'Human-readable device name (e.g., Chrome on MacOS)';
COMMENT ON COLUMN refresh_tokens.device_fingerprint IS 'Privacy-preserving browser fingerprint for security';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address when token was created';
COMMENT ON COLUMN refresh_tokens.last_used_at IS 'Last time this token was used to refresh access token';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Token expiration time (7 days from creation, extendable)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'When token was revoked (NULL if still active)';
