/**
 * CanvasCommentLayer — DOM overlay for comment pins + popovers on the timeline canvas.
 *
 * Sprint 32: Positioned absolutely over the TimelineCanvas.
 * Sprint 33: Threading (replies), reactions, reply count badges.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, Check, Trash2, X } from 'lucide-react';
import type { CanvasComment } from '../../hooks/useMetMapComments';
import { REACTION_EMOJIS } from '../../hooks/useMetMapComments';

interface CanvasCommentLayerProps {
  comments: CanvasComment[];
  pixelsPerBar: number;
  canvasHeight: number;
  currentUserId: string;
  onAddComment: (barStart: number, text: string) => void;
  onReplyToComment: (parentId: string, text: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
  onToggleReaction: (commentId: string, emoji: string) => void;
  className?: string;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Single comment bubble used for both parents and replies. */
function CommentBubble({
  comment,
  currentUserId,
  isReply,
  onToggleReaction,
}: {
  comment: CanvasComment;
  currentUserId: string;
  isReply: boolean;
  onToggleReaction: (commentId: string, emoji: string) => void;
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const reactionEntries = Object.entries(comment.reactions || {}).filter(
    ([, users]) => users.length > 0
  );

  return (
    <div className={isReply ? 'pl-3 border-l-2 border-neutral-100 ml-2 mt-2' : ''}>
      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-medium shrink-0"
          style={{ backgroundColor: comment.color }}
        >
          {comment.username[0]?.toUpperCase()}
        </div>
        <span className="font-medium text-neutral-800">{comment.username}</span>
        <span className="text-neutral-400">{formatRelativeTime(comment.createdAt)}</span>
      </div>
      <p className="text-neutral-700 whitespace-pre-wrap mb-1.5">{comment.text}</p>

      {/* Reactions */}
      <div className="flex flex-wrap items-center gap-1">
        {reactionEntries.map(([emoji, users]) => (
          <button
            key={emoji}
            onClick={() => onToggleReaction(comment.id, emoji)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-colors ${
              users.includes(currentUserId)
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-150 hover:bg-neutral-100'
            }`}
          >
            <span>{emoji}</span>
            <span>{users.length}</span>
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="w-5 h-5 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400 transition-colors"
            title="Add reaction"
          >
            +
          </button>
          {showReactionPicker && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 bg-white rounded-lg shadow-md border border-neutral-200 p-1 z-50">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction(comment.id, emoji);
                    setShowReactionPicker(false);
                  }}
                  className="w-6 h-6 rounded hover:bg-neutral-100 flex items-center justify-center text-sm transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const CanvasCommentLayer = React.memo(function CanvasCommentLayer({
  comments,
  pixelsPerBar,
  canvasHeight,
  currentUserId,
  onAddComment,
  onReplyToComment,
  onResolveComment,
  onDeleteComment,
  onToggleReaction,
  className = '',
}: CanvasCommentLayerProps) {
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [addingAtBar, setAddingAtBar] = useState<number | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingAtBar !== null) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [addingAtBar]);

  // Group comments: top-level + their replies
  const topLevelComments = useMemo(
    () => comments.filter((c) => !c.parentId && !c.resolved),
    [comments]
  );

  const repliesMap = useMemo(() => {
    const map = new Map<string, CanvasComment[]>();
    for (const c of comments) {
      if (c.parentId && !c.resolved) {
        const existing = map.get(c.parentId) || [];
        existing.push(c);
        map.set(c.parentId, existing);
      }
    }
    // Sort replies chronologically
    for (const replies of map.values()) {
      replies.sort((a, b) => a.createdAt - b.createdAt);
    }
    return map;
  }, [comments]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const bar = Math.floor(x / pixelsPerBar) + 1;
      setAddingAtBar(bar);
      setNewCommentText('');
      setOpenCommentId(null);
    },
    [pixelsPerBar]
  );

  const handleSubmitComment = useCallback(() => {
    if (!addingAtBar || !newCommentText.trim()) return;
    onAddComment(addingAtBar, newCommentText.trim());
    setAddingAtBar(null);
    setNewCommentText('');
  }, [addingAtBar, newCommentText, onAddComment]);

  const handleSubmitReply = useCallback(
    (parentId: string) => {
      if (!replyText.trim()) return;
      onReplyToComment(parentId, replyText.trim());
      setReplyText('');
    },
    [replyText, onReplyToComment]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmitComment();
      } else if (e.key === 'Escape') {
        setAddingAtBar(null);
      }
    },
    [handleSubmitComment]
  );

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      onDoubleClick={handleDoubleClick}
      style={{ pointerEvents: 'none' }}
    >
      {/* Comment pin targets */}
      {topLevelComments.map((comment) => {
        const pinX = (comment.barStart - 1) * pixelsPerBar + pixelsPerBar * 0.5;
        const isOpen = openCommentId === comment.id;
        const replies = repliesMap.get(comment.id) || [];
        const replyCount = replies.length;

        return (
          <div
            key={comment.id}
            className="absolute"
            style={{ left: pinX - 8, top: 2, pointerEvents: 'auto' }}
          >
            {/* Clickable pin with reply count badge */}
            <div className="relative">
              <button
                onClick={() => {
                  setOpenCommentId(isOpen ? null : comment.id);
                  setReplyText('');
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:scale-125 transition-transform"
                style={{ backgroundColor: comment.color }}
                title={`${comment.username}: ${comment.text}`}
              >
                <MessageCircle className="w-2.5 h-2.5 text-white" />
              </button>
              {replyCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[8px] flex items-center justify-center font-medium">
                  {replyCount}
                </span>
              )}
            </div>

            {/* Thread popover */}
            {isOpen && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 p-3 text-xs max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-neutral-400 font-medium uppercase">
                    Thread{replyCount > 0 ? ` · ${replyCount + 1}` : ''}
                  </span>
                  <button
                    onClick={() => setOpenCommentId(null)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Parent comment */}
                <CommentBubble
                  comment={comment}
                  currentUserId={currentUserId}
                  isReply={false}
                  onToggleReaction={onToggleReaction}
                />

                {/* Replies */}
                {replies.map((reply) => (
                  <CommentBubble
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    isReply={true}
                    onToggleReaction={onToggleReaction}
                  />
                ))}

                {/* Reply input */}
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    ref={replyRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && replyText.trim()) {
                        handleSubmitReply(comment.id);
                      }
                    }}
                    placeholder="Reply..."
                    maxLength={500}
                    className="flex-1 px-2 py-1 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyText.trim()}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Post
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      onResolveComment(comment.id);
                      setOpenCommentId(null);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Resolve
                  </button>
                  {comment.userId === currentUserId && (
                    <button
                      onClick={() => {
                        onDeleteComment(comment.id);
                        setOpenCommentId(null);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add comment popover */}
      {addingAtBar !== null && (
        <div
          className="absolute z-50"
          style={{
            left: (addingAtBar - 1) * pixelsPerBar,
            top: canvasHeight + 4,
            pointerEvents: 'auto',
          }}
        >
          <div className="w-56 bg-white rounded-lg shadow-lg border border-neutral-200 p-3">
            <div className="flex items-center gap-1.5 mb-2 text-xs text-neutral-500">
              <MessageCircle className="w-3 h-3" />
              <span>Comment at bar {addingAtBar}</span>
            </div>
            <textarea
              ref={inputRef}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a comment..."
              rows={2}
              maxLength={500}
              className="w-full px-2 py-1.5 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-neutral-400">
                {newCommentText.length}/500
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAddingAtBar(null)}
                  className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitComment}
                  disabled={!newCommentText.trim()}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Post
                </button>
              </div>
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              Cmd+Enter to post
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
