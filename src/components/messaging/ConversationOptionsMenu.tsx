/**
 * ConversationOptionsMenu Component
 *
 * Dropdown menu for conversation-level actions:
 * - Mute/unmute notifications
 * - Archive/unarchive conversation
 * - View conversation info
 * - Leave conversation (group only)
 */

import {
  Bell,
  BellOff,
  Archive,
  ArchiveRestore,
  Info,
  LogOut,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Conversation } from './types';

export interface ConversationOptionsMenuProps {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMute: () => void;
  onArchive: () => void;
  onViewInfo: () => void;
  onLeave?: () => void;
  trigger: React.ReactNode;
}

export function ConversationOptionsMenu({
  conversation,
  open,
  onOpenChange,
  onMute,
  onArchive,
  onViewInfo,
  onLeave,
  trigger,
}: ConversationOptionsMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onMute}>
          {conversation.isMuted ? (
            <>
              <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
              Unmute notifications
            </>
          ) : (
            <>
              <BellOff className="w-4 h-4 mr-2" aria-hidden="true" />
              Mute notifications
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onArchive}>
          {conversation.isArchived ? (
            <>
              <ArchiveRestore className="w-4 h-4 mr-2" aria-hidden="true" />
              Unarchive conversation
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 mr-2" aria-hidden="true" />
              Archive conversation
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onViewInfo}>
          <Info className="w-4 h-4 mr-2" aria-hidden="true" />
          Conversation info
        </DropdownMenuItem>

        {conversation.type === 'group' && onLeave && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLeave} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              Leave conversation
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ConversationOptionsMenu;
