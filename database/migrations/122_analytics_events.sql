-- Sprint 44: Funnel Analytics — analytics_events table
-- Tracks user journey events: signup, verification, first project, first collab, retention

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name VARCHAR(100) NOT NULL,
  properties JSONB DEFAULT '{}',
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for funnel queries (event_name + created_at)
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time
  ON analytics_events (event_name, created_at DESC);

-- Index for per-user event lookup
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id, event_name, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Index for time-range scans
CREATE INDEX IF NOT EXISTS idx_analytics_events_created
  ON analytics_events (created_at DESC);
