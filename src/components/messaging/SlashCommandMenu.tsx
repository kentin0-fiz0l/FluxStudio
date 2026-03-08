/**
 * SlashCommandMenu Component
 * /slash command menu for the message composer.
 *
 * Features:
 * - Triggers when user types '/' at the start of a line
 * - Shows available commands filtered by typed text
 * - Arrow keys to navigate, Enter to execute, Escape to close
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Bot,
  File,
  CheckSquare,
  Image,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** placeholder = not yet functional */
  isPlaceholder?: boolean;
}

/** Default slash commands for messaging, reusing concepts from CommandPalette */
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'search',
    label: '/search',
    description: 'Search messages and files',
    icon: Search,
  },
  {
    id: 'ai',
    label: '/ai',
    description: 'Ask AI a question',
    icon: Bot,
  },
  {
    id: 'file',
    label: '/file',
    description: 'Share a file from the project',
    icon: File,
  },
  {
    id: 'task',
    label: '/task',
    description: 'Create or link a task',
    icon: CheckSquare,
  },
  {
    id: 'giphy',
    label: '/giphy',
    description: 'Search for a GIF',
    icon: Image,
    isPlaceholder: true,
  },
  {
    id: 'poll',
    label: '/poll',
    description: 'Create a quick poll',
    icon: BarChart3,
    isPlaceholder: true,
  },
];

interface SlashCommandMenuProps {
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  position?: { top?: number | string; bottom?: number | string; left: number | string };
}

export function SlashCommandMenu({
  query,
  onSelect,
  onClose,
  position,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const queryLower = query.toLowerCase();
  const filteredCommands = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.id.includes(queryLower) ||
      cmd.label.includes(queryLower) ||
      cmd.description.toLowerCase().includes(queryLower)
  );

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          onSelect(filteredCommands[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  if (filteredCommands.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-72 max-h-64 overflow-y-auto bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700"
      style={{
        bottom: position?.bottom,
        top: position?.top,
        left: position?.left ?? 0,
      }}
    >
      <div className="px-3 py-2 text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">
        Commands
      </div>
      <div ref={listRef} role="listbox" aria-label="Slash commands">
        {filteredCommands.map((command, index) => {
          const Icon = command.icon;
          return (
            <button
              key={command.id}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => onSelect(command)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                index === selectedIndex
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {command.label}
                  </span>
                  {command.isPlaceholder && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-full">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {command.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SlashCommandMenu;
