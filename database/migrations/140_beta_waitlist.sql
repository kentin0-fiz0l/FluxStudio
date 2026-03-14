-- Sprint 92: Beta waitlist for public beta launch
-- Tracks waitlist signups and connects them to invite codes

CREATE TABLE IF NOT EXISTS beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  role VARCHAR(50),
  organization VARCHAR(200),
  status VARCHAR(20) DEFAULT 'waiting',
  invite_code_id UUID REFERENCES beta_invite_codes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_beta_waitlist_email ON beta_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_status ON beta_waitlist(status);
