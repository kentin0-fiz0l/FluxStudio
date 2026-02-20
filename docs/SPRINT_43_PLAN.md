# Sprint 43: Performance & Launch Optimization

**Phase 6.1** — Crush the bundle, enforce Lighthouse 90+, add SEO, harden rate limits, and polish the first-run experience.

## Why This Sprint

Phase 5 made FluxStudio production-ready *architecturally*. But the success metrics tell a different story:

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Bundle Size | ~650KB+ (chunks to 916KB) | <500KB | 2x over |
| Time to Interactive | ~1.5s | <1s | 50% over |
| Lighthouse Score | threshold at 80% | 90+ | Not enforced |
| SEO / Discoverability | None | Basics | Missing entirely |
| Abuse Prevention | User-based only | IP + fingerprint | Vulnerable |
| First-run Experience | Steps exist, no guidance | <30s to first action | No tour |

## Existing Infrastructure

| Layer | What exists | File |
|-------|-------------|------|
| Bundle splitting | Vite `manualChunks` strategy with 15+ named chunks | `vite.config.ts` |
| Lazy loading | `lazyLoadWithRetry` utility, React.lazy for all routes | `src/App.tsx` |
| Lighthouse CI | LCP/CLS/TBT assertions at 80% perf, 90% a11y | `.lighthouserc.js` |
| CI bundle check | Per-chunk 500KB + total 800KB budget | `.github/workflows/ci.yml` |
| Rate limiting | Redis-backed per-user sliding window (AI, uploads, auth) | `lib/auth/middleware.js` |
| Landing page | 3-variant composition (Hero, UseCases, Pricing, CTA) | `src/pages/landing/LandingPage.tsx` |
| Onboarding | `useOnboardingState` hook, signup wizard, welcome flow | `src/hooks/useOnboardingState.ts` |
| First-time hook | `useFirstTimeExperience.ts` (stub) | `src/hooks/useFirstTimeExperience.ts` |

## What's Missing

1. **Bundle is bloated** — onboarding chunk 916KB, printing 483KB, widgets 424KB. Heavy libraries (Recharts, Three.js, Yjs) not tree-shaken.
2. **Lighthouse not enforced at 90+** — current threshold is 80% perf. LCP cap at 3000ms (should be 2500ms).
3. **No SEO** — no meta tags, no Open Graph, no structured data. Organic traffic = zero.
4. **No IP rate limiting** — only per-user. Vulnerable to credential stuffing, distributed abuse.
5. **No product tour** — users land in the app with no guidance. No tooltips, no contextual help.

---

## Tasks

### T1: Bundle Size Reduction

Attack the largest chunks and heavy dependencies to hit the <500KB per-chunk target.

**Files to modify:**

| File | Changes |
|------|---------|
| `vite.config.ts` | Refine `manualChunks`: split onboarding further, extract Recharts/D3/Three.js into dedicated lazy chunks, enable CSS code splitting |
| `src/App.tsx` | Add `React.lazy` wrappers for admin routes, printing routes, and widget-heavy pages that aren't already lazy |
| `package.json` | Add `"sideEffects": false` for tree-shaking, add `vite-plugin-compression` for gzip/brotli |

**Approach:**
1. Audit current bundle with `ANALYZE=true pnpm build`
2. Move Recharts, Three.js, D3 into dedicated dynamic imports (only loaded on pages that use them)
3. Split the onboarding mega-chunk (916KB) into sub-routes
4. Add `vite-plugin-compression` for gzip + brotli pre-compression
5. Verify all chunks are ≤500KB after changes

### T2: Lighthouse CI Enforcement

Raise the bar from 80% to 90+ and enforce in CI.

**Files to modify:**

| File | Changes |
|------|---------|
| `.lighthouserc.js` | Raise performance assertion to 0.9, best-practices to 0.9, LCP max 2500ms |
| `.github/workflows/ci.yml` | Ensure Lighthouse job fails on regression, add performance budget assertion |

**New thresholds:**
- Performance: ≥ 0.9 (error, not warn)
- Accessibility: ≥ 0.9 (keep)
- Best Practices: ≥ 0.9 (error, not warn)
- LCP: ≤ 2500ms
- CLS: ≤ 0.1
- TBT: ≤ 300ms

### T3: SEO Foundation

Add meta tags, Open Graph, structured data, and a sitemap for the public pages.

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `src/components/SEOHead.tsx` | Reusable `<Helmet>` component for page-level meta/OG tags |
| `src/pages/landing/LandingPage.tsx` | Add SEOHead with title, description, OG image, structured data |
| `src/pages/Login.tsx` | Add SEOHead with login-specific meta |
| `public/sitemap.xml` | Static sitemap for public pages (landing, pricing, login, signup) |
| `public/robots.txt` | Allow crawling of public pages, disallow /api and authenticated routes |
| `index.html` | Add default meta description, OG tags, canonical URL |

**Dependencies:** `react-helmet-async` (lightweight, SSR-ready)

### T4: IP Rate Limiting & Abuse Prevention

Add IP-based rate limiting to protect against distributed attacks and credential stuffing.

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `lib/security/ipRateLimit.js` | IP-based rate limiter using Redis (falls back to in-memory Map) |
| `server-unified.js` | Mount IP rate limiter globally, stricter limits on auth endpoints |
| `routes/auth.js` | Apply per-IP limits: 5 login attempts per 15 minutes per IP |

**Configuration:**
- Global: 100 requests per minute per IP
- Login: 5 attempts per 15 minutes per IP
- Signup: 3 per hour per IP
- Password reset: 3 per hour per IP
- Headers: `Retry-After`, `X-RateLimit-*`

### T5: First-Run Product Tour

Build a lightweight product tour that guides new users to their first creative action in <30 seconds.

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `src/components/onboarding/ProductTour.tsx` | Step-by-step overlay tour (spotlight + tooltip) |
| `src/hooks/useFirstTimeExperience.ts` | Complete the stub: track tour completion, feature discovery |
| `src/hooks/useOnboardingState.ts` | Add `tourCompleted` flag |
| `src/pages/Dashboard.tsx` | Trigger ProductTour on first visit if onboarding not complete |

**Tour steps:**
1. Welcome spotlight on project list → "Create your first project"
2. After project creation → highlight MetMap canvas → "This is your creative workspace"
3. Highlight collaboration button → "Invite your team to collaborate in real-time"
4. Done → show success state, dismiss tour, set `tourCompleted = true`

**Approach:** Custom implementation using CSS spotlight + positioned tooltip (no react-joyride dependency). Use `useFirstTimeExperience` to track state in localStorage + backend sync.

---

## Verification

```bash
# 1. Bundle size
ANALYZE=true pnpm build
# All chunks should be ≤500KB gzipped

# 2. Lighthouse
npx lhci autorun
# Score should be ≥90 for performance

# 3. SEO
curl -s http://localhost:5173/ | grep -c 'og:title'
# Should return 1+

# 4. Rate limiting
for i in {1..6}; do curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/auth/login -d '{}' -H 'Content-Type: application/json'; echo; done
# 6th request should return 429

# 5. Product tour
# Open app as new user → tour should auto-start on dashboard
```

## Implementation Order

1. T1 (Bundle Reduction) — biggest impact on all performance metrics
2. T2 (Lighthouse Enforcement) — validates T1 changes, gates CI
3. T3 (SEO Foundation) — enables organic discovery
4. T4 (IP Rate Limiting) — security hardening before public launch
5. T5 (Product Tour) — UX polish for first-run experience
