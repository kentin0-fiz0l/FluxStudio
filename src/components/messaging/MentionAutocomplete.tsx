/**
 * MentionAutocomplete Component
 * @mention dropdown autocomplete for the message composer.
 *
 * Features:
 * - Triggers when user types '@' in the composer
 * - Shows filtered user list with avatar, name, online status
 * - Special "@AI" entry at the top when matching
 * - Arrow keys to navigate, Enter to select, Escape to close
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
}

interface MentionAutocompleteProps {
  query: string;
  users: MentionUser[];
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
  position?: { top?: number | string; bottom?: number | string; left: number | string };
}

const AI_USER: MentionUser = {
  id: '__ai__',
  name: 'AI',
  isOnline: true,
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function MentionAutocomplete({
  query,
  users,
  onSelect,
  onClose,
  position,
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const queryLower = query.toLowerCase();

  // Build filtered list with AI at top when matching
  const filteredUsers: MentionUser[] = [];

  if (!query || 'ai'.startsWith(queryLower) || 'a'.startsWith(queryLower)) {
    filteredUsers.push(AI_USER);
  }

  const matchingUsers = users.filter(
    (u) => u.name.toLowerCase().includes(queryLower)
  );
  filteredUsers.push(...matchingUsers);

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
      if (filteredUsers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
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
          onSelect(filteredUsers[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
      }
    },
    [filteredUsers, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  if (filteredUsers.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-64 max-h-48 overflow-y-auto bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700"
      style={{
        bottom: position?.bottom,
        top: position?.top,
        left: position?.left ?? 0,
      }}
    >
      <div ref={listRef} role="listbox" aria-label="Mention suggestions">
        {filteredUsers.map((user, index) => (
          <button
            key={user.id}
            role="option"
            aria-selected={index === selectedIndex}
            onClick={() => onSelect(user)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              index === selectedIndex
                ? 'bg-primary-50 dark:bg-primary-900/30'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
            )}
          >
            {/* Avatar */}
            {user.id === '__ai__' ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
            ) : user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {getInitials(user.name)}
              </div>
            )}

            {/* Name and status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {user.id === '__ai__' ? '@AI Assistant' : user.name}
                </span>
                {user.id === '__ai__' && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                    AI
                  </span>
                )}
              </div>
            </div>

            {/* Online status */}
            {user.isOnline && user.id !== '__ai__' && (
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Online" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MentionAutocomplete;
