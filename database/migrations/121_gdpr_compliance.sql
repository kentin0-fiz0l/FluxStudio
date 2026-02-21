-- Sprint 41 T2: GDPR/CCPA Compliance Tools
-- Adds data export request tracking, enhanced deletion requests, and consent records

-- ==================== Data Export Requests ====================

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_size BIGINT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);

-- ==================== Account Deletion Requests ====================
-- Enhances the existing deletion_requests table with grace_period_ends and cancelled_at

ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS grace_period_ends TIMESTAMPTZ;
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE deletion_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Backfill grace_period_ends from scheduled_at for existing rows
UPDATE deletion_requests
SET grace_period_ends = scheduled_at
WHERE grace_period_ends IS NULL AND scheduled_at IS NOT NULL;

-- ==================== Consent Records ====================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id, consent_type);
