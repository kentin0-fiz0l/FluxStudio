# Sprint 38: SaaS Subscription Plans & Usage Gating

**Phase:** 5.1 Monetization & Pricing
**Goal:** Layer recurring SaaS subscription plans on top of the existing project-based billing, with usage quotas and in-app upgrade prompts.

## Current State

FluxStudio has strong billing infrastructure already:

| Component | Status | Notes |
|-----------|--------|-------|
| `lib/payments.js` (616 lines) | Complete | Stripe SDK, webhooks, payment intents, subscriptions |
| `routes/payments.js` (301 lines) | Complete | Checkout sessions, customer portal, webhooks |
| `src/pages/Billing.tsx` (347 lines) | Complete | Subscription status, Stripe portal integration |
| `src/pages/Checkout.tsx` (180 lines) | Complete | PricingTable + Stripe redirect |
| `src/components/payments/PricingTable.tsx` (200 lines) | Complete | 4 service tiers ($1K-$12K) |
| `database/migrations/102_*` | Complete | subscriptions + payments tables |
| `tests/integration/payments.*` (522 lines) | Complete | Full endpoint coverage |

**Gap:** The current pricing is **project-based** (design services: $1K-$12K one-time). There's no SaaS subscription model for platform access with usage limits. Users can use FluxStudio for free with no limits today.

**Strategy:** Add a Free/Pro/Team tier system with usage quotas. Keep existing project-based billing intact — it becomes a separate "Services" offering.

---

## T1: Plan Definitions & Quota Schema

**Files:** `src/config/plans.ts` (new), `database/migrations/117_subscription_plans.sql` (new)

### 1a: Plan constants (`src/config/plans.ts`)
Define the SaaS subscription tiers:

```
Free:   3 projects, 500MB storage, 10 AI calls/month, 1 collaborator
Pro:    Unlimited projects, 10GB storage, 100 AI calls/month, 10 collaborators, $12/mo
Team:   Unlimited projects, 100GB storage, unlimited AI calls, unlimited collaborators, $29/mo per seat
```

Export: `PLANS`, `PlanId`, `PlanLimits`, `getPlanLimits(planId)`, Stripe price IDs.

### 1b: Database migration (`database/migrations/117_subscription_plans.sql`)
- `subscription_plans` table: id, name, stripe_price_id_monthly, stripe_price_id_yearly, limits (JSONB), is_default
- `user_usage` table: user_id, period_start, period_end, projects_count, storage_bytes, ai_calls_count, collaborators_count
- Add `plan_id` column to `users` table (default: 'free')

---

## T2: Usage Tracking Service

**Files:** `src/services/usageService.ts` (new), `routes/usage.js` (new)

### 2a: Backend usage tracking (`routes/usage.js`)
- `GET /api/usage` — Current period usage for authenticated user (projects, storage, AI calls, collaborators)
- `GET /api/usage/limits` — User's plan limits
- Internally: count projects, sum file sizes, count AI chat messages this period

### 2b: Frontend usage service (`src/services/usageService.ts`)
- `fetchUsage()` — Get current usage from API
- `fetchLimits()` — Get plan limits
- `isAtLimit(resource)` — Check if user has reached a specific limit
- `getUsagePercentage(resource)` — For progress bars

### 2c: Usage check middleware (`middleware/quotaCheck.js`)
- Express middleware for quota enforcement
- Check project count on `POST /api/projects`
- Check storage on file upload endpoints
- Check AI calls on `POST /api/ai/*`
- Returns 403 with `{ error: 'Plan limit reached', resource: 'projects', limit: 3, current: 3, upgrade_url: '/pricing' }`

---

## T3: Pricing Page

**Files:** `src/pages/Pricing.tsx` (new), `src/components/payments/SaaSPricingTable.tsx` (new)

### 3a: SaaS pricing table (`src/components/payments/SaaSPricingTable.tsx`)
- 3-column layout: Free / Pro ($12/mo) / Team ($29/seat/mo)
- Feature comparison with check/x marks
- Monthly/yearly toggle (yearly = 2 months free)
- Current plan badge for authenticated users
- CTA: "Current Plan" / "Upgrade" / "Contact Sales"

### 3b: Pricing page (`src/pages/Pricing.tsx`)
- Public page (no auth required) at `/pricing`
- SaaSPricingTable + FAQ section
- Links to checkout for Pro/Team
- Add route in App.tsx

---

## T4: Upgrade Flow & Billing Page Enhancement

**Files:** `src/pages/Billing.tsx` (modify), `src/components/payments/UsageBar.tsx` (new), `src/components/payments/UpgradePrompt.tsx` (new)

### 4a: Usage display on Billing page
- Add usage bars showing projects, storage, AI calls vs limits
- Show current plan name and next billing date
- "Change Plan" button → opens pricing comparison or Stripe portal

### 4b: Usage bar component (`src/components/payments/UsageBar.tsx`)
- Reusable progress bar: label, current, limit, unit
- Color changes: green (<70%), amber (70-90%), red (>90%)

### 4c: Upgrade prompt component (`src/components/payments/UpgradePrompt.tsx`)
- Shown inline when user hits a limit (e.g., trying to create 4th project on Free)
- "You've reached the limit of 3 projects on the Free plan. Upgrade to Pro for unlimited projects."
- "Upgrade to Pro" button → `/pricing`

### 4d: Wire upgrade prompts into key creation flows
- `src/pages/NewProject.tsx` — Check project quota before showing creation form
- `src/components/ai/AIChatPanel.tsx` — Check AI call quota before sending message
- Show UpgradePrompt instead of the creation UI when at limit

---

## T5: Navigation & Route Wiring

**Files:** `src/App.tsx`, `src/components/organisms/NavigationSidebar.tsx`, `server-unified.js`

- Add `/pricing` route (public, no auth)
- Add usage routes mount in server-unified.js
- Add "Pricing" link in the landing/public nav (not sidebar — sidebar is for authenticated users)
- Add "Usage" badge/indicator in Billing nav or Settings

---

## Verification

1. `npm run dev` + `npm run dev:unified`
2. Visit `/pricing` (unauthenticated) — see 3 plans with features
3. Sign in as free user → `/billing` shows usage bars and "Free" plan badge
4. Try to create 4th project → UpgradePrompt shown
5. Click "Upgrade to Pro" → redirects to Stripe checkout
6. After payment → plan upgraded, limits increased
7. `npm run typecheck` — zero new errors
8. `npm run lint` — clean

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `src/config/plans.ts` | Create | Plan definitions, limits, Stripe price IDs |
| `database/migrations/117_subscription_plans.sql` | Create | Plans table, usage table, user plan_id |
| `routes/usage.js` | Create | Usage tracking endpoints |
| `middleware/quotaCheck.js` | Create | Quota enforcement middleware |
| `server-unified.js` | Modify | Mount usage routes, wire quota middleware |
| `src/services/usageService.ts` | Create | Frontend usage fetching |
| `src/pages/Pricing.tsx` | Create | Public pricing page |
| `src/components/payments/SaaSPricingTable.tsx` | Create | Plan comparison table |
| `src/components/payments/UsageBar.tsx` | Create | Reusable usage progress bar |
| `src/components/payments/UpgradePrompt.tsx` | Create | Inline upgrade prompt |
| `src/pages/Billing.tsx` | Modify | Add usage display, plan badge |
| `src/pages/NewProject.tsx` | Modify | Quota check before creation |
| `src/App.tsx` | Modify | Add /pricing route |
