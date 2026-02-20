# Sprint 40: Observability & Analytics

**Phase 5.3** — Connect the monitoring infrastructure that already exists to real endpoints, add Lighthouse CI, and create an admin metrics view.

## Existing Infrastructure (already built)

| Layer | What exists | File |
|-------|-------------|------|
| Event tracking | `EventTracker` class, session/user IDs, queuing | `src/services/observability/index.ts` |
| Web Vitals | LCP, FCP, FID, CLS, TTFB, TTI + hooks | `src/services/monitoring/PerformanceMonitoringService.ts` |
| Error tracking | Sentry backend init, React ErrorBoundaries | `lib/monitoring/sentry.js`, `src/components/error/ErrorBoundary.tsx` |
| Backend metrics | Request latency (p50/p95/p99), Redis ops, system stats | `lib/monitoring/performanceMetrics.js` |
| Bundle budget | 600KB chunk limit in CI, intelligent code splitting | `.github/workflows/ci.yml`, `vite.config.ts` |

## What's Missing

1. Analytics events never leave the browser — `sendToAnalytics()` is a no-op
2. Web Vitals data collected but not exported to backend
3. No Lighthouse CI in the pipeline
4. No bundle size visualizer for local development
5. Backend metrics exist but no admin-facing endpoint to view them
6. No frontend Sentry client (only backend)

---

## T1: Analytics Event Pipeline

Wire the existing `AnalyticsService` queue to a backend endpoint that persists events.

### Backend: `routes/analytics.js`
- `POST /api/analytics/events` — Accept batched events `{ events: [...] }`
- Validate payload shape, enforce max 50 events per batch
- Store to `analytics_events` table (id, user_id, session_id, event_name, properties, created_at)
- Rate limit: 10 requests/min per user

### Database: `database/migrations/118_analytics_events.sql`
- Create `analytics_events` table with JSONB `properties` column
- Index on `(event_name, created_at)` for querying
- Index on `(user_id, created_at)` for per-user queries

### Frontend: `src/services/observability/index.ts`
- Implement `flush()` method in `AnalyticsService` that POSTs queued events to `/api/analytics/events`
- Auto-flush every 30 seconds via `setInterval`
- Flush on `visibilitychange` (page hide) using `navigator.sendBeacon`
- Flush on queue reaching 20 events
- Wire `identify()` to pull user ID from AuthContext on login

### Mount: `server-unified.js`
- Add `app.use('/api/analytics', analyticsRoutes)`

---

## T2: Web Vitals RUM Export

Connect the existing `PerformanceMonitoringService` to a backend endpoint for real-user monitoring.

### Backend: `routes/analytics.js` (extend)
- `POST /api/analytics/vitals` — Accept `{ metrics: { lcp, fcp, fid, cls, ttfb }, url, userAgent, connectionType }`
- Store to `web_vitals` table
- No auth required (beacon from any page load)

### Database: `database/migrations/118_analytics_events.sql` (extend)
- Create `web_vitals` table (id, session_id, url, lcp, fcp, fid, cls, ttfb, connection_type, user_agent, created_at)
- Index on `created_at` for time-range queries

### Frontend: `src/services/monitoring/PerformanceMonitoringService.ts`
- Replace the empty `reportMetrics()` with actual `navigator.sendBeacon('/api/analytics/vitals', ...)` call
- Send on page unload and every 60 seconds for long sessions
- Include `connectionType` from `navigator.connection` for correlation

---

## T3: Bundle Size Budget & Visualizer

Add local bundle visualization and tighten CI budget enforcement.

### `vite.config.ts`
- Add `rollup-plugin-visualizer` (conditional on `ANALYZE=true` env var)
- Generates `dist/stats.html` for interactive treemap

### `.github/workflows/ci.yml`
- Tighten chunk limit from 600KB to 500KB (per roadmap target)
- Add total bundle size check: warn if `dist/assets/*.js` total exceeds 800KB
- Output bundle size summary as CI step annotation

### `package.json`
- Add script: `"analyze": "ANALYZE=true vite build"`

---

## T4: Lighthouse CI

Add automated Lighthouse audits on every PR.

### `.lighthouserc.js` (new)
- Configure `ci.collect` with `startServerCommand` pointing to preview build
- Set performance budget assertions:
  - Performance score >= 80
  - Accessibility score >= 90
  - Best practices >= 85
  - LCP < 3s, CLS < 0.15, TBT < 400ms
- Upload results to temporary public storage (LHCI default)

### `.github/workflows/ci.yml` (extend)
- Add `lighthouse` job after `build`
- Uses `treosh/lighthouse-ci-action@v12`
- Runs against built assets with a local server
- Posts results as PR comment

---

## T5: Admin Metrics Endpoint

Expose the existing backend performance metrics to authenticated admin users.

### Backend: `routes/admin.js` (new or extend)
- `GET /api/admin/metrics` — Returns aggregated metrics from `performanceMetrics.js`
  - Request latency percentiles (p50, p95, p99) per endpoint
  - Error rate per endpoint
  - System stats (CPU, memory, uptime)
  - Active connections count
- Auth required: admin role only
- Cache response for 30 seconds (metrics don't need real-time)

### Frontend: `src/pages/AdminMetrics.tsx` (new)
- Simple dashboard showing:
  - API latency chart (p50/p95/p99 over last hour)
  - Error rate indicator
  - System health (CPU/memory gauges)
  - Top slowest endpoints table
- Protected route at `/admin/metrics`, admin-only
- Use existing Chart.js (already in vendor-charts bundle)

### Route: `src/App.tsx`
- Add lazy-loaded `/admin/metrics` route with admin guard

---

## Files to Create

| File | Purpose |
|------|---------|
| `routes/analytics.js` | Event + vitals ingestion endpoints |
| `database/migrations/118_analytics_events.sql` | analytics_events + web_vitals tables |
| `.lighthouserc.js` | Lighthouse CI configuration |
| `src/pages/AdminMetrics.tsx` | Admin metrics dashboard |

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/observability/index.ts` | Wire flush() to backend, auto-flush, beacon |
| `src/services/monitoring/PerformanceMonitoringService.ts` | Wire reportMetrics() to /api/analytics/vitals |
| `server-unified.js` | Mount analytics + admin routes |
| `vite.config.ts` | Add rollup-plugin-visualizer |
| `.github/workflows/ci.yml` | Lighthouse CI job, tighten bundle budget |
| `package.json` | Add analyze script, @lhci/cli dev dep |
| `src/App.tsx` | Add /admin/metrics route |

## Verification

1. `npm run dev` — Trigger page navigation, check Network tab for `/api/analytics/events` POST after 30s
2. `npm run build` — Verify bundle under 500KB per chunk
3. `npm run analyze` — Open `dist/stats.html`, verify treemap renders
4. `npm run typecheck` — Zero new errors
5. Push a test commit — Verify Lighthouse CI runs and posts results
6. Visit `/admin/metrics` as admin — Verify latency chart and system stats render
