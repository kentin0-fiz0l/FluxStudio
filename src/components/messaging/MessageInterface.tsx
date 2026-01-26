/**
 * Message Interface Component
 * Main messaging interface with conversation view, message input, and real-time features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Smile, Paperclip, Image, Mic, MoreVertical, Reply } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Message, Conversation, MessageType, MessageUser, Priority } from '../../types/messaging';
import { messagingService } from '../../services/messagingService';
import { cn } from '../../lib/utils';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import FileUploadButton from './FileUploadButton';

interface MessageInterfaceProps {
  conversation: Conversation | null;
  currentUser: MessageUser;
  className?: string;
}

export function MessageInterface({ conversation, currentUser, className }: MessageInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [priority, setPriority] = useState<Priority>('medium');
  const [attachments, setAttachments] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation) {
      loadMessages();
      messagingService.joinConversation(conversation.id);

      return () => {
        messagingService.leaveConversation(conversation.id);
      };
    }
  }, [conversation]);

  // Set up real-time event listeners
  useEffect(() => {
    const handleMessageReceived = (message: Message) => {
      if (message.conversationId === conversation?.id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
    };

    const handleTypingStarted = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      if (data.conversationId === conversation?.id && data.userId !== currentUser.id) {
        setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
      }
    };

    const handleTypingStopped = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      if (data.conversationId === conversation?.id) {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    };

    messagingService.onMessageReceived(handleMessageReceived);
    messagingService.onTypingStarted(handleTypingStarted);
    messagingService.onTypingStopped(handleTypingStopped);

    return () => {
      messagingService.off('message:received', handleMessageReceived);
      messagingService.off('typing:started', handleTypingStarted);
      messagingService.off('typing:stopped', handleTypingStopped);
    };
  }, [conversation, currentUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversation) return;

    try {
      setLoading(true);
      const data = await messagingService.getMessages(conversation.id, {
        limit: 50,
      });
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = useCallback(() => {
    if (!conversation) return;

    if (!isTyping) {
      setIsTyping(true);
      messagingService.startTyping(conversation.id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      messagingService.stopTyping(conversation.id);
    }, 3000);
  }, [conversation, isTyping]);

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!conversation || (!messageInput.trim() && attachments.length === 0)) return;

    try {
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        messagingService.stopTyping(conversation.id);
      }

      const messageData = {
        conversationId: conversation.id,
        type: (attachments.length > 0 ? 'file' : 'text') as MessageType,
        content: messageInput.trim(),
        priority,
        attachments,
        replyTo: replyingTo?.id,
      };

      await messagingService.sendMessage(messageData);

      // Clear form
      setMessageInput('');
      setAttachments([]);
      setReplyingTo(null);
      setPriority('medium');

      // Focus back to input
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmit(e);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    messageInputRef.current?.focus();
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);

    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (!conversation) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-muted/30", className)}>
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <Send className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
          <p className="text-muted-foreground">Choose a conversation from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {conversation.type === 'direct' && conversation.participants.length <= 3 ? (
              <div className="flex -space-x-2">
                {conversation.participants.slice(0, 3).map(participant => (
                  <Avatar key={participant.id} className="w-8 h-8 border-2 border-background">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback className="text-sm">
                      {participant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white",
                conversation.metadata.color || "bg-primary"
              )}>
                {conversation.metadata.icon || conversation.name.charAt(0)}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-semibold">{conversation.name}</h2>
            <p className="text-sm text-muted-foreground">
              {conversation.participants.length} participant{conversation.participants.length !== 1 ? 's' : ''}
              {conversation.description && ` • ${conversation.description}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.metadata.priority !== 'medium' && (
            <Badge variant={conversation.metadata.priority === 'high' ? 'error' : 'secondary'}>
              {conversation.metadata.priority}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Add Members</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
                  <div className="h-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-muted px-3 py-1 rounded-full text-xs font-medium">
                    {new Date(date).toLocaleDateString([], {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {dayMessages.map((message, index) => {
                    const prevMessage = dayMessages[index - 1];
                    const showAvatar = !prevMessage ||
                      prevMessage.author.id !== message.author.id ||
                      (() => {
                        const currentTime = new Date(message.createdAt);
                        const prevTime = new Date(prevMessage.createdAt);
                        const currentTimeVal = isNaN(currentTime.getTime()) ? 0 : currentTime.getTime();
                        const prevTimeVal = isNaN(prevTime.getTime()) ? 0 : prevTime.getTime();
                        return currentTimeVal - prevTimeVal > 300000; // 5 minutes
                      })();

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.author.id === currentUser.id}
                        showAvatar={showAvatar}
                        onReply={() => handleReply(message)}
                        currentUser={currentUser}
                        conversationId={conversation.id}
                        showThreads={true}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator
                userIds={typingUsers}
                participants={conversation.participants}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4" />
              <span className="font-medium">Replying to {replyingTo.author.name}</span>
              <span className="text-muted-foreground truncate max-w-md">
                {replyingTo.content}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleMessageSubmit} className="space-y-3">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded-lg">
                  <span className="text-sm">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* File Upload */}
            <FileUploadButton
              onFilesSelected={setAttachments}
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            {/* Message Input */}
            <div className="flex-1 relative">
              <Textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="min-h-[40px] max-h-[120px] resize-none pr-12"
                rows={1}
              />

              {/* Priority Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      priority === 'high' ? 'bg-red-500' :
                      priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    )} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setPriority('low')}>
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    Low Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriority('medium')}>
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                    Medium Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriority('high')}>
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                    High Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!messageInput.trim() && attachments.length === 0}
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MessageInterface;