# Active Project Context (Project Focus Mode)

## Overview

Active Project Context is a UX feature that allows users to "focus" on a single project, automatically scoping global pages like Messages, Notifications, and Tools to that project's context.

**FluxStudio Principle:** "Projects are the home for everything"

## How It Works

### Entry Points

Users can focus on a project from:

1. **Projects List (`/projects`)**: Click the "Focus" button on any project card
2. **Project Detail (`/projects/:id`)**: Click the "Focus" button in the header

### Visual Indicators

When a project is focused:

- **ProjectContextBar**: A sticky bar appears at the top showing "Working on: <ProjectName>"
- **Focus Button State**: Buttons show "Focused" (primary color) instead of "Focus"

### Page Behavior

| Page | Behavior When Focused |
|------|----------------------|
| `/messages` | Shows only conversations linked to the focused project |
| `/notifications` | Shows only notifications for the focused project |
| `/tools` | Shows "Project Quick Actions" card with shortcuts to project tabs |

### Exiting Focus Mode

Click "Exit Focus" in the ProjectContextBar, or clear localStorage key `fluxstudio.activeProject`.

## Technical Architecture

### State Management

```typescript
// src/contexts/ActiveProjectContext.tsx

interface ActiveProject {
  id: string;
  name: string;
}

interface ActiveProjectContextValue {
  activeProject: ActiveProject | null;
  setActiveProject: (project: ActiveProject) => void;
  clearActiveProject: () => void;
  isProjectFocused: (projectId: string) => boolean;
  hasFocus: boolean;
}
```

### Persistence

- Uses `localStorage` key: `fluxstudio.activeProject`
- Persists across page refreshes and navigation
- Hydration handling prevents flash of wrong state

### Files Changed

```
src/
├── contexts/
│   └── ActiveProjectContext.tsx    # New context provider
├── components/
│   └── projects/
│       ├── ProjectContextBar.tsx   # New sticky bar component
│       └── ProjectCard.tsx         # Added onFocus prop
├── pages/
│   ├── ProjectsNew.tsx             # Focus button on cards
│   ├── ProjectDetail.tsx           # Focus button in header
│   ├── MessagesNew.tsx             # Project-scoped filtering
│   ├── Notifications.tsx           # Project-scoped filtering
│   └── Tools.tsx                   # Project quick actions
└── App.tsx                         # Provider integration
```

## Usage

### Focusing a Project

```typescript
import { useActiveProject } from '@/contexts/ActiveProjectContext';

function MyComponent() {
  const { setActiveProject } = useActiveProject();

  const handleFocus = (project) => {
    setActiveProject({ id: project.id, name: project.name });
  };
}
```

### Checking Focus State

```typescript
import { useActiveProject } from '@/contexts/ActiveProjectContext';

function MyComponent() {
  const { activeProject, hasFocus, isProjectFocused } = useActiveProject();

  if (hasFocus) {
    // User is focused on a project
    console.log(`Working on: ${activeProject.name}`);
  }

  // Check if specific project is focused
  if (isProjectFocused(someProjectId)) {
    // This project is the focused one
  }
}
```

### Filtering by Active Project

```typescript
const filteredItems = useMemo(() => {
  let result = [...items];

  if (hasFocus && activeProject) {
    result = result.filter(item => item.projectId === activeProject.id);
  }

  return result;
}, [items, hasFocus, activeProject]);
```

## Relationship to Project Context Everywhere

This feature builds on the "Project Context Everywhere" migration (045):

- **Project Context Everywhere**: Added `projectId` to conversations and notifications
- **Active Project Context**: Uses those fields to filter by the focused project

Together, they implement the vision: "When users focus on a project, the entire app revolves around it."

## Future Enhancements

- Keyboard shortcut to toggle focus mode
- Recently focused projects history
- Project switcher modal for quick switching
- Per-project notification settings
