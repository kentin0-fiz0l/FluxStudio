# Sprint 41: Enterprise & Compliance

**Phase 5.4** — Audit logging, GDPR data tools, 2FA, enhanced RBAC, and session security.

> SSO/SAML is deferred to Sprint 42 — requires external IdP test infrastructure.

## Existing Infrastructure

| Layer | What exists | File |
|-------|-------------|------|
| Security events | `securityLogger` writes LOGIN, OAUTH, TOKEN, RATE_LIMIT events | `lib/auth/securityLogger.js` |
| Security events table | `security_events` with type, severity, user_id, ip, metadata | `database/migrations/004_create_security_events.sql` |
| Security admin API | List, detail, stats, export, timeline for security events | `lib/api/admin/security.js` |
| Audit Logs UI | Full admin page with filters, pagination, CSV/PDF export — **uses mock data** | `src/pages/admin/AuditLogs.tsx` |
| Role middleware | `requireUserType(['admin'])`, `requireAdmin` | `lib/auth/middleware.js` |
| Admin auth | 3-level role hierarchy (admin/moderator/analyst) + endpoint perms | `middleware/adminAuth.js` |
| JSONB permissions | `organization_members.permissions`, `team_members.permissions` columns | Existing schema |
| OTP UI library | `input-otp` v1.4.2 installed but unused | `package.json` |
| JWT tokens | Access + refresh token system with device fingerprinting | `lib/auth/tokenService.js` |

## What's Missing

1. General audit log for all user actions (only security events exist today)
2. AuditLogs.tsx page reads mock data — not wired to backend
3. No GDPR data export or account deletion endpoints
4. No 2FA/TOTP backend (secret generation, verification, backup codes)
5. No custom role definitions or permissions API (only hardcoded roles)
6. No session security policies (timeout, concurrent sessions, forced re-auth)

---

## T1: Comprehensive Audit Log

Wire the existing AuditLogs admin UI to a real backend, and add audit logging middleware.

### Database: `database/migrations/119_audit_logs.sql`
- Create `audit_logs` table:
  ```
  id UUID PK, user_id UUID, action TEXT, resource_type TEXT,
  resource_id TEXT, details JSONB, ip_address TEXT,
  user_agent TEXT, created_at TIMESTAMPTZ
  ```
- Index on `(resource_type, created_at)` and `(user_id, created_at)`

### Backend: `lib/auditLog.js` (new)
- `logAction(userId, action, resourceType, resourceId, details, req)` — helper
- Actions: `create`, `update`, `delete`, `invite`, `remove`, `login`, `logout`, `settings_change`
- Resource types: `project`, `organization`, `team`, `user`, `file`, `plugin`, `template`

### Backend: `routes/admin-audit.js` (new)
- `GET /api/admin/audit` — List audit logs with filters:
  - `?category=` (auth, projects, settings, users, security)
  - `?action=`, `?userId=`, `?from=`, `?to=`, `?search=`
  - Pagination: `?page=`, `?limit=`
- `GET /api/admin/audit/export` — CSV export
- Auth: admin only

### Integration: Sprinkle `logAction()` into existing routes
- `routes/projects.js` — create, update, delete project
- `routes/auth.js` — login, logout
- `routes/files.js` — upload, delete
- `routes/plugins.js` — install, uninstall, activate

### Frontend: `src/pages/admin/AuditLogs.tsx`
- Replace mock data fetch with real API call to `/api/admin/audit`
- Wire filter state to query params
- Wire CSV export button to `/api/admin/audit/export`

### Mount: `server-unified.js`
- `app.use('/api/admin/audit', adminAuditRoutes)`

---

## T2: GDPR Compliance Tools

Data export and account deletion endpoints.

### Database: `database/migrations/119_audit_logs.sql` (extend)
- Create `deletion_requests` table:
  ```
  id UUID PK, user_id UUID UNIQUE, reason TEXT,
  status TEXT DEFAULT 'pending', scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
  ```

### Backend: `routes/account.js` (new)
- `POST /api/account/export-data` — Aggregate all user data into JSON:
  - Profile, projects (owned), files, messages, activities, analytics events, settings
  - Stream as downloadable JSON file
  - Rate limit: 1 request per 24 hours
  - Log action to audit log

- `POST /api/account/request-deletion` — Schedule account deletion:
  - Accept `{ reason }` body
  - Insert into `deletion_requests` with `scheduled_at = NOW() + 30 days`
  - Send confirmation email
  - Log action to audit log
  - Return scheduled deletion date

- `DELETE /api/account/cancel-deletion` — Cancel pending deletion request
- `GET /api/account/deletion-status` — Check if deletion is scheduled

### Frontend: `src/pages/Settings.tsx` (extend)
- Add "Data & Privacy" section:
  - "Export My Data" button → POST to `/api/account/export-data`
  - "Delete Account" button → confirmation dialog → POST to `/api/account/request-deletion`
  - Show pending deletion banner if scheduled

### Mount: `server-unified.js`
- `app.use('/api/account', accountRoutes)`

---

## T3: Two-Factor Authentication (TOTP)

### Dependencies
- `otplib` — TOTP generation and verification
- `qrcode` — QR code generation for authenticator apps

### Database: `database/migrations/119_audit_logs.sql` (extend)
- Add columns to `users` table:
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];
  ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;
  ```

### Backend: `routes/two-factor.js` (new)
- `POST /api/auth/2fa/setup` — Generate TOTP secret + QR code data URI
  - Returns `{ secret, qrCodeUrl, backupCodes }` (10 backup codes)
  - Does NOT enable 2FA yet — user must verify first
- `POST /api/auth/2fa/verify-setup` — Verify TOTP code and enable 2FA
  - Accept `{ code }`, verify against secret
  - If valid: set `totp_enabled = true`, store hashed backup codes
  - Return `{ enabled: true, backupCodes }` (show once)
- `POST /api/auth/2fa/disable` — Disable 2FA
  - Require current password confirmation
  - Set `totp_enabled = false`, clear secret and backup codes
- `POST /api/auth/2fa/verify` — Verify TOTP during login
  - Accept `{ tempToken, code }` where tempToken is issued after password check
  - If valid: issue full access + refresh tokens
  - Accept backup code as fallback

### Backend: `routes/auth.js` (modify login flow)
- After successful password check, if `totp_enabled`:
  - Don't issue tokens yet
  - Return `{ requires2FA: true, tempToken }` (short-lived JWT, 5 min)
  - Frontend redirects to 2FA verification step

### Frontend: `src/components/settings/TwoFactorSetup.tsx` (new)
- Setup flow: "Enable 2FA" → shows QR code → verify code → show backup codes
- Disable flow: confirm with password → disable
- Integration with Settings page security section

### Frontend: `src/pages/Login.tsx` (modify)
- Handle `requires2FA` response → show OTP input (using `input-otp`)
- Submit code to `/api/auth/2fa/verify`

### Mount: `server-unified.js`
- `app.use('/api/auth/2fa', twoFactorRoutes)`

---

## T4: Enhanced Role-Based Access Control

### Database: `database/migrations/119_audit_logs.sql` (extend)
- Create `custom_roles` table:
  ```
  id UUID PK, organization_id UUID, name TEXT, slug TEXT,
  permissions JSONB DEFAULT '[]', is_default BOOLEAN DEFAULT false,
  created_by UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
  UNIQUE(organization_id, slug)
  ```
- Seed default roles: `owner`, `admin`, `editor`, `viewer`

### Backend: `routes/roles.js` (new)
- `GET /api/organizations/:orgId/roles` — List roles for org
- `POST /api/organizations/:orgId/roles` — Create custom role (admin only)
  - Accept `{ name, permissions: ['projects.create', 'projects.delete', ...] }`
- `PUT /api/organizations/:orgId/roles/:roleId` — Update role permissions
- `DELETE /api/organizations/:orgId/roles/:roleId` — Delete custom role (not defaults)
- `PUT /api/organizations/:orgId/members/:userId/role` — Assign role to member

### Backend: `lib/auth/permissions.js` (new)
- Define permission catalog:
  ```js
  const PERMISSIONS = {
    'projects.create': 'Create projects',
    'projects.delete': 'Delete projects',
    'projects.manage': 'Manage project settings',
    'files.upload': 'Upload files',
    'files.delete': 'Delete files',
    'members.invite': 'Invite members',
    'members.remove': 'Remove members',
    'billing.manage': 'Manage billing',
    'settings.manage': 'Manage org settings',
    'admin.access': 'Access admin panel',
  };
  ```
- `hasPermission(user, orgId, permission)` — Check user's role permissions
- `requirePermission(permission)` — Express middleware factory

### Frontend: `src/pages/OrganizationNew.tsx` (extend)
- Add "Roles & Permissions" tab in org settings
- Role list with permission checkboxes
- Create/edit custom role dialog

### Mount: `server-unified.js`
- `app.use('/api/organizations', rolesRoutes)` (nested under org routes)

---

## T5: Session Security Policies

### Database: `database/migrations/119_audit_logs.sql` (extend)
- Create `active_sessions` table:
  ```
  id UUID PK, user_id UUID, token_id TEXT UNIQUE,
  device_info JSONB, ip_address TEXT,
  last_active_at TIMESTAMPTZ, created_at TIMESTAMPTZ
  ```
- Add org-level setting: `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS session_policy JSONB DEFAULT '{}'`
  - Shape: `{ maxConcurrentSessions: 5, sessionTimeoutMinutes: 480, require2FA: false }`

### Backend: `routes/sessions.js` (new)
- `GET /api/auth/sessions` — List active sessions for current user
  - Returns device info, IP, last active, current session flag
- `DELETE /api/auth/sessions/:sessionId` — Revoke a specific session
- `DELETE /api/auth/sessions` — Revoke all sessions except current ("sign out everywhere")

### Backend: `lib/auth/sessionManager.js` (new)
- Track sessions on token creation (insert into `active_sessions`)
- Clean up on logout/token refresh
- Enforce `maxConcurrentSessions` — reject new login if limit reached (oldest session gets revoked)
- Enforce `sessionTimeoutMinutes` — middleware checks `last_active_at`

### Frontend: `src/pages/Settings.tsx` (extend)
- Add "Active Sessions" section in security settings
- List sessions with "Revoke" button per session
- "Sign out everywhere" button

### Mount: `server-unified.js`
- `app.use('/api/auth/sessions', sessionRoutes)`

---

## Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/119_audit_logs.sql` | audit_logs, deletion_requests, custom_roles, active_sessions, user 2FA columns |
| `lib/auditLog.js` | Audit logging helper |
| `lib/auth/permissions.js` | Permission catalog + middleware |
| `lib/auth/sessionManager.js` | Session tracking + policy enforcement |
| `routes/admin-audit.js` | Audit log admin endpoints |
| `routes/account.js` | GDPR data export + deletion |
| `routes/two-factor.js` | 2FA setup, verify, disable |
| `routes/roles.js` | Custom role CRUD |
| `routes/sessions.js` | Active session management |
| `src/components/settings/TwoFactorSetup.tsx` | 2FA setup UI |

## Files to Modify

| File | Changes |
|------|---------|
| `server-unified.js` | Mount new routes |
| `routes/auth.js` | 2FA check in login flow |
| `routes/projects.js` | Audit logging on CRUD |
| `routes/files.js` | Audit logging on upload/delete |
| `routes/plugins.js` | Audit logging on install/uninstall |
| `src/pages/admin/AuditLogs.tsx` | Wire to real API, remove mock data |
| `src/pages/Settings.tsx` | Add Data & Privacy section, Active Sessions, 2FA toggle |
| `src/pages/Login.tsx` | Handle 2FA step in login flow |
| `package.json` | Add otplib, qrcode dependencies |

## Verification

1. `npm run dev` + `npm run dev:unified` — Start both servers
2. Create/update/delete a project → verify audit log entry appears in admin panel
3. Visit `/admin/audit` as admin → verify filtering, pagination, CSV export
4. POST to `/api/account/export-data` → verify JSON download contains all user data
5. POST to `/api/account/request-deletion` → verify deletion_requests entry + email
6. Enable 2FA in Settings → scan QR → verify code → confirm enabled
7. Log out and log in → verify 2FA prompt appears, verify code works
8. Visit Settings → Active Sessions → verify list, revoke works
9. `npm run typecheck` — Zero new errors
10. `npx vitest run` — All existing tests pass
