-- Migration: Create security_events table
-- Part of: Week 2 Security Sprint
-- Date: 2025-10-15
-- Description: Tracks security events for monitoring, alerting, and forensic analysis

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  user_id VARCHAR(255),
  token_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for querying and monitoring
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_metadata ON security_events USING gin(metadata);

-- Composite index for user security timeline
CREATE INDEX IF NOT EXISTS idx_security_events_user_timeline
  ON security_events(user_id, created_at DESC);

-- Comments for documentation
COMMENT ON TABLE security_events IS 'Security monitoring and audit log for authentication events';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (e.g., device_fingerprint_mismatch, failed_login, suspicious_activity)';
COMMENT ON COLUMN security_events.severity IS 'Event severity: info, warning, error, critical';
COMMENT ON COLUMN security_events.user_id IS 'User associated with the event (NULL for anonymous events)';
COMMENT ON COLUMN security_events.token_id IS 'Refresh token ID if event relates to token activity';
COMMENT ON COLUMN security_events.metadata IS 'Additional event data stored as JSON (flexible schema)';

-- Event type constraints
ALTER TABLE security_events ADD CONSTRAINT chk_severity
  CHECK (severity IN ('info', 'warning', 'error', 'critical'));

-- Common event types for reference:
-- - device_fingerprint_mismatch: Device fingerprint changed during token use
-- - failed_login: Failed authentication attempt
-- - suspicious_token_usage: Unusual token usage pattern detected
-- - rate_limit_exceeded: User exceeded rate limits
-- - token_revoked: Token was manually revoked
-- - multiple_device_login: User logged in from new device
-- - session_hijack_attempt: Potential session hijacking detected
