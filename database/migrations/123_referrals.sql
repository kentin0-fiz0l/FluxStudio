-- Sprint 44: Referral & Invite System
-- Tracks referral codes, signups via referral, and referral stats.

-- Referral codes per user
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  max_uses INT DEFAULT NULL,  -- NULL = unlimited
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes (code);

-- Track signups that came through a referral
CREATE TABLE IF NOT EXISTS referral_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,  -- TRUE when referred user creates first project
  converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referral_signups_referrer ON referral_signups (referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_signups_referred ON referral_signups (referred_user_id);
