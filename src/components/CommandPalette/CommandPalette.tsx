/* eslint-disable react-refresh/only-export-components */
/**
 * CommandPalette - Quick navigation and actions (Cmd+K)
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
import { Search } from 'lucide-react';

import type { Command, CommandPaletteProps, FrecencyStore } from './command-types';
import { catOrder } from './command-constants';
import { loadFrecency, recordCommandUsage, getFrecencyScore, buildCommands } from './command-utils';
import { CommandGroupList } from './CommandGroupList';
import { PaletteFooter } from './PaletteFooter';

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

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const commands = useMemo(
    () => buildCommands(navigate, handleOpenChange, { onCreateProject, onUploadFile, onCreateTask, onSendMessage }, currentProject, projects),
    [navigate, handleOpenChange, onCreateProject, onUploadFile, onCreateTask, onSendMessage, projects, currentProject]
  );

  const frecencyRef = useRef<FrecencyStore>({});
  useEffect(() => {
    if (open) frecencyRef.current = loadFrecency();
  }, [open]);

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

    const store = frecencyRef.current;
    return [...result].sort((a, b) => {
      const catA = catOrder[a.category || 'navigation'] ?? 9;
      const catB = catOrder[b.category || 'navigation'] ?? 9;
      if (catA !== catB) return catA - catB;
      return getFrecencyScore(b.id, store) - getFrecencyScore(a.id, store);
    });
  }, [commands, search]);

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

  useLayoutEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const executeCommand = useCallback((command: Command) => {
    recordCommandUsage(command.id);
    command.action();
  }, []);

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl" aria-describedby="command-palette-description">
        <div className="sr-only" id="command-palette-description">
          Command palette for quick navigation and actions
        </div>

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

        <div className="max-h-[400px] overflow-y-auto p-2">
          <CommandGroupList
            groupedCommands={groupedCommands}
            filteredCommands={filteredCommands}
            selectedIndex={selectedIndex}
            onExecute={executeCommand}
            onSelect={setSelectedIndex}
          />
        </div>

        <PaletteFooter />
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
