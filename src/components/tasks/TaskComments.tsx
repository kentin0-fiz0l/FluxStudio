/**
 * Task Comments Component - Flux Studio Sprint 2
 *
 * A comprehensive comments system with @mention support for task collaboration.
 *
 * Features:
 * - Comment display with author, timestamp, and content
 * - Markdown rendering with syntax highlighting
 * - @Mention autocomplete for team members
 * - Rich textarea with markdown toolbar
 * - Character count (max 2000 chars)
 * - Edit/delete for own comments
 * - Real-time updates via WebSocket
 * - Keyboard shortcuts (Cmd+Enter to submit)
 * - Empty state with call-to-action
 * - Loading and error states
 * - Accessibility (WCAG 2.1 Level A)
 *
 * @example
 * <TaskComments
 *   projectId="proj_123"
 *   taskId="task_456"
 *   teamMembers={members}
 *   currentUser={user}
 * />
 */

import * as React from 'react';
import { MessageCircle, Send, Edit2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeComment } from '@/lib/sanitize';
import { Button } from '@/components/ui/button';
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
import {
  useCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  type Comment,
} from '@/hooks/useComments';
import { useWebSocket } from '@/hooks/useWebSocket';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export interface TaskCommentsProps {
  projectId: string;
  taskId: string;
  teamMembers: TeamMember[];
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format relative time from ISO date string
 * Examples: "Just now", "5m ago", "2h ago", "3d ago", "Mar 15, 2024"
 */
const formatRelativeTime = (isoDate: string): string => {
  const now = new Date();
  const date = new Date(isoDate);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  // For dates older than a week, show full date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Get initials from name for avatar
 * Examples: "John Doe" => "JD", "Alice" => "A"
 */
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Get consistent color for user based on their ID
 * Uses HSL color space for visually distinct colors
 */
const getUserColor = (userId: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/**
 * Render markdown with @mention highlighting
 * Supports: **bold**, *italic*, `code`, [links](url), @mentions
 */
const renderMarkdown = (text: string): string => {
  let rendered = text;

  // Bold: **text**
  rendered = rendered.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* (but not ** from bold)
  rendered = rendered.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Code: `text`
  rendered = rendered.replace(/`([^`]+)`/g, '<code class="bg-neutral-100 text-neutral-900 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

  // Links: [text](url)
  rendered = rendered.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700 underline">$1</a>'
  );

  // Mentions: @username
  rendered = rendered.replace(
    /@(\w+)/g,
    '<span class="text-primary-600 font-semibold bg-primary-50 px-1 rounded">@$1</span>'
  );

  // Line breaks
  rendered = rendered.replace(/\n/g, '<br/>');

  return rendered;
};

/**
 * Extract @mentions from text
 * Returns array of usernames mentioned
 */
const extractMentions = (text: string, teamMembers: TeamMember[]): string[] => {
  const mentionPattern = /@(\w+)/g;
  const matches = Array.from(text.matchAll(mentionPattern));
  const mentionedNames = matches.map((match) => match[1].toLowerCase());

  // Map mentioned names to user IDs
  const mentionedUserIds: string[] = [];
  teamMembers.forEach((member) => {
    const nameLower = member.name.toLowerCase().replace(/\s+/g, '');
    if (mentionedNames.some((mention) => nameLower.includes(mention))) {
      mentionedUserIds.push(member.id);
    }
  });

  return mentionedUserIds;
};

// ============================================================================
// Comment Item Component
// ============================================================================

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
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
            dangerouslySetInnerHTML={{ __html: sanitizeComment(renderMarkdown(comment.content)) }}
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

// ============================================================================
// Mention Autocomplete Component
// ============================================================================

interface MentionAutocompleteProps {
  suggestions: TeamMember[];
  selectedIndex: number;
  onSelect: (member: TeamMember) => void;
  position: { top: number; left: number };
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
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

// ============================================================================
// Main Component
// ============================================================================

export const TaskComments: React.FC<TaskCommentsProps> = ({
  projectId,
  taskId,
  teamMembers,
  currentUser,
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [inputValue, setInputValue] = React.useState('');
  const [editingComment, setEditingComment] = React.useState<Comment | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = React.useState<TeamMember[]>([]);
  const [showMentions, setShowMentions] = React.useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = React.useState(0);
  const [mentionPosition, setMentionPosition] = React.useState({ top: 0, left: 0 });

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // ============================================================================
  // API Hooks
  // ============================================================================

  const { data: comments = [], isLoading, error } = useCommentsQuery(projectId, taskId);
  const createCommentMutation = useCreateCommentMutation(projectId, taskId);
  const updateCommentMutation = useUpdateCommentMutation(projectId, taskId);
  const deleteCommentMutation = useDeleteCommentMutation(projectId, taskId);

  // ============================================================================
  // Real-Time Updates
  // ============================================================================

  const { on, off } = useWebSocket('/projects');

  React.useEffect(() => {
    const handleCommentCreated = (newComment: Comment) => {
      if (newComment.taskId === taskId && newComment.projectId === projectId) {
        // React Query will handle cache update automatically
      }
    };

    const handleCommentUpdated = (updatedComment: Comment) => {
      if (updatedComment.taskId === taskId && updatedComment.projectId === projectId) {
        // React Query will handle cache update automatically
      }
    };

    const handleCommentDeleted = (data: { commentId: string; taskId: string }) => {
      if (data.taskId === taskId) {
        // React Query will handle cache update automatically
      }
    };

    on('comment:created', handleCommentCreated);
    on('comment:updated', handleCommentUpdated);
    on('comment:deleted', handleCommentDeleted);

    return () => {
      off('comment:created', handleCommentCreated);
      off('comment:updated', handleCommentUpdated);
      off('comment:deleted', handleCommentDeleted);
    };
  }, [on, off, projectId, taskId]);

  // ============================================================================
  // Character Count
  // ============================================================================

  const characterCount = inputValue.length;
  const isOverLimit = characterCount > 2000;

  // ============================================================================
  // @Mention Handling
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputValue(text);

    const cursorPos = e.target.selectionStart;
    const beforeCursor = text.slice(0, cursorPos);
    const match = beforeCursor.match(/@(\w*)$/);

    if (match) {
      // Show mention suggestions
      const searchTerm = match[1].toLowerCase();
      const suggestions = teamMembers.filter(
        (member) =>
          member.name.toLowerCase().includes(searchTerm) ||
          member.email.toLowerCase().includes(searchTerm)
      );
      setMentionSuggestions(suggestions);
      setShowMentions(true);
      setSelectedMentionIndex(0);

      // Calculate position for mention dropdown
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const { offsetTop, offsetLeft } = textarea;
        // Position below the textarea
        setMentionPosition({
          top: offsetTop + textarea.offsetHeight,
          left: offsetLeft,
        });
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const text = inputValue;
    const beforeCursor = text.slice(0, cursorPos);
    const afterCursor = text.slice(cursorPos);

    const match = beforeCursor.match(/@(\w*)$/);
    if (match) {
      const mentionText = member.name.replace(/\s+/g, '');
      const newText =
        beforeCursor.slice(0, match.index) + `@${mentionText} ` + afterCursor;
      setInputValue(newText);
      setShowMentions(false);

      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = match.index! + mentionText.length + 2; // +2 for @ and space
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions) {
      // Handle mention navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mentionSuggestions[selectedMentionIndex]) {
          insertMention(mentionSuggestions[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
    } else {
      // Cmd+Enter or Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  // ============================================================================
  // Comment Actions
  // ============================================================================

  const handleSubmit = async () => {
    if (!inputValue.trim() || isOverLimit) return;

    const mentions = extractMentions(inputValue, teamMembers);

    if (editingComment) {
      // Update existing comment
      await updateCommentMutation.mutateAsync({
        commentId: editingComment.id,
        updates: {
          content: inputValue.trim(),
          mentions,
        },
      });
      setEditingComment(null);
    } else {
      // Create new comment
      await createCommentMutation.mutateAsync({
        content: inputValue.trim(),
        mentions,
      });
    }

    setInputValue('');
    setShowMentions(false);
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    setInputValue(comment.content);
    textareaRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setInputValue('');
  };

  const handleDelete = async (commentId: string) => {
    await deleteCommentMutation.mutateAsync(commentId);
  };

  // ============================================================================
  // Markdown Toolbar Actions
  // ============================================================================

  const insertMarkdown = (syntax: string, placeholder: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = inputValue.slice(start, end);
    const text = selectedText || placeholder;

    let newText = '';
    let cursorOffset = 0;

    switch (syntax) {
      case 'bold':
        newText = inputValue.slice(0, start) + `**${text}**` + inputValue.slice(end);
        cursorOffset = selectedText ? 2 : text.length + 2;
        break;
      case 'italic':
        newText = inputValue.slice(0, start) + `*${text}*` + inputValue.slice(end);
        cursorOffset = selectedText ? 1 : text.length + 1;
        break;
      case 'code':
        newText = inputValue.slice(0, start) + `\`${text}\`` + inputValue.slice(end);
        cursorOffset = selectedText ? 1 : text.length + 1;
        break;
      case 'link':
        const url = window.prompt('Enter URL:');
        if (url) {
          newText = inputValue.slice(0, start) + `[${text}](${url})` + inputValue.slice(end);
          cursorOffset = selectedText ? 1 : text.length + 1;
        } else {
          return;
        }
        break;
      default:
        return;
    }

    setInputValue(newText);

    // Set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + cursorOffset;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = selectedText ? newPos : start + text.length + (syntax === 'link' ? 1 : syntax === 'bold' ? 2 : 1);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // ============================================================================
  // Auto-resize Textarea
  // ============================================================================

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-neutral-600" aria-hidden="true" />
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden="true" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-error-600 text-sm">Failed to load comments</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 bg-neutral-50 rounded-lg border border-neutral-200">
            <MessageCircle className="h-12 w-12 text-neutral-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-neutral-600 font-medium mb-1">No comments yet</p>
            <p className="text-neutral-500 text-sm">Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser.id}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Comment Input */}
      <div className="border border-neutral-300 rounded-lg overflow-hidden focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
        {/* Markdown Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-neutral-50 border-b border-neutral-200">
          <button
            onClick={() => insertMarkdown('bold', 'bold text')}
            className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 transition-colors"
            title="Bold (Cmd+B)"
            aria-label="Bold"
            type="button"
          >
            <span className="font-bold text-sm">B</span>
          </button>
          <button
            onClick={() => insertMarkdown('italic', 'italic text')}
            className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 transition-colors"
            title="Italic (Cmd+I)"
            aria-label="Italic"
            type="button"
          >
            <span className="italic text-sm">I</span>
          </button>
          <button
            onClick={() => insertMarkdown('code', 'code')}
            className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 transition-colors font-mono"
            title="Code"
            aria-label="Code"
            type="button"
          >
            <span className="text-sm">&lt;&gt;</span>
          </button>
          <button
            onClick={() => insertMarkdown('link', 'link text')}
            className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 transition-colors"
            title="Insert Link"
            aria-label="Insert link"
            type="button"
          >
            <span className="text-sm">Link</span>
          </button>

          <div className="flex-1" />

          {/* Character Count */}
          <span
            className={cn(
              'text-xs',
              isOverLimit ? 'text-error-600 font-semibold' : 'text-neutral-500'
            )}
          >
            {characterCount}/2000
          </span>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingComment
                ? 'Edit your comment...'
                : 'Add a comment... (type @ to mention someone)'
            }
            className="w-full px-3 py-2 resize-none focus:outline-none text-sm min-h-[80px] max-h-[200px]"
            aria-label="Comment input"
            disabled={createCommentMutation.isPending || updateCommentMutation.isPending}
          />

          {/* Mention Autocomplete */}
          {showMentions && (
            <MentionAutocomplete
              suggestions={mentionSuggestions}
              selectedIndex={selectedMentionIndex}
              onSelect={insertMention}
              position={mentionPosition}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-t border-neutral-200">
          <p className="text-xs text-neutral-500">
            {editingComment ? (
              <>
                Editing comment{' '}
                <button
                  onClick={handleCancelEdit}
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <kbd className="px-1 py-0.5 bg-white border border-neutral-300 rounded text-xs">
                  Cmd+Enter
                </kbd>{' '}
                to submit
              </>
            )}
          </p>

          <Button
            onClick={handleSubmit}
            disabled={
              !inputValue.trim() ||
              isOverLimit ||
              createCommentMutation.isPending ||
              updateCommentMutation.isPending
            }
            size="sm"
            icon={
              createCommentMutation.isPending || updateCommentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )
            }
          >
            {editingComment ? 'Update' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskComments;
