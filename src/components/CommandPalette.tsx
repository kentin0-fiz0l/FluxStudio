/**
 * CommandPalette - Quick navigation and actions (⌘K)
 *
 * Keyboard-driven command interface for quick navigation and actions.
 * Inspired by VS Code, Raycast, and Linear.
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Home,
  Briefcase,
  Folder,
  Users,
  MessageSquare,
  Settings,
  Plus,
  Search,
  Wrench,
  Building2,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string[];
  action: () => void;
  category?: 'navigation' | 'actions' | 'create';
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject?: () => void;
  projects?: Array<{ id: string; name: string }>;
}

export function CommandPalette({
  open,
  onOpenChange,
  onCreateProject,
  projects = [],
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define commands
  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        icon: Home,
        category: 'navigation',
        keywords: ['home', 'dashboard', 'overview'],
        action: () => {
          navigate('/home');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-projects',
        label: 'Go to Projects',
        icon: Briefcase,
        category: 'navigation',
        keywords: ['projects', 'work'],
        action: () => {
          navigate('/projects');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-files',
        label: 'Go to Files',
        icon: Folder,
        category: 'navigation',
        keywords: ['files', 'documents', 'storage'],
        action: () => {
          navigate('/file');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-assets',
        label: 'Go to Assets',
        icon: Layers,
        category: 'navigation',
        keywords: ['assets', 'media', 'images'],
        action: () => {
          navigate('/assets');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-team',
        label: 'Go to Team',
        icon: Users,
        category: 'navigation',
        keywords: ['team', 'members', 'people'],
        action: () => {
          navigate('/team');
          onOpenChange(false);
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
          onOpenChange(false);
        },
      },
      {
        id: 'nav-org',
        label: 'Go to Organization',
        icon: Building2,
        category: 'navigation',
        keywords: ['organization', 'company', 'org'],
        action: () => {
          navigate('/organization');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-tools',
        label: 'Go to Tools',
        icon: Wrench,
        category: 'navigation',
        keywords: ['tools', 'utilities'],
        action: () => {
          navigate('/tools');
          onOpenChange(false);
        },
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        icon: Settings,
        category: 'navigation',
        keywords: ['settings', 'preferences', 'config'],
        action: () => {
          navigate('/settings');
          onOpenChange(false);
        },
      },

      // Actions
      {
        id: 'action-create-project',
        label: 'Create New Project',
        description: 'Start a new project',
        icon: Plus,
        category: 'create',
        shortcut: ['⌘', 'N'],
        keywords: ['create', 'new', 'project', 'add'],
        action: () => {
          onOpenChange(false);
          setTimeout(() => onCreateProject?.(), 100);
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
          onOpenChange(false);
        },
      },
    ];

    // Add recent projects
    const projectCommands: Command[] = projects.slice(0, 5).map((project) => ({
      id: `project-${project.id}`,
      label: project.name,
      description: 'Go to project',
      icon: Briefcase,
      category: 'navigation',
      keywords: ['project', project.name.toLowerCase()],
      action: () => {
        navigate(`/projects/${project.id}`);
        onOpenChange(false);
      },
    }));

    return [...baseCommands, ...projectCommands];
  }, [navigate, onOpenChange, onCreateProject, projects]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const matchesLabel = cmd.label.toLowerCase().includes(searchLower);
      const matchesDescription = cmd.description?.toLowerCase().includes(searchLower);
      const matchesKeywords = cmd.keywords?.some((k) => k.includes(searchLower));

      return matchesLabel || matchesDescription || matchesKeywords;
    });
  }, [commands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      actions: [],
      create: [],
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0);
  }, [search]);

  // Reset search when closing
  useLayoutEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

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
        filteredCommands[selectedIndex]?.action();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    },
    [filteredCommands, selectedIndex, onOpenChange]
  );

  // Execute command
  const executeCommand = (command: Command) => {
    command.action();
  };

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    create: 'Create',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl" aria-describedby="command-palette-description">
        <div className="sr-only" id="command-palette-description">
          Command palette for quick navigation and actions
        </div>

        {/* Search Input */}
        <div className="border-b border-neutral-200 dark:border-neutral-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
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
