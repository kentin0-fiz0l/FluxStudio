-- Sprint 38: SaaS subscription plans and usage tracking

-- Add plan_id to users (default free)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan_id') THEN
    ALTER TABLE users ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'free';
  END IF;
END $$;

-- Usage tracking per billing period
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  projects_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  ai_calls_count INTEGER DEFAULT 0,
  collaborators_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_period ON user_usage(user_id, period_start DESC);
