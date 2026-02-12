/**
 * MessagingSidepanel - Integrated messaging panel that slides out from the right
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Search,
  Plus,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Bell
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useMessaging } from '../../hooks/useMessaging';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface MessagingSidepanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'right' | 'left';
  width?: string;
}

export const MessagingSidepanel = memo(function MessagingSidepanel({
  isOpen,
  onClose,
  position = 'right',
  width = 'w-96'
}: MessagingSidepanelProps) {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    conversationMessages,
    setActiveConversation,
    sendMessage: sendMessageToConversation,
    createConversation: _createConversation,
    setTyping,
    userPresence,
    refresh: _refresh
  } = useMessaging();
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConversationList, setShowConversationList] = useState(!activeConversation);
  const [searchFilter, setSearchFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [isTyping, setIsTyping] = useState(false);

  // Calculate unread count from conversations
  const unreadCount = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  }, [conversations]);

  // Format timestamp for display
  const formatTimestamp = useCallback((date: Date | string | undefined) => {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }, []);

  // Enhanced search with filters - memoized for performance
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Text search
      const matchesSearch = !searchQuery ||
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

      // Filter by type
      const matchesFilter = searchFilter === 'all' ||
        (searchFilter === 'unread' && conv.unreadCount > 0) ||
        (searchFilter === 'archived' && conv.metadata?.isArchived);

      return matchesSearch && matchesFilter;
    });
  }, [conversations, searchQuery, searchFilter]);

  const handleSendMessage = useCallback(async () => {
    if (message.trim() && activeConversation) {
      try {
        await sendMessageToConversation(activeConversation.id, {
          content: message,
          type: 'text',
          priority: 'medium'
        });
        setMessage('');
        setIsTyping(false);
        setTyping(activeConversation.id, false);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }, [message, activeConversation, sendMessageToConversation, setTyping]);

  // Handle typing indicator
  const handleTypingChange = useCallback((value: string) => {
    setMessage(value);
    if (activeConversation) {
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        setTyping(activeConversation.id, true);
      } else if (!value.trim() && isTyping) {
        setIsTyping(false);
        setTyping(activeConversation.id, false);
      }
    }
  }, [activeConversation, isTyping, setTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />

          {/* Sidepanel */}
          <motion.div
            initial={{ x: position === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: position === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className={cn(
              'fixed top-0 h-full bg-white shadow-2xl z-50 flex flex-col',
              width,
              position === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                <h2 className="font-semibold text-lg">Messages</h2>
                {unreadCount > 0 && (
                  <Badge variant="error" className="h-5 px-1.5">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search Bar and Filters */}
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConversationList(false)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'All', count: conversations.length },
                  { key: 'unread', label: 'Unread', count: conversations.filter(c => c.unreadCount > 0).length },
                  { key: 'archived', label: 'Archived', count: conversations.filter(c => c.metadata?.isArchived).length }
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={searchFilter === filter.key ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSearchFilter(filter.key as typeof searchFilter)}
                    className="h-7 px-3 text-xs"
                  >
                    {filter.label}
                    {filter.count > 0 && (
                      <Badge className="ml-1 h-4 px-1 text-xs bg-gray-600 text-white">
                        {filter.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {showConversationList ? (
                /* Conversation List */
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No conversations found</p>
                        {searchQuery && (
                          <p className="text-xs mt-1">Try different search terms</p>
                        )}
                      </div>
                    ) : (
                      filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setActiveConversation(conv.id);
                          setShowConversationList(false);
                        }}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.participants?.[0]?.avatar} />
                            <AvatarFallback>
                              {conv.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Check if any participant is online */}
                          {conv.participants?.some(p =>
                            userPresence[typeof p === 'string' ? p : p.id]?.status === 'online'
                          ) && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">{conv.name}</p>
                            <span className="text-xs text-gray-500">{formatTimestamp(conv.lastActivity)}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {conv.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge variant="error" className="h-5 min-w-[20px] px-1">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              ) : (
                /* Conversation View */
                <>
                  {/* Conversation Header */}
                  <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowConversationList(true);
                          setActiveConversation(null);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {activeConversation && (
                        <>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={activeConversation.participants?.[0]?.avatar} />
                            <AvatarFallback>
                              {activeConversation.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{activeConversation.name}</p>
                            <p className="text-xs text-gray-500">
                              {activeConversation.participants?.some(p =>
                                userPresence[typeof p === 'string' ? p : p.id]?.status === 'online'
                              ) ? 'Active now' : 'Offline'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Bell className="mr-2 h-4 w-4" />
                            Mute notifications
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            Archive conversation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {conversationMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No messages yet</p>
                          <p className="text-xs mt-1">Send a message to start the conversation</p>
                        </div>
                      ) : (
                        conversationMessages.map((msg) => {
                          const isOwnMessage = msg.author?.id === user?.id;
                          const messageTime = new Date(msg.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });

                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                'flex items-start gap-3',
                                isOwnMessage && 'justify-end'
                              )}
                            >
                              {!isOwnMessage && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={msg.author?.avatar} />
                                  <AvatarFallback>
                                    {msg.author?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn('flex-1', isOwnMessage && 'flex flex-col items-end')}>
                                <div
                                  className={cn(
                                    'rounded-lg p-3 max-w-[80%]',
                                    isOwnMessage
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100'
                                  )}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                </div>
                                <span className="text-xs text-gray-500 mt-1">{messageTime}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <div className="flex items-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Textarea
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => handleTypingChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                        rows={1}
                        disabled={!activeConversation}
                      />
                      <Button variant="ghost" size="sm">
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});