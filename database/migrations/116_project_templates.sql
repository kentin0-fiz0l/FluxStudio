-- Sprint 37: Smart Templates — project_templates and user_custom_templates tables

CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'custom',
  complexity TEXT NOT NULL DEFAULT 'basic' CHECK (complexity IN ('starter', 'basic', 'advanced', 'enterprise')),
  structure JSONB NOT NULL DEFAULT '{}',
  variables JSONB NOT NULL DEFAULT '[]',
  presets JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT DEFAULT 'FluxStudio Team',
  is_official BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_custom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'custom',
  complexity TEXT NOT NULL DEFAULT 'basic',
  structure JSONB NOT NULL DEFAULT '{}',
  variables JSONB NOT NULL DEFAULT '[]',
  source_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_featured ON project_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_user_custom_templates_user ON user_custom_templates(user_id);
