/**
 * CommentItem - Individual comment display with edit/delete actions
 */

import * as React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type Comment } from '@/hooks/useComments';
import { formatRelativeTime, getInitials, getUserColor, renderMarkdown } from './comment-helpers';

export interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onEdit,
  onDelete,
}) => {
  const isOwnComment = comment.createdBy === currentUserId;
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  return (
    <>
      <div className="flex gap-3 group">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className={cn('text-white text-sm', getUserColor(comment.author.id))}>
            {getInitials(comment.author.name)}
          </AvatarFallback>
        </Avatar>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-neutral-900 text-sm">
              {comment.author.name}
            </span>
            <span className="text-xs text-neutral-500">
              {formatRelativeTime(comment.createdAt)}
            </span>
            {comment.updatedAt && (
              <span className="text-xs text-neutral-400 italic">(edited)</span>
            )}
          </div>

          {/* Comment Body with Markdown */}
          <div
            className="text-sm text-neutral-700 break-words prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
          />

          {/* Actions (visible on hover for own comments) */}
          {isOwnComment && (
            <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(comment)}
                className="text-xs text-neutral-600 hover:text-primary-600 flex items-center gap-1"
                aria-label="Edit comment"
              >
                <Edit2 className="h-3 w-3" aria-hidden="true" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="text-xs text-neutral-600 hover:text-error-600 flex items-center gap-1"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(comment.id);
                setShowDeleteDialog(false);
              }}
              className="bg-error-600 hover:bg-error-700"
            >
              Delete Comment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
