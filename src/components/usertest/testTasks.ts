/**
 * Test task definitions and shared types for the user testing harness.
 */

export const TEST_TASKS = [
  {
    id: 'task-1',
    title: 'Find a project and click "Focus on this project"',
    successCriteria: 'ProjectContextBar appears with correct project name',
  },
  {
    id: 'task-2',
    title: 'Go to /messages and verify only project conversations are shown',
    successCriteria: 'Messages list shows only conversations from focused project',
  },
  {
    id: 'task-3',
    title: 'Open Pulse panel and review Activity tab',
    successCriteria: 'Pulse panel opens and shows Activity tab content',
  },
  {
    id: 'task-4',
    title: 'Trigger an activity and confirm it appears without refresh',
    successCriteria: 'Send a message; it appears in Activity tab in real-time',
  },
  {
    id: 'task-5',
    title: 'Go to /notifications and confirm scoped to focused project',
    successCriteria: 'Notifications are filtered to the focused project only',
  },
  {
    id: 'task-6',
    title: 'Click "Exit Focus" and verify /messages returns to global view',
    successCriteria: 'Messages show all conversations after exiting focus',
  },
  {
    id: 'task-7',
    title: 'Re-focus a project and verify focus persists on refresh',
    successCriteria: 'After page refresh, the project is still focused',
  },
];

export type TabId = 'info' | 'tasks' | 'feedback';
