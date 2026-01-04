-- ============================================
-- FluxStudio Database Schema for Supabase
-- ============================================
-- Run this SQL in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Note: Supabase Auth handles the core auth.users table
-- This extends it with additional profile data

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================

CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Members can view their organizations
CREATE POLICY "Members can view organization"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Members can view other members
CREATE POLICY "Members can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- PROJECTS TABLE
-- ============================================

CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  status project_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Organization members can view projects
CREATE POLICY "Organization members can view projects"
  ON public.projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Organization admins/owners can create projects
CREATE POLICY "Admins can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- ASSETS TABLE
-- ============================================

CREATE TYPE asset_type AS ENUM ('image', 'video', 'audio', '3d', 'document');

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type asset_type NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  thumbnail_url TEXT,
  duration FLOAT, -- For video/audio in seconds
  dimensions JSONB, -- { width: number, height: number }
  metadata JSONB,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  parent_asset_id UUID REFERENCES public.assets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Project members can view assets
CREATE POLICY "Project members can view assets"
  ON public.assets FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Project members can upload assets
CREATE POLICY "Project members can upload assets"
  ON public.assets FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================
-- COMMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id),
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  position JSONB, -- { x: number, y: number } for images
  timestamp FLOAT, -- For video/audio timestamps in seconds
  frame INTEGER, -- For video frame numbers
  camera_position JSONB, -- For 3D models
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Asset viewers can see comments
CREATE POLICY "Asset viewers can see comments"
  ON public.comments FOR SELECT
  USING (
    asset_id IN (
      SELECT a.id FROM public.assets a
      JOIN public.projects p ON a.project_id = p.id
      JOIN public.organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Project members can add comments
CREATE POLICY "Project members can add comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    asset_id IN (
      SELECT a.id FROM public.assets a
      JOIN public.projects p ON a.project_id = p.id
      JOIN public.organization_members om ON p.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- Comment authors can update their comments
CREATE POLICY "Authors can update comments"
  ON public.comments FOR UPDATE
  USING (author_id = auth.uid());

-- ============================================
-- REVIEW SESSIONS TABLE
-- ============================================

CREATE TYPE review_status AS ENUM ('pending', 'in_progress', 'completed');

CREATE TABLE IF NOT EXISTS public.review_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  status review_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these in the Supabase Dashboard SQL Editor

-- Create assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assets bucket
CREATE POLICY "Authenticated users can upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assets' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assets');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_sessions_updated_at
  BEFORE UPDATE ON public.review_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_assets_project ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(file_type);
CREATE INDEX IF NOT EXISTS idx_comments_asset ON public.comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON public.comments(is_resolved);
