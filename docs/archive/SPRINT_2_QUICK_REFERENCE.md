# Sprint 2: Quick Reference Guide
**Task Management UI & Real-Time Collaboration**

## TL;DR

**Duration**: 2 weeks (10 days)
**Start Date**: October 21, 2025
**Target Completion**: November 1, 2025

**What We're Building**:
1. Kanban board with drag-and-drop
2. Task list view with sorting/filtering
3. Task detail modal with full CRUD
4. Real-time WebSocket collaboration
5. Comments system with @mentions
6. Activity feed
7. Advanced search and filtering

**Success Metric**: Users can create, assign, and track tasks in real-time with their team.

---

## Week 1: Task Management UI

### Day 1 - Task List View
- Build table with sortable columns
- Implement inline editing
- Add keyboard navigation

### Day 2 - Kanban Foundation
- Install @dnd-kit
- Build KanbanBoard and KanbanColumn components
- Style Kanban layout

### Day 3 - Drag-and-Drop
- Implement drag-and-drop with keyboard support
- Add accessibility features
- Connect to API with optimistic updates

### Day 4 - Task Detail Modal
- Build complete task editor
- Add rich text editor
- Implement file upload

### Day 5 - API Integration & Polish
- Create useTasks hook with React Query
- Add loading/error states
- Code review and bug fixes

**Week 1 Deliverable**: Fully functional task UI (list + Kanban + detail modal)

---

## Week 2: Real-Time Collaboration

### Day 6 - WebSocket Infrastructure
- Set up project rooms
- Implement presence tracking
- Build task update broadcasting

### Day 7 - Comments System
- Create comments API
- Build TaskComments component
- Add @mentions functionality

### Day 8 - Activity Feed
- Build activity tracking service
- Create ActivityFeed component
- Implement real-time updates

### Day 9 - Search & Filtering
- Build TaskFilters component
- Implement search API endpoint
- Add saved filter presets

### Day 10 - Testing & Polish
- Integration testing
- Accessibility testing
- Performance optimization
- Sprint review prep

**Week 2 Deliverable**: Real-time collaborative task management system

---

## Priority Breakdown

### P1: MUST HAVE (Week 1)
- Task List View
- Kanban Board with drag-and-drop
- Task Detail Modal
- Task API Integration

### P2: SHOULD HAVE (Week 2)
- Real-time collaboration (WebSocket)
- Comments with @mentions
- Activity feed
- Advanced filtering & search

### P3: NICE TO HAVE (If Time Permits)
- Task dependencies
- Custom fields
- Task templates
- Bulk operations

---

## Tech Stack

**Frontend**:
- React + TypeScript
- @dnd-kit (drag-and-drop)
- React Query (data fetching)
- TipTap or Lexical (rich text)
- Socket.io-client (WebSocket)

**Backend**:
- Express.js
- Socket.io (WebSocket server)
- PostgreSQL (schema design this sprint)
- Existing validation middleware

**Infrastructure**:
- Existing WebSocket server
- JSON files (transition to PostgreSQL in Sprint 3)

---

## Key API Endpoints

### Tasks
- `GET /api/projects/:projectId/tasks` - List all tasks
- `POST /api/projects/:projectId/tasks` - Create task
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task
- `GET /api/projects/:projectId/tasks/search` - Search tasks

### Comments
- `POST /api/tasks/:taskId/comments` - Add comment
- `GET /api/tasks/:taskId/comments` - List comments
- `PUT /api/comments/:commentId` - Edit comment
- `DELETE /api/comments/:commentId` - Delete comment

### Activity
- `GET /api/projects/:projectId/activity` - Activity feed

---

## WebSocket Events

### Client → Server
- `project:join` - Join project room
- `task:update` - Update task
- `comment:create` - Create comment
- `comment:typing` - Typing indicator
- `presence:update` - Update online status

### Server → Client
- `task:updated` - Task was updated
- `task:created` - Task was created
- `comment:created` - Comment was added
- `user:joined` - User came online
- `user:typing` - User is typing

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Page load | < 2s |
| Task list render (100 tasks) | < 500ms |
| Kanban render (100 tasks) | < 800ms |
| Task modal open | < 200ms |
| Search results | < 300ms |
| Real-time update | < 100ms |

---

## Testing Checklist

### Unit Tests
- [ ] TaskListView sorting/filtering
- [ ] KanbanBoard drag-and-drop
- [ ] TaskDetailModal validation
- [ ] useTasks hook optimistic updates
- [ ] Task CRUD API endpoints

### Integration Tests
- [ ] Create task → appears in UI
- [ ] Update task → saves to DB
- [ ] Real-time update → other users see it
- [ ] Comment → notification sent

### E2E Tests
- [ ] Complete task workflow
- [ ] Real-time collaboration (2 users)
- [ ] Search and filter tasks

### Accessibility Tests
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] ARIA labels
- [ ] Focus management

### Performance Tests
- [ ] 100 tasks render time
- [ ] WebSocket throughput
- [ ] Lighthouse score > 90

---

## Risk Mitigation

**High Risk**:
1. **Real-time conflicts** → Implement version tracking and conflict resolution
2. **Performance with large datasets** → Virtual scrolling and pagination

**Medium Risk**:
3. **Drag-and-drop accessibility** → Use @dnd-kit, test with screen readers
4. **PostgreSQL migration delay** → Continue with JSON, dual-write strategy

**Low Risk**:
5. **WebSocket connection issues** → Graceful degradation, poll API as fallback

---

## Dependencies

### Before Sprint Start
- [ ] Sprint 1 API deployed to production
- [ ] PostgreSQL database provisioned (for schema design)
- [ ] @dnd-kit and React Query installed
- [ ] Team aligned on priorities

### During Sprint
- [ ] Backend team available for API coordination
- [ ] Design system components available
- [ ] DevOps support for deployment

---

## Success Criteria

### Must Pass
- [ ] Can create, edit, delete tasks
- [ ] Drag-and-drop works on Kanban board
- [ ] Real-time updates appear instantly
- [ ] Comments work with @mentions
- [ ] Activity feed shows all changes
- [ ] All tests passing
- [ ] Lighthouse score > 90
- [ ] WCAG 2.1 Level A compliant

### Quality Gates
- [ ] < 5 bugs per 100 sessions
- [ ] 80% code coverage
- [ ] Zero security vulnerabilities
- [ ] Performance targets met

---

## Quick Commands

### Development
```bash
# Install dependencies
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @tanstack/react-query
npm install tiptap

# Run tests
npm test
npm run test:e2e

# Start dev server
npm run dev
```

### Deployment
```bash
# Build
npm run build

# Deploy
./scripts/deploy.sh

# Health check
curl https://fluxstudio.art/health
```

---

## Team Contacts

**Tech Lead**: Orchestrates agents and makes final decisions
**Project Manager**: Handles requirements and timelines
**Code Reviewer**: Ensures code quality
**Security Reviewer**: Validates security
**UX Reviewer**: Checks accessibility and UX

---

## Daily Standup Questions

1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?
4. Are we on track for sprint goals?

---

## Definition of Done

A feature is done when:
- [ ] Code written and reviewed
- [ ] Tests written and passing
- [ ] Accessible (keyboard + screen reader)
- [ ] Performant (meets targets)
- [ ] Documented
- [ ] Deployed to staging
- [ ] QA approved

---

## Resources

- **Full Plan**: `SPRINT_2_PLAN.md` (detailed specifications)
- **Sprint 1 Summary**: `SPRINT_1_COMPLETION_SUMMARY.md`
- **API Docs**: `docs/API_REFERENCE.md`
- **Design System**: `src/components/ui/`

---

## Next Steps

1. Review this plan with team
2. Confirm Sprint 1 deployment status
3. Set up development environment
4. Start Day 1: Task List View

**Questions?** Reach out to Tech Lead for clarification.

---

**Last Updated**: October 17, 2025
**Sprint**: 2 of 5
**Status**: Planning Complete - Ready to Start
