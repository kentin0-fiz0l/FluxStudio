/**
 * Message Bubble Component
 * Individual message display with reactions, replies, and file attachments
 */

import React, { useState } from 'react';
import { Reply, MoreVertical, Download, ExternalLink, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Message, Priority, MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';
import MessageThread from './MessageThread';
import EmojiReactions from './EmojiReactions';
import { messagingService } from '../../services/messagingService';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onReply: () => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  currentUser?: MessageUser;
  conversationId?: string;
  showThreads?: boolean;
  className?: string;
}

const priorityColors = {
  critical: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  high: 'border-orange-500 bg-orange-50 dark:bg-orange-950/20',
  medium: 'border-gray-200 dark:border-gray-700',
  low: 'border-green-500 bg-green-50 dark:bg-green-950/20',
};

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  onReply,
  onEdit,
  onDelete,
  currentUser,
  conversationId,
  showThreads = true,
  className
}: MessageBubbleProps) {
  const [reactions, setReactions] = useState<Map<string, { users: MessageUser[] }>>(
    new Map()
  );

  const handleReact = async (emoji: string) => {
    if (!conversationId) return;

    try {
      await messagingService.addReaction(message.id, conversationId, emoji);

      // Optimistically update local state
      setReactions(prev => {
        const newReactions = new Map(prev);
        const existing = newReactions.get(emoji);

        if (existing && currentUser) {
          existing.users.push(currentUser);
        } else if (currentUser) {
          newReactions.set(emoji, { users: [currentUser] });
        }

        return newReactions;
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (emoji: string) => {
    if (!conversationId || !currentUser) return;

    try {
      await messagingService.removeReaction(message.id, conversationId, emoji);

      // Optimistically update local state
      setReactions(prev => {
        const newReactions = new Map(prev);
        const existing = newReactions.get(emoji);

        if (existing) {
          existing.users = existing.users.filter(u => u.id !== currentUser.id);
          if (existing.users.length === 0) {
            newReactions.delete(emoji);
          }
        }

        return newReactions;
      });
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
  };

  const FileAttachment = ({ attachment }: { attachment: any }) => {
    const isImage = attachment.isImage;
    const isVideo = attachment.isVideo;

    if (isImage) {
      return (
        <div className="relative group max-w-sm">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="rounded-lg max-h-64 object-cover cursor-pointer"
            onClick={() => window.open(attachment.url, '_blank')}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
            <Button
              variant="secondary"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => window.open(attachment.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View
            </Button>
          </div>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="max-w-sm">
          <video
            src={attachment.url}
            controls
            className="rounded-lg max-h-64"
            poster={attachment.thumbnailUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-sm">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="text-xs font-medium">
            {attachment.name.split('.').pop()?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{attachment.name}</p>
          <p className="text-sm text-muted-foreground">
            {(attachment.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(attachment.url, '_blank')}
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("group flex gap-3", isOwn && "flex-row-reverse", className)}>
      {/* Avatar */}
      {showAvatar && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={message.author.avatar} />
          <AvatarFallback className="text-xs">
            {message.author.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={cn("flex-1 max-w-[70%]", !showAvatar && "ml-11", isOwn && !showAvatar && "mr-11 ml-0")}>
        {/* Author & Time */}
        {showAvatar && (
          <div className={cn("flex items-center gap-2 mb-1", isOwn && "justify-end")}>
            <span className="text-sm font-medium">{message.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}

        {/* Reply Context */}
        {message.replyTo && (
          <div className="mb-2 p-2 bg-muted rounded-md border-l-2 border-primary">
            <p className="text-xs text-muted-foreground">Replying to a message</p>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "relative p-3 rounded-lg border",
            isOwn
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-background",
            message.metadata?.priority && priorityColors[message.metadata.priority as Priority],
            "group-hover:shadow-sm transition-shadow"
          )}
        >
          {/* Priority Badge */}
          {message.metadata?.priority && message.metadata.priority !== 'medium' && (
            <Badge
              variant={message.metadata.priority === 'high' ? 'destructive' : 'secondary'}
              className="absolute -top-2 -right-2 text-xs"
            >
              {message.metadata.priority}
            </Badge>
          )}

          {/* Message Content */}
          {message.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="mb-0 whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={cn("space-y-2", message.content && "mt-3")}>
              {message.attachments.map((attachment, index) => (
                <FileAttachment key={index} attachment={attachment} />
              ))}
            </div>
          )}

          {/* System Message Styling */}
          {message.type === 'system' && (
            <div className="text-center text-sm italic text-muted-foreground">
              {message.content}
            </div>
          )}

          {/* Message Actions */}
          <div className={cn(
            "absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
            isOwn ? "-left-16" : "-right-16"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onReply}
            >
              <Reply className="w-3 h-3" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleCopyMessage}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {isOwn && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(message.id, message.content)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isOwn && onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Message Status */}
          {isOwn && (
            <div className="text-xs opacity-70 mt-1 text-right">
              {message.status === 'sending' && 'Sending...'}
              {message.status === 'sent' && '✓'}
              {message.status === 'delivered' && '✓✓'}
              {message.status === 'read' && '✓✓'}
              {message.status === 'failed' && 'Failed'}
            </div>
          )}
        </div>

        {/* Emoji Reactions */}
        {currentUser && conversationId && (
          <div className="mt-2">
            <EmojiReactions
              messageId={message.id}
              reactions={reactions}
              currentUser={currentUser}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
            />
          </div>
        )}

        {/* Mentions */}
        {message.mentions && message.mentions.length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            Mentioned: {message.mentions.length} user{message.mentions.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Tags */}
        {message.metadata?.tags && message.metadata.tags.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {message.metadata.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Message Thread */}
        {showThreads && currentUser && conversationId && (
          <MessageThread
            rootMessage={message}
            currentUser={currentUser}
            conversationId={conversationId}
          />
        )}
      </div>
    </div>
  );
}

export default MessageBubble;