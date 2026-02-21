# Sprint 44: Growth & Engagement

**Phase 6.3** — Wire real-time notifications, expand email templates, add funnel analytics, build referral system, and track onboarding drop-off.

## Why This Sprint

Phase 6.1 made FluxStudio fast and discoverable. But we still have 0 monthly active users. This sprint adds the infrastructure to attract, activate, and retain the first 100 users:

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Monthly Active Users | 0 | 100 | No growth engine |
| Real-time Notifications | DB-only | Live push | No engagement loop |
| Email Templates | 3 (auth only) | 8+ (collab events) | No re-engagement |
| Funnel Analytics | Framework only | Full pipeline | Can't measure activation |
| Referral System | Basic invite UI | Tracked referrals | No viral loop |

## Existing Infrastructure

| Layer | What exists | File |
|-------|-------------|------|
| In-app notifications | CRUD routes, notification service, NotificationCenter widget (70% done) | `routes/notifications.js`, `services/notification-service.js` |
| Socket.IO | Running on unified backend with /auth and /messaging namespaces | `server-unified.js` |
| Email service | SMTP/SendGrid, 3 templates (verify, reset, welcome) | `lib/email/emailService.js` |
| Event tracking | Client-side EventTracker class with session/event IDs | `src/services/analytics/eventTracking.ts` |
| Invite system | InviteMembers component, team invite logic | `src/components/InviteMembers.tsx`, `routes/teams.js` |
| Onboarding state | useOnboardingState, useFirstTimeExperience hooks | `src/hooks/useOnboardingState.ts` |
| Analytics endpoint | Project health/velocity queries | `routes/analytics.js` |

## What's Missing

1. **No real-time notification delivery** — notifications are database-only, not pushed to clients via Socket.IO
2. **No collaboration emails** — users aren't notified when mentioned, shared with, or commented on
3. **No funnel tracking** — can't measure signup→activation→retention or identify drop-off points
4. **No referral system** — no referral codes, no tracking, no viral growth mechanism
5. **No onboarding analytics** — can't tell where new users abandon the flow

---

## Tasks

### T1: Real-Time Notification Delivery

Wire the existing notification service to push events through Socket.IO so users see notifications instantly.

**Files to modify:**

| File | Changes |
|------|---------|
| `services/notification-service.js` | After creating a DB notification, emit to Socket.IO namespace |
| `server-unified.js` | Add `/notifications` Socket.IO namespace with auth |
| `src/hooks/useNotifications.ts` | Create hook: connect to socket, listen for events, update query cache |
| `src/components/widgets/NotificationCenter.tsx` | Use new hook, show unread badge, toast on new notification |

**Approach:**
1. Add a `notifyRealtime(userId, notification)` method to notification-service.js
2. Create a `/notifications` Socket.IO namespace that authenticates via JWT
3. Client hook connects on mount, listens for `notification:new`, invalidates TanStack Query cache
4. Show toast via Sonner when a notification arrives while user is active

### T2: Collaboration Email Templates

Expand the email service with templates for collaboration events that bring users back.

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `lib/email/templates/mentionNotification.js` | "@user mentioned you in Project X" |
| `lib/email/templates/projectShared.js` | "User shared Project X with you" |
| `lib/email/templates/commentReply.js` | "User replied to your comment" |
| `lib/email/templates/weeklyDigest.js` | "Your week in FluxStudio — X projects, Y comments" |
| `lib/email/emailService.js` | Add `sendCollaborationEmail(type, recipient, data)` method |
| `services/notification-service.js` | After DB + realtime, also queue email if user preference allows |

**Templates:**
- Mention: subject "You were mentioned in {project}", CTA → deep link to comment
- Project shared: subject "{user} shared {project} with you", CTA → open project
- Comment reply: subject "{user} replied to your comment", CTA → view thread
- Weekly digest: subject "Your week in FluxStudio", summary of activity, CTA → dashboard

### T3: Funnel Analytics

Track the user journey from signup through activation and retention.

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `database/migrations/121_analytics_events.sql` | `analytics_events` table (user_id, event_name, properties JSONB, timestamp) |
| `lib/analytics/funnelTracker.js` | Server-side event ingestion and funnel query helpers |
| `routes/analytics.js` | Add `POST /api/analytics/events` (ingest), `GET /api/analytics/funnel` (query) |
| `src/services/analytics/eventTracking.ts` | Add `trackEvent(name, properties)` that sends to backend |
| `src/pages/admin/Analytics.tsx` | Admin funnel dashboard (signup → verify → first project → first invite → retained) |

**Funnel stages:**
1. `signup_started` — user opens signup page
2. `signup_completed` — user submits signup form
3. `email_verified` — user clicks verification link
4. `first_project_created` — user creates first project
5. `first_collaboration` — user invites a teammate or shares a project
6. `day_7_return` — user returns after 7 days (computed from login events)

**Instrumentation points:**
- Signup page mount → `signup_started`
- Signup API success → `signup_completed`
- Email verification API success → `email_verified`
- Project creation API success → `first_project_created`
- Team invite or project share → `first_collaboration`

### T4: Referral & Invite System

Add referral codes, tracking, and a dedicated invite flow for viral growth.

**Files to create/modify:**

| File | Purpose |
|------|---------|
| `database/migrations/122_referrals.sql` | `referral_codes` (user_id, code, created_at), `referral_signups` (referrer_id, referee_id, code, signed_up_at) |
| `routes/referrals.js` | `GET /api/referrals/code` (get/generate), `GET /api/referrals/stats` (count), `POST /api/referrals/track` (on signup) |
| `src/pages/Referrals.tsx` | Referral dashboard: shareable link, copy button, stats (invited, signed up, active) |
| `src/pages/Signup.tsx` | Accept `?ref=CODE` query param, store in signup payload |
| `routes/auth.js` | On signup success, if `referralCode` present, create `referral_signups` entry |

**Referral flow:**
1. User visits `/referrals` → sees unique link `fluxstudio.art/signup?ref=ABC123`
2. User shares link via copy/email/social
3. New user signs up with `?ref=ABC123` → tracked in `referral_signups`
4. Referrer sees stats update on their referral dashboard

### T5: Onboarding Drop-Off Tracking

Instrument every onboarding step so we can measure where users abandon the flow.

**Files to modify:**

| File | Changes |
|------|---------|
| `src/hooks/useOnboardingState.ts` | Fire analytics events on step enter, step complete, step skip |
| `src/hooks/useFirstTimeExperience.ts` | Fire analytics events on tour start, tour step, tour complete, tour dismiss |
| `src/components/onboarding/ProductTour.tsx` | Call eventTracker on each step transition |
| `src/pages/SignupWizard.tsx` | Track wizard step entry and completion |

**Events:**
- `onboarding_tour_started` — tour overlay appears
- `onboarding_tour_step_{n}` — user reaches step N
- `onboarding_tour_completed` — user finishes all steps
- `onboarding_tour_dismissed` — user skips tour
- `signup_wizard_step_{n}` — user reaches signup wizard step N
- `signup_wizard_completed` — user finishes signup wizard
- `signup_wizard_abandoned` — user leaves mid-wizard (beforeunload)

---

## Verification

```bash
# 1. Real-time notifications
# Open app in 2 tabs as same user, trigger notification → both tabs see it

# 2. Email templates
# Mention a user in a comment → verify email arrives with correct CTA link

# 3. Funnel analytics
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.fluxstudio.art/api/analytics/funnel?start=2026-01-01 | jq
# Should return stage counts

# 4. Referral system
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.fluxstudio.art/api/referrals/code | jq
# Should return { code: "ABC123", link: "https://..." }

# 5. Onboarding tracking
# Sign up as new user → check analytics_events table for onboarding events
```

## Implementation Order

1. T3 (Funnel Analytics) — database + API first, other tasks instrument into it
2. T1 (Real-Time Notifications) — biggest engagement impact
3. T2 (Collaboration Emails) — re-engagement loop
4. T4 (Referral System) — viral growth
5. T5 (Onboarding Tracking) — depends on T3 analytics infrastructure
