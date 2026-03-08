-- Migration 135: LMS Provider Support (Google Classroom, Canvas LMS)
-- Adds LMS providers to OAuth token constraints and provider_base_url for Canvas

-- Update oauth_tokens provider constraint to include LMS providers
ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS valid_provider;
ALTER TABLE oauth_tokens ADD CONSTRAINT valid_provider CHECK (
  provider IN (
    'figma', 'slack', 'github', 'notion', 'asana', 'monday', 'linear',
    'google_drive', 'dropbox', 'onedrive',
    'google_classroom', 'canvas_lms'
  )
);

-- Update oauth_integration_settings provider constraint
ALTER TABLE oauth_integration_settings DROP CONSTRAINT IF EXISTS valid_integration_provider;
ALTER TABLE oauth_integration_settings ADD CONSTRAINT valid_integration_provider CHECK (
  provider IN (
    'figma', 'slack', 'github', 'notion', 'asana', 'monday', 'linear',
    'google_drive', 'dropbox', 'onedrive',
    'google_classroom', 'canvas_lms'
  )
);

-- Add provider_base_url column for Canvas institution-specific URLs
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS provider_base_url TEXT;

COMMENT ON COLUMN oauth_tokens.provider_base_url IS 'Institution-specific base URL for providers like Canvas LMS (e.g. https://school.instructure.com)';
