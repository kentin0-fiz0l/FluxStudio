'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  MessageSquare,
  Check,
  MoreVertical,
  Reply,
  Trash2,
  Edit,
  Send,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  isResolved: boolean;
  createdAt: string;
  replies?: Comment[];
}

interface CommentPanelProps {
  comments: Comment[];
  selectedCommentId?: string | null;
  onAddComment: (content: string, parentId?: string) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onSelectComment: (commentId: string) => void;
  className?: string;
}

export function CommentPanel({
  comments,
  selectedCommentId,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onSelectComment,
  className,
}: CommentPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment);
    setNewComment('');
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    onAddComment(replyContent, parentId);
    setReplyContent('');
    setReplyingTo(null);
  };

  const unresolvedCount = comments.filter((c) => !c.isResolved).length;
  const resolvedCount = comments.filter((c) => c.isResolved).length;

  return (
    <div className={cn('flex flex-col h-full border-l bg-background', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{unresolvedCount} open</span>
            <span className="text-muted">/</span>
            <span>{resolvedCount} resolved</span>
          </div>
        </div>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Click on the asset to add annotations</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                'rounded-lg border p-3 transition-colors cursor-pointer',
                selectedCommentId === comment.id && 'border-primary bg-primary/5',
                comment.isResolved && 'opacity-60'
              )}
              onClick={() => onSelectComment(comment.id)}
            >
              {/* Comment header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.author.avatarUrl} />
                    <AvatarFallback>
                      {comment.author.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium">
                      {comment.author.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onResolveComment(comment.id)}>
                      <Check className="mr-2 h-4 w-4" />
                      {comment.isResolved ? 'Unresolve' : 'Resolve'}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteComment(comment.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Comment content */}
              <p className="text-sm mb-2">{comment.content}</p>

              {/* Resolved badge */}
              {comment.isResolved && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  Resolved
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={reply.author.avatarUrl} />
                          <AvatarFallback>
                            {reply.author.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {reply.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === comment.id ? (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply(comment.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => handleReply(comment.id)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyingTo(comment.id);
                  }}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
          />
          <Button type="submit" disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
