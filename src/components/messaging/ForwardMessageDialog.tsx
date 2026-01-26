/**
 * ForwardMessageDialog Component
 * Dialog for forwarding a message to another conversation
 *
 * Features:
 * - Message preview
 * - Conversation list with selection
 * - Filters out current conversation
 */

import { Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';
import { Button } from '@/components/ui';
import type { Message, Conversation } from './types';

export interface ForwardMessageDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The message being forwarded */
  sourceMessage: Message | null;
  /** List of available conversations to forward to */
  conversations: Conversation[];
  /** Currently selected conversation (to exclude from list) */
  currentConversationId?: string;
  /** ID of the selected target conversation */
  targetConversationId: string | null;
  /** Called when user selects a target conversation */
  onSelectTarget: (conversationId: string) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Called when user confirms forward */
  onConfirm: () => void;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  sourceMessage,
  conversations,
  currentConversationId,
  targetConversationId,
  onSelectTarget,
  onCancel,
  onConfirm,
}: ForwardMessageDialogProps) {
  // Filter out current conversation
  const availableConversations = conversations.filter(
    c => c.id !== currentConversationId
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message</DialogTitle>
          <DialogDescription>
            Select a conversation to forward this message to.
          </DialogDescription>
        </DialogHeader>

        {/* Message preview */}
        {sourceMessage?.content && (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-4">
            <p className="text-xs text-neutral-500 mb-1">Message preview:</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">
              {sourceMessage.content}
            </p>
          </div>
        )}

        {/* Conversation list */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {availableConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelectTarget(conv.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                targetConversationId === conv.id
                  ? 'bg-primary-100 dark:bg-primary-900 border border-primary-300'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-transparent'
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-medium">
                {conv.type === 'group' || conv.type === 'channel' ? (
                  <Users className="w-5 h-5" />
                ) : (
                  conv.participant?.initials || '?'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {conv.title}
                </p>
                {conv.lastMessage && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {conv.lastMessage.content}
                  </p>
                )}
              </div>
              {targetConversationId === conv.id && (
                <Check className="w-5 h-5 text-primary-600" />
              )}
            </button>
          ))}

          {availableConversations.length === 0 && (
            <p className="text-center text-sm text-neutral-500 py-4">
              No other conversations available
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!targetConversationId}
            onClick={onConfirm}
          >
            Forward
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ForwardMessageDialog;
