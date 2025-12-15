# Project Pulse

## Overview

Project Pulse is a real-time activity and attention layer that surfaces what matters NOW within the focused project context. It transforms FluxStudio from a collection of pages into a living workspace where information comes to users rather than requiring navigation to find it.

**FluxStudio Principle:** "Here's what's happening and what needs you."

## Features

### 1. Pulse Panel

A collapsible overlay panel accessible from the ProjectContextBar showing:

- **Attention Inbox**: Items needing user action (mentions, assigned tasks, replies)
- **Activity Stream**: Recent events in the project
- **Team Heartbeat**: Who's online and what they're working on

### 2. Pulse Indicator

A badge in the ProjectContextBar that shows:
- Count of unseen items since last viewed
- Animated pulse when new activity arrives
- Visual indicator when attention items exist

### 3. Quick Actions (Cmd/Ctrl+K)

A keyboard-accessible command palette for:
- Creating new items without navigation (tasks, messages, files)
- Navigating to project tabs
- Global navigation shortcuts

### 4. Session Memory

Automatic persistence of user session state:
- Last focused project (auto-restored on return)
- Last seen timestamp (for "X new since..." calculations)
- Last activity timestamp

## User Experience

### Opening FluxStudio

1. User opens FluxStudio
2. If previously focused on a project, that focus is restored
3. Pulse indicator shows "X new" if activity occurred
4. User can immediately click Pulse to see what changed

### During a Work Session

1. Pulse indicator updates in real-time as events occur
2. User can click Pulse at any time to see attention items
3. Cmd/Ctrl+K provides quick creation without navigation
4. Activity stream shows team collaboration in real-time

### Returning After Time Away

1. Session Memory restores last project focus
2. Pulse shows all activity since last visit
3. Attention Inbox surfaces what needs response
4. User oriented in seconds, not minutes

## Technical Architecture

### State Management

```
SessionContext (localStorage):
├── lastFocusedProjectId
├── lastFocusedProjectName
├── lastProjectTab
├── lastRoute
├── lastSeenTimestamp
└── lastActivityTimestamp

PulseState (derived from existing contexts):
├── activityStream[] (from notifications)
├── attentionItems[] (from notifications + tasks)
├── teamMembers[] (from socket presence)
└── unseenCount (calculated from timestamps)
```

### Components

```
src/components/pulse/
├── index.ts              # Exports
├── PulsePanel.tsx        # Main container with tabs
├── PulseIndicator.tsx    # Badge for ProjectContextBar
├── ActivityStream.tsx    # Event feed
├── AttentionInbox.tsx    # Needs-attention items
├── TeamHeartbeat.tsx     # Presence indicators
└── QuickActions.tsx      # Command palette

src/contexts/
└── SessionContext.tsx    # Session memory provider

src/hooks/
└── useProjectPulse.ts    # Data aggregation hook
```

### Integration Points

| Component | Integration |
|-----------|-------------|
| ProjectContextBar | Renders PulseIndicator and PulsePanel |
| App.tsx | Provides SessionProvider and QuickActions |
| NotificationContext | Source for activity stream and attention items |
| useTasks | Source for assigned task attention items |
| SocketContext | Real-time presence and pulse event subscriptions |
| useProjectPresence | Project-scoped presence via unified socket |

## Usage

### Accessing Pulse

1. **Click the Pulse badge** in the ProjectContextBar
2. Badge shows count like "3 new" or just "Pulse" if no new items

### Using Quick Actions

1. Press **Cmd/Ctrl+K** anywhere in the app
2. Type to search actions
3. Use arrow keys to navigate, Enter to select
4. Actions are context-aware (project-specific when focused)

### Session Memory

Session memory is automatic:
- No user action required
- State persists across page refreshes
- Cleared on explicit logout

## API Reference

### useProjectPulse Hook

```typescript
const {
  activityStream,      // ActivityItem[]
  attentionItems,      // AttentionItem[]
  teamMembers,         // TeamMember[] (from socket presence)
  unseenCount,         // number
  isLoading,           // boolean
  error,               // string | null
  isAvailable,         // boolean (true when project focused)
  isConnected,         // boolean (socket connection status)
  refresh,             // () => void
  markAllSeen,         // () => void
  getAttentionByType,  // (type) => AttentionItem[]
} = useProjectPulse();
```

### useProjectPresence Hook

```typescript
const {
  members,             // ProjectPresenceMember[] (online team members)
  isConnected,         // boolean (socket connection status)
  onlineCount,         // number (count of online members)
  latestPulseEvent,    // PulseEvent | null (most recent event)
  onPulseEvent,        // (callback) => unsubscribe (subscribe to events)
} = useProjectPresence();
```

### useSession Hook

```typescript
const {
  session,             // SessionState
  updateSession,       // (updates: Partial<SessionState>) => void
  markAsSeen,          // () => void
  getTimeSinceLastSeen,// () => number | null
  recordActivity,      // () => void
  isReturningSession,  // boolean
  clearSession,        // () => void
} = useSession();
```

### useQuickActions Hook

```typescript
const {
  isOpen,              // boolean
  open,                // () => void
  close,               // () => void
  toggle,              // () => void
} = useQuickActions();
```

## Socket Unification

### Single Socket Connection

Project Pulse uses the unified `socketService` singleton instead of creating duplicate socket.io connections. This ensures:

- Single WebSocket connection per client
- Consistent connection state across all features
- Proper cleanup on disconnect/reconnect
- No memory leaks from accumulated listeners

### Architecture

```
socketService (singleton)
├── Messaging namespace (/messaging)
├── Project presence (project:join, project:leave, project:presence)
└── Pulse events (pulse:event)

SocketContext (React context)
├── isConnected state
├── joinProject() / leaveProject()
├── onProjectPresence() callback
└── onPulseEvent() callback

useProjectPresence (hook)
├── Uses socketService directly
├── Joins/leaves room on project focus change
├── Tracks presence members
└── Forwards pulse events
```

### Key Files

| File | Purpose |
|------|---------|
| `src/services/socketService.ts` | Socket singleton with project presence methods |
| `src/contexts/SocketContext.tsx` | React context exposing socket capabilities |
| `src/hooks/useProjectPresence.ts` | Project-scoped presence tracking |
| `src/hooks/useProjectPulse.ts` | Aggregates pulse data including presence |

## Backend API Endpoints

### GET /api/projects/:id/pulse/activity

Fetches recent activity for the project. Activity is derived from notifications.

**Query Parameters:**
- `limit` (number, default 50): Maximum items to return
- `cursor` (string, optional): Pagination cursor from previous response

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notification-123",
      "projectId": "proj-456",
      "type": "message_new",
      "actorUserId": "user-789",
      "title": "New message in conversation",
      "entity": {
        "conversationId": "conv-111",
        "messageId": "msg-222"
      },
      "createdAt": "2025-12-14T12:00:00Z",
      "deepLink": "/messages?highlight=conv-111",
      "preview": "Hey, can you review this?",
      "isNew": true
    }
  ],
  "pagination": {
    "cursor": "2025-12-14T11:59:00Z",
    "hasMore": true
  }
}
```

### GET /api/projects/:id/pulse/attention

Fetches items needing user action (mentions, replies, assigned tasks).

**Query Parameters:**
- `limit` (number, default 50): Maximum items to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-123",
      "projectId": "proj-456",
      "reason": "mention",
      "title": "@you was mentioned",
      "description": "Check out this design",
      "entity": {
        "conversationId": "conv-111",
        "messageId": "msg-222"
      },
      "createdAt": "2025-12-14T12:00:00Z",
      "deepLink": "/messages?highlight=conv-111",
      "status": "open",
      "priority": "high"
    }
  ]
}
```

### GET /api/projects/:id/pulse/unseen-count

Returns count of activity since user last viewed pulse.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "lastSeenAt": "2025-12-14T11:00:00Z"
}
```

### POST /api/projects/:id/pulse/mark-seen

Marks all pulse activity as seen. Updates `lastSeenAt` to current time.

**Response:**
```json
{
  "success": true,
  "lastSeenAt": "2025-12-14T12:30:00Z"
}
```

### GET /api/projects/:id/pulse/presence

Returns current online presence for the project.

**Response:**
```json
{
  "success": true,
  "presence": [
    {
      "userId": "user-123",
      "userName": "Alice",
      "joinedAt": "2025-12-14T12:00:00Z",
      "isOnline": true
    }
  ]
}
```

## WebSocket Events

### Real-time Presence

**Client → Server:**
```javascript
// Join project room when focusing
socket.emit('project:join', projectId, { userId, userName });

// Leave project room when unfocusing
socket.emit('project:leave', projectId, { userId, userName });
```

**Server → Client:**
```javascript
// Presence update broadcast to project room
socket.on('project:presence', (data) => {
  // data.projectId: string
  // data.presence: PresenceMember[]
  // data.event: 'join' | 'leave'
  // data.userId: string (who joined/left)
});
```

### Real-time Pulse Events

**Server → Client:**
```javascript
// New activity/attention item (emitted when notifications created)
socket.on('pulse:event', (data) => {
  // data.projectId: string
  // data.type: 'activity' | 'attention'
  // data.event: ActivityItem | AttentionItem
  // data.timestamp: string (ISO)
});
```

The `useProjectPulse` hook automatically subscribes to `pulse:event` and updates the activity stream and attention inbox in real-time.

## Socket Unification & UX Polish Test Plan

### Test 1: Single Socket Verification

**Steps:**
1. Open browser DevTools → Network → WS filter
2. Log in to FluxStudio
3. Navigate to different pages
4. Focus on a project

**Expected:**
- Only ONE WebSocket connection to `/messaging` namespace
- No additional socket connections when focusing project
- Connection persists across navigation

### Test 2: Project Presence Join/Leave

**Steps:**
1. Focus on Project A
2. Check console for "🎯 Joined project: {id}"
3. Switch focus to Project B
4. Check console for "👋 Left project: {oldId}" and "🎯 Joined project: {newId}"
5. Clear project focus

**Expected:**
- Join logged when focusing
- Leave + Join logged when switching
- Leave logged when clearing focus

### Test 3: Offline State Display

**Steps:**
1. Focus on a project
2. Open DevTools → Network → Offline mode
3. Observe PulseIndicator
4. Open PulsePanel

**Expected:**
- PulseIndicator shows amber wifi icon (bottom-right)
- PulseIndicator has reduced opacity
- PulsePanel header shows connection warning
- Team tab shows "Connect to see who is working..."

### Test 4: Keyboard Shortcuts

**Steps:**
1. Focus on a project
2. Press `Cmd/Ctrl+Shift+P`
3. Panel opens
4. Press `Escape`

**Expected:**
- `Cmd/Ctrl+Shift+P` toggles PulsePanel
- `Escape` closes panel when open
- Shortcuts don't fire in input fields

### Test 5: Empty States

**Steps:**
1. Focus on a project with no activity
2. Open PulsePanel
3. Check each tab: Attention, Activity, Team

**Expected:**
- Attention tab: "All caught up!" with green checkmark
- Activity tab: "No recent activity" with clock icon
- Team tab: "No team members online" with context message

### Test 6: Mark as Seen Button

**Steps:**
1. Create some notifications for a project
2. Focus on that project
3. Open PulsePanel
4. Observe header buttons

**Expected:**
- CheckCheck icon button visible when unseenCount > 0
- Button is clickable and marks all as seen
- Button becomes disabled (opacity-50) when count is 0

### Test 7: Memory Leak Prevention

**Steps:**
1. Open/close PulsePanel 10 times rapidly
2. Switch between projects 10 times
3. Check DevTools → Memory → Event Listeners

**Expected:**
- No accumulation of socket event listeners
- Memory usage stays stable
- No console errors about leaked listeners

### Test 8: Focus Clear Resets Pulse

**Steps:**
1. Focus on a project with activity
2. Open PulsePanel, see items
3. Click "Exit Focus" in ProjectContextBar
4. (Optional) Try to open Pulse without focus

**Expected:**
- PulsePanel closes automatically or shows empty state
- Activity/Attention/Team lists are cleared
- PulseIndicator hidden when no focus

## Future Enhancements

1. **Backend Activity Endpoint**: Dedicated API for aggregated activity
2. **Notification Preferences**: Per-project notification settings
3. **Cross-project View**: "All my attention items" across projects
4. **Rich Presence**: Show which tab/view each team member is viewing

## Relationship to Other Features

### Active Project Context

- Pulse only activates when a project is focused
- Extends "which project" to "what's happening in that project"
- Same localStorage persistence pattern

### Project Context Everywhere

- Uses projectId on notifications for filtering
- Uses projectId on conversations for scoping
- Builds on same data model

## Success Metrics

| Metric | Target |
|--------|--------|
| Time from open to meaningful action | < 10 seconds |
| Navigation clicks per session | -40% |
| Context switches to find info | -50% |
| "What changed?" answered without navigation | Yes |

## Manual Test Plan

### Prerequisites

1. Two user accounts (User A, User B)
2. A shared project where both users are members
3. Browser DevTools open for network inspection

### Test 1: Activity Endpoint

**Steps:**
1. Log in as User A
2. Focus on a project
3. Click the Pulse indicator to open the panel
4. Check the Activity tab

**Expected:**
- Network request to `/api/projects/:id/pulse/activity`
- Activity items displayed (if any notifications exist)
- Each item shows type icon, title, timestamp
- Clicking an item navigates to the deepLink

### Test 2: Attention Endpoint

**Steps:**
1. As User B, create a message mentioning User A (e.g., "@userA check this")
2. Switch to User A's session
3. Open the Pulse panel
4. Check the Attention tab

**Expected:**
- Mention appears in attention items
- Shows "Mention" label and appropriate icon
- Priority badge if high/urgent
- Click navigates to conversation

### Test 3: Unseen Count

**Steps:**
1. As User A, open Pulse and click "Mark as Seen"
2. As User B, send a new message in the project
3. Refresh User A's page (don't open Pulse)

**Expected:**
- Pulse indicator shows "1 new" (or badge increments)
- Activity items should have `isNew: true`
- "Mark as Seen" button visible

### Test 4: Mark Seen

**Steps:**
1. With unseen items, click "Mark as Seen" button
2. Refresh the page
3. Open Pulse panel

**Expected:**
- Unseen count resets to 0
- Activity items no longer show "new" indicator
- No "Mark as Seen" button (or disabled)

### Test 5: Team Presence (Sockets)

**Steps:**
1. Log in as User A in Browser 1
2. Log in as User B in Browser 2
3. Both focus on the same project
4. User A opens Pulse and checks Team tab

**Expected:**
- User B appears in team list
- Shows "Online" status with green indicator
- If User B closes their tab, they disappear (after disconnect)

### Test 6: Real-time Updates

**Steps:**
1. User A has Pulse panel open
2. User B sends a new message in the project
3. Watch User A's Activity tab

**Expected:**
- New activity appears at top without refresh
- Item has "new" indicator
- Unseen count increments
- No page reload required

### Test 7: Error Handling

**Steps:**
1. Open DevTools Network tab
2. Block requests to `/pulse/activity` (using DevTools)
3. Open Pulse panel

**Expected:**
- Error message displayed: "Failed to load pulse data"
- Retry button available
- Other tabs still functional if their endpoints work

### Test 8: Pagination (Large Activity)

**Steps:**
1. Create 60+ notifications in a project
2. Open Pulse Activity tab
3. Scroll to bottom

**Expected:**
- Initial load returns ~50 items
- "Load more" or infinite scroll loads older items
- Pagination cursor in network response

### Test 9: Project Switch

**Steps:**
1. Focus on Project A
2. Open Pulse (shows Project A activity)
3. Switch focus to Project B
4. Check Pulse panel

**Expected:**
- Activity/Attention clears and reloads for Project B
- Team presence shows Project B members
- Socket joins Project B room (check DevTools WebSocket)

### Test 10: Cross-tab Consistency

**Steps:**
1. Open same project in two browser tabs
2. Mark as seen in Tab 1
3. Refresh Tab 2

**Expected:**
- Unseen count consistent in both tabs
- Last seen timestamp updated in database
