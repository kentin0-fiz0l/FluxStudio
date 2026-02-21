-- Sprint 45: T1 — Web Vitals RUM Pipeline
-- Stores real-user monitoring data from PerformanceMonitoringService

CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  url VARCHAR(2048),
  lcp DOUBLE PRECISION,        -- Largest Contentful Paint (ms)
  fcp DOUBLE PRECISION,        -- First Contentful Paint (ms)
  fid DOUBLE PRECISION,        -- First Input Delay (ms)
  cls DOUBLE PRECISION,        -- Cumulative Layout Shift (unitless)
  ttfb DOUBLE PRECISION,       -- Time to First Byte (ms)
  tti DOUBLE PRECISION,        -- Time to Interactive (ms)
  connection_type VARCHAR(50),
  user_agent VARCHAR(512),
  viewport_width INTEGER,
  viewport_height INTEGER,
  performance_score DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for time-range queries on admin dashboard
CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON web_vitals (created_at DESC);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_web_vitals_session ON web_vitals (session_id);
