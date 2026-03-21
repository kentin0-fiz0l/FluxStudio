-- Migration: Add user AI preferences table
-- Stores learned preferences for AI-assisted formation generation

CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}',
  confidence REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source VARCHAR(50) DEFAULT 'inferred' CHECK (source IN ('inferred', 'explicit', 'feedback')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS idx_user_ai_prefs_user ON user_ai_preferences(user_id);

-- Index for preference key lookups (for aggregation/analytics)
CREATE INDEX IF NOT EXISTS idx_user_ai_prefs_key ON user_ai_preferences(preference_key);

-- Common preference keys:
-- 'default_spacing'       -> { "type": "8-to-5", "value": 8 }
-- 'preferred_transitions'  -> { "types": ["ease-in-out", "curved"] }
-- 'ensemble_size'         -> { "typical": 48 }
-- 'field_type'            -> { "type": "ncaa_football" }
-- 'style_preferences'     -> { "compact": false, "curved_paths": true }
-- 'section_layout'        -> { "brass_front": true, "percussion_back": true }

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_ai_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_ai_preferences_updated ON user_ai_preferences;
CREATE TRIGGER trg_user_ai_preferences_updated
  BEFORE UPDATE ON user_ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_preferences_timestamp();
