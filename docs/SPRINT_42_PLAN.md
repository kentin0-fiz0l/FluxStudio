# Sprint 42: Deployment Confidence

**Phase 5.5** -- Feature flags, post-deploy smoke tests, visual regression, coverage push, and incident response runbook.

## Existing Infrastructure

| Layer | What exists | File |
|-------|-------------|------|
| CI/CD pipeline | Lint, test (sharded 2x), build, E2E (7 configs), Lighthouse, security audit | `.github/workflows/ci.yml` |
| Deployment | DigitalOcean App Platform, PR previews, auto-cleanup | `.github/workflows/deploy.yml`, `deploy-preview.yml` |
| Health checks | `/health`, `/health/live`, `/health/ready` with DB/Redis/WS checks | `routes/health.js`, `health-check.js` |
| Error tracking | Sentry with 50% traces, profiling, breadcrumbs | `lib/monitoring/sentry.js` |
| Test coverage | Vitest (50% lines), Jest integration, Playwright E2E (7 browsers) | `vitest.config.ts`, `jest.config.js`, `playwright.config.ts` |
| Bundle checks | Per-chunk 500KB + total 800KB budget in CI | `.github/workflows/ci.yml` |
| Lighthouse CI | LCP/CLS/TBT thresholds, a11y 0.9+ | `.lighthouserc.js` |
| Env-based toggles | `FLUXPRINT_ENABLED`, `ENABLE_REGISTRATION` in `.do/app.yaml` | Static deploy-time only |

## What's Missing

1. **Feature flags** -- No runtime flag system. Can't gate features without redeployment.
2. **Smoke tests** -- E2E tests exist but don't run post-deployment. No critical-path API validation after deploy.
3. **Visual regression** -- No screenshot comparison. UI regressions go undetected.
4. **Coverage gaps** -- Thresholds at 50% lines. Roadmap target is 75%+.
5. **Incident runbook** -- No documented response procedures.

---

## Tasks

### T1: Feature Flag System (Custom, Lightweight)

Build a simple feature flag system backed by PostgreSQL. No external dependency (LaunchDarkly/Unleash) -- FluxStudio's scale doesn't warrant the cost or complexity yet.

**Files to create:**

| File | Purpose |
|------|---------|
| `database/migrations/120_feature_flags.sql` | `feature_flags` table with name, enabled, rollout_percentage, user_allowlist, metadata |
| `lib/featureFlags.js` | Server-side flag evaluation with caching (60s TTL) |
| `routes/admin-flags.js` | Admin CRUD: list, create, toggle, update rollout %, delete |
| `src/hooks/useFeatureFlag.ts` | React hook: `useFeatureFlag('flag-name')` returns boolean |
| `src/services/featureFlagService.ts` | Client-side: fetches flags from API, caches in memory |

**Migration schema:**
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,           -- e.g. 'metmap-ai-copilot'
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INT DEFAULT 100,  -- 0-100, evaluated per user
  user_allowlist UUID[] DEFAULT '{}',  -- always-on for these users
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Server-side evaluation logic:**
1. If flag doesn't exist or `enabled = false` → return false
2. If user ID is in `user_allowlist` → return true
3. If `rollout_percentage = 100` → return true
4. Hash `userId + flagName` to deterministic 0-99 → return `hash < rollout_percentage`

**React hook API:**
```tsx
const isEnabled = useFeatureFlag('new-dashboard');
if (isEnabled) return <NewDashboard />;
return <OldDashboard />;
```

### T2: Post-Deployment Smoke Tests

Add a dedicated smoke test suite that runs after deployment to verify critical API endpoints and page loads.

**Files to create:**

| File | Purpose |
|------|---------|
| `tests/smoke/api-health.test.ts` | Verify /health, /health/ready, /api/auth/me (with test token) |
| `tests/smoke/critical-pages.test.ts` | Playwright: load login, dashboard, projects, settings — check no 500s |
| `tests/smoke/run-smoke.sh` | Shell script: run both suites against a target URL |

**CI integration:** Add `smoke-test` job to `deploy.yml` that runs after successful deployment, targeting the live URL.

### T3: Visual Regression Testing

Add Playwright screenshot comparison to catch unintended UI changes.

**Files to create:**

| File | Purpose |
|------|---------|
| `tests/visual/pages.spec.ts` | Screenshot tests for login, dashboard, project detail, settings |
| `tests/visual/components.spec.ts` | Screenshot tests for key components (sidebar, header, cards) |
| `playwright-visual.config.ts` | Separate Playwright config for visual tests (single browser, consistent viewport) |

**Approach:**
- Use Playwright's built-in `toHaveScreenshot()` with `maxDiffPixelRatio: 0.01`
- Baseline screenshots committed to `tests/visual/__snapshots__/`
- CI job compares against baselines, fails on drift
- `npm run test:visual` script to update baselines locally

### T4: Test Coverage Push

Add targeted tests to push coverage from ~50% to 75%+ across critical paths.

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `src/services/__tests__/featureFlagService.test.ts` | Tests for new feature flag client |
| `tests/integration/audit-logs.test.js` | Integration tests for Sprint 41 audit log API |
| `tests/integration/two-factor.test.js` | Integration tests for 2FA setup/verify/disable flow |
| `tests/integration/sessions.test.js` | Integration tests for session management API |
| `tests/integration/feature-flags.test.js` | Integration tests for feature flag CRUD |
| `vitest.config.ts` | Raise thresholds: lines 75%, branches 65%, functions 70% |

### T5: Incident Response Runbook

**Files to create:**

| File | Purpose |
|------|---------|
| `docs/INCIDENT_RESPONSE.md` | Step-by-step runbook: severity levels, escalation, rollback procedures, post-mortem template |

**Sections:**
1. Severity classification (P1-P4)
2. On-call responsibilities
3. Rollback procedures (DigitalOcean App Platform, database migrations)
4. Communication templates
5. Post-mortem template

---

## Verification

```bash
# 1. Feature flags
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/flags
# Should return empty array initially

# 2. Smoke tests
./tests/smoke/run-smoke.sh http://localhost:3001
# Should pass all health + page load checks

# 3. Visual regression
npx playwright test --config=playwright-visual.config.ts
# Should generate baseline screenshots on first run

# 4. Test coverage
npm run test:coverage
# Should report 75%+ lines

# 5. Runbook
cat docs/INCIDENT_RESPONSE.md
# Should contain rollback procedures
```

## Implementation Order

1. T1 (Feature Flags) — foundation for all future safe rollouts
2. T5 (Incident Runbook) — quick doc win
3. T4 (Test Coverage) — tests for T1 + Sprint 41 backfill
4. T2 (Smoke Tests) — CI integration
5. T3 (Visual Regression) — screenshot baselines
