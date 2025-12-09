-- Migration 010: Add DRM Support for FairPlay Streaming
-- Adds tables and columns needed for content protection

-- Add DRM-related columns to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS drm_protected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hls_manifest_url TEXT,
ADD COLUMN IF NOT EXISTS transcoding_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS transcoding_job_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS content_key_id UUID,
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP;

-- Create index on transcoding status for job queries
CREATE INDEX IF NOT EXISTS idx_files_transcoding_status
ON files(transcoding_status)
WHERE transcoding_status != 'completed';

-- Content Keys table - stores encryption keys for protected media
CREATE TABLE IF NOT EXISTS content_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    content_key TEXT NOT NULL,  -- Base64-encoded, encrypted with KMS
    iv TEXT NOT NULL,            -- Initialization Vector for AES
    algorithm VARCHAR(50) DEFAULT 'AES-128',
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    revoke_reason TEXT,

    -- Ensure only one active key per content
    UNIQUE(content_id, revoked_at)
);

-- Index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_content_keys_content_id
ON content_keys(content_id)
WHERE revoked_at IS NULL;

-- Media Licenses table - tracks license issuances
CREATE TABLE IF NOT EXISTS media_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_id UUID NOT NULL REFERENCES content_keys(id),
    issued_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    license_type VARCHAR(50) DEFAULT 'rental',  -- 'rental' or 'purchase'
    device_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,

    -- Composite index for user license queries
    INDEX idx_media_licenses_user_content (user_id, content_id),
    INDEX idx_media_licenses_expires (expires_at) WHERE revoked = FALSE
);

-- Transcoding Jobs table - tracks HLS encoding jobs
CREATE TABLE IF NOT EXISTS transcoding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    job_id VARCHAR(255) UNIQUE,  -- AWS MediaConvert job ID
    status VARCHAR(50) DEFAULT 'pending',
    -- Status: pending, submitted, progressing, complete, error, canceled
    input_url TEXT NOT NULL,
    output_bucket VARCHAR(255),
    output_prefix VARCHAR(255),
    manifest_url TEXT,

    -- Job progress
    progress INTEGER DEFAULT 0,  -- 0-100
    error_message TEXT,
    error_code VARCHAR(100),

    -- Timing
    created_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Settings
    settings JSONB,

    INDEX idx_transcoding_jobs_file (file_id),
    INDEX idx_transcoding_jobs_status (status) WHERE status IN ('pending', 'submitted', 'progressing')
);

-- Subscription Tiers table (placeholder for future premium features)
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    max_storage_gb INTEGER DEFAULT 100,
    max_concurrent_streams INTEGER DEFAULT 3,
    can_use_drm BOOLEAN DEFAULT FALSE,
    price_monthly_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO subscription_tiers (name, description, max_storage_gb, max_concurrent_streams, can_use_drm, price_monthly_cents)
VALUES
    ('free', 'Free tier with basic features', 10, 1, FALSE, 0),
    ('pro', 'Professional tier with DRM support', 100, 3, TRUE, 1999),
    ('enterprise', 'Enterprise tier with unlimited features', NULL, 10, TRUE, 9999)
ON CONFLICT (name) DO NOTHING;

-- User Subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
    status VARCHAR(50) DEFAULT 'active',  -- active, canceled, expired, suspended
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    canceled_at TIMESTAMP,
    stripe_subscription_id VARCHAR(255),

    UNIQUE(user_id),
    INDEX idx_user_subscriptions_status (status, expires_at)
);

-- Function to auto-assign free tier to new users
CREATE OR REPLACE FUNCTION assign_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_subscriptions (user_id, tier_id)
    SELECT NEW.id, id FROM subscription_tiers WHERE name = 'free'
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign default subscription
DROP TRIGGER IF EXISTS trigger_assign_default_subscription ON users;
CREATE TRIGGER trigger_assign_default_subscription
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION assign_default_subscription();

-- View for active licenses
CREATE OR REPLACE VIEW active_licenses AS
SELECT
    ml.*,
    f.name as file_name,
    f.mime_type,
    u.email as user_email,
    ck.algorithm
FROM media_licenses ml
JOIN files f ON ml.content_id = f.id
JOIN users u ON ml.user_id = u.id
JOIN content_keys ck ON ml.key_id = ck.id
WHERE ml.revoked = FALSE
  AND ml.expires_at > NOW();

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE ON content_keys TO fluxstudio_app;
-- GRANT SELECT, INSERT, UPDATE ON media_licenses TO fluxstudio_app;
-- GRANT SELECT, INSERT, UPDATE ON transcoding_jobs TO fluxstudio_app;

-- Comments for documentation
COMMENT ON TABLE content_keys IS 'Stores encrypted content keys for DRM-protected media files';
COMMENT ON TABLE media_licenses IS 'Tracks FairPlay license issuances for analytics and access control';
COMMENT ON TABLE transcoding_jobs IS 'Tracks AWS MediaConvert HLS transcoding jobs';
COMMENT ON TABLE subscription_tiers IS 'Defines subscription tiers with feature limits';
COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription status and tier';

COMMENT ON COLUMN files.drm_protected IS 'Whether this file requires FairPlay DRM for playback';
COMMENT ON COLUMN files.hls_manifest_url IS 'URL to HLS manifest (m3u8) for adaptive streaming';
COMMENT ON COLUMN files.transcoding_status IS 'Status: pending, processing, completed, failed';
COMMENT ON COLUMN files.content_key_id IS 'Reference to encryption key used for this file';
