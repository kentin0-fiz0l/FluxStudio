-- Sprint 45: T5 — Trial Eligibility Tracking
-- Prevents users from claiming multiple free trials.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMPTZ;

-- Index for quick trial eligibility lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_used
  ON subscriptions (user_id) WHERE trial_used_at IS NOT NULL;
