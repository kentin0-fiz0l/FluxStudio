-- Sprint 56: Beta invite code gate for soft launch
-- Requires invite codes for signup when beta_invite_required feature flag is enabled

CREATE TABLE IF NOT EXISTS beta_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_code ON beta_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_active
  ON beta_invite_codes(code) WHERE uses_count < max_uses;
