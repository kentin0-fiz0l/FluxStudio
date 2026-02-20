-- Sprint 36: User plugins table for plugin installation state
-- Stores per-user plugin installations, settings, and state.

CREATE TABLE IF NOT EXISTS user_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plugin_id TEXT NOT NULL,
  manifest JSONB NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'inactive'
    CHECK (state IN ('inactive', 'active', 'error', 'disabled')),
  settings JSONB NOT NULL DEFAULT '{}',
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT uq_user_plugin UNIQUE (user_id, plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_user_plugins_user ON user_plugins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plugins_state ON user_plugins(user_id, state);
