import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type TeamMember, getInitials, getUserColor } from './comment-utils';

interface MentionAutocompleteProps {
  suggestions: TeamMember[];
  selectedIndex: number;
  onSelect: (member: TeamMember) => void;
  position: { top: number; left: number };
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  position,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
      role="listbox"
      aria-label="Mention suggestions"
    >
      {suggestions.map((member, index) => (
        <button
          key={member.id}
          onClick={() => onSelect(member)}
          className={cn(
            'w-full px-3 py-2 text-left hover:bg-neutral-100 flex items-center gap-2',
            index === selectedIndex && 'bg-primary-50'
          )}
          role="option"
          aria-selected={index === selectedIndex}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className={cn('text-white text-xs', getUserColor(member.id))}>
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-neutral-900 truncate">
              {member.name}
            </div>
            <div className="text-xs text-neutral-500 truncate">{member.email}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
