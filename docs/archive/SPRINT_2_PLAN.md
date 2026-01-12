# Sprint 2: Task Management UI & Real-Time Collaboration
**Flux Studio Project Management - Sprint 2 Roadmap**

**Sprint Duration**: 2 weeks (10 working days)
**Target Completion**: November 1, 2025
**Status**: Planning Complete - Ready to Start
**Dependencies**: Sprint 1 Complete (Backend API deployed)

---

## Executive Summary

Sprint 2 transforms Flux Studio from a basic project tracking system into a production-ready, collaborative project management platform. We'll build the Task Management UI (Kanban board + list views), integrate real-time WebSocket collaboration, and begin the PostgreSQL migration.

**Key Deliverables**:
1. Task Management UI (Kanban board, list view, task detail modal)
2. Real-time collaboration (WebSocket integration, live updates, presence)
3. Database migration Phase 1 (schema design, migration scripts)
4. Comments & activity feed
5. Advanced filtering & search

**Success Metric**: Users can create, assign, and track tasks in real-time with team collaboration.

---

## Table of Contents

1. [Sprint Goals & Objectives](#sprint-goals--objectives)
2. [Feature Breakdown & Prioritization](#feature-breakdown--prioritization)
3. [Technical Architecture](#technical-architecture)
4. [Week-by-Week Timeline](#week-by-week-timeline)
5. [Data Models & Schema](#data-models--schema)
6. [API Specifications](#api-specifications)
7. [WebSocket Protocol](#websocket-protocol)
8. [UI Component Architecture](#ui-component-architecture)
9. [Performance Requirements](#performance-requirements)
10. [Dependencies & Risks](#dependencies--risks)
11. [Success Metrics](#success-metrics)
12. [Testing Strategy](#testing-strategy)

---

## Sprint Goals & Objectives

### Primary Goals

**Goal 1: Build Task Management UI**
- Create Kanban board with drag-and-drop
- Implement list view with sorting/filtering
- Build task detail modal with full CRUD
- Ensure WCAG 2.1 Level A compliance

**Goal 2: Enable Real-Time Collaboration**
- Integrate existing WebSocket infrastructure
- Implement live task updates across users
- Add user presence indicators
- Enable real-time commenting

**Goal 3: Prepare Database Migration**
- Design PostgreSQL schema
- Create migration scripts
- Implement dual-write strategy
- Test data integrity

### Secondary Goals

**Goal 4: Activity Feed & Comments**
- Project activity timeline
- Task comments with mentions
- Real-time notifications

**Goal 5: Search & Filtering**
- Full-text task search
- Advanced filters (assignee, status, priority, date)
- Saved filter presets

---

## Feature Breakdown & Prioritization

### Priority 1: MUST HAVE (Week 1)

#### 1.1 Task List View Component
**Estimated Effort**: 1.5 days
**Owner**: Frontend Team
**Dependencies**: Sprint 1 Task API

**Requirements**:
- Display all project tasks in a table/list format
- Columns: Task name, status, assignee, priority, due date
- Inline editing for quick updates
- Bulk selection for batch operations
- Keyboard navigation (arrow keys, Enter to edit)
- ARIA labels for screen readers

**Technical Specs**:
```typescript
// src/components/tasks/TaskListView.tsx
interface TaskListViewProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskCreate: () => void;
  loading?: boolean;
  error?: Error | null;
}

// Features
- Sortable columns (click header to sort)
- Resizable columns (drag column divider)
- Row actions dropdown (edit, delete, duplicate)
- Empty state with "Create Task" CTA
- Loading skeleton for better UX
```

**Acceptance Criteria**:
- [ ] Can view all tasks with complete information
- [ ] Can sort by any column
- [ ] Can inline-edit task status and priority
- [ ] Keyboard navigation works (Tab, arrows, Enter, Escape)
- [ ] Screen reader announces task count and updates
- [ ] Performance: Renders 100+ tasks in < 500ms

---

#### 1.2 Kanban Board View
**Estimated Effort**: 2 days
**Owner**: Frontend Team
**Dependencies**: Task List View, react-beautiful-dnd or @dnd-kit

**Requirements**:
- 4 default columns: To Do, In Progress, Review, Done
- Customizable columns (add/remove/rename)
- Drag-and-drop tasks between columns
- Task card with key info (title, assignee, due date, priority)
- Visual indicators (overdue tasks, blocked tasks)
- Swimlanes (optional: group by assignee or priority)
- Mobile-responsive (swipe gestures on touch devices)

**Technical Specs**:
```typescript
// src/components/tasks/KanbanBoard.tsx
interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  columns: KanbanColumn[];
  onTaskMove: (taskId: string, fromColumn: string, toColumn: string) => void;
  onColumnUpdate: (columns: KanbanColumn[]) => void;
  groupBy?: 'status' | 'assignee' | 'priority';
  viewMode?: 'compact' | 'detailed';
}

interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus;
  color: string;
  limit?: number; // WIP limit
  taskIds: string[];
}

// Use @dnd-kit/core for accessibility-first drag-and-drop
import { DndContext, DragOverlay, PointerSensor } from '@dnd-kit/core';
```

**Accessibility Requirements**:
- Keyboard drag-and-drop (Space to pick up, arrows to move, Space to drop)
- Screen reader announces column changes
- Focus management during drag operations
- ARIA live region for status updates

**Performance Requirements**:
- Smooth 60fps animations
- Virtual scrolling for columns with 50+ tasks
- Optimistic updates (update UI immediately, sync with server)

**Acceptance Criteria**:
- [ ] Can drag tasks between columns
- [ ] Task status updates automatically on drop
- [ ] Keyboard drag-and-drop works
- [ ] Visual feedback during drag (ghost card, drop zone highlight)
- [ ] Undo action for accidental moves
- [ ] Persists column customizations per user
- [ ] Mobile: Swipe to move between adjacent columns

---

#### 1.3 Task Detail Modal
**Estimated Effort**: 1.5 days
**Owner**: Frontend Team
**Dependencies**: Task List View

**Requirements**:
- Full task CRUD within modal
- Fields: Title, description (rich text), status, priority, assignee, due date, labels
- Attachment upload (images, PDFs, documents)
- Comments section (real-time updates)
- Activity history
- Related tasks/dependencies
- Keyboard shortcuts (Cmd+Enter to save, Escape to close)

**Technical Specs**:
```typescript
// src/components/tasks/TaskDetailModal.tsx
interface TaskDetailModalProps {
  taskId: string | null; // null = create new task
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

// Rich text editor: TipTap or Lexical
// File upload: Drag-and-drop with progress indicator
// Real-time: Subscribe to task updates via WebSocket
```

**Acceptance Criteria**:
- [ ] Can create new task with all fields
- [ ] Can edit existing task
- [ ] Rich text formatting works (bold, italic, lists, links)
- [ ] Can upload and preview attachments
- [ ] Comments appear in real-time
- [ ] Focus trap within modal
- [ ] Escape key closes modal (with unsaved changes warning)
- [ ] Form validation with inline error messages

---

#### 1.4 Task API Integration
**Estimated Effort**: 1 day
**Owner**: Frontend + Backend Team
**Dependencies**: Sprint 1 Task API

**Requirements**:
- React hooks for task CRUD operations
- Optimistic updates with rollback on error
- Loading and error states
- Caching with React Query or SWR
- WebSocket integration for real-time updates

**Technical Specs**:
```typescript
// src/hooks/useTasks.ts
export function useTasks(projectId: string) {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => fetchTasks(projectId),
    staleTime: 30000, // 30 seconds
  });

  const createTask = useMutation({
    mutationFn: (newTask: Partial<Task>) => createTaskAPI(projectId, newTask),
    onMutate: async (newTask) => {
      // Optimistic update
      await queryClient.cancelQueries(['tasks', projectId]);
      const previous = queryClient.getQueryData(['tasks', projectId]);

      queryClient.setQueryData(['tasks', projectId], (old: Task[]) => [
        ...old,
        { ...newTask, id: `temp-${Date.now()}`, status: 'saving' }
      ]);

      return { previous };
    },
    onError: (err, newTask, context) => {
      // Rollback on error
      queryClient.setQueryData(['tasks', projectId], context?.previous);
      toast.error('Failed to create task. Please try again.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId]);
    },
  });

  return { tasks, isLoading, error, createTask, updateTask, deleteTask };
}

// WebSocket integration
useEffect(() => {
  const unsubscribe = subscribeToTaskUpdates(projectId, (update) => {
    queryClient.setQueryData(['tasks', projectId], (old: Task[]) =>
      old.map(task => task.id === update.taskId ? { ...task, ...update.changes } : task)
    );
  });

  return unsubscribe;
}, [projectId]);
```

**Acceptance Criteria**:
- [ ] All CRUD operations work
- [ ] Optimistic updates provide instant feedback
- [ ] Errors display user-friendly messages
- [ ] Real-time updates from other users appear automatically
- [ ] Handles race conditions (multiple users editing same task)

---

### Priority 2: SHOULD HAVE (Week 2)

#### 2.1 Real-Time Collaboration Infrastructure
**Estimated Effort**: 2 days
**Owner**: Backend Team
**Dependencies**: Existing WebSocket server (socket.io)

**Requirements**:
- WebSocket rooms per project
- Broadcast task updates to all project members
- User presence tracking (online/away/offline)
- Typing indicators for comments
- Conflict resolution for simultaneous edits

**Technical Specs**:
```javascript
// server.js - WebSocket handlers
io.on('connection', (socket) => {
  // Join project room
  socket.on('project:join', ({ projectId, userId }) => {
    socket.join(`project:${projectId}`);

    // Broadcast user joined
    socket.to(`project:${projectId}`).emit('user:joined', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Track presence
    onlineUsers.set(userId, {
      socketId: socket.id,
      projectId,
      status: 'online',
      lastActive: Date.now()
    });
  });

  // Task updates
  socket.on('task:update', ({ projectId, taskId, changes, userId }) => {
    // Save to database
    updateTask(taskId, changes);

    // Broadcast to all users in project (except sender)
    socket.to(`project:${projectId}`).emit('task:updated', {
      taskId,
      changes,
      updatedBy: userId,
      timestamp: new Date().toISOString()
    });
  });

  // Typing indicators
  socket.on('comment:typing', ({ projectId, taskId, userId, isTyping }) => {
    socket.to(`project:${projectId}`).emit('user:typing', {
      taskId,
      userId,
      isTyping
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = Array.from(onlineUsers.entries())
      .find(([_, data]) => data.socketId === socket.id);

    if (user) {
      const [userId, userData] = user;
      onlineUsers.delete(userId);

      socket.to(`project:${userData.projectId}`).emit('user:left', {
        userId,
        timestamp: new Date().toISOString()
      });
    }
  });
});
```

**Acceptance Criteria**:
- [ ] Users see real-time task updates
- [ ] Presence indicators show who's online
- [ ] Typing indicators work in comments
- [ ] Handles reconnection gracefully
- [ ] No duplicate updates when multiple tabs open

---

#### 2.2 Comments System
**Estimated Effort**: 1.5 days
**Owner**: Full Stack Team
**Dependencies**: Task Detail Modal, WebSocket

**Requirements**:
- Add comments to tasks
- @mentions for team members
- Rich text formatting
- Edit/delete own comments
- Real-time updates
- Unread comment indicators

**Database Schema**:
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT content_length CHECK (length(content) <= 10000)
);

CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_mentions ON comments USING GIN(mentions);
```

**API Endpoints**:
```javascript
// POST /api/tasks/:taskId/comments
app.post('/api/tasks/:taskId/comments', authenticate, validateCommentData, async (req, res) => {
  const { content, mentions } = req.body;
  const { taskId } = req.params;

  const comment = await createComment({
    taskId,
    authorId: req.user.id,
    content,
    mentions
  });

  // Send real-time notification to mentioned users
  mentions.forEach(userId => {
    createNotification('comment_mention', userId, {
      taskId,
      commentId: comment.id,
      mentionedBy: req.user.name
    });
  });

  // Broadcast to project room
  io.to(`project:${task.projectId}`).emit('comment:created', comment);

  res.status(201).json(comment);
});

// GET /api/tasks/:taskId/comments
// PUT /api/comments/:commentId
// DELETE /api/comments/:commentId
```

**Acceptance Criteria**:
- [ ] Can add comments to tasks
- [ ] @mentions autocomplete from team members
- [ ] Mentioned users receive notification
- [ ] Comments appear in real-time
- [ ] Can edit/delete own comments within 15 minutes
- [ ] Deleted comments show "[deleted]" placeholder

---

#### 2.3 Activity Feed
**Estimated Effort**: 1 day
**Owner**: Frontend Team
**Dependencies**: Comments, Task updates

**Requirements**:
- Timeline of all project activity
- Grouped by date (Today, Yesterday, Last 7 days)
- Filter by activity type (tasks, comments, status changes)
- Infinite scroll for pagination
- Real-time updates

**Technical Specs**:
```typescript
// src/components/projects/ActivityFeed.tsx
interface ActivityFeedProps {
  projectId: string;
  filters?: ActivityFilter[];
  limit?: number;
}

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_updated' | 'comment_added' | 'status_changed' | 'member_added';
  actor: User;
  target: Task | Comment | Project;
  changes?: Record<string, { old: any; new: any }>;
  timestamp: string;
}

// Render activity with human-readable descriptions
function renderActivity(item: ActivityItem) {
  switch (item.type) {
    case 'task_created':
      return <>{item.actor.name} created task "{item.target.title}"</>;
    case 'status_changed':
      return (
        <>
          {item.actor.name} moved "{item.target.title}" from{' '}
          <Badge>{item.changes.status.old}</Badge> to{' '}
          <Badge>{item.changes.status.new}</Badge>
        </>
      );
    // ... more cases
  }
}
```

**Acceptance Criteria**:
- [ ] Shows all project activity in chronological order
- [ ] Groups by relative date
- [ ] Can filter by activity type
- [ ] Infinite scroll loads more activities
- [ ] Real-time updates appear at top
- [ ] Performance: Renders 50 activities in < 300ms

---

#### 2.4 Advanced Filtering & Search
**Estimated Effort**: 1.5 days
**Owner**: Frontend + Backend Team
**Dependencies**: Task List View

**Requirements**:
- Full-text search across task titles and descriptions
- Filter by: status, assignee, priority, labels, due date
- Multiple filter combinations (AND/OR logic)
- Save filter presets for quick access
- URL state for shareable filtered views

**Technical Specs**:
```typescript
// src/components/tasks/TaskFilters.tsx
interface TaskFiltersProps {
  projectId: string;
  onFilterChange: (filters: TaskFilter[]) => void;
  savedPresets?: FilterPreset[];
  onSavePreset: (name: string, filters: TaskFilter[]) => void;
}

interface TaskFilter {
  field: 'status' | 'assignee' | 'priority' | 'labels' | 'dueDate';
  operator: 'equals' | 'not_equals' | 'contains' | 'before' | 'after';
  value: any;
  logic?: 'AND' | 'OR';
}

// Backend: Full-text search with PostgreSQL
// GET /api/projects/:id/tasks/search?q=design&status=in_progress&assignee=user-123
app.get('/api/projects/:id/tasks/search', authenticate, async (req, res) => {
  const { q, status, assignee, priority, dueDate } = req.query;

  let query = `
    SELECT * FROM tasks
    WHERE project_id = $1
  `;
  const params = [req.params.id];

  if (q) {
    query += ` AND (title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
    params.push(`%${q}%`);
  }

  if (status) {
    query += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  // ... more filters

  const tasks = await db.query(query, params);
  res.json(tasks.rows);
});
```

**Acceptance Criteria**:
- [ ] Search returns results within 500ms
- [ ] Multiple filters work together correctly
- [ ] Can save and load filter presets
- [ ] URL updates with filters (shareable links)
- [ ] Clear all filters button
- [ ] Active filters shown as removable chips

---

### Priority 3: NICE TO HAVE (If Time Permits)

#### 3.1 Task Dependencies
**Estimated Effort**: 1 day
**Requirements**: Mark tasks as dependent on others, visualize dependency graph

#### 3.2 Custom Task Fields
**Estimated Effort**: 1.5 days
**Requirements**: Add custom fields per project (text, number, date, dropdown)

#### 3.3 Task Templates
**Estimated Effort**: 1 day
**Requirements**: Save tasks as templates, create from template with pre-filled values

#### 3.4 Bulk Operations
**Estimated Effort**: 0.5 days
**Requirements**: Select multiple tasks, bulk update status/assignee/priority

---

## Technical Architecture

### Frontend Architecture

```
src/
├── components/
│   ├── tasks/
│   │   ├── TaskListView.tsx          # Table/list view
│   │   ├── KanbanBoard.tsx           # Drag-and-drop board
│   │   ├── KanbanColumn.tsx          # Single column
│   │   ├── TaskCard.tsx              # Card in Kanban
│   │   ├── TaskDetailModal.tsx       # Full task editor
│   │   ├── TaskFilters.tsx           # Filter controls
│   │   ├── TaskSearch.tsx            # Search input
│   │   ├── CreateTaskButton.tsx      # Quick create
│   │   └── TaskComments.tsx          # Comments section
│   ├── projects/
│   │   ├── ActivityFeed.tsx          # Activity timeline
│   │   └── ProjectPresence.tsx       # Online users
│   └── ui/
│       ├── DragDropContext.tsx       # Drag-and-drop wrapper
│       └── RichTextEditor.tsx        # Rich text input
├── hooks/
│   ├── useTasks.ts                   # Task CRUD + cache
│   ├── useTaskFilters.ts             # Filter state
│   ├── useTaskSearch.ts              # Search logic
│   ├── useRealtimeUpdates.ts         # WebSocket integration
│   └── usePresence.ts                # Online users
├── contexts/
│   ├── WebSocketContext.tsx          # WebSocket connection
│   └── CollaborationContext.tsx      # Shared state
└── utils/
    ├── taskHelpers.ts                # Task utilities
    └── conflictResolution.ts         # Handle edit conflicts
```

### Backend Architecture

```
server/
├── routes/
│   ├── tasks.js                      # Task CRUD endpoints
│   ├── comments.js                   # Comment endpoints
│   └── activity.js                   # Activity feed
├── middleware/
│   ├── validation.js                 # ✅ Already exists
│   ├── rateLimiting.js               # Rate limits
│   └── websocket.js                  # WebSocket auth
├── models/
│   ├── Task.js                       # Task model
│   ├── Comment.js                    # Comment model
│   └── Activity.js                   # Activity model
├── services/
│   ├── taskService.js                # Business logic
│   ├── notificationService.js        # Notifications
│   └── activityService.js            # Activity tracking
└── websocket/
    ├── taskHandlers.js               # Task WebSocket events
    ├── presenceHandlers.js           # Presence tracking
    └── commentHandlers.js            # Comment events
```

### Database Migration Strategy

**Phase 1: Schema Design (This Sprint)**
- Design PostgreSQL schema for tasks, comments, activity
- Create migration scripts
- Set up development database

**Phase 2: Dual Write (Sprint 3)**
- Write to both JSON files and PostgreSQL
- Read from PostgreSQL, fallback to JSON
- Validate data consistency

**Phase 3: Full Migration (Sprint 4)**
- Migrate all existing data
- Switch to PostgreSQL only
- Remove JSON file code

---

## Week-by-Week Timeline

### Week 1: Core Task UI (Days 1-5)

#### Day 1: Setup & Task List View
**Morning**:
- [ ] Sprint kickoff meeting
- [ ] Create feature branches
- [ ] Set up component structure

**Afternoon**:
- [ ] Build TaskListView component skeleton
- [ ] Implement table with sortable columns
- [ ] Add inline editing for status/priority

**Deliverables**: Basic task list with sorting

---

#### Day 2: Kanban Board Foundation
**Morning**:
- [ ] Install @dnd-kit packages
- [ ] Build KanbanBoard component
- [ ] Create KanbanColumn components

**Afternoon**:
- [ ] Implement drag-and-drop logic
- [ ] Add TaskCard component
- [ ] Style Kanban board

**Deliverables**: Functional Kanban board (no API integration yet)

---

#### Day 3: Kanban Drag-and-Drop
**Morning**:
- [ ] Implement keyboard drag-and-drop
- [ ] Add accessibility features (ARIA labels)
- [ ] Test with screen reader

**Afternoon**:
- [ ] Connect drag-and-drop to API
- [ ] Implement optimistic updates
- [ ] Add undo functionality

**Deliverables**: Fully accessible Kanban with API integration

---

#### Day 4: Task Detail Modal
**Morning**:
- [ ] Build TaskDetailModal component
- [ ] Create form with all task fields
- [ ] Add rich text editor for description

**Afternoon**:
- [ ] Implement file upload
- [ ] Add form validation
- [ ] Connect to API

**Deliverables**: Complete task editor modal

---

#### Day 5: Task API Integration & Polish
**Morning**:
- [ ] Create useTasks hook with React Query
- [ ] Implement optimistic updates
- [ ] Add error handling

**Afternoon**:
- [ ] Polish UI (loading states, empty states)
- [ ] Add keyboard shortcuts
- [ ] Code review

**Deliverables**: Production-ready task UI

---

### Week 2: Real-Time Collaboration (Days 6-10)

#### Day 6: WebSocket Infrastructure
**Morning**:
- [ ] Set up WebSocket rooms per project
- [ ] Implement presence tracking
- [ ] Create WebSocketContext

**Afternoon**:
- [ ] Build task update broadcasting
- [ ] Test with multiple clients
- [ ] Handle edge cases (reconnection, offline)

**Deliverables**: Real-time task updates working

---

#### Day 7: Comments System
**Morning**:
- [ ] Create comments API endpoints
- [ ] Build Comment model and validation
- [ ] Set up database table (PostgreSQL or JSON)

**Afternoon**:
- [ ] Build TaskComments component
- [ ] Implement @mentions
- [ ] Add real-time comment updates

**Deliverables**: Working comments with real-time sync

---

#### Day 8: Activity Feed
**Morning**:
- [ ] Create activity tracking service
- [ ] Build ActivityFeed component
- [ ] Implement infinite scroll

**Afternoon**:
- [ ] Add activity filters
- [ ] Implement real-time activity updates
- [ ] Polish UI

**Deliverables**: Live activity feed

---

#### Day 9: Search & Filtering
**Morning**:
- [ ] Build TaskFilters component
- [ ] Implement filter logic
- [ ] Create search API endpoint

**Afternoon**:
- [ ] Add saved filter presets
- [ ] Implement URL state for filters
- [ ] Test performance with large datasets

**Deliverables**: Advanced filtering and search

---

#### Day 10: Testing & Polish
**Morning**:
- [ ] Integration testing
- [ ] Accessibility testing (keyboard + screen reader)
- [ ] Performance testing

**Afternoon**:
- [ ] Bug fixes
- [ ] Documentation
- [ ] Sprint review preparation

**Deliverables**: Sprint 2 complete and demo-ready

---

## Data Models & Schema

### PostgreSQL Schema

```sql
-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  labels TEXT[] DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_status CHECK (status IN ('todo', 'in_progress', 'review', 'blocked', 'completed')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT title_length CHECK (length(title) >= 3 AND length(title) <= 255)
);

-- Indexes for performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_labels ON tasks USING GIN(labels);

-- Full-text search index
CREATE INDEX idx_tasks_search ON tasks USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Comments table (defined in section 2.2)

-- Activity table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_action CHECK (action IN ('created', 'updated', 'deleted', 'commented', 'moved', 'assigned'))
);

CREATE INDEX idx_activities_project_id ON activities(project_id, created_at DESC);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);

-- Task dependencies (optional for Sprint 2)
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  CONSTRAINT unique_dependency UNIQUE (task_id, depends_on_task_id)
);
```

### TypeScript Interfaces

```typescript
// src/types/task.ts
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  dueDate: string | null;
  startDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  labels: string[];
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;

  // Virtual fields (computed)
  isOverdue?: boolean;
  commentsCount?: number;
  attachmentsCount?: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  // Populated fields
  author?: User;
}

export interface Activity {
  id: string;
  projectId: string;
  actorId: string;
  action: ActivityAction;
  entityType: 'task' | 'comment' | 'project' | 'member';
  entityId: string;
  changes: Record<string, { old: any; new: any }>;
  metadata: Record<string, any>;
  createdAt: string;

  // Populated fields
  actor?: User;
  entity?: Task | Comment;
}

export type ActivityAction = 'created' | 'updated' | 'deleted' | 'commented' | 'moved' | 'assigned';
```

---

## API Specifications

### Task Endpoints

```javascript
// GET /api/projects/:projectId/tasks
// Returns all tasks for a project with optional filtering
app.get('/api/projects/:projectId/tasks', authenticate, async (req, res) => {
  const { status, assignee, priority, search, sortBy, sortOrder } = req.query;

  // Build query with filters
  let query = 'SELECT * FROM tasks WHERE project_id = $1';
  const params = [req.params.projectId];

  // Apply filters (implementation from section 2.4)

  const tasks = await db.query(query, params);
  res.json(tasks.rows);
});

// POST /api/projects/:projectId/tasks
// Creates a new task
app.post('/api/projects/:projectId/tasks', authenticate, validateTaskData, async (req, res) => {
  const task = await createTask({
    ...req.body,
    projectId: req.params.projectId,
    createdBy: req.user.id
  });

  // Create activity
  await createActivity({
    projectId: req.params.projectId,
    actorId: req.user.id,
    action: 'created',
    entityType: 'task',
    entityId: task.id
  });

  // Broadcast to WebSocket room
  io.to(`project:${req.params.projectId}`).emit('task:created', task);

  res.status(201).json(task);
});

// PUT /api/tasks/:taskId
// Updates an existing task
app.put('/api/tasks/:taskId', authenticate, validateTaskData, async (req, res) => {
  const oldTask = await getTask(req.params.taskId);
  const updatedTask = await updateTask(req.params.taskId, req.body);

  // Track changes for activity feed
  const changes = {};
  ['status', 'priority', 'assignedTo', 'dueDate'].forEach(field => {
    if (oldTask[field] !== updatedTask[field]) {
      changes[field] = { old: oldTask[field], new: updatedTask[field] };
    }
  });

  // Create activity if there were changes
  if (Object.keys(changes).length > 0) {
    await createActivity({
      projectId: updatedTask.projectId,
      actorId: req.user.id,
      action: 'updated',
      entityType: 'task',
      entityId: updatedTask.id,
      changes
    });
  }

  // Broadcast update
  io.to(`project:${updatedTask.projectId}`).emit('task:updated', {
    taskId: updatedTask.id,
    changes: req.body,
    updatedBy: req.user.id
  });

  res.json(updatedTask);
});

// DELETE /api/tasks/:taskId
// Deletes a task (soft delete)
app.delete('/api/tasks/:taskId', authenticate, async (req, res) => {
  const task = await getTask(req.params.taskId);
  await deleteTask(req.params.taskId);

  await createActivity({
    projectId: task.projectId,
    actorId: req.user.id,
    action: 'deleted',
    entityType: 'task',
    entityId: task.id
  });

  io.to(`project:${task.projectId}`).emit('task:deleted', {
    taskId: task.id,
    deletedBy: req.user.id
  });

  res.status(204).send();
});
```

### Validation Middleware

```javascript
// middleware/taskValidation.js
const { body } = require('express-validator');
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

exports.validateTaskData = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 255 }).withMessage('Title must be 3-255 characters')
    .customSanitizer(value => DOMPurify.sanitize(value)),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 10000 }).withMessage('Description too long')
    .customSanitizer(value => DOMPurify.sanitize(value)),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'blocked', 'completed'])
    .withMessage('Invalid status'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  body('assignedTo')
    .optional()
    .isUUID().withMessage('Invalid assignee ID'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 }).withMessage('Invalid estimated hours'),

  body('labels')
    .optional()
    .isArray().withMessage('Labels must be an array')
    .custom((labels) => {
      return labels.every(label =>
        typeof label === 'string' &&
        label.length <= 50
      );
    }).withMessage('Invalid label format'),
];
```

---

## WebSocket Protocol

### Event Types

```typescript
// Client -> Server events
interface TaskUpdateEvent {
  type: 'task:update';
  projectId: string;
  taskId: string;
  changes: Partial<Task>;
  userId: string;
}

interface CommentTypingEvent {
  type: 'comment:typing';
  projectId: string;
  taskId: string;
  userId: string;
  isTyping: boolean;
}

interface PresenceUpdateEvent {
  type: 'presence:update';
  projectId: string;
  userId: string;
  status: 'online' | 'away' | 'offline';
}

// Server -> Client events
interface TaskUpdatedEvent {
  type: 'task:updated';
  taskId: string;
  changes: Partial<Task>;
  updatedBy: string;
  timestamp: string;
}

interface CommentCreatedEvent {
  type: 'comment:created';
  comment: Comment;
  taskId: string;
}

interface UserJoinedEvent {
  type: 'user:joined';
  userId: string;
  timestamp: string;
}

interface UserLeftEvent {
  type: 'user:left';
  userId: string;
  timestamp: string;
}

interface UserTypingEvent {
  type: 'user:typing';
  taskId: string;
  userId: string;
  isTyping: boolean;
}
```

### Conflict Resolution Strategy

When multiple users edit the same task simultaneously:

1. **Optimistic Locking**: Track version number on each task
2. **Last Write Wins**: Most recent update overwrites previous (with notification)
3. **Field-Level Merging**: Merge non-conflicting field changes
4. **Conflict Notification**: Alert user if their changes were overwritten

```typescript
// Conflict resolution example
function handleTaskUpdate(taskId: string, changes: Partial<Task>, version: number) {
  const currentTask = getTask(taskId);

  if (currentTask.version !== version) {
    // Conflict detected
    const conflictingFields = Object.keys(changes).filter(
      key => currentTask[key] !== changes[key]
    );

    if (conflictingFields.length > 0) {
      // Notify user of conflict
      emitToUser(userId, 'task:conflict', {
        taskId,
        conflictingFields,
        currentValues: pick(currentTask, conflictingFields),
        yourValues: pick(changes, conflictingFields)
      });

      return { success: false, reason: 'conflict' };
    }
  }

  // No conflict, apply changes
  const updatedTask = {
    ...currentTask,
    ...changes,
    version: currentTask.version + 1,
    updatedAt: new Date().toISOString()
  };

  saveTask(updatedTask);
  return { success: true, task: updatedTask };
}
```

---

## UI Component Architecture

### Component Hierarchy

```
ProjectDetail (page)
├── ProjectHeader
├── Tabs
│   ├── Overview Tab
│   ├── Tasks Tab
│   │   ├── TasksToolbar
│   │   │   ├── ViewToggle (List / Kanban)
│   │   │   ├── TaskFilters
│   │   │   ├── TaskSearch
│   │   │   └── CreateTaskButton
│   │   ├── [View: TaskListView OR KanbanBoard]
│   │   └── TaskDetailModal (portal)
│   ├── Files Tab
│   └── Messages Tab
└── ActivityFeed (sidebar)
```

### Responsive Design

**Desktop (1920px+)**:
- Kanban board with 4-5 columns visible
- Sidebar activity feed
- Expanded task detail modal

**Tablet (768px - 1919px)**:
- Kanban board with 3 columns visible, horizontal scroll
- Collapsed sidebar (expand on click)
- Full-screen task detail modal

**Mobile (< 768px)**:
- Task list view (Kanban too cramped)
- Bottom sheet for task detail
- Activity feed in separate tab

---

## Performance Requirements

### Load Time Targets

| Metric | Target | Max Acceptable |
|--------|--------|----------------|
| Initial page load | < 2s | 3s |
| Task list render (100 tasks) | < 500ms | 1s |
| Kanban board render (100 tasks) | < 800ms | 1.5s |
| Task detail modal open | < 200ms | 500ms |
| Search results | < 300ms | 800ms |
| Real-time update propagation | < 100ms | 300ms |

### Optimization Strategies

**1. Virtual Scrolling**
- Use `react-window` or `@tanstack/react-virtual` for long task lists
- Only render visible tasks + buffer

**2. Memoization**
- Memoize expensive calculations (task filtering, sorting)
- Use `React.memo` for TaskCard components

**3. Code Splitting**
- Lazy load TaskDetailModal (only load when opened)
- Lazy load rich text editor (large bundle)

**4. Caching**
- Cache task list with React Query (staleTime: 30s)
- Cache user data (staleTime: 5 minutes)
- Implement optimistic updates for instant feedback

**5. Database Optimization**
- Index all filter fields (status, assignee, priority, dueDate)
- Use full-text search index for search queries
- Implement pagination (50 tasks per page)

**6. WebSocket Optimization**
- Debounce typing indicators (500ms)
- Batch multiple updates into single message
- Implement message compression for large payloads

---

## Dependencies & Risks

### Critical Dependencies

| Dependency | Status | Risk Level | Mitigation |
|------------|--------|------------|------------|
| Sprint 1 API Deployment | ⚠️ Pending | HIGH | Block Sprint 2 start until deployed |
| PostgreSQL Setup | 🔴 Not Started | HIGH | Use JSON fallback if delayed |
| WebSocket Server | ✅ Exists | LOW | Already implemented |
| @dnd-kit Library | 🔴 Not Installed | MEDIUM | Install Day 1, test thoroughly |
| React Query | 🔴 Not Installed | MEDIUM | Can use useState/useEffect fallback |

### Technical Risks

**Risk 1: Real-Time Conflicts**
- **Probability**: High
- **Impact**: High (data loss, user confusion)
- **Mitigation**: Implement robust conflict resolution, version tracking, user notifications

**Risk 2: Performance with Large Datasets**
- **Probability**: Medium
- **Impact**: High (slow UI, poor UX)
- **Mitigation**: Virtual scrolling, pagination, database indexing

**Risk 3: Drag-and-Drop Accessibility**
- **Probability**: Medium
- **Impact**: Medium (compliance issues)
- **Mitigation**: Use @dnd-kit (accessibility-first), test with screen readers

**Risk 4: PostgreSQL Migration Delay**
- **Probability**: Medium
- **Impact**: Low (can continue with JSON)
- **Mitigation**: Dual-write strategy allows gradual migration

**Risk 5: WebSocket Connection Issues**
- **Probability**: Low
- **Impact**: Medium (no real-time updates)
- **Mitigation**: Graceful degradation (poll API as fallback), reconnection logic

### External Dependencies

- **Design System**: Existing Flux Design Language components
- **Backend Team**: Need to coordinate on API changes
- **DevOps**: Need to provision PostgreSQL database
- **QA**: Need manual testing for accessibility

---

## Success Metrics

### Quantitative Metrics

**User Engagement**:
- [ ] 80% of users create at least one task in first session
- [ ] Average 10+ task updates per project per week
- [ ] 50% of users use Kanban view (vs list view)

**Performance**:
- [ ] 95% of page loads < 2 seconds
- [ ] 99% of task updates < 500ms
- [ ] Zero data loss incidents

**Quality**:
- [ ] < 5 bugs per 100 user sessions
- [ ] Lighthouse score > 95
- [ ] WCAG 2.1 Level A compliance: 100%

**Real-Time Collaboration**:
- [ ] 90% of WebSocket messages delivered within 100ms
- [ ] < 1% message loss rate
- [ ] Average 3+ concurrent users per project

### Qualitative Metrics

**User Feedback**:
- [ ] Users describe task management as "intuitive"
- [ ] Users notice and appreciate real-time updates
- [ ] Users report no major accessibility issues

**Code Quality**:
- [ ] All code reviewed and approved
- [ ] Test coverage > 80% for new code
- [ ] No security vulnerabilities

---

## Testing Strategy

### Unit Tests

**Frontend**:
- [ ] TaskListView: Sorting, filtering, inline editing
- [ ] KanbanBoard: Drag-and-drop logic, column management
- [ ] TaskDetailModal: Form validation, save/cancel
- [ ] useTasks hook: Optimistic updates, error handling
- [ ] Conflict resolution logic

**Backend**:
- [ ] Task CRUD operations
- [ ] Validation middleware
- [ ] Activity tracking
- [ ] Comment system

**Target**: 80% code coverage

---

### Integration Tests

- [ ] Create task via API → appears in UI
- [ ] Update task in UI → saves to database
- [ ] Delete task → removes from all views
- [ ] Real-time update from user A → appears for user B
- [ ] Comment creation → notification sent
- [ ] Search → correct results returned
- [ ] Filters → correct tasks displayed

**Target**: All critical paths covered

---

### E2E Tests (Playwright)

```typescript
// tests/e2e/task-management.spec.ts
test('User can create and manage tasks', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to project
  await page.goto('/projects/project-1');
  await page.click('text=Tasks');

  // Create task
  await page.click('text=Create Task');
  await page.fill('input[name="title"]', 'Test Task');
  await page.fill('textarea[name="description"]', 'This is a test task');
  await page.selectOption('select[name="priority"]', 'high');
  await page.click('button:has-text("Create")');

  // Verify task appears
  await expect(page.locator('text=Test Task')).toBeVisible();

  // Switch to Kanban view
  await page.click('[aria-label="Kanban view"]');

  // Drag task to "In Progress"
  const taskCard = page.locator('[data-task-id]').first();
  const inProgressColumn = page.locator('[data-column="in_progress"]');
  await taskCard.dragTo(inProgressColumn);

  // Verify status updated
  await expect(taskCard).toHaveAttribute('data-status', 'in_progress');
});

test('Real-time collaboration works', async ({ browser }) => {
  // Open two browser contexts (two users)
  const user1Context = await browser.newContext();
  const user2Context = await browser.newContext();

  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();

  // Both users login and navigate to same project
  // ... login logic ...

  await Promise.all([
    user1Page.goto('/projects/project-1/tasks'),
    user2Page.goto('/projects/project-1/tasks')
  ]);

  // User 1 creates a task
  await user1Page.click('text=Create Task');
  await user1Page.fill('input[name="title"]', 'Shared Task');
  await user1Page.click('button:has-text("Create")');

  // User 2 should see the task appear in real-time
  await expect(user2Page.locator('text=Shared Task')).toBeVisible({ timeout: 3000 });

  // User 2 updates the task
  await user2Page.click('text=Shared Task');
  await user2Page.selectOption('select[name="status"]', 'in_progress');
  await user2Page.click('button:has-text("Save")');

  // User 1 should see the update
  await expect(user1Page.locator('[data-task-title="Shared Task"]')).toHaveAttribute('data-status', 'in_progress');
});
```

---

### Accessibility Testing

**Automated**:
- [ ] Run axe-core on all new pages
- [ ] Lighthouse accessibility score > 95
- [ ] eslint-plugin-jsx-a11y: 0 warnings

**Manual**:
- [ ] Keyboard navigation (Tab, Enter, Escape, arrows)
- [ ] Screen reader (VoiceOver on macOS, NVDA on Windows)
- [ ] Focus visible and logical
- [ ] ARIA labels accurate
- [ ] Live regions announce changes

**Checklist**:
- [ ] All interactive elements keyboard accessible
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Color contrast ratio > 4.5:1
- [ ] No keyboard traps
- [ ] Skip links present

---

### Performance Testing

**Automated**:
- [ ] Lighthouse performance score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Total Blocking Time < 300ms

**Load Testing**:
- [ ] Test with 100 tasks per project
- [ ] Test with 500 tasks per project
- [ ] Test with 10 concurrent users
- [ ] Test with 50 concurrent users

**WebSocket Testing**:
- [ ] 1000 messages/second throughput
- [ ] < 1% message loss
- [ ] Graceful degradation on connection loss

---

## Deployment Plan

### Pre-Deployment Checklist

**Code Quality**:
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No console errors or warnings
- [ ] Lighthouse scores meet targets

**Security**:
- [ ] No exposed secrets
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints

**Database**:
- [ ] Migration scripts tested
- [ ] Backup created
- [ ] Rollback plan documented

**Monitoring**:
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring (Lighthouse CI)
- [ ] WebSocket health checks

---

### Deployment Steps

**Phase 1: Backend Deployment**
1. Deploy database migrations
2. Deploy updated server code
3. Restart Node.js processes
4. Verify API health checks

**Phase 2: Frontend Deployment**
1. Build production bundle
2. Deploy static assets to CDN
3. Update service worker (if applicable)
4. Verify frontend loads

**Phase 3: Smoke Testing**
1. Create test task
2. Update task in real-time (two browsers)
3. Add comment
4. Check activity feed
5. Verify WebSocket connection

**Phase 4: Gradual Rollout**
1. Enable for internal team (10 users)
2. Monitor for 24 hours
3. Enable for beta users (50 users)
4. Monitor for 48 hours
5. Full rollout (all users)

---

### Rollback Plan

If critical issues are detected:

1. **Immediate**: Revert frontend deployment (restore previous build)
2. **Within 1 hour**: Revert backend deployment (restore previous server code)
3. **Within 4 hours**: Rollback database migrations (if necessary)

**Rollback Triggers**:
- Error rate > 5%
- Performance degradation > 50%
- Data loss incident
- Security vulnerability discovered

---

## Post-Sprint Activities

### Sprint Review
- Demo all features to stakeholders
- Gather feedback
- Update backlog based on feedback

### Sprint Retrospective
- What went well?
- What could be improved?
- Action items for Sprint 3

### Documentation
- Update API documentation
- Create user guides
- Update developer onboarding docs

### Handoff to Sprint 3
- Prioritize remaining P3 features
- Plan PostgreSQL full migration
- Identify technical debt to address

---

## Appendix A: Component API Reference

### TaskListView Component

```typescript
interface TaskListViewProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskClick: (taskId: string) => void;
  sortBy?: 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: string) => void;
  loading?: boolean;
  error?: Error | null;
  emptyState?: React.ReactNode;
  className?: string;
}

// Usage
<TaskListView
  projectId={projectId}
  tasks={tasks}
  onTaskUpdate={handleTaskUpdate}
  onTaskDelete={handleTaskDelete}
  onTaskClick={(id) => setSelectedTaskId(id)}
  sortBy="dueDate"
  sortOrder="asc"
  loading={isLoading}
/>
```

### KanbanBoard Component

```typescript
interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  columns: KanbanColumn[];
  onTaskMove: (taskId: string, fromColumn: string, toColumn: string, position: number) => void;
  onTaskClick: (taskId: string) => void;
  onColumnUpdate: (columns: KanbanColumn[]) => void;
  groupBy?: 'status' | 'assignee' | 'priority';
  viewMode?: 'compact' | 'detailed';
  loading?: boolean;
  className?: string;
}

// Usage
<KanbanBoard
  projectId={projectId}
  tasks={tasks}
  columns={kanbanColumns}
  onTaskMove={handleTaskMove}
  onTaskClick={(id) => setSelectedTaskId(id)}
  viewMode="detailed"
/>
```

### TaskDetailModal Component

```typescript
interface TaskDetailModalProps {
  taskId: string | null; // null = create mode
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  mode?: 'create' | 'edit';
}

// Usage
<TaskDetailModal
  taskId={selectedTaskId}
  projectId={projectId}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSave={handleSaveTask}
  onDelete={handleDeleteTask}
/>
```

---

## Appendix B: WebSocket Events Reference

### Client → Server Events

```typescript
// Join project room
socket.emit('project:join', { projectId, userId });

// Leave project room
socket.emit('project:leave', { projectId, userId });

// Update task
socket.emit('task:update', {
  projectId,
  taskId,
  changes: { status: 'in_progress' },
  userId,
  version: 5
});

// Create comment
socket.emit('comment:create', {
  projectId,
  taskId,
  content: 'Great work!',
  mentions: ['user-123'],
  userId
});

// Typing indicator
socket.emit('comment:typing', {
  projectId,
  taskId,
  userId,
  isTyping: true
});

// Update presence
socket.emit('presence:update', {
  projectId,
  userId,
  status: 'online' | 'away' | 'offline'
});
```

### Server → Client Events

```typescript
// User joined project
socket.on('user:joined', ({ userId, timestamp }) => {
  console.log(`${userId} joined at ${timestamp}`);
});

// User left project
socket.on('user:left', ({ userId, timestamp }) => {
  console.log(`${userId} left at ${timestamp}`);
});

// Task updated
socket.on('task:updated', ({ taskId, changes, updatedBy, timestamp }) => {
  updateTaskInState(taskId, changes);
  showToast(`${updatedBy} updated task`);
});

// Task created
socket.on('task:created', (task) => {
  addTaskToState(task);
});

// Task deleted
socket.on('task:deleted', ({ taskId, deletedBy }) => {
  removeTaskFromState(taskId);
});

// Comment created
socket.on('comment:created', (comment) => {
  addCommentToTask(comment.taskId, comment);
});

// User typing
socket.on('user:typing', ({ taskId, userId, isTyping }) => {
  updateTypingIndicator(taskId, userId, isTyping);
});

// Presence update
socket.on('presence:update', ({ userId, status }) => {
  updateUserPresence(userId, status);
});

// Conflict detected
socket.on('task:conflict', ({ taskId, conflictingFields, currentValues, yourValues }) => {
  showConflictModal(taskId, conflictingFields, currentValues, yourValues);
});
```

---

## Appendix C: Database Migration Scripts

### Migration 001: Create Tasks Table

```sql
-- migrations/001_create_tasks_table.sql
-- Up Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  labels TEXT[] DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_status CHECK (status IN ('todo', 'in_progress', 'review', 'blocked', 'completed')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT title_length CHECK (length(title) >= 3 AND length(title) <= 255),
  CONSTRAINT hours_positive CHECK (estimated_hours >= 0 AND actual_hours >= 0)
);

-- Indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_labels ON tasks USING GIN(labels);
CREATE INDEX idx_tasks_search ON tasks USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS tasks;
```

### Migration 002: Create Comments Table

```sql
-- migrations/002_create_comments_table.sql
-- Up Migration
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT content_length CHECK (length(content) >= 1 AND length(content) <= 10000),
  CONSTRAINT content_not_empty CHECK (trim(content) != '')
);

-- Indexes
CREATE INDEX idx_comments_task_id ON comments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_mentions ON comments USING GIN(mentions);

-- Trigger to update updated_at
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Down Migration
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TABLE IF EXISTS comments;
```

### Migration 003: Create Activities Table

```sql
-- migrations/003_create_activities_table.sql
-- Up Migration
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_action CHECK (action IN ('created', 'updated', 'deleted', 'commented', 'moved', 'assigned', 'completed', 'reopened')),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('task', 'comment', 'project', 'member', 'file'))
);

-- Indexes
CREATE INDEX idx_activities_project_id ON activities(project_id, created_at DESC);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_activities_actor_id ON activities(actor_id);

-- Partitioning by month for better performance (optional)
-- CREATE TABLE activities_2025_10 PARTITION OF activities
-- FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Down Migration
DROP TABLE IF EXISTS activities;
```

---

## Appendix D: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `n` or `c` | Create new task |
| `f` | Focus search |
| `/` | Focus filters |
| `k` | Toggle Kanban view |
| `l` | Toggle List view |
| `j` / `k` | Navigate tasks down/up |
| `Enter` | Open selected task |
| `Escape` | Close modal/cancel |
| `Cmd+Enter` / `Ctrl+Enter` | Save task |
| `Cmd+Shift+D` / `Ctrl+Shift+D` | Duplicate task |
| `Cmd+K` / `Ctrl+K` | Command palette (future) |
| `?` | Show keyboard shortcuts |

---

## Summary

Sprint 2 is an ambitious but achievable sprint that will transform Flux Studio into a competitive project management platform. By focusing on the core task management UI, real-time collaboration, and laying the foundation for database migration, we're building a scalable, user-friendly system that teams will love.

**Key Success Factors**:
1. Start with Sprint 1 API fully deployed
2. Prioritize core features (P1) over nice-to-haves (P3)
3. Test real-time collaboration thoroughly
4. Maintain accessibility standards
5. Monitor performance closely

**Ready to Begin**: This plan provides a clear roadmap with technical specifications, timelines, and success metrics. Let's build something exceptional.

---

**Last Updated**: October 17, 2025
**Sprint**: 2 of 5
**Next Sprint**: Database Migration & Advanced Features
**Document Owner**: Tech Lead
**Review Date**: October 24, 2025 (Mid-Sprint Check-in)
