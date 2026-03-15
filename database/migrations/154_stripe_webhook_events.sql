-- Migration 154: Stripe webhook event deduplication table
-- Prevents processing duplicate webhook events from Stripe retries

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup: index for purging old events (keep 90 days)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at
  ON stripe_webhook_events (created_at);
