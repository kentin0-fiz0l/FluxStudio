-- Phase 4: 14-day Pro trial support
-- Adds trial_ends_at column to users for server-managed trials
-- Also adds email_preferences for weekly digest unsubscribe (P14)

-- Trial support: nullable timestamp indicating when the trial expires
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL;

-- Email preferences: jsonb for granular email opt-out settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"weekly_digest": true, "product_updates": true, "trial_reminders": true}'::jsonb;

-- Index for efficient trial expiry queries (scheduled jobs, login checks)
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at ON users (trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Insert open_registration feature flag (default enabled for Phase 4 launch)
INSERT INTO feature_flags (name, description, enabled, rollout_percentage, metadata)
VALUES (
  'open_registration',
  'When enabled, skip beta invite code requirement for signup',
  true,
  100,
  '{"phase": 4}'::jsonb
)
ON CONFLICT (name) DO UPDATE SET enabled = true, rollout_percentage = 100;
