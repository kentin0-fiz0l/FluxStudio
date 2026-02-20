-- Sprint 41: Enterprise & Compliance
-- T1: Audit logs, T2: GDPR deletion requests, T3: 2FA columns, T4: Custom roles, T5: Active sessions

-- ==================== T1: Audit Logs ====================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs (action, created_at);

-- ==================== T2: GDPR Deletion Requests ====================

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== T3: 2FA Columns ====================

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

-- ==================== T4: Custom Roles ====================

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Seed default roles (org_id NULL = global defaults)
INSERT INTO custom_roles (organization_id, name, slug, permissions, is_default) VALUES
  (NULL, 'Owner', 'owner', '["*"]', true),
  (NULL, 'Admin', 'admin', '["projects.create","projects.delete","projects.manage","files.upload","files.delete","members.invite","members.remove","settings.manage","admin.access"]', true),
  (NULL, 'Editor', 'editor', '["projects.create","projects.manage","files.upload","files.delete","members.invite"]', true),
  (NULL, 'Viewer', 'viewer', '["projects.view","files.view"]', true)
ON CONFLICT DO NOTHING;

-- ==================== T5: Active Sessions ====================

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_id TEXT UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_active_sessions_user ON active_sessions (user_id);
CREATE INDEX idx_active_sessions_token ON active_sessions (token_id);

-- Session policy per organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS session_policy JSONB DEFAULT '{}';
-- Shape: { "maxConcurrentSessions": 5, "sessionTimeoutMinutes": 480, "require2FA": false }
