/**
 * CommandPalette - Quick navigation and actions (⌘K)
 *
 * Keyboard-driven command interface for quick navigation and actions.
 * Inspired by VS Code, Raycast, and Linear.
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Briefcase,
  Folder,
  MessageSquare,
  Settings,
  Plus,
  Search,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Frecency — frequency + recency scoring for command ranking
// ============================================================================

const FRECENCY_KEY = 'flux-command-frecency';
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 1-week half-life

interface FrecencyEntry {
  count: number;
  lastUsed: number; // epoch ms
}

type FrecencyStore = Record<string, FrecencyEntry>;

function loadFrecency(): FrecencyStore {
  try {
    const raw = localStorage.getItem(FRECENCY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveFrecency(store: FrecencyStore): void {
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
function getFrecencyScore(commandId: string, store: FrecencyStore): number {
  const entry = store[commandId];
  if (!entry) return 0;
  const age = Date.now() - entry.lastUsed;
  const recency = Math.pow(0.5, age / HALF_LIFE_MS); // exponential decay
  return entry.count * recency;
}

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string[];
  action: () => void;
  category?: 'navigation' | 'actions' | 'create' | 'recent';
  keywords?: string[];
  /** If true, action is executed directly (e.g., opens modal) instead of navigating */
  isDirect?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject?: () => void;
  onUploadFile?: () => void;
  onCreateTask?: () => void;
  onSendMessage?: () => void;
  projects?: Array<{ id: string; name: string }>;
  /** Current project context for context-aware actions */
  currentProject?: { id: string; name: string } | null;
}

export function CommandPalette({
  open,
  onOpenChange,
  onCreateProject,
  onUploadFile,
  onCreateTask,
  onSendMessage,
  projects = [],
  currentProject,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Wrapper to reset state when closing - avoids setState in effect
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  // Define commands - Enhanced with direct actions
  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      // ============================================
      // DIRECT ACTIONS (Execute immediately, no navigation)
      // These open modals or perform actions directly
      // ============================================
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
          // Direct action - open modal immediately
          if (onCreateProject) {
            onCreateProject();
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
          if (onUploadFile) {
            onUploadFile();
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
          if (onSendMessage) {
            onSendMessage();
          } else {
            navigate('/messages?compose=true');
          }
        },
      },

      // Context-aware actions (only show when in a project)
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
            if (onCreateTask) {
              onCreateTask();
            } else {
              navigate(`/projects/${currentProject.id}?action=new-task`);
            }
          },
        },
      ] : []),

      // ============================================
      // NAVIGATION (Go to pages)
      // Simplified 3-space architecture
      // ============================================
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

      // ============================================
      // UTILITY ACTIONS
      // ============================================
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

    // Add recent projects as quick access
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
  }, [navigate, handleOpenChange, onCreateProject, onUploadFile, onCreateTask, onSendMessage, projects, currentProject]);

  // Load frecency store once when palette opens
  const frecencyRef = useRef<FrecencyStore>({});
  useEffect(() => {
    if (open) frecencyRef.current = loadFrecency();
  }, [open]);

  // Filter commands based on search, then sort by frecency
  const filteredCommands = useMemo(() => {
    let result: Command[];

    if (!search) {
      result = commands;
    } else {
      const searchLower = search.toLowerCase();
      result = commands.filter((cmd) => {
        const matchesLabel = cmd.label.toLowerCase().includes(searchLower);
        const matchesDescription = cmd.description?.toLowerCase().includes(searchLower);
        const matchesKeywords = cmd.keywords?.some((k) => k.includes(searchLower));
        return matchesLabel || matchesDescription || matchesKeywords;
      });
    }

    // Sort by frecency within each group — commands with higher scores appear first
    const store = frecencyRef.current;
    return [...result].sort((a, b) => {
      // Keep category ordering stable (create > actions > navigation > recent)
      const catOrder: Record<string, number> = { create: 0, actions: 1, navigation: 2, recent: 3 };
      const catA = catOrder[a.category || 'navigation'] ?? 9;
      const catB = catOrder[b.category || 'navigation'] ?? 9;
      if (catA !== catB) return catA - catB;
      // Within same category, sort by frecency descending
      return getFrecencyScore(b.id, store) - getFrecencyScore(a.id, store);
    });
  }, [commands, search]);

  // Group commands by category - prioritize create/actions over navigation
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      create: [],
      actions: [],
      navigation: [],
      recent: [],
    };

    filteredCommands.forEach((cmd) => {
      const category = cmd.category || 'navigation';
      if (!groups[category]) groups[category] = [];
      groups[category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selection when search changes
  useLayoutEffect(() => {
     
    setSelectedIndex(0);
  }, [search]);


  // Execute command and record frecency
  const executeCommand = useCallback((command: Command) => {
    recordCommandUsage(command.id);
    command.action();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) executeCommand(cmd);
      } else if (e.key === 'Escape') {
        handleOpenChange(false);
      }
    },
    [filteredCommands, selectedIndex, handleOpenChange, executeCommand]
  );

  const categoryLabels: Record<string, string> = {
    create: 'Quick Actions',
    actions: 'Utilities',
    navigation: 'Go To',
    recent: 'Recent Projects',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl" aria-describedby="command-palette-description">
        <div className="sr-only" id="command-palette-description">
          Command palette for quick navigation and actions
        </div>

        {/* Search Input */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="pl-10 border-0 focus-visible:ring-0 text-base"
              autoFocus
              aria-label="Search commands"
            />
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              No commands found
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedCommands).map(
                ([category, cmds]) =>
                  cmds.length > 0 && (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                        {categoryLabels[category] || category}
                      </div>
                      <div className="space-y-1">
                        {cmds.map((command) => {
                          const globalIndex = filteredCommands.indexOf(command);
                          const Icon = command.icon;

                          return (
                            <button
                              key={command.id}
                              onClick={() => executeCommand(command)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                globalIndex === selectedIndex
                                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
                                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                              )}
                            >
                              {Icon && (
                                <Icon
                                  className={cn(
                                    'w-4 h-4 flex-shrink-0',
                                    globalIndex === selectedIndex
                                      ? 'text-primary-600 dark:text-primary-400'
                                      : 'text-neutral-400 dark:text-neutral-500'
                                  )}
                                  aria-hidden="true"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{command.label}</div>
                                {command.description && (
                                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                    {command.description}
                                  </div>
                                )}
                              </div>
                              {command.shortcut && (
                                <div className="flex items-center gap-1">
                                  {command.shortcut.map((key, i) => (
                                    <kbd
                                      key={i}
                                      className="px-1.5 py-0.5 text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 rounded"
                                    >
                                      {key}
                                    </kbd>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 p-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">ESC</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage command palette state and keyboard shortcut
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}
