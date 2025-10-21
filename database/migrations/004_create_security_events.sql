-- Migration: Create security_events table
-- Sprint 13: Security Monitoring & Observability
-- Date: 2025-10-15

-- Create security_events table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  user_id VARCHAR(255),
  token_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_token ON security_events(token_id);

-- Create composite index for user activity queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON security_events(user_id, created_at DESC);

-- Create composite index for severity monitoring
CREATE INDEX IF NOT EXISTS idx_security_events_severity_created ON security_events(severity, created_at DESC);

-- Add comment to table
COMMENT ON TABLE security_events IS 'Comprehensive security event logging for audit trails and threat detection';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (login_success, failed_login_attempt, etc.)';
COMMENT ON COLUMN security_events.severity IS 'Event severity level (info, low, warning, high, critical)';
COMMENT ON COLUMN security_events.user_id IS 'ID of user associated with event';
COMMENT ON COLUMN security_events.token_id IS 'ID of token associated with event';
COMMENT ON COLUMN security_events.ip_address IS 'IP address of request';
COMMENT ON COLUMN security_events.user_agent IS 'User agent string of request';
COMMENT ON COLUMN security_events.metadata IS 'Additional event-specific metadata in JSON format';
COMMENT ON COLUMN security_events.created_at IS 'Timestamp when event occurred';
