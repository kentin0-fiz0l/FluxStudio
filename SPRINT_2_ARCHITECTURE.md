# Sprint 2: Technical Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              ProjectDetail Page (Route)                 │    │
│  │  /projects/:id                                           │    │
│  └───────────┬────────────────────────────────────────────┘    │
│              │                                                    │
│              ▼                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Tasks Tab                              │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │            TasksToolbar                          │    │  │
│  │  │  [View Toggle] [Filters] [Search] [Create]      │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  │  ┌───────────────────────┐  ┌──────────────────────┐   │  │
│  │  │   TaskListView        │  │   KanbanBoard         │   │  │
│  │  │                       │  │                        │   │  │
│  │  │  ┌──────────────┐    │  │  ┌─────┬─────┬─────┐ │   │  │
│  │  │  │ Task Row     │    │  │  │ To  │ In  │Done │ │   │  │
│  │  │  │ [Inline Edit]│    │  │  │ Do  │Prog │     │ │   │  │
│  │  │  └──────────────┘    │  │  │ ┌─┐ │ ┌─┐ │ ┌─┐ │ │   │  │
│  │  │  ┌──────────────┐    │  │  │ │T││ │T││ │T││ │ │   │  │
│  │  │  │ Task Row     │    │  │  │ └─┘ │ └─┘ │ └─┘ │ │   │  │
│  │  │  └──────────────┘    │  │  └─────┴─────┴─────┘ │   │  │
│  │  └───────────────────────┘  └──────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            TaskDetailModal (Portal)                       │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │  Title: _______________________________        │     │  │
│  │  │  Description: [Rich Text Editor]               │     │  │
│  │  │  Status: [Dropdown] Priority: [Dropdown]       │     │  │
│  │  │  Assignee: [User Select]                       │     │  │
│  │  │                                                 │     │  │
│  │  │  ┌─────────────────────────────────────┐      │     │  │
│  │  │  │      TaskComments                    │      │     │  │
│  │  │  │  @user Great work! [Send]            │      │     │  │
│  │  │  │  • Comment 1                         │      │     │  │
│  │  │  │  • Comment 2                         │      │     │  │
│  │  │  └─────────────────────────────────────┘      │     │  │
│  │  │                                                 │     │  │
│  │  │  [Save] [Cancel]                               │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ HTTP + WebSocket
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                      BACKEND (Express)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                REST API Endpoints                         │  │
│  │                                                            │  │
│  │  POST   /api/projects/:id/tasks         (Create)         │  │
│  │  GET    /api/projects/:id/tasks         (List)           │  │
│  │  PUT    /api/tasks/:id                  (Update)         │  │
│  │  DELETE /api/tasks/:id                  (Delete)         │  │
│  │  GET    /api/projects/:id/tasks/search  (Search)         │  │
│  │                                                            │  │
│  │  POST   /api/tasks/:id/comments         (Create)         │  │
│  │  GET    /api/tasks/:id/comments         (List)           │  │
│  │                                                            │  │
│  │  GET    /api/projects/:id/activity      (Activity Feed)  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              WebSocket Server (Socket.io)                 │  │
│  │                                                            │  │
│  │  Rooms: project:{projectId}                               │  │
│  │                                                            │  │
│  │  Events:                                                   │  │
│  │    • project:join / project:leave                         │  │
│  │    • task:update → task:updated (broadcast)               │  │
│  │    • comment:create → comment:created (broadcast)         │  │
│  │    • comment:typing → user:typing (broadcast)             │  │
│  │    • presence:update → user presence tracking             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Middleware Layer                        │  │
│  │                                                            │  │
│  │  • authenticate           (JWT verification)              │  │
│  │  • validateTaskData       (XSS prevention, validation)    │  │
│  │  • rateLimiting           (Prevent abuse)                 │  │
│  │  • errorHandler           (Standardized errors)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ SQL Queries
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                   DATA LAYER (Sprint 2: Design)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐         ┌──────────────────────────┐  │
│  │   Current (Sprint 1) │         │   Future (Sprint 3+)     │  │
│  │                      │         │                          │  │
│  │   JSON Files         │  ───→   │   PostgreSQL Database    │  │
│  │   • projects.json    │         │   • tasks table          │  │
│  │   • tasks.json       │         │   • comments table       │  │
│  │   • messages.json    │         │   • activities table     │  │
│  │                      │         │   • Full-text search     │  │
│  │   (In-memory)        │         │   • Transactions         │  │
│  └─────────────────────┘         └──────────────────────────┘  │
│                                                                   │
│  Sprint 2: Dual-write strategy (write to both)                  │
│  Sprint 3: Full migration                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Creating a Task

```
User Types Task Title
       │
       ▼
┌──────────────────────┐
│ TaskDetailModal      │
│ (React Component)    │
│                      │
│ [Form Validation]    │
└──────┬───────────────┘
       │
       │ useTasks.createTask()
       │
       ▼
┌──────────────────────┐
│ React Query          │
│ (Data Layer)         │
│                      │
│ 1. Optimistic Update │ ◄─── Shows task immediately in UI
│    (Add temp task)   │
│                      │
│ 2. API Call          │
└──────┬───────────────┘
       │
       │ POST /api/projects/:id/tasks
       │ + JWT Token
       │ + Task Data (validated on client)
       │
       ▼
┌──────────────────────┐
│ Express Server       │
│                      │
│ 1. authenticate()    │ ◄─── Verify JWT
│ 2. validateTaskData()│ ◄─── XSS prevention, validation
│ 3. createTask()      │ ◄─── Business logic
└──────┬───────────────┘
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────────┐    ┌────────────────────┐
│ Save to Database │    │ WebSocket Broadcast│
│ (JSON / Postgres)│    │                    │
│                  │    │ io.to(projectRoom) │
│ • Write task     │    │   .emit('task:     │
│ • Update project │    │    created', task) │
│ • Create activity│    └─────────┬──────────┘
└──────┬───────────┘              │
       │                          │
       │ Return task              │ Broadcast to all
       │ with ID                  │ connected users
       │                          │
       ▼                          ▼
┌──────────────────────┐  ┌─────────────────────┐
│ Client (User A)      │  │ Client (User B, C)  │
│                      │  │                      │
│ 3. Replace temp ID   │  │ 1. Receive event    │
│    with real ID      │  │ 2. Add task to state│
│ 4. Mark as saved     │  │ 3. Show toast       │
│    (remove spinner)  │  │    "User A created  │
└──────────────────────┘  │     a task"         │
                           └─────────────────────┘
```

---

## Data Flow: Real-Time Task Update

```
User A: Drags task from "To Do" → "In Progress"
       │
       ▼
┌──────────────────────┐
│ KanbanBoard          │
│ (React Component)    │
│                      │
│ onTaskMove()         │
└──────┬───────────────┘
       │
       │ 1. Optimistic Update
       │    (Move task in UI immediately)
       │
       │ 2. WebSocket Emit
       │
       ▼
┌──────────────────────┐
│ WebSocket Client     │
│                      │
│ socket.emit(         │
│   'task:update',     │
│   {                  │
│     taskId,          │
│     changes: {       │
│       status: 'in_   │
│         progress'    │
│     },               │
│     version: 3       │ ◄─── For conflict detection
│   }                  │
│ )                    │
└──────┬───────────────┘
       │
       │ WebSocket connection
       │
       ▼
┌──────────────────────┐
│ WebSocket Server     │
│ (Socket.io)          │
│                      │
│ 1. Authenticate      │
│ 2. Validate changes  │
│ 3. Check version     │ ◄─── Detect conflicts
└──────┬───────────────┘
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────────┐    ┌────────────────────┐
│ Update Database  │    │ Broadcast Update   │
│                  │    │                    │
│ • Save changes   │    │ socket.to(         │
│ • Increment      │    │   projectRoom      │
│   version (4)    │    │ ).emit('task:      │
│ • Create activity│    │   updated', ...)   │
└──────────────────┘    └─────────┬──────────┘
                                  │
                                  │ Real-time broadcast
                                  │ (excludes sender)
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
       ▼                          ▼                          ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ User B       │        │ User C       │        │ User D       │
│ (Online)     │        │ (Online)     │        │ (Offline)    │
│              │        │              │        │              │
│ socket.on(   │        │ socket.on(   │        │ [Reconnects] │
│  'task:      │        │  'task:      │        │              │
│   updated'   │        │   updated'   │        │ Fetches all  │
│ )            │        │ )            │        │ missed       │
│              │        │              │        │ updates      │
│ Update UI    │        │ Update UI    │        └──────────────┘
│ Show toast   │        │ Show toast   │
└──────────────┘        └──────────────┘
```

---

## Component Tree

```
ProjectDetail (Page)
│
├── ProjectHeader
│   ├── BackButton
│   ├── ProjectTitle
│   ├── StatusBadge
│   ├── PriorityBadge
│   └── ProjectActions
│       ├── SettingsButton
│       └── MoreButton
│
├── TabNavigation (Sticky)
│   ├── OverviewTab
│   ├── TasksTab ◄─── Sprint 2 Focus
│   ├── FilesTab
│   └── MessagesTab
│
└── TabContent
    │
    └── TasksTab
        │
        ├── TasksToolbar
        │   ├── ViewToggle
        │   │   ├── ListViewButton
        │   │   └── KanbanViewButton
        │   ├── TaskFilters
        │   │   ├── StatusFilter
        │   │   ├── AssigneeFilter
        │   │   ├── PriorityFilter
        │   │   └── DateFilter
        │   ├── TaskSearch
        │   │   └── SearchInput
        │   └── CreateTaskButton
        │
        ├── TaskListView (conditional)
        │   ├── TableHeader
        │   │   └── SortableColumn[]
        │   └── TaskRow[]
        │       ├── TaskCheckbox
        │       ├── TaskTitle
        │       ├── StatusDropdown (inline edit)
        │       ├── AssigneeAvatar
        │       ├── PriorityBadge
        │       ├── DueDate
        │       └── RowActions
        │
        └── KanbanBoard (conditional)
            ├── KanbanColumn[]
            │   ├── ColumnHeader
            │   │   ├── ColumnTitle
            │   │   ├── TaskCount
            │   │   └── ColumnActions
            │   └── TaskCard[] (draggable)
            │       ├── TaskTitle
            │       ├── TaskDescription (truncated)
            │       ├── PriorityBadge
            │       ├── AssigneeAvatar
            │       ├── DueDate
            │       ├── CommentsCount
            │       └── AttachmentsCount
            │
            └── DragOverlay
                └── GhostCard

[Portal]
TaskDetailModal (when opened)
│
├── ModalHeader
│   ├── TaskTitle (editable)
│   └── CloseButton
│
├── ModalBody
│   ├── TaskForm
│   │   ├── TitleInput
│   │   ├── DescriptionEditor (RichText)
│   │   ├── StatusSelect
│   │   ├── PrioritySelect
│   │   ├── AssigneeSelect
│   │   ├── DueDatePicker
│   │   ├── LabelsInput
│   │   └── AttachmentsSection
│   │       ├── FileUpload
│   │       └── AttachmentList
│   │
│   ├── TaskComments
│   │   ├── CommentInput
│   │   │   ├── RichTextEditor
│   │   │   ├── MentionAutocomplete
│   │   │   └── SendButton
│   │   └── CommentList
│   │       └── Comment[]
│   │           ├── CommentAuthor
│   │           ├── CommentContent
│   │           ├── CommentActions
│   │           └── CommentTimestamp
│   │
│   └── ActivityTimeline
│       └── ActivityItem[]
│           ├── ActivityIcon
│           ├── ActivityDescription
│           └── ActivityTimestamp
│
└── ModalFooter
    ├── DeleteButton
    ├── CancelButton
    └── SaveButton
```

---

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application State                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             Server State (React Query)               │  │
│  │                                                       │  │
│  │  Query Keys:                                          │  │
│  │    ['projects', projectId]                           │  │
│  │    ['tasks', projectId]                              │  │
│  │    ['task', taskId]                                  │  │
│  │    ['comments', taskId]                              │  │
│  │    ['activity', projectId]                           │  │
│  │                                                       │  │
│  │  Caching:                                             │  │
│  │    staleTime: 30s (tasks, projects)                  │  │
│  │    staleTime: 5m (users, teams)                      │  │
│  │                                                       │  │
│  │  Optimistic Updates:                                 │  │
│  │    onMutate: Update cache immediately                │  │
│  │    onError: Rollback cache                           │  │
│  │    onSuccess: Invalidate queries                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              UI State (React useState)               │  │
│  │                                                       │  │
│  │  • activeTab: 'tasks'                                │  │
│  │  • viewMode: 'kanban' | 'list'                       │  │
│  │  • filters: TaskFilter[]                             │  │
│  │  • searchQuery: string                               │  │
│  │  • selectedTaskId: string | null                     │  │
│  │  • isModalOpen: boolean                              │  │
│  │  • sortBy: string                                    │  │
│  │  • sortOrder: 'asc' | 'desc'                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Collaboration State (WebSocket)             │  │
│  │                                                       │  │
│  │  • onlineUsers: Map<userId, presence>                │  │
│  │  • typingUsers: Map<taskId, userId[]>                │  │
│  │  • pendingUpdates: TaskUpdate[]                      │  │
│  │  • connectionStatus: 'connected' | 'reconnecting'    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Global State (Context)                  │  │
│  │                                                       │  │
│  │  • AuthContext                                        │  │
│  │    - user: User                                       │  │
│  │    - token: string                                    │  │
│  │                                                       │  │
│  │  • WebSocketContext                                   │  │
│  │    - socket: Socket                                   │  │
│  │    - isConnected: boolean                             │  │
│  │    - emit() / on() methods                            │  │
│  │                                                       │  │
│  │  • ThemeContext                                       │  │
│  │    - theme: 'light' | 'dark'                          │  │
│  │    - toggleTheme()                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (PostgreSQL)

```
┌─────────────────────────────────────────────────────────────┐
│                       tasks (table)                          │
├─────────────────────────────────────────────────────────────┤
│ id                UUID PRIMARY KEY                           │
│ project_id        UUID NOT NULL → projects(id)              │
│ title             VARCHAR(255) NOT NULL                      │
│ description       TEXT                                       │
│ status            VARCHAR(50) NOT NULL DEFAULT 'todo'        │
│ priority          VARCHAR(50) NOT NULL DEFAULT 'medium'      │
│ assigned_to       UUID → users(id)                          │
│ due_date          TIMESTAMP WITH TIME ZONE                   │
│ start_date        TIMESTAMP WITH TIME ZONE                   │
│ estimated_hours   DECIMAL(10,2)                              │
│ actual_hours      DECIMAL(10,2)                              │
│ labels            TEXT[] DEFAULT '{}'                        │
│ position          INTEGER NOT NULL DEFAULT 0                 │
│ version           INTEGER NOT NULL DEFAULT 1                 │
│ created_by        UUID NOT NULL → users(id)                 │
│ created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()     │
│ updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()     │
│ completed_at      TIMESTAMP WITH TIME ZONE                   │
├─────────────────────────────────────────────────────────────┤
│ Indexes:                                                     │
│   idx_tasks_project_id (project_id)                         │
│   idx_tasks_assigned_to (assigned_to)                       │
│   idx_tasks_status (status)                                 │
│   idx_tasks_due_date (due_date) WHERE due_date IS NOT NULL  │
│   idx_tasks_labels (labels) USING GIN                       │
│   idx_tasks_search (title, description) USING GIN           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     comments (table)                         │
├─────────────────────────────────────────────────────────────┤
│ id                UUID PRIMARY KEY                           │
│ task_id           UUID NOT NULL → tasks(id) ON DELETE CASCADE│
│ author_id         UUID NOT NULL → users(id)                 │
│ content           TEXT NOT NULL                              │
│ mentions          UUID[] DEFAULT '{}'                        │
│ created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()     │
│ updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()     │
│ deleted_at        TIMESTAMP WITH TIME ZONE                   │
├─────────────────────────────────────────────────────────────┤
│ Indexes:                                                     │
│   idx_comments_task_id (task_id) WHERE deleted_at IS NULL   │
│   idx_comments_author_id (author_id)                        │
│   idx_comments_mentions (mentions) USING GIN                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    activities (table)                        │
├─────────────────────────────────────────────────────────────┤
│ id                UUID PRIMARY KEY                           │
│ project_id        UUID NOT NULL → projects(id) ON DELETE CASCADE│
│ actor_id          UUID NOT NULL → users(id)                 │
│ action            VARCHAR(100) NOT NULL                      │
│ entity_type       VARCHAR(50) NOT NULL                       │
│ entity_id         UUID NOT NULL                              │
│ changes           JSONB                                      │
│ metadata          JSONB                                      │
│ created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()     │
├─────────────────────────────────────────────────────────────┤
│ Indexes:                                                     │
│   idx_activities_project_id (project_id, created_at DESC)   │
│   idx_activities_entity (entity_type, entity_id)            │
│   idx_activities_actor_id (actor_id)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Sprint 2 Implementation Flow

```
Week 1: Core Task UI
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Day 1          Day 2          Day 3          Day 4   Day 5  │
│  ─────────────  ─────────────  ─────────────  ──────  ───── │
│  TaskListView → KanbanBoard → Drag & Drop  → Modal → Tests  │
│                                                               │
│  • Table        • Layout       • @dnd-kit     • Form  • API  │
│  • Sorting      • Columns      • Keyboard     • Rich  • Hook │
│  • Inline Edit  • Card Style   • Accessible   • Text • Bugs │
│                                • Optimistic   • Upload       │
│                                                               │
│  Deliverable: Functional task UI (offline-capable)           │
└─────────────────────────────────────────────────────────────┘

Week 2: Real-Time Collaboration
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Day 6         Day 7          Day 8          Day 9    Day 10 │
│  ────────────  ─────────────  ─────────────  ──────  ────── │
│  WebSocket  → Comments     → Activity     → Search → Polish  │
│                                                               │
│  • Rooms       • API          • Timeline     • Filters       │
│  • Presence    • Component    • Real-time    • Presets       │
│  • Broadcast   • @mentions    • Infinite     • URL State     │
│  • Conflicts   • Notifications • Scroll                      │
│                                                               │
│  Deliverable: Real-time collaborative task management        │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Optimization Strategy

### 1. Virtual Scrolling (react-window)
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={tasks.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TaskRow task={tasks[index]} />
    </div>
  )}
</FixedSizeList>
```

### 2. Memoization
```typescript
const filteredTasks = useMemo(() => {
  return tasks.filter(task =>
    filters.every(filter => matchesFilter(task, filter))
  );
}, [tasks, filters]);

const TaskCard = React.memo(({ task }) => {
  // Component only re-renders if task changes
  return <div>{task.title}</div>;
});
```

### 3. Code Splitting
```typescript
const TaskDetailModal = lazy(() => import('./TaskDetailModal'));
const RichTextEditor = lazy(() => import('./RichTextEditor'));

// Lazy load when opened
{isModalOpen && (
  <Suspense fallback={<Spinner />}>
    <TaskDetailModal />
  </Suspense>
)}
```

### 4. React Query Caching
```typescript
const { data: tasks } = useQuery({
  queryKey: ['tasks', projectId],
  queryFn: () => fetchTasks(projectId),
  staleTime: 30000, // Cache for 30 seconds
  cacheTime: 300000, // Keep in cache for 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});
```

### 5. WebSocket Batching
```typescript
// Batch multiple updates into single message
const updateQueue = [];
const flushInterval = 100; // ms

function queueUpdate(update) {
  updateQueue.push(update);

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      socket.emit('task:batch_update', updateQueue);
      updateQueue.length = 0;
      flushTimer = null;
    }, flushInterval);
  }
}
```

---

## Security Considerations

### 1. Input Validation
```typescript
// Client-side
const schema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(10000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

// Server-side (ALWAYS validate)
app.post('/api/tasks', validateTaskData, async (req, res) => {
  const sanitized = DOMPurify.sanitize(req.body.title);
  // ... create task
});
```

### 2. WebSocket Authentication
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});
```

### 3. Rate Limiting
```typescript
const taskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many task operations, please slow down'
});

app.post('/api/tasks', taskLimiter, createTask);
```

---

**End of Architecture Document**
