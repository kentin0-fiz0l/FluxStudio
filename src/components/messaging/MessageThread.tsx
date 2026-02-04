/**
 * Message Thread Component
 * Displays threaded conversations with expand/collapse functionality
 * Supports nested replies, thread navigation, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Reply,
  Users,
  Clock,
  CornerDownRight,
  X,
  Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';
import { Message, MessageUser } from '../../types/messaging';
import MessageBubble from './MessageBubble';
import { messagingService } from '../../services/messagingService';

interface MessageThreadProps {
  rootMessage: Message;
  currentUser: MessageUser;
  conversationId: string;
  onClose?: () => void;
  className?: string;
}

interface ThreadState {
  isExpanded: boolean;
  replies: Message[];
  loading: boolean;
  hasMore: boolean;
  replyInput: string;
  isSubmitting: boolean;
}

export function MessageThread({
  rootMessage,
  currentUser,
  conversationId,
  onClose,
  className
}: MessageThreadProps) {
  const [state, setState] = useState<ThreadState>({
    isExpanded: false,
    replies: [],
    loading: false,
    hasMore: false,
    replyInput: '',
    isSubmitting: false
  });

  const loadThreadReplies = useCallback(async () => {
    if (!rootMessage.threadId) return;

    try {
      setState(prev => ({ ...prev, loading: true }));

      const replies = await messagingService.getThreadReplies(rootMessage.threadId, {
        limit: 50,
        offset: 0
      });

      setState(prev => ({
        ...prev,
        replies: replies.filter(msg => msg.id !== rootMessage.id),
        loading: false,
        hasMore: replies.length === 50
      }));
    } catch (error) {
      console.error('Failed to load thread replies:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [rootMessage.threadId, rootMessage.id]);

  // Load thread replies when expanded - use a ref to track loading state to avoid sync setState
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!state.isExpanded || !rootMessage.threadId) return;
    if (loadingRef.current) return;

    let cancelled = false;
    loadingRef.current = true;

    const fetchReplies = async () => {
      try {
        const replies = await messagingService.getThreadReplies(rootMessage.threadId!, {
          limit: 50,
          offset: 0
        });

        if (!cancelled) {
          setState(prev => ({
            ...prev,
            replies: replies.filter(msg => msg.id !== rootMessage.id),
            loading: false,
            hasMore: replies.length === 50
          }));
        }
      } catch (error) {
        console.error('Failed to load thread replies:', error);
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false }));
        }
      } finally {
        loadingRef.current = false;
      }
    };

    // Set loading state via the fetch function's first promise tick
    fetchReplies();

    return () => {
      cancelled = true;
      loadingRef.current = false;
    };
  }, [state.isExpanded, rootMessage.threadId, rootMessage.id]);

  // Listen for new replies in real-time
  useEffect(() => {
    if (!rootMessage.threadId) return;

    const handleNewReply = (message: Message) => {
      if (message.threadId === rootMessage.threadId && message.id !== rootMessage.id) {
        setState(prev => ({
          ...prev,
          replies: [...prev.replies, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        }));
      }
    };

    messagingService.onMessageReceived(handleNewReply);

    return () => {
      messagingService.off('message:received', handleNewReply);
    };
  }, [rootMessage.threadId]);

  const toggleThread = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.replyInput.trim() || state.isSubmitting) return;

    try {
      setState(prev => ({ ...prev, isSubmitting: true }));

      await messagingService.sendMessage({
        conversationId,
        type: 'text',
        content: state.replyInput.trim(),
        replyTo: rootMessage.id,
        threadId: rootMessage.threadId || rootMessage.id,
        priority: 'medium'
      });

      setState(prev => ({
        ...prev,
        replyInput: '',
        isSubmitting: false
      }));
    } catch (error) {
      console.error('Failed to send reply:', error);
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReplySubmit(e);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  const formatThreadPreview = () => {
    if (!state.replies.length) return null;

    const lastReply = state.replies[state.replies.length - 1];
    const uniqueAuthors = new Set(state.replies.map(r => r.author.id));

    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex -space-x-2">
          {Array.from(uniqueAuthors).slice(0, 3).map(authorId => {
            const author = state.replies.find(r => r.author.id === authorId)?.author;
            if (!author) return null;
            return (
              <Avatar key={authorId} className="w-5 h-5 border-2 border-background">
                <AvatarImage src={author.avatar} />
                <AvatarFallback className="text-[8px]">
                  {author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            );
          })}
        </div>
        <span>
          {lastReply.author.name} replied • {formatTime(lastReply.createdAt)}
        </span>
      </div>
    );
  };

  const replyCount = rootMessage.replyCount || state.replies.length;

  return (
    <div className={cn('relative', className)}>
      {/* Thread Header - Shown when replies exist */}
      {replyCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleThread}
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:bg-muted/50"
          >
            {state.isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <MessageSquare className="w-3 h-3" />
            <span className="font-medium">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {!state.isExpanded && formatThreadPreview()}
          </Button>
        </motion.div>
      )}

      {/* Expanded Thread View */}
      <AnimatePresence>
        {state.isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 ml-8 space-y-3"
          >
            {/* Thread Container */}
            <Card className="border-l-2 border-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CornerDownRight className="w-4 h-4 text-muted-foreground" />
                    Thread
                  </CardTitle>
                  {onClose && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Loading State */}
                {state.loading && (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-2">
                        <div className="w-6 h-6 bg-muted rounded-full animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
                          <div className="h-12 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thread Replies */}
                {!state.loading && state.replies.length > 0 && (
                  <div className="space-y-3">
                    {state.replies.map((reply, index) => {
                      const prevReply = state.replies[index - 1];
                      const showAvatar = !prevReply ||
                        prevReply.author.id !== reply.author.id ||
                        (() => {
                          const currentTime = new Date(reply.createdAt);
                          const prevTime = new Date(prevReply.createdAt);
                          return currentTime.getTime() - prevTime.getTime() > 300000; // 5 minutes
                        })();

                      return (
                        <motion.div
                          key={reply.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="pl-2 border-l-2 border-muted"
                        >
                          <MessageBubble
                            message={reply}
                            isOwn={reply.author.id === currentUser.id}
                            showAvatar={showAvatar}
                            onReply={() => {
                              // Focus reply input
                              const textarea = document.getElementById(
                                `thread-reply-${rootMessage.id}`
                              ) as HTMLTextAreaElement;
                              textarea?.focus();
                            }}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Empty Thread State */}
                {!state.loading && state.replies.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No replies yet. Be the first to reply!</p>
                  </div>
                )}

                {/* Load More */}
                {state.hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadThreadReplies}
                    className="w-full"
                  >
                    Load more replies
                  </Button>
                )}

                {/* Reply Input */}
                <form onSubmit={handleReplySubmit} className="pt-3 border-t">
                  <div className="flex items-end gap-2">
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="text-xs">
                        {currentUser.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <Textarea
                        id={`thread-reply-${rootMessage.id}`}
                        value={state.replyInput}
                        onChange={(e) => setState(prev => ({ ...prev, replyInput: e.target.value }))}
                        onKeyPress={handleKeyPress}
                        placeholder="Reply to thread..."
                        className="min-h-[60px] max-h-[120px] resize-none text-sm"
                        rows={2}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={!state.replyInput.trim() || state.isSubmitting}
                      className="shrink-0"
                    >
                      {state.isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Thread Stats */}
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {new Set(state.replies.map(r => r.author.id)).size + 1} participants
                      </span>
                      {rootMessage.lastReplyAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last reply {formatTime(rootMessage.lastReplyAt)}
                        </span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Thread
                    </Badge>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Reply Button - Shown when thread is collapsed */}
      {!state.isExpanded && replyCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 ml-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleThread}
            className="text-xs gap-2"
          >
            <Reply className="w-3 h-3" />
            Reply to thread
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export default MessageThread;
