-- Sprint 3.5: OAuth Tokens and Integration Management
-- Phase 1 Implementation: OAuth Framework + Figma + Slack + PostgreSQL MCP

-- OAuth Tokens Table
-- Stores encrypted access tokens and refresh tokens for third-party integrations
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'figma', 'slack', 'github', etc.

  -- Encrypted tokens (use pgcrypto for encryption at rest)
  access_token TEXT NOT NULL,
  refresh_token TEXT,

  -- Token metadata
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT[], -- Array of granted scopes

  -- Provider-specific data
  provider_user_id VARCHAR(255), -- User ID from the OAuth provider
  provider_username VARCHAR(255),
  provider_email VARCHAR(255),
  provider_metadata JSONB DEFAULT '{}',

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider),
  CONSTRAINT valid_provider CHECK (provider IN ('figma', 'slack', 'github', 'notion', 'asana', 'monday', 'linear'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_active ON oauth_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- OAuth Integration Settings Table
-- Stores user preferences for each integration
CREATE TABLE IF NOT EXISTS oauth_integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,

  -- Integration preferences
  auto_sync_enabled BOOLEAN DEFAULT true,
  notification_enabled BOOLEAN DEFAULT true,
  webhook_enabled BOOLEAN DEFAULT false,

  -- Provider-specific settings
  settings JSONB DEFAULT '{}',

  -- Last sync metadata
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'syncing', 'error'
  sync_error TEXT,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT unique_user_integration UNIQUE(user_id, provider),
  CONSTRAINT valid_integration_provider CHECK (provider IN ('figma', 'slack', 'github', 'notion', 'asana', 'monday', 'linear'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_settings_user_id ON oauth_integration_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_settings_provider ON oauth_integration_settings(provider);

-- OAuth State Tokens Table
-- Stores PKCE challenge codes and state tokens for OAuth flows (short-lived)
CREATE TABLE IF NOT EXISTS oauth_state_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,

  -- PKCE (Proof Key for Code Exchange) parameters
  state_token VARCHAR(255) NOT NULL UNIQUE,
  code_challenge VARCHAR(255) NOT NULL,
  code_challenge_method VARCHAR(10) DEFAULT 'S256', -- 'S256' or 'plain'
  code_verifier VARCHAR(255) NOT NULL,

  -- OAuth flow metadata
  redirect_uri TEXT NOT NULL,
  scope TEXT[],

  -- Expiry (OAuth state tokens should expire quickly - 10 minutes)
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
  used BOOLEAN DEFAULT false,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_state_user_id ON oauth_state_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_state_token ON oauth_state_tokens(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON oauth_state_tokens(expires_at);

-- Figma Files Cache Table (Optional - for performance)
-- Caches Figma file metadata to reduce API calls
CREATE TABLE IF NOT EXISTS figma_files_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_key VARCHAR(255) NOT NULL,

  -- File metadata
  file_name VARCHAR(500),
  file_data JSONB NOT NULL,
  thumbnail_url TEXT,
  last_modified TIMESTAMP WITH TIME ZONE,
  version VARCHAR(100),

  -- Cache metadata
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),

  -- Link to projects (optional)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  CONSTRAINT unique_user_file UNIQUE(user_id, file_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_figma_cache_user_id ON figma_files_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_figma_cache_file_key ON figma_files_cache(file_key);
CREATE INDEX IF NOT EXISTS idx_figma_cache_project ON figma_files_cache(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_figma_cache_expires ON figma_files_cache(cache_expires_at);

-- Slack Channels Cache Table (Optional - for performance)
-- Caches Slack channels to reduce API calls
CREATE TABLE IF NOT EXISTS slack_channels_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) NOT NULL,

  -- Channel metadata
  channel_name VARCHAR(255),
  channel_type VARCHAR(50), -- 'public', 'private', 'dm', 'group_dm'
  is_archived BOOLEAN DEFAULT false,
  channel_data JSONB NOT NULL,

  -- Cache metadata
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes'),

  -- Link to projects (optional)
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  CONSTRAINT unique_user_channel UNIQUE(user_id, channel_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_slack_cache_user_id ON slack_channels_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_cache_channel_id ON slack_channels_cache(channel_id);
CREATE INDEX IF NOT EXISTS idx_slack_cache_project ON slack_channels_cache(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slack_cache_expires ON slack_channels_cache(cache_expires_at);

-- Integration Webhooks Table
-- Tracks incoming webhooks from integrated services
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,

  -- Webhook metadata
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255), -- Provider's event ID (for deduplication)
  payload JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,

  -- Source tracking
  ip_address INET,
  user_agent TEXT,
  signature_valid BOOLEAN, -- Did webhook signature verify?

  -- Audit timestamps
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_webhook_provider CHECK (provider IN ('figma', 'slack', 'github', 'notion'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON integration_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON integration_webhooks(provider);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON integration_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON integration_webhooks(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON integration_webhooks(event_id) WHERE event_id IS NOT NULL;

-- Cleanup Function: Delete expired OAuth state tokens (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM oauth_state_tokens
  WHERE expires_at < CURRENT_TIMESTAMP OR used = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup Function: Delete expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE(figma_deleted INTEGER, slack_deleted INTEGER) AS $$
DECLARE
  figma_count INTEGER;
  slack_count INTEGER;
BEGIN
  -- Cleanup Figma cache
  DELETE FROM figma_files_cache WHERE cache_expires_at < CURRENT_TIMESTAMP;
  GET DIAGNOSTICS figma_count = ROW_COUNT;

  -- Cleanup Slack cache
  DELETE FROM slack_channels_cache WHERE cache_expires_at < CURRENT_TIMESTAMP;
  GET DIAGNOSTICS slack_count = ROW_COUNT;

  RETURN QUERY SELECT figma_count, slack_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON oauth_integration_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE oauth_tokens IS 'Stores encrypted OAuth access tokens and refresh tokens for third-party integrations';
COMMENT ON TABLE oauth_integration_settings IS 'User preferences and settings for each OAuth integration';
COMMENT ON TABLE oauth_state_tokens IS 'Short-lived PKCE state tokens for OAuth authorization flows';
COMMENT ON TABLE figma_files_cache IS 'Caches Figma file metadata to reduce API calls and improve performance';
COMMENT ON TABLE slack_channels_cache IS 'Caches Slack channel data to reduce API calls and improve performance';
COMMENT ON TABLE integration_webhooks IS 'Logs incoming webhooks from integrated services (Figma, Slack, GitHub, etc.)';

COMMENT ON COLUMN oauth_tokens.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN oauth_tokens.refresh_token IS 'Encrypted OAuth refresh token (if available)';
COMMENT ON COLUMN oauth_state_tokens.code_challenge IS 'PKCE code challenge for secure OAuth flow';
COMMENT ON COLUMN oauth_state_tokens.code_verifier IS 'PKCE code verifier (stored temporarily, deleted after use)';
