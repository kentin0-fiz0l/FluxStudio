/**
 * QuickActions - Command palette for quick creation
 *
 * A keyboard-accessible palette for creating items without navigation:
 * - New task (in focused project)
 * - New message
 * - Quick note
 * - Navigate to project tabs
 *
 * Triggered by Cmd/Ctrl+K
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  CheckSquare,
  MessageSquare,
  FileUp,
  FolderOpen,
  Layers,
  PenTool,
  Settings,
  Target,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveProjectOptional } from '@/contexts/ActiveProjectContext';

export interface QuickActionsProps {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Callback to close the palette */
  onClose: () => void;
  /** Callback when an action is selected */
  onAction?: (action: QuickAction) => void;
}

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  category: 'create' | 'navigate' | 'project';
  action: () => void;
}

export function QuickActions({ isOpen, onClose, onAction }: QuickActionsProps) {
  const navigate = useNavigate();
  const activeProjectContext = useActiveProjectOptional();
  const activeProject = activeProjectContext?.activeProject ?? null;
  const hasFocus = activeProjectContext?.hasFocus ?? false;
  const [search, setSearch] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build actions list based on project context
  const actions = React.useMemo((): QuickAction[] => {
    const baseActions: QuickAction[] = [];

    // Project-specific actions (only when focused)
    if (hasFocus && activeProject) {
      baseActions.push(
        {
          id: 'new-task',
          label: 'New Task',
          description: `Create task in ${activeProject.name}`,
          icon: <Plus className="h-4 w-4" />,
          shortcut: 'T',
          category: 'create',
          action: () => {
            navigate(`/projects/${activeProject.id}?tab=tasks&action=new`);
            onClose();
          },
        },
        {
          id: 'new-message',
          label: 'New Message',
          description: `Send message in ${activeProject.name}`,
          icon: <MessageSquare className="h-4 w-4" />,
          shortcut: 'M',
          category: 'create',
          action: () => {
            navigate(`/projects/${activeProject.id}?tab=messages`);
            onClose();
          },
        },
        {
          id: 'upload-file',
          label: 'Upload File',
          description: `Upload to ${activeProject.name}`,
          icon: <FileUp className="h-4 w-4" />,
          shortcut: 'U',
          category: 'create',
          action: () => {
            navigate(`/projects/${activeProject.id}?tab=files&action=upload`);
            onClose();
          },
        }
      );

      // Navigation within project
      baseActions.push(
        {
          id: 'nav-overview',
          label: 'Project Overview',
          description: activeProject.name,
          icon: <FolderOpen className="h-4 w-4" />,
          category: 'navigate',
          action: () => {
            navigate(`/projects/${activeProject.id}`);
            onClose();
          },
        },
        {
          id: 'nav-tasks',
          label: 'Project Tasks',
          description: activeProject.name,
          icon: <CheckSquare className="h-4 w-4" />,
          category: 'navigate',
          action: () => {
            navigate(`/projects/${activeProject.id}?tab=tasks`);
            onClose();
          },
        },
        {
          id: 'nav-files',
          label: 'Project Files',
          description: activeProject.name,
          icon: <FileUp className="h-4 w-4" />,
          category: 'navigate',
          action: () => {
            navigate(`/projects/${activeProject.id}?tab=files`);
            onClose();
          },
        },
        {
          id: 'nav-assets',
          label: 'Project Assets',
          description: activeProject.name,
          icon: <Layers className="h-4 w-4" />,
          category: 'navigate',
          action: () => {
            navigate(`/projects/${activeProject.id}?tab=assets`);
            onClose();
          },
        },
        {
          id: 'nav-boards',
          label: 'Project Boards',
          description: activeProject.name,
          icon: <PenTool className="h-4 w-4" />,
          category: 'navigate',
          action: () => {
            navigate(`/projects/${activeProject.id}?tab=boards`);
            onClose();
          },
        }
      );
    }

    // Global navigation
    baseActions.push(
      {
        id: 'nav-projects',
        label: 'All Projects',
        icon: <FolderOpen className="h-4 w-4" />,
        category: 'navigate',
        action: () => {
          navigate('/projects');
          onClose();
        },
      },
      {
        id: 'nav-messages',
        label: 'Messages',
        icon: <MessageSquare className="h-4 w-4" />,
        category: 'navigate',
        action: () => {
          navigate('/messages');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        icon: <Settings className="h-4 w-4" />,
        category: 'navigate',
        action: () => {
          navigate('/settings');
          onClose();
        },
      }
    );

    return baseActions;
  }, [hasFocus, activeProject, navigate, onClose]);

  // Filter actions by search
  const filteredActions = React.useMemo(() => {
    if (!search) return actions;
    const searchLower = search.toLowerCase();
    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(searchLower) ||
        action.description?.toLowerCase().includes(searchLower)
    );
  }, [actions, search]);

  // Group actions by category
  const groupedActions = React.useMemo(() => {
    const groups: Record<QuickAction['category'], QuickAction[]> = {
      create: [],
      navigate: [],
      project: [],
    };

    filteredActions.forEach((action) => {
      groups[action.category].push(action);
    });

    return groups;
  }, [filteredActions]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredActions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredActions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredActions[selectedIndex]) {
            filteredActions[selectedIndex].action();
            onAction?.(filteredActions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose, onAction]);

  // Reset selection when search changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className={cn(
          'fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-lg z-50',
          'bg-white dark:bg-neutral-900 rounded-xl shadow-2xl',
          'border border-neutral-200 dark:border-neutral-800',
          'animate-in fade-in-0 zoom-in-95 duration-150'
        )}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <Search className="h-5 w-5 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              hasFocus
                ? `Quick actions for ${activeProject?.name}...`
                : 'Search actions...'
            }
            className={cn(
              'flex-1 bg-transparent outline-none',
              'text-neutral-900 dark:text-neutral-100',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500'
            )}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500">
            esc
          </kbd>
        </div>

        {/* Actions list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-6">
              No actions found
            </p>
          ) : (
            <>
              {/* Create actions */}
              {groupedActions.create.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2 py-1">
                    Create
                  </p>
                  {groupedActions.create.map((action) => {
                    const globalIndex = filteredActions.indexOf(action);
                    return (
                      <ActionItem
                        key={action.id}
                        action={action}
                        isSelected={globalIndex === selectedIndex}
                        onClick={() => {
                          action.action();
                          onAction?.(action);
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Navigate actions */}
              {groupedActions.navigate.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 px-2 py-1">
                    Navigate
                  </p>
                  {groupedActions.navigate.map((action) => {
                    const globalIndex = filteredActions.indexOf(action);
                    return (
                      <ActionItem
                        key={action.id}
                        action={action}
                        isSelected={globalIndex === selectedIndex}
                        onClick={() => {
                          action.action();
                          onAction?.(action);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                ↵
              </kbd>
              select
            </span>
          </div>
          {hasFocus && (
            <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
              <Target className="h-3 w-3" />
              {activeProject?.name}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function ActionItem({
  action,
  isSelected,
  onClick,
}: {
  action: QuickAction;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
        'text-left transition-colors',
        isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          isSelected
            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
        )}
      >
        {action.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium',
            isSelected
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-neutral-900 dark:text-neutral-100'
          )}
        >
          {action.label}
        </p>
        {action.description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {action.description}
          </p>
        )}
      </div>
      {action.shortcut && (
        <kbd
          className={cn(
            'flex-shrink-0 px-1.5 py-0.5 rounded text-xs',
            isSelected
              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
          )}
        >
          {action.shortcut}
        </kbd>
      )}
      <ArrowRight
        className={cn(
          'h-4 w-4 flex-shrink-0',
          isSelected
            ? 'text-primary-500'
            : 'text-neutral-400 opacity-0 group-hover:opacity-100'
        )}
      />
    </button>
  );
}

// Hook to manage QuickActions state with keyboard shortcut
export function useQuickActions() {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}

export default QuickActions;
