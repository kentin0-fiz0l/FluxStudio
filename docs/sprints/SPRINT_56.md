# Sprint 56: Ship to First Users

**Goal:** Deploy FluxStudio to production, onboard 5-10 beta users, and close the feedback loop.

**Duration:** 1 week
**Branch:** `sprint-56/ship-to-users`

---

## Context

FluxStudio has 55 pages, 41 API routes, 129 database migrations, and 0 users. Phases 1-4 of the roadmap are complete. Sprint 55 hardened test coverage and produced a 55-item launch checklist (54/55 confirmed). The single remaining gap is Sentry source map upload verification.

The platform is deployed on DigitalOcean App Platform with CI/CD via GitHub Actions. The domain `fluxstudio.art` is configured with SSL. What's missing is final production configuration, a few hardcoded localhost references, and the confidence that comes from real user traffic.

---

## Tickets

### S56-1: Fix production blockers
**Priority:** P0 | **Estimate:** 2-3 hours

Remove hardcoded localhost references and fix configuration issues that would break in production.

**Tasks:**
- [ ] Fix `src/components/printing/PrintingDashboard.tsx` — replace `http://localhost:5001` with environment-based URL or disable FluxPrint link when no local service is detected
- [ ] Audit `src/config/environment.ts` — confirm all production URLs resolve correctly (`wss://fluxstudio.art`, `/api`, etc.)
- [ ] Verify Vite build output dir (`build/`) matches `.do/app.yaml` static site config (confirmed: both use `build`)
- [ ] Ensure `database/run-migrations.js` (used by DO pre-deploy job) works with the migration-system entry point

**Acceptance:** `npm run build` succeeds with zero localhost references in the production bundle (grep `dist/` or `build/` for `localhost`).

---

### S56-2: Configure production secrets
**Priority:** P0 | **Estimate:** 1-2 hours

Set all required environment variables in DigitalOcean App Platform dashboard.

**Secrets to configure:**
| Secret | Source | Notes |
|--------|--------|-------|
| `JWT_SECRET` | Generate (64-char random) | Auth token signing |
| `SESSION_SECRET` | Generate (64-char random) | Express session |
| `OAUTH_ENCRYPTION_KEY` | Generate (32-byte hex) | OAuth token encryption |
| `DATABASE_URL` | DO managed PostgreSQL | Auto-provisioned |
| `REDIS_URL` | DO managed Redis/Valkey | Auto-provisioned |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | OAuth login |
| `ANTHROPIC_API_KEY` | Anthropic dashboard | AI co-pilot |
| `STRIPE_SECRET_KEY` | Stripe dashboard (test mode first) | Payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Webhook verification |
| `SENTRY_DSN` | Sentry project settings | Backend error tracking |
| `VITE_SENTRY_DSN` | Sentry project settings | Frontend error tracking |
| `SPACES_ACCESS_KEY` | DO Spaces | File storage |
| `SPACES_SECRET_KEY` | DO Spaces | File storage |
| `SMTP_USER` | Email provider | Transactional email |
| `SMTP_PASSWORD` | Email provider | Transactional email |

**Optional (can defer):**
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth
- `FIGMA_CLIENT_ID` / `FIGMA_CLIENT_SECRET` — Figma import
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_SIGNING_SECRET` — Slack integration
- `MCP_AUTH_TOKEN` — MCP server auth

**Acceptance:** `doctl apps list` shows all required env vars set. Health endpoint returns 200.

---

### S56-3: Deploy and verify
**Priority:** P0 | **Estimate:** 2-3 hours

Push to production and run the post-deploy verification checklist from `docs/LAUNCH_CHECKLIST.md`.

**Tasks:**
- [ ] Trigger deploy via `npm run deploy` or merge to main (GitHub Actions)
- [ ] Verify health: `curl https://api.fluxstudio.art/health` → 200 with DB/Redis/Socket.IO status
- [ ] Verify API version header: `curl -I https://api.fluxstudio.art/api/auth/health | grep x-api-version` → `2025.1`
- [ ] Verify frontend loads: `https://fluxstudio.art` → landing page renders
- [ ] Verify signup flow: create test account, confirm email delivery
- [ ] Verify Sentry: trigger a test error in staging, confirm it appears in Sentry dashboard
- [ ] Verify Sentry source maps: confirm stack traces show original file:line (not minified)
- [ ] Run Lighthouse on production: `npx @lhci/cli autorun` → scores meet 85/95/90/80 thresholds
- [ ] Verify analytics: check admin dashboard for test signup events
- [ ] Verify WebSocket: open two tabs, confirm real-time messaging works

**Acceptance:** All 10 verification steps pass. LAUNCH_CHECKLIST.md updated to 55/55.

---

### S56-4: Set up Sentry source maps
**Priority:** P1 | **Estimate:** 1-2 hours

Configure automatic source map upload on deploy so production errors show original TypeScript file:line references.

**Tasks:**
- [ ] Install `@sentry/vite-plugin` as dev dependency
- [ ] Configure in `vite.config.ts`:
  ```ts
  import { sentryVitePlugin } from "@sentry/vite-plugin";
  // In plugins array (production only):
  sentryVitePlugin({
    org: "fluxstudio",
    project: "fluxstudio-frontend",
    authToken: process.env.SENTRY_AUTH_TOKEN,
  })
  ```
- [ ] Add `SENTRY_AUTH_TOKEN` to GitHub Actions secrets and DO environment
- [ ] Verify: deploy, trigger error, confirm Sentry shows original source

**Acceptance:** Sentry error detail shows `.tsx` file paths and correct line numbers.

---

### S56-5: Beta invite email + closed access gate
**Priority:** P1 | **Estimate:** 3-4 hours

Add an invite-code gate so only beta testers can sign up during the soft launch period. This prevents random signups before the product is ready for public traffic.

**Tasks:**
- [ ] Add feature flag: `beta_invite_required` (default: `true`)
- [ ] Create `beta_invite_codes` table:
  ```sql
  CREATE TABLE beta_invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    max_uses INTEGER DEFAULT 1,
    uses INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] Add invite code validation to `POST /api/auth/signup`:
  - When `beta_invite_required` flag is on, require `inviteCode` field
  - Validate code exists, not expired, uses < max_uses
  - Increment uses on successful signup
- [ ] Update SignupWizard Step 0: show invite code field when flag is enabled
  - Text: "FluxStudio is in closed beta. Enter your invite code to get started."
  - Link: "Request an invite" → mailto or typeform
- [ ] Create admin endpoint: `POST /api/admin/invite-codes` to generate batch of codes
- [ ] Pre-generate 20 invite codes for initial beta cohort

**Acceptance:** Signup blocked without valid invite code when flag is on. Admin can generate and distribute codes.

---

### S56-6: Beta user outreach
**Priority:** P1 | **Estimate:** 2-3 hours

Identify and contact 10-15 potential beta testers. Target: 5-10 active users within first week.

**Targets (by persona):**
1. **Band directors** (3-5) — primary formation editor use case
2. **Choreographers** (2-3) — collaborative design + 3D preview
3. **Drum corps staff** (2-3) — template library + sharing
4. **Design students** (2-3) — fresh eyes, high engagement

**Outreach channels:**
- [ ] Personal network / LinkedIn contacts in performing arts
- [ ] Reddit: r/marchingband, r/drumcorps, r/colorguard
- [ ] Music education Facebook groups
- [ ] Direct email to any existing interest list / waitlist

**Email template:**
```
Subject: You're invited to try FluxStudio (closed beta)

Hi [Name],

I'm building FluxStudio — a collaborative formation editor for
band directors and choreographers. Think "Google Docs meets
drill design" with 3D preview and AI-assisted layouts.

I'd love your feedback during our closed beta. Here's your
invite code: [CODE]

Sign up at: https://fluxstudio.art/signup?invite=[CODE]

What I'm looking for:
- Can you create a formation in under 2 minutes?
- Does the 3D preview help you visualize?
- What's missing for your workflow?

Thanks,
Kent
```

**Acceptance:** 10+ invite codes distributed. Tracking spreadsheet created with name, email, code, signup date, first project date.

---

### S56-7: Feedback collection mechanism
**Priority:** P2 | **Estimate:** 2-3 hours

Give beta users a lightweight way to report feedback without leaving the app.

**Tasks:**
- [ ] Add feedback button (bottom-right corner, all pages):
  - Icon: `MessageSquarePlus` from lucide-react
  - Opens slide-over panel with:
    - Type selector: Bug / Feature Request / General
    - Text area (required, 10-1000 chars)
    - Screenshot toggle (uses `html2canvas` or browser API)
    - Submit button
- [ ] Backend: `POST /api/feedback`
  - Stores in `user_feedback` table (user_id, type, message, screenshot_url, page_url, user_agent)
  - Sends notification email to admin
- [ ] Admin view: `GET /api/admin/feedback` — list all feedback with filters
- [ ] Add to landing page footer: "Beta Feedback" link

**Acceptance:** Beta users can submit feedback from any page. Admin receives email notification.

---

### S56-8: Complete i18n for remaining languages
**Priority:** P2 | **Estimate:** 3-4 hours

6 languages (de, es, fr, ja, zh-CN, zh-TW) are at 52% translation coverage (148/282 keys). Complete them.

**Tasks:**
- [ ] Extract the 134 missing keys per language from English `common.json`
- [ ] Translate using Claude API (batch, with review pass):
  - German (de)
  - Spanish (es)
  - French (fr)
  - Japanese (ja)
  - Chinese Simplified (zh-CN)
  - Chinese Traditional (zh-TW)
- [ ] Also complete `messages.json`, `projects.json`, `auth.json`, `admin.json` for each
- [ ] Manual review pass: check for UI string length issues (German tends to be longer)
- [ ] Test: switch browser language, verify no missing key fallbacks

**Acceptance:** All 8 languages at 100% key coverage. No `missing_key` warnings in console.

---

### S56-9: Clean up legacy deploy scripts
**Priority:** P3 | **Estimate:** 30 min

Remove deprecated deploy scripts that create confusion about which to use.

**Tasks:**
- [ ] Identify all deploy scripts in `scripts/`:
  - Keep: `deploy.sh`, `verify-deployment.sh`, `health-check.sh`
  - Remove: `deploy-to-digitalocean.sh`, `deploy-production.sh`, `deploy-to-app-platform.sh`, `deploy-sprint-*.sh`, and any other legacy variants
- [ ] Update any references in docs

**Acceptance:** `ls scripts/deploy*` shows only the canonical `deploy.sh`.

---

## Sprint Schedule

| Day | Focus | Tickets |
|-----|-------|---------|
| Day 1 | Fix blockers + configure secrets | S56-1, S56-2 |
| Day 2 | Deploy + verify + source maps | S56-3, S56-4 |
| Day 3 | Beta gate + feedback mechanism | S56-5, S56-7 |
| Day 4 | Outreach + i18n | S56-6, S56-8 |
| Day 5 | Buffer / fix issues from deploy | S56-9, bugs |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Production deploy | Live at fluxstudio.art |
| Health check | All services green (DB, Redis, Socket.IO) |
| Sentry | Errors tracked with source maps |
| Lighthouse | 85+ / 95+ / 90+ / 80+ |
| Beta invites sent | 10+ |
| Beta signups | 5+ |
| First formation created by external user | 1+ |
| Feedback submissions | 3+ |
| Launch checklist | 55/55 |

---

## Risks

| Risk | Mitigation |
|------|------------|
| DO secrets misconfigured → 500 errors | Health endpoint checks all dependencies; verify each service individually |
| Migration fails on production DB | Run `db:migrate:dry-run` first; migration system supports rollback |
| Beta users hit critical bugs | Sentry alerts + feedback widget; keep beta cohort small (5-10) |
| WebSocket doesn't work behind DO proxy | Test WS connection specifically; collaboration service has health check |
| Stripe test mode confusion | Keep `STRIPE_SECRET_KEY` in test mode for beta; switch to live after validation |

---

## Dependencies

- DigitalOcean App Platform access (doctl configured)
- Sentry project created (org: fluxstudio)
- Stripe account in test mode
- SMTP provider configured (for verification emails + invite codes)
- Google OAuth credentials (for social login)
- Anthropic API key (for AI co-pilot features)

---

*Sprint 56 — February 2026*
