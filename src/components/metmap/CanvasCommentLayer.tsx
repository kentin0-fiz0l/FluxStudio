/**
 * CanvasCommentLayer — DOM overlay for comment pins + popovers on the timeline canvas.
 *
 * Sprint 32: Positioned absolutely over the TimelineCanvas. Comment pins are clickable
 * targets; double-click on empty area opens "add comment" popover.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, Check, Trash2, X } from 'lucide-react';
import type { CanvasComment } from '../../hooks/useMetMapComments';

interface CanvasCommentLayerProps {
  comments: CanvasComment[];
  pixelsPerBar: number;
  canvasHeight: number;
  currentUserId: string;
  onAddComment: (barStart: number, text: string) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
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

export const CanvasCommentLayer = React.memo(function CanvasCommentLayer({
  comments,
  pixelsPerBar,
  canvasHeight,
  currentUserId,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  className = '',
}: CanvasCommentLayerProps) {
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [addingAtBar, setAddingAtBar] = useState<number | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when add popover opens
  useEffect(() => {
    if (addingAtBar !== null) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [addingAtBar]);

  const unresolvedComments = comments.filter((c) => !c.resolved);

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
      {unresolvedComments.map((comment) => {
        const pinX = (comment.barStart - 1) * pixelsPerBar + pixelsPerBar * 0.5;
        const isOpen = openCommentId === comment.id;

        return (
          <div
            key={comment.id}
            className="absolute"
            style={{ left: pinX - 8, top: 2, pointerEvents: 'auto' }}
          >
            {/* Clickable pin */}
            <button
              onClick={() => setOpenCommentId(isOpen ? null : comment.id)}
              className="w-4 h-4 rounded-full flex items-center justify-center hover:scale-125 transition-transform"
              style={{ backgroundColor: comment.color }}
              title={`${comment.username}: ${comment.text}`}
            >
              <MessageCircle className="w-2.5 h-2.5 text-white" />
            </button>

            {/* Popover */}
            {isOpen && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-medium"
                      style={{ backgroundColor: comment.color }}
                    >
                      {comment.username[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-neutral-800">{comment.username}</span>
                    <span className="text-neutral-400">{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => setOpenCommentId(null)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-neutral-700 mb-2 whitespace-pre-wrap">{comment.text}</p>
                <div className="flex items-center gap-1.5">
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
