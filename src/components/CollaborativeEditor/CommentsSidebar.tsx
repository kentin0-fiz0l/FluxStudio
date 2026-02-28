import { Clock, MessageCircle } from 'lucide-react';
import type { Comment } from './editor-types';

interface CommentsSidebarProps {
  showComments: boolean;
  newComment: string;
  setNewComment: (comment: string) => void;
  selectedLine: number | null;
  addComment: () => void;
  comments: Comment[];
  resolveComment: (commentId: string) => void;
  userId: string | undefined;
}

export function CommentsSidebar({
  showComments,
  newComment,
  setNewComment,
  selectedLine,
  addComment,
  comments,
  resolveComment,
  userId,
}: CommentsSidebarProps) {
  if (!showComments) return null;

  return (
    <div className="w-80 border-l border-white/10 bg-white/5 flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-bold text-white mb-4">Comments</h3>

        {/* Add Comment */}
        <div className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-white/60">
              {selectedLine && (
                <span>Line {selectedLine}</span>
              )}
            </div>
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.map(comment => (
          <div
            key={comment.id}
            className={`p-3 rounded-lg border ${
              comment.resolved
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium text-white text-sm">{comment.authorName}</div>
                <div className="text-xs text-white/60 flex items-center space-x-2">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  {comment.line && <span>• Line {comment.line}</span>}
                </div>
              </div>
              {!comment.resolved && comment.author !== userId && (
                <button
                  onClick={() => resolveComment(comment.id)}
                  className="text-green-400 hover:text-green-300 text-sm"
                >
                  Resolve
                </button>
              )}
            </div>
            <p className="text-white/80 text-sm">{comment.text}</p>
            {comment.resolved && (
              <div className="mt-2 text-xs text-green-400">✓ Resolved</div>
            )}
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" aria-hidden="true" />
            <p className="text-white/40">No comments yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
