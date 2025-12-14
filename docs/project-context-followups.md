# Project Context UX Follow-ups

**Date:** 2025-12-14
**Status:** ✅ IMPLEMENTED
**Priority:** P1 for project-first UX alignment

---

## Problem Statement

FluxStudio's core principle is **"Projects are the home for everything."**

Previously, several key screens lacked visible project context:
- **Messages** — Conversations didn't show which project they belong to
- **Notifications** — Project-related notifications didn't display project name
- **ProjectDetail tabs** — Tab count badges needed API backing

**All three have now been implemented.**

---

## UX Implementation Summary

| Screen | Implementation | Status |
|--------|---------------|--------|
| Messages list | Project badge on conversation rows | ✅ Done |
| Notification item | Project badge + "Project Only" filter | ✅ Done |
| ProjectDetail tabs | Count badges from `/api/projects/:id/counts` | ✅ Done |

---

## Backend Changes Implemented

### 1. Database Migration (045_project_context_everywhere.sql)

```sql
-- Conversations: Add project context
ALTER TABLE conversations ADD COLUMN project_id TEXT REFERENCES projects(id);
CREATE INDEX idx_conversations_project ON conversations(project_id);

-- Notifications: Add project context
ALTER TABLE notifications ADD COLUMN project_id TEXT;
ALTER TABLE notifications ADD COLUMN project_name TEXT;
CREATE INDEX idx_notifications_project ON notifications(project_id);
```

### 2. Conversations API

**`GET /api/conversations`** now returns:
```typescript
interface ConversationSummary {
  id: string;
  organizationId: string | null;
  projectId: string | null;      // ✅ NEW
  projectName: string | null;    // ✅ NEW
  name: string | null;
  isGroup: boolean;
  // ... other fields
}
```

**`POST /api/conversations`** now accepts:
```typescript
{
  name?: string;
  isGroup?: boolean;
  memberUserIds?: string[];
  organizationId?: string;
  projectId?: string;  // ✅ NEW: Link conversation to project
}
```

### 3. Notifications API

**`GET /api/notifications`** now returns:
```typescript
interface Notification {
  // ... existing fields
  projectId: string | null;      // ✅ NEW
  projectName: string | null;    // ✅ NEW
}
```

**Notification Service** updated to accept and store `projectId`/`projectName` when creating notifications for project-scoped conversations.

### 4. Project Counts Endpoint (NEW)

**`GET /api/projects/:projectId/counts`**

**Response:**
```typescript
{
  success: true,
  counts: {
    messages: number,  // Conversations linked to project
    files: number,     // Files in project
    assets: number,    // Active assets in project
    boards: number     // Design boards in project
  }
}
```

**Authorization:** Requires authentication + project membership.

---

## Frontend Changes Implemented

### Messages Page (`src/pages/MessagesNew.tsx`)
- Added `ProjectBadge` component with link to project
- Updated `ConversationItem` to display project badge when `projectName` exists
- Project badges are clickable (navigate to `/projects/:id`)

### Notifications Page (`src/pages/Notifications.tsx`)
- Added `NotificationProjectBadge` component
- Added "Project Only" filter dropdown
- Project badges are clickable

### ProjectDetail Page (`src/pages/ProjectDetail.tsx`)
- Added `useProjectCounts` hook to fetch from `/api/projects/:id/counts`
- Messages tab now shows count from API instead of hardcoded 0

### New Hook (`src/hooks/useProjectCounts.ts`)
```typescript
export function useProjectCounts(projectId: string | undefined) {
  // Returns: { counts, loading, error, refetch }
}
```

---

## Answers to Open Questions

1. **Conversations without project:** Show no badge (implicit "Personal")
2. **Project context clickable:** Yes, navigates to `/projects/:id`
3. **Project deletion:** `ON DELETE SET NULL` preserves conversation, badge disappears

---

## Files Modified

**Backend:**
- `database/migrations/045_project_context_everywhere.sql` — Schema changes
- `database/messaging-conversations-adapter.js` — Query updates
- `services/notification-service.js` — Project context passing
- `server-unified.js` — New counts endpoint + conversation creation update

**Frontend:**
- `src/pages/MessagesNew.tsx` — Project badge on conversations
- `src/pages/Notifications.tsx` — Project badge + filter
- `src/pages/ProjectDetail.tsx` — Wired up counts hook
- `src/hooks/useProjectCounts.ts` — NEW: Fetch project counts

---

## Manual Test Plan

### Messages Page (`/messages`)
1. Create a conversation with `projectId` set
2. Verify project badge appears on conversation row
3. Click badge → navigates to project

### Notifications Page (`/notifications`)
1. Generate notification for project-scoped conversation (mention, reply)
2. Verify project badge appears on notification
3. Test "Project Only" filter

### ProjectDetail Page (`/projects/:id`)
1. Navigate to project detail
2. Verify Messages tab shows count from API
3. Count should reflect conversations linked to project
