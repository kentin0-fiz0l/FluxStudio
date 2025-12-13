/**
 * Message Reactions Component
 *
 * Displays reactions on a message and allows users to add/remove reactions.
 * Integrates with the real-time reaction system via WebSocket.
 */

import React, { useState } from 'react';
import { Smile, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { cn } from '../../lib/utils';
import { MessageReactionSummary } from '../../services/messagingSocketService';

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '🎉', '🔥', '😂', '😮'];

interface MessageReactionsProps {
  reactions: MessageReactionSummary[];
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
  className?: string;
  compact?: boolean;
}

export function MessageReactions({
  reactions,
  currentUserId,
  onToggleReaction,
  className,
  compact = false,
}: MessageReactionsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Check if current user has reacted with a specific emoji
  const hasUserReacted = (reaction: MessageReactionSummary): boolean => {
    return reaction.userIds.includes(currentUserId);
  };

  // Handle reaction click - toggle reaction
  const handleReactionClick = (emoji: string) => {
    onToggleReaction(emoji);
  };

  // Handle emoji pick from picker
  const handleEmojiPick = (emoji: string) => {
    onToggleReaction(emoji);
    setIsPickerOpen(false);
  };

  // Format tooltip showing who reacted
  const formatReactorTooltip = (reaction: MessageReactionSummary): string => {
    const count = reaction.count;
    if (count === 1) {
      return hasUserReacted(reaction) ? 'You reacted' : '1 reaction';
    }
    if (hasUserReacted(reaction)) {
      return count === 2 ? 'You and 1 other' : `You and ${count - 1} others`;
    }
    return `${count} reactions`;
  };

  return (
    <div className={cn('flex items-center flex-wrap gap-1', className)}>
      {/* Existing reactions */}
      {reactions.map((reaction) => {
        const userReacted = hasUserReacted(reaction);
        return (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            title={formatReactorTooltip(reaction)}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all',
              'border hover:scale-105 active:scale-95',
              userReacted
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-muted/50 border-border hover:bg-muted text-muted-foreground'
            )}
          >
            <span className="text-sm leading-none">{reaction.emoji}</span>
            <span className="font-medium tabular-nums">{reaction.count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 w-6 p-0 rounded-full opacity-60 hover:opacity-100 transition-opacity',
              compact && reactions.length === 0 && 'hidden group-hover:flex'
            )}
          >
            <Plus className="h-3 w-3" />
            <span className="sr-only">Add reaction</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-2"
          align="start"
          side="top"
          sideOffset={4}
        >
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => {
              const existingReaction = reactions.find(r => r.emoji === emoji);
              const userReacted = existingReaction ? hasUserReacted(existingReaction) : false;
              return (
                <button
                  key={emoji}
                  onClick={() => handleEmojiPick(emoji)}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center text-lg rounded transition-all',
                    'hover:bg-accent hover:scale-110 active:scale-95',
                    userReacted && 'bg-blue-50 dark:bg-blue-950'
                  )}
                  title={userReacted ? 'Remove reaction' : 'Add reaction'}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Inline add reaction button for message hover actions
 */
interface AddReactionButtonProps {
  onOpenPicker: () => void;
  className?: string;
}

export function AddReactionButton({ onOpenPicker, className }: AddReactionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 w-7 p-0', className)}
      onClick={onOpenPicker}
      title="Add reaction"
    >
      <Smile className="h-4 w-4" />
    </Button>
  );
}

/**
 * Standalone reaction picker for use in message action menus
 */
interface ReactionPickerProps {
  onSelectEmoji: (emoji: string) => void;
  existingReactions?: MessageReactionSummary[];
  currentUserId?: string;
  className?: string;
}

export function ReactionPicker({
  onSelectEmoji,
  existingReactions = [],
  currentUserId = '',
  className,
}: ReactionPickerProps) {
  const hasUserReacted = (emoji: string): boolean => {
    const reaction = existingReactions.find(r => r.emoji === emoji);
    return reaction ? reaction.userIds.includes(currentUserId) : false;
  };

  return (
    <div className={cn('flex gap-1 p-1', className)}>
      {QUICK_REACTIONS.map((emoji) => {
        const userReacted = hasUserReacted(emoji);
        return (
          <button
            key={emoji}
            onClick={() => onSelectEmoji(emoji)}
            className={cn(
              'w-8 h-8 flex items-center justify-center text-lg rounded transition-all',
              'hover:bg-accent hover:scale-110 active:scale-95',
              userReacted && 'bg-blue-50 dark:bg-blue-950 ring-1 ring-blue-200 dark:ring-blue-800'
            )}
            title={userReacted ? 'Remove reaction' : 'Add reaction'}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

export default MessageReactions;
