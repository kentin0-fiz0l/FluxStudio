import type { NavigateFunction } from 'react-router-dom';
import {
  Briefcase,
  Folder,
  MessageSquare,
  Settings,
  Plus,
  Search,
  Building2,
} from 'lucide-react';
import type { FrecencyStore, Command } from './command-types';
import { FRECENCY_KEY, HALF_LIFE_MS } from './command-constants';

export function loadFrecency(): FrecencyStore {
  try {
    const raw = localStorage.getItem(FRECENCY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveFrecency(store: FrecencyStore): void {
  try {
    localStorage.setItem(FRECENCY_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded — silently ignore
  }
}

/** Record that a command was used. */
export function recordCommandUsage(commandId: string): void {
  const store = loadFrecency();
  const existing = store[commandId];
  store[commandId] = {
    count: (existing?.count ?? 0) + 1,
    lastUsed: Date.now(),
  };
  saveFrecency(store);
}

/** Compute a frecency score (higher = more relevant). */
export function getFrecencyScore(commandId: string, store: FrecencyStore): number {
  const entry = store[commandId];
  if (!entry) return 0;
  const age = Date.now() - entry.lastUsed;
  const recency = Math.pow(0.5, age / HALF_LIFE_MS); // exponential decay
  return entry.count * recency;
}

export function buildCommands(
  navigate: NavigateFunction,
  handleOpenChange: (open: boolean) => void,
  callbacks: {
    onCreateProject?: () => void;
    onUploadFile?: () => void;
    onCreateTask?: () => void;
    onSendMessage?: () => void;
  },
  currentProject: { id: string; name: string } | null | undefined,
  projects: Array<{ id: string; name: string }>
): Command[] {
  const baseCommands: Command[] = [
    {
      id: 'action-create-project',
      label: 'Create New Project',
      description: 'Start a new project immediately',
      icon: Plus,
      category: 'create',
      shortcut: ['⌘', 'N'],
      keywords: ['create', 'new', 'project', 'add'],
      isDirect: true,
      action: () => {
        handleOpenChange(false);
        if (callbacks.onCreateProject) {
          callbacks.onCreateProject();
        } else {
          navigate('/projects/new');
        }
      },
    },
    {
      id: 'action-upload-file',
      label: 'Upload File',
      description: 'Upload a file to your project',
      icon: Folder,
      category: 'create',
      shortcut: ['⌘', 'U'],
      keywords: ['upload', 'file', 'add', 'document'],
      isDirect: true,
      action: () => {
        handleOpenChange(false);
        if (callbacks.onUploadFile) {
          callbacks.onUploadFile();
        } else {
          navigate(currentProject ? `/projects/${currentProject.id}?action=upload` : '/projects?action=upload');
        }
      },
    },
    {
      id: 'action-send-message',
      label: 'Send Message',
      description: 'Start a new conversation',
      icon: MessageSquare,
      category: 'create',
      shortcut: ['⌘', 'M'],
      keywords: ['message', 'chat', 'send', 'conversation'],
      isDirect: true,
      action: () => {
        handleOpenChange(false);
        if (callbacks.onSendMessage) {
          callbacks.onSendMessage();
        } else {
          navigate('/messages?compose=true');
        }
      },
    },

    ...(currentProject ? [
      {
        id: 'action-create-task',
        label: `Create Task in "${currentProject.name}"`,
        description: 'Add a new task to this project',
        icon: Plus,
        category: 'create' as const,
        keywords: ['task', 'todo', 'create', 'add'],
        isDirect: true,
        action: () => {
          handleOpenChange(false);
          if (callbacks.onCreateTask) {
            callbacks.onCreateTask();
          } else {
            navigate(`/projects/${currentProject.id}?action=new-task`);
          }
        },
      },
    ] : []),

    {
      id: 'nav-projects',
      label: 'Go to Projects',
      description: 'View all your projects',
      icon: Briefcase,
      category: 'navigation',
      keywords: ['projects', 'work', 'home', 'dashboard'],
      action: () => {
        navigate('/projects');
        handleOpenChange(false);
      },
    },
    {
      id: 'nav-messages',
      label: 'Go to Messages',
      icon: MessageSquare,
      category: 'navigation',
      keywords: ['messages', 'chat', 'communication'],
      action: () => {
        navigate('/messages');
        handleOpenChange(false);
      },
    },
    {
      id: 'nav-org',
      label: 'Go to Organization',
      description: 'Team and company settings',
      icon: Building2,
      category: 'navigation',
      keywords: ['organization', 'company', 'org', 'team', 'members'],
      action: () => {
        navigate('/organization');
        handleOpenChange(false);
      },
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Your preferences',
      icon: Settings,
      category: 'navigation',
      keywords: ['settings', 'preferences', 'config', 'profile'],
      action: () => {
        navigate('/settings');
        handleOpenChange(false);
      },
    },
    {
      id: 'action-search',
      label: 'Search Everything',
      description: 'Search across all content',
      icon: Search,
      category: 'actions',
      shortcut: ['⌘', 'F'],
      keywords: ['search', 'find', 'look'],
      action: () => {
        navigate('/search');
        handleOpenChange(false);
      },
    },
  ];

  const projectCommands: Command[] = projects.slice(0, 5).map((project) => ({
    id: `project-${project.id}`,
    label: project.name,
    description: 'Open project',
    icon: Briefcase,
    category: 'recent' as const,
    keywords: ['project', project.name.toLowerCase()],
    action: () => {
      navigate(`/projects/${project.id}`);
      handleOpenChange(false);
    },
  }));

  return [...baseCommands, ...projectCommands];
}
