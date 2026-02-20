-- Sprint 40: Observability & Analytics
-- T1: Analytics event storage
-- T2: Web Vitals RUM storage

-- Analytics events (batched from frontend)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name_created ON analytics_events (event_name, created_at);
CREATE INDEX idx_analytics_events_user_created ON analytics_events (user_id, created_at);
CREATE INDEX idx_analytics_events_session ON analytics_events (session_id);

-- Web Vitals real-user monitoring
CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  url TEXT,
  lcp REAL,
  fcp REAL,
  fid REAL,
  cls REAL,
  ttfb REAL,
  tti REAL,
  connection_type TEXT,
  user_agent TEXT,
  viewport_width INT,
  viewport_height INT,
  performance_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_web_vitals_created ON web_vitals (created_at);

-- Auto-purge old data (keep 90 days)
-- Run via cron: DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
-- Run via cron: DELETE FROM web_vitals WHERE created_at < NOW() - INTERVAL '90 days';
