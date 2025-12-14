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
| SocketContext | Future: real-time presence data |

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
  teamMembers,         // TeamMember[]
  unseenCount,         // number
  isLoading,           // boolean
  error,               // string | null
  isAvailable,         // boolean (true when project focused)
  refresh,             // () => void
  markAllSeen,         // () => void
  getAttentionByType,  // (type) => AttentionItem[]
} = useProjectPulse();
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

## Future Enhancements

1. **Backend Activity Endpoint**: Dedicated API for aggregated activity
2. **Real-time Updates**: WebSocket push for live activity stream
3. **Team Presence Integration**: Full integration with SocketContext
4. **Keyboard Shortcuts**: Additional shortcuts for common actions
5. **Notification Preferences**: Per-project notification settings
6. **Cross-project View**: "All my attention items" across projects

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
