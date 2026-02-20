# Sprint 41: Enterprise & Compliance

**Phase 5.4** -- Build the enterprise trust layer: audit logging, GDPR compliance, custom roles, 2FA, and SSO foundation.

## Existing Infrastructure

| Layer | What exists | File |
|-------|-------------|------|
| Security events | `SecurityLogger` class, 20+ event types, DB-backed | `lib/auth/securityLogger.js` |
| Security events table | `security_events` with user_id, event_type, severity, metadata JSONB | `database/migrations/004_create_security_events.sql` |
| Admin auth middleware | JWT + role-based (admin/moderator/analyst), rate limiting, action logging | `middleware/adminAuth.js` |
| Admin UI (audit) | `AuditLogs.tsx` with filters, search, pagination -- uses **mock data** only | `src/pages/admin/AuditLogs.tsx` |
| Admin UI (users) | `Users.tsx` with role badges, bulk actions -- uses **mock data** only | `src/pages/admin/Users.tsx` |
| Auth middleware | `authenticateToken`, `requireUserType`, `requireAdmin` | `lib/auth/middleware.js` |
| Token service | Access (15m) + refresh (7d), device binding, session limits (5 max) | `lib/auth/tokenService.js` |
| User schema | `users` table with `user_type` CHECK constraint (`client`, `designer`, `admin`) | `database/schema.sql` |
| Org members | `organization_members` with role (`owner`, `admin`, `member`) + JSONB permissions | `database/schema.sql` |
| Team/project members | Role-based membership tables with JSONB permissions | `database/schema.sql` |

## What's Missing

1. **Audit logging** only covers security events (login, tokens). No logging for user CRUD, project changes, settings changes, data access, or admin actions beyond auth.
2. **Admin AuditLogs page** uses hardcoded mock data -- not wired to backend.
3. **No GDPR/CCPA tooling** -- no data export, no account deletion, no consent tracking.
4. **Roles are hardcoded** -- `user_type` is a simple string, no custom roles or fine-grained permission templates.
5. **No 2FA** -- no TOTP enrollment, no enforcement, no recovery codes.
6. **No SSO/SAML** -- enterprise customers cannot use their identity provider.

---

## T1: Comprehensive Audit Logging System

Extend the existing `SecurityLogger` pattern to capture all user-visible actions, then wire the admin UI to real data.

### Database: `database/migrations/120_audit_logs.sql`

Create a dedicated `audit_logs` table (separate from `security_events` which is security-focused):

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  actor_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,         -- 'project.create', 'user.update', 'file.delete'
  category VARCHAR(50) NOT NULL,        -- 'auth', 'users', 'projects', 'files', 'settings', 'billing', 'security'
  resource_type VARCHAR(100),           -- 'project', 'user', 'file', 'organization'
  resource_id UUID,
  organization_id UUID,
  details JSONB DEFAULT '{}',           -- action-specific metadata (before/after values)
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

### Backend: `lib/audit/auditLogger.js` (new)

Centralized audit logging service:

- `logAction(actor, action, category, resourceType, resourceId, details, req)` -- main logging method
- Convenience methods: `logCreate()`, `logUpdate()`, `logDelete()`, `logAccess()`
- Extracts IP and user agent from request object
- Non-blocking (fire-and-forget, never blocks the main request flow)

### Backend: `middleware/auditMiddleware.js` (new)

Express middleware that auto-logs route actions:

- Wraps route handlers to capture action completion
- Configurable per-route: `audit('project.create', 'projects')`
- Captures request body for write operations (redacts passwords, tokens)

### Backend: `routes/admin/audit.js` (new)

Admin API for querying audit logs:

- `GET /api/admin/audit-logs` -- paginated, filterable by actor, category, action, date range, resource, search text
- `GET /api/admin/audit-logs/export` -- CSV export of filtered results
- `GET /api/admin/audit-logs/stats` -- aggregated counts by category/action for dashboard
- Protected by `adminAuth` middleware

### Frontend: `src/pages/admin/AuditLogs.tsx` (modify)

Replace mock data with real API calls:

- Use TanStack Query to fetch from `/api/admin/audit-logs`
- Wire search, category filter, and date range to query params
- Implement CSV export button using the export endpoint
- Add loading states, error states, empty states

### Integration points

Add `auditMiddleware` or direct `logAction()` calls to existing routes:
- `routes/auth.js` -- login, signup, password changes
- `routes/projects.js` -- CRUD operations
- `routes/users.js` -- profile updates, role changes
- `routes/teams.js` -- membership changes
- `routes/files.js` -- uploads, deletions, permission changes

### Mount: `server-unified.js`
- `app.use('/api/admin/audit-logs', adminAuth, auditRoutes)`

---

## T2: GDPR/CCPA Compliance Tools

Implement data subject rights: export all personal data, request account deletion, and consent tracking.

### Database: `database/migrations/121_gdpr_compliance.sql`

```sql
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_size BIGINT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE TABLE account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  grace_period_ends TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_consent_user ON consent_records(user_id, consent_type);
```

### Backend: `routes/compliance.js` (new)

User-facing endpoints (authenticated):

- `POST /api/compliance/data-export` -- request personal data export (rate limit: 1/24h)
- `GET /api/compliance/data-export/:id` -- check export status
- `GET /api/compliance/data-export/:id/download` -- download export archive
- `POST /api/compliance/delete-account` -- request account deletion (30-day grace period)
- `POST /api/compliance/cancel-deletion` -- cancel pending deletion
- `GET /api/compliance/consents` -- get current consent settings
- `PUT /api/compliance/consents` -- update consent preferences

### Backend: `lib/compliance/dataExporter.js` (new)

Generates a complete data export package:

- Collects: profile, projects, files metadata, messages, activity logs, settings
- Produces JSON files per data category, bundled in a ZIP
- Stores in temporary location, sets 7-day expiry
- Sends email notification when export is ready

### Backend: `lib/compliance/accountDeletor.js` (new)

Handles account deletion workflow:

- Sends confirmation email with cancel link
- 30-day grace period before hard delete
- Anonymizes data in shared resources (messages, project contributions)
- Revokes all tokens, deletes personal files
- Logs deletion to audit trail

### Frontend: `src/pages/settings/PrivacySettings.tsx` (new)

User-facing privacy settings page:

- "Download My Data" button with status tracking
- "Delete My Account" section with confirmation flow and grace period display
- Consent toggles (marketing emails, analytics tracking, third-party sharing)

### Mount: `server-unified.js`
- `app.use('/api/compliance', authenticateToken, complianceRoutes)`

---

## T3: Custom Roles and Permission Templates

Replace the hardcoded `user_type` system with a flexible RBAC model.

### Database: `database/migrations/122_custom_roles.sql`

```sql
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE permission_catalog (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_dangerous BOOLEAN DEFAULT FALSE
);

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id);
```

### Backend: `lib/rbac/permissionChecker.js` (new)

Permission checking utility:

- `hasPermission(userId, orgId, permission)` -- checks user role permissions
- `hasAnyPermission(userId, orgId, permissions[])` -- OR check
- `getUserPermissions(userId, orgId)` -- returns full permission set
- Redis cache for role lookups (5-minute TTL)

### Backend: `middleware/requirePermission.js` (new)

Express middleware factory:

- `requirePermission('projects.create')` -- checks specific permission
- Extracts `organizationId` from route params, query, or body
- Falls back to `user_type === 'admin'` for backward compatibility

### Backend: `routes/admin/roles.js` (new)

Admin endpoints for role management:

- `GET /api/admin/roles` -- list roles for organization
- `POST /api/admin/roles` -- create custom role
- `PUT /api/admin/roles/:id` -- update role permissions
- `DELETE /api/admin/roles/:id` -- delete custom role (not system roles)
- `GET /api/admin/permissions` -- list all available permissions
- `PUT /api/admin/members/:id/role` -- assign role to member

### Frontend: `src/pages/admin/Roles.tsx` (new)

Role management UI:

- List of roles with permission counts
- Create/edit role modal with permission checkboxes grouped by category
- Visual indicator for system vs custom roles
- Member count per role

### Modify: `src/pages/admin/Users.tsx`

Replace mock role badges with real role data from the custom_roles system.

---

## T4: Two-Factor Authentication (TOTP)

Add TOTP-based 2FA with enrollment flow, enforcement options, and recovery codes.

### Database: `database/migrations/123_two_factor_auth.sql`

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255),
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_codes JSONB;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS require_2fa BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_2fa_roles JSONB DEFAULT '[]';
```

### Dependencies: `npm install otplib qrcode`

### Backend: `lib/auth/totpService.js` (new)

TOTP utility:

- `generateSecret(email)` -- create TOTP secret with issuer "FluxStudio"
- `generateQRCodeURI(secret, email)` -- otpauth:// URI for authenticator apps
- `verifyToken(secret, token)` -- verify 6-digit code (1-step time window)
- `generateRecoveryCodes(count=10)` -- generate and bcrypt-hash recovery codes
- `verifyRecoveryCode(storedCodes, input)` -- check and consume a recovery code

### Backend: `routes/auth-2fa.js` (new)

2FA endpoints:

- `POST /api/auth/2fa/setup` -- generate TOTP secret, return QR code data URI + backup codes
- `POST /api/auth/2fa/verify` -- verify TOTP code to complete enrollment
- `POST /api/auth/2fa/disable` -- disable 2FA (requires current password)
- `POST /api/auth/2fa/validate` -- validate TOTP during login (after password check)
- `POST /api/auth/2fa/recovery` -- use a recovery code

### Modify: `routes/auth.js` login flow

After password verification succeeds:
1. Check if user has `totp_enabled === true`
2. If yes, return `{ requires2FA: true, tempToken }` (5-min JWT) instead of full auth
3. Client shows TOTP input, calls `/api/auth/2fa/validate` with temp token + code
4. On success, return full auth response with access + refresh tokens

### Frontend: `src/components/auth/TwoFactorSetup.tsx` (new)

2FA setup wizard in Settings:
- QR code display for authenticator app scanning
- 6-digit verification step
- Recovery codes display with copy/download
- Disable 2FA with password confirmation

### Frontend: `src/components/auth/TwoFactorPrompt.tsx` (new)

Login 2FA prompt:
- 6-digit code input with auto-submit (using existing `input-otp` package)
- "Use recovery code" fallback link
- Matches existing login page styling

### Mount: `server-unified.js`
- `app.use('/api/auth/2fa', authenticateToken, twoFactorRoutes)`
- 2FA validate endpoint does NOT require auth (uses temp token)

---

## T5: SSO/SAML 2.0 Foundation

Backend infrastructure for SAML 2.0 so enterprise customers can authenticate via their IdP. Full configuration UI deferred to Sprint 42.

### Database: `database/migrations/124_sso_saml.sql`

```sql
CREATE TABLE sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL DEFAULT 'saml2',
  display_name VARCHAR(255),
  entity_id VARCHAR(500) NOT NULL,
  sso_url VARCHAR(500) NOT NULL,
  slo_url VARCHAR(500),
  certificate TEXT NOT NULL,
  metadata_url VARCHAR(500),
  attribute_mapping JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  enforce_sso BOOLEAN DEFAULT FALSE,
  auto_provision BOOLEAN DEFAULT TRUE,
  default_role_id UUID REFERENCES custom_roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE TABLE sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  sso_config_id UUID NOT NULL REFERENCES sso_configurations(id),
  session_index VARCHAR(255),
  name_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Dependencies: `npm install @node-saml/passport-saml`

### Backend: `lib/auth/samlService.js` (new)

SAML utility:

- `generateMetadata(config)` -- generate SP metadata XML
- `createAuthRequest(config)` -- create SAML AuthnRequest
- `validateAssertion(config, samlResponse)` -- validate and parse SAML response
- `extractUserAttributes(assertion, attributeMapping)` -- map IdP attributes

### Backend: `routes/sso.js` (new)

SAML 2.0 endpoints:

- `GET /api/sso/:orgSlug/metadata` -- SP metadata XML for IdP configuration
- `GET /api/sso/:orgSlug/login` -- initiate SAML AuthnRequest (redirect to IdP)
- `POST /api/sso/:orgSlug/callback` -- SAML assertion consumer service (ACS)
- `GET /api/sso/:orgSlug/logout` -- initiate SAML SLO (optional)

### Backend: `routes/admin/sso.js` (new)

Admin endpoints for SSO configuration:

- `GET /api/admin/sso` -- get current SSO config for org
- `POST /api/admin/sso` -- create/update SSO configuration
- `POST /api/admin/sso/test` -- test configuration with dry-run
- `DELETE /api/admin/sso` -- disable SSO

### Frontend: `src/pages/admin/SSOSettings.tsx` (new, minimal)

Basic SSO configuration page:
- Form for IdP metadata URL or manual SSO URL + certificate entry
- "Test Configuration" button
- Toggles for enforce SSO and auto-provision
- Display SP metadata URL and ACS URL for admin to copy to their IdP

### Modify: `src/pages/Login.tsx`

- Add "Sign in with SSO" button
- Prompt for organization slug or email domain
- Redirect to `/api/sso/:orgSlug/login`

---

## Sprint Scope Notes

- **T1 and T2 are highest priority** -- audit logging and GDPR compliance are non-negotiable for production.
- **T3 (roles) is foundational** for T5 (SSO auto-provisioning needs default_role_id FK).
- **T4 (2FA) is independent** and can be worked in parallel with anything.
- **T5 (SSO) is foundation only** -- full IdP configuration UI and OIDC deferred to Sprint 42.

## Dependencies

```
T1 (Audit Logging) -- no dependencies, start first
T2 (GDPR/CCPA)    -- no dependencies, parallel with T1
T3 (Custom Roles)  -- no dependencies, parallel
T4 (2FA/TOTP)      -- no dependencies, parallel
T5 (SSO/SAML)      -- depends on T3 (custom_roles for default_role_id FK)
```

## Definition of Done

- [ ] All new tables have migrations with proper indexes
- [ ] API endpoints have input validation and error handling
- [ ] Admin endpoints protected by `adminAuth` middleware
- [ ] User-facing endpoints protected by `authenticateToken`
- [ ] Frontend pages use TanStack Query for data fetching
- [ ] Audit logging integrated into all new and existing key routes
- [ ] All user-visible actions logged to audit trail
- [ ] `npm run typecheck` passes with zero new errors
- [ ] `npx vitest run` -- all existing tests pass
