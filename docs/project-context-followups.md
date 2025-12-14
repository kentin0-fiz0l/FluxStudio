# Project Context UX Follow-ups

**Date:** 2025-12-14
**Status:** Planning
**Priority:** P1 for project-first UX alignment

---

## Problem Statement

FluxStudio's core principle is **"Projects are the home for everything."**

Currently, several key screens lack visible project context:
- **Messages** — Conversations don't show which project they belong to
- **Notifications** — Project-related notifications don't display project name
- **ProjectDetail tabs** — No count badges showing items per tab

This creates cognitive friction where users must remember which project context they're working in.

---

## UX Motivation

| Screen | Current State | Desired State |
|--------|--------------|---------------|
| Messages list | Shows conversation title only | Shows project badge + title |
| Notification item | Shows action type only | Shows project name for project-scoped events |
| ProjectDetail tabs | Text labels only | Labels with count badges (e.g., "Files (12)") |

---

## Backend Data Requirements

### 1. Conversation Project Badge

**Frontend Need:**
Display project name on conversation cards in `/messages`

**Current API Response (`GET /api/conversations`):**
```typescript
interface ConversationSummary {
  id: string;
  organizationId: string | null;
  name: string | null;
  isGroup: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  members?: Array<...>;
  // ❌ Missing: projectId, projectName
}
```

**Required Change:**
```typescript
interface ConversationSummary {
  // ... existing fields
  projectId?: string | null;      // NEW: Optional project link
  projectName?: string | null;    // NEW: Denormalized for display
}
```

**Backend Work:**
- Add `projectId` foreign key to `conversations` table (nullable)
- Join project name in conversations list query
- Return in API response

**Risks:**
- N+1 query if not properly joined
- Migration needed for existing conversations (default: null)

---

### 2. Notification Project Context

**Frontend Need:**
Display project name on project-scoped notifications

**Current API Response (`GET /api/notifications`):**
```typescript
interface Notification {
  id: string;
  type: NotificationType; // e.g., 'project_file_uploaded'
  title: string;
  body?: string;
  entityId?: string;      // Generic entity reference
  actionUrl?: string;
  // ❌ Missing: projectId, projectName for project-scoped types
}
```

**Required Change:**
```typescript
interface Notification {
  // ... existing fields
  projectId?: string | null;      // NEW: For project-scoped notifications
  projectName?: string | null;    // NEW: Denormalized for display
}
```

**Backend Work:**
- Store `projectId` when creating project-scoped notifications
- Denormalize `projectName` at creation time (avoids joins)
- Types that need project context:
  - `project_member_added`
  - `project_status_changed`
  - `project_file_uploaded`
  - `message_mention` (if conversation is project-scoped)
  - `message_reply` (if conversation is project-scoped)

**Risks:**
- Denormalized name becomes stale if project renamed (acceptable trade-off)
- Existing notifications won't have project context (migration optional)

---

### 3. ProjectDetail Tab Count Badges

**Frontend Need:**
Show item counts on tab labels: "Tasks (5)", "Files (12)", "Messages (3 unread)"

**Data Sources:**

| Tab | Count Source | Current Availability |
|-----|--------------|----------------------|
| Tasks | `useTasksQuery(projectId)` | ✅ Available (client-side) |
| Files | Project files API | ❌ Needs count endpoint or derive from list |
| Assets | `assetsState.assets.filter(a => a.projectId === id)` | ✅ Available (client-side) |
| Boards | `boards.length` | ✅ Available (client-side) |
| Messages | Unread count for project conversations | ❌ Needs aggregation |

**Option A: Client-Side Derivation (No Backend Change)**
```typescript
// Files count - fetch list length
const filesCount = projectFiles?.length ?? undefined;

// Tasks count - already available
const tasksCount = tasks?.length ?? undefined;

// Assets count - already available
const assetsCount = projectAssets?.length ?? undefined;
```

**Option B: Lightweight Counts Endpoint (Recommended)**
```
GET /api/projects/:id/counts
Response: {
  tasks: number;
  files: number;
  assets: number;
  boards: number;
  unreadMessages: number;
}
```

**Recommended Approach:**
- Start with Option A (client-side) for immediate progress
- Add Option B endpoint if performance becomes an issue

---

## Implementation Phases

### Phase 1: Frontend Scaffolding (No Backend)
- [x] Add optional `projectId`/`projectName` to TypeScript interfaces
- [x] Add null-safe rendering for project badges
- [x] Add tab count badge component that accepts `undefined | number`

### Phase 2: Backend — Conversations Project Link
- [ ] Add `projectId` column to conversations table
- [ ] Update conversation creation to accept projectId
- [ ] Update list endpoint to include project context
- [ ] Frontend: Remove placeholder, wire up real data

### Phase 3: Backend — Notification Project Context
- [ ] Store projectId/projectName on notification creation
- [ ] Update notification types to include project context
- [ ] Frontend: Display project badge on notification items

### Phase 4: Tab Count Badges
- [ ] Implement client-side counts (Phase 1)
- [ ] Add counts endpoint if needed (Phase 2)

---

## Rollout Order

1. **Tab Count Badges** — Lowest risk, no backend needed
2. **Notification Project Context** — Medium risk, additive change
3. **Conversation Project Badge** — Higher risk, schema change needed

---

## Open Questions

1. Should conversations without a project show "Personal" or no badge?
2. Should project context be clickable (navigate to project)?
3. What happens to project context if a project is deleted?

---

## Related Files

**Frontend:**
- `src/pages/MessagesNew.tsx` — ConversationSummary interface
- `src/pages/Notifications.tsx` — Notification rendering
- `src/pages/ProjectDetail.tsx` — Tab component
- `src/contexts/NotificationContext.tsx` — Notification interface

**Backend (to be modified):**
- Conversations API endpoint
- Notifications API endpoint
- Project counts endpoint (new)
