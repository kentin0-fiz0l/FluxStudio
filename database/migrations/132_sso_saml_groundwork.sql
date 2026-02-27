-- Migration 132: SSO/SAML 2.0 Groundwork (Sprint 61)
-- Creates tables for Enterprise SSO: SAML configurations, verified domains, and audit events.

-- 1. saml_configurations: one per organization
CREATE TABLE IF NOT EXISTS saml_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- SP config
  sp_entity_id TEXT NOT NULL,
  sp_acs_url TEXT NOT NULL,
  -- IdP config
  idp_entity_id TEXT,
  idp_sso_url TEXT,
  idp_slo_url TEXT,
  idp_certificate TEXT,
  idp_metadata_url TEXT,
  -- Options
  sign_requests BOOLEAN DEFAULT true,
  want_assertions_signed BOOLEAN DEFAULT true,
  signature_algorithm TEXT DEFAULT 'sha256',
  -- Attribute mapping (SAML claim URIs → user fields)
  attribute_mapping JSONB DEFAULT '{"email":"urn:oid:0.9.2342.19200300.100.1.3","firstName":"urn:oid:2.5.4.42","lastName":"urn:oid:2.5.4.4"}',
  -- Provisioning
  auto_provision BOOLEAN DEFAULT true,
  default_role VARCHAR(50) DEFAULT 'member',
  -- Status
  is_active BOOLEAN DEFAULT false,
  is_test_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 2. verified_domains: email-based SSO routing
CREATE TABLE IF NOT EXISTS verified_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  verification_token VARCHAR(255) NOT NULL,
  verification_method VARCHAR(20) DEFAULT 'dns',
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain)
);

-- 3. sso_login_events: audit trail
CREATE TABLE IF NOT EXISTS sso_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  saml_name_id TEXT,
  saml_session_index TEXT,
  ip_address INET,
  user_agent TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saml_config_org ON saml_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_verified_domains_domain ON verified_domains(domain);
CREATE INDEX IF NOT EXISTS idx_verified_domains_org ON verified_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_sso_events_org ON sso_login_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_sso_events_user ON sso_login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_events_created ON sso_login_events(created_at);
