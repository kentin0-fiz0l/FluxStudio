-- Migration 156: User AI Preferences (4D - User Preference Learning)
-- Stores inferred and explicit AI preferences per user for personalized formation suggestions.

CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL,
  confidence REAL DEFAULT 0.5,
  source VARCHAR(50) DEFAULT 'inferred',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_prefs_user ON user_ai_preferences(user_id);
