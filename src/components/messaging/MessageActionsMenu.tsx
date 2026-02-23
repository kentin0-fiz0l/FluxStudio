/**
 * Message Actions Menu Component
 * Dropdown menu for message actions (reply, react, pin, copy, delete)
 */

// React import not needed with JSX transform
import {
  Reply,
  Smile,
  Pin,
  PinOff,
  Copy,
  Trash2,
  MoreHorizontal,
  Pencil,
  Forward,
  MessageCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

export interface MessageActionsMenuProps {
  messageId: string;
  canReply?: boolean;
  canReact?: boolean;
  canPin?: boolean;
  canEdit?: boolean;
  canForward?: boolean;
  canDelete?: boolean;
  canOpenThread?: boolean;
  isPinned?: boolean;
  hasReplies?: boolean;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string) => void;
  onPinToggle?: (messageId: string) => void;
  onEdit?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
  onCopy?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onOpenThread?: (messageId: string) => void;
  className?: string;
  /** Position of the menu relative to the message */
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function MessageActionsMenu({
  messageId,
  canReply = true,
  canReact = true,
  canPin = true,
  canEdit = false,
  canForward = true,
  canDelete = false,
  canOpenThread = true,
  isPinned = false,
  hasReplies = false,
  onReply,
  onReact,
  onPinToggle,
  onEdit,
  onForward,
  onCopy,
  onDelete,
  onOpenThread,
  className,
  align = 'end',
  side = 'top',
}: MessageActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'p-1.5 rounded-full bg-white dark:bg-neutral-800 shadow-lg',
            'hover:bg-neutral-100 dark:hover:bg-neutral-700',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
            'transition-colors',
            className
          )}
          title="More actions"
          aria-label="Message actions menu"
        >
          <MoreHorizontal className="w-4 h-4 text-neutral-600 dark:text-neutral-400" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-48">
        {/* Reply */}
        {canReply && onReply && (
          <DropdownMenuItem onClick={() => onReply(messageId)}>
            <Reply className="w-4 h-4 mr-2" aria-hidden="true" />
            Reply
          </DropdownMenuItem>
        )}

        {/* Open Thread */}
        {canOpenThread && onOpenThread && (
          <DropdownMenuItem onClick={() => onOpenThread(messageId)}>
            <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            {hasReplies ? 'View thread' : 'Start thread'}
          </DropdownMenuItem>
        )}

        {/* Add Reaction */}
        {canReact && onReact && (
          <DropdownMenuItem onClick={() => onReact(messageId)}>
            <Smile className="w-4 h-4 mr-2" aria-hidden="true" />
            Add reaction...
          </DropdownMenuItem>
        )}

        {/* Pin / Unpin */}
        {canPin && onPinToggle && (
          <DropdownMenuItem onClick={() => onPinToggle(messageId)}>
            {isPinned ? (
              <>
                <PinOff className="w-4 h-4 mr-2" aria-hidden="true" />
                Unpin message
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 mr-2" aria-hidden="true" />
                Pin message
              </>
            )}
          </DropdownMenuItem>
        )}

        {/* Edit */}
        {canEdit && onEdit && (
          <DropdownMenuItem onClick={() => onEdit(messageId)}>
            <Pencil className="w-4 h-4 mr-2" aria-hidden="true" />
            Edit message
          </DropdownMenuItem>
        )}

        {/* Forward */}
        {canForward && onForward && (
          <DropdownMenuItem onClick={() => onForward(messageId)}>
            <Forward className="w-4 h-4 mr-2" aria-hidden="true" />
            Forward
          </DropdownMenuItem>
        )}

        {/* Copy */}
        {onCopy && (
          <DropdownMenuItem onClick={() => onCopy(messageId)}>
            <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
            Copy text
          </DropdownMenuItem>
        )}

        {/* Separator before destructive actions */}
        {canDelete && onDelete && <DropdownMenuSeparator />}

        {/* Delete */}
        {canDelete && onDelete && (
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(messageId)}
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MessageActionsMenu;
