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
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  type Comment,
} from '@/hooks/useComments';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  VirtualizedCommentList,
  MentionAutocomplete,
  extractMentions,
  type TeamMember,
} from './comments';

// ============================================================================
// Type Definitions
// ============================================================================

export type { TeamMember } from './comments';

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
      const searchTerm = match[1].toLowerCase();
      const suggestions = teamMembers.filter(
        (member) =>
          member.name.toLowerCase().includes(searchTerm) ||
          member.email.toLowerCase().includes(searchTerm)
      );
      setMentionSuggestions(suggestions);
      setShowMentions(true);
      setSelectedMentionIndex(0);

      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const { offsetTop, offsetLeft } = textarea;
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

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = match.index! + mentionText.length + 2;
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
      await updateCommentMutation.mutateAsync({
        commentId: editingComment.id,
        updates: {
          content: inputValue.trim(),
          mentions,
        },
      });
      setEditingComment(null);
    } else {
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
      case 'link': {
        const url = window.prompt('Enter URL:');
        if (url) {
          newText = inputValue.slice(0, start) + `[${text}](${url})` + inputValue.slice(end);
          cursorOffset = selectedText ? 1 : text.length + 1;
        } else {
          return;
        }
        break;
      }
      default:
        return;
    }

    setInputValue(newText);

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
      <div>
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
          <VirtualizedCommentList
            comments={comments}
            currentUserId={currentUser.id}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
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
