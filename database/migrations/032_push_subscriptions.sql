-- Push Notification Subscriptions Schema
-- Stores user push notification subscriptions for web push

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id TEXT PRIMARY KEY,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  push_messages BOOLEAN NOT NULL DEFAULT true,
  push_project_updates BOOLEAN NOT NULL DEFAULT true,
  push_mentions BOOLEAN NOT NULL DEFAULT true,
  push_comments BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME NULL,  -- e.g., '22:00'
  quiet_hours_end TIME NULL,    -- e.g., '08:00'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_notification_preferences_updated_at'
  ) THEN
    CREATE TRIGGER update_user_notification_preferences_updated_at
      BEFORE UPDATE ON user_notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
