-- Migration 101: Email Verification & Password Reset
-- Adds columns for email verification and password reset functionality
-- FluxStudio User Adoption Roadmap - Phase 1

-- Add email verification columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP WITH TIME ZONE;

-- Add password reset columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Google OAuth users are auto-verified (their email was verified by Google)
UPDATE users SET email_verified = true WHERE google_id IS NOT NULL AND email_verified = false;

-- Comment for documentation
COMMENT ON COLUMN users.email_verified IS 'Whether user email has been verified via email link';
COMMENT ON COLUMN users.verification_token IS 'Token sent in verification email, expires after 24h';
COMMENT ON COLUMN users.verification_expires IS 'Timestamp when verification token expires';
COMMENT ON COLUMN users.password_reset_token IS 'Token sent in password reset email, expires after 1h';
COMMENT ON COLUMN users.password_reset_expires IS 'Timestamp when password reset token expires';
