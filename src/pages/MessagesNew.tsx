/**
 * Messages Page - Flux Design Language
 *
 * Redesigned messaging interface using DashboardLayout and ChatMessage components.
 * Simplified from 582 lines to ~400 lines with cleaner state management.
 */

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { ChatMessage, UserCard } from '@/components/molecules';
import { Button, Card, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../hooks/useMessaging';
import {
  Send,
  Paperclip,
  Smile,
  Search,
  Phone,
  Video,
  MoreVertical,
  UserPlus,
  Archive,
  Star,
  X,
  ArrowLeft
} from 'lucide-react';
import type {
  ChatMessage as ChatMessageType,
  ChatMessageSender,
  ChatMessageAttachment
} from '@/components/molecules';

// Types
interface Conversation {
  id: string;
  title: string;
  participant: ChatMessageSender;
  lastMessage?: ChatMessageType;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
}

type ConversationFilter = 'all' | 'unread' | 'archived' | 'starred';

// Mock data
const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Sarah Chen',
    participant: {
      id: 'user1',
      name: 'Sarah Chen',
      avatar: undefined,
      initials: 'SC'
    },
    lastMessage: {
      id: 'msg1',
      text: 'The latest color palette looks fantastic! Can we schedule a review meeting?',
      sender: {
        id: 'user1',
        name: 'Sarah Chen',
        initials: 'SC'
      },
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      isCurrentUser: false
    },
    unreadCount: 2,
    isPinned: true
  },
  {
    id: '2',
    title: 'Mike Johnson',
    participant: {
      id: 'user2',
      name: 'Mike Johnson',
      avatar: undefined,
      initials: 'MJ'
    },
    lastMessage: {
      id: 'msg2',
      text: 'Thanks for the feedback! I\'ll make those changes and send you an update.',
      sender: {
        id: 'user2',
        name: 'Mike Johnson',
        initials: 'MJ'
      },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isCurrentUser: false
    },
    unreadCount: 0
  },
  {
    id: '3',
    title: 'Alex Rodriguez',
    participant: {
      id: 'user3',
      name: 'Alex Rodriguez',
      avatar: undefined,
      initials: 'AR'
    },
    lastMessage: {
      id: 'msg3',
      text: 'I\'ve uploaded the wireframes for the checkout flow.',
      sender: {
        id: 'user3',
        name: 'Alex Rodriguez',
        initials: 'AR'
      },
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isCurrentUser: false,
      attachments: [{
        id: 'att1',
        name: 'checkout-wireframes.pdf',
        size: 2458000,
        type: 'application/pdf',
        url: '/files/checkout-wireframes.pdf'
      }]
    },
    unreadCount: 0,
    isPinned: true
  },
  {
    id: '4',
    title: 'Emma Wilson',
    participant: {
      id: 'user4',
      name: 'Emma Wilson',
      avatar: undefined,
      initials: 'EW'
    },
    lastMessage: {
      id: 'msg4',
      text: 'Looking forward to the presentation tomorrow!',
      sender: {
        id: 'user4',
        name: 'Emma Wilson',
        initials: 'EW'
      },
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      isCurrentUser: false
    },
    unreadCount: 0
  }
];

const mockMessages: Record<string, ChatMessageType[]> = {
  '1': [
    {
      id: 'msg1-1',
      text: 'Hi! I saw the initial designs for the brand refresh. They look great!',
      sender: {
        id: 'user1',
        name: 'Sarah Chen',
        initials: 'SC'
      },
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isCurrentUser: false,
      read: true
    },
    {
      id: 'msg1-2',
      text: 'Thank you! I\'m glad you like them. We focused on modernizing the color palette while keeping the brand identity strong.',
      sender: {
        id: 'current',
        name: 'You',
        initials: 'YO'
      },
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
      isCurrentUser: true,
      read: true
    },
    {
      id: 'msg1-3',
      text: 'The latest color palette looks fantastic! Can we schedule a review meeting?',
      sender: {
        id: 'user1',
        name: 'Sarah Chen',
        initials: 'SC'
      },
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      isCurrentUser: false,
      read: false
    }
  ],
  '2': [
    {
      id: 'msg2-1',
      text: 'Hey, I reviewed the latest mockups. Overall they\'re great, but I have a few suggestions for the navigation.',
      sender: {
        id: 'current',
        name: 'You',
        initials: 'YO'
      },
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      isCurrentUser: true,
      read: true
    },
    {
      id: 'msg2-2',
      text: 'Thanks for the feedback! I\'ll make those changes and send you an update.',
      sender: {
        id: 'user2',
        name: 'Mike Johnson',
        initials: 'MJ'
      },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isCurrentUser: false,
      read: true
    }
  ]
};

function MessagesNew() {
  // Force detection of new code - CANNOT be tree-shaken
  React.useEffect(() => {
    document.title = 'Messages - FluxStudio V3.5';
    (window as any).__MESSAGES_V35_LOADED = true;
    console.log('=== MESSAGES PAGE V3.5 LOADING ===');
  }, []);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Real-time messaging hook
  const {
    conversations: backendConversations,
    activeConversation,
    conversationMessages,
    sendMessage,
    setActiveConversation,
    isLoading,
    error: messagingError,
    refresh
  } = useMessaging();

  // Local UI state
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Use backend conversations or fallback to mock data during loading
  const conversations = backendConversations.length > 0 ? backendConversations : mockConversations;
  const selectedConversation = activeConversation;
  const messages = conversationMessages || [];

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Apply filter
    switch (filter) {
      case 'unread':
        result = result.filter(c => c.unreadCount > 0);
        break;
      case 'archived':
        result = result.filter(c => c.isArchived);
        break;
      case 'starred':
        result = result.filter(c => c.isPinned);
        break;
    }

    // Apply search
    if (searchTerm) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage?.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort: pinned first, then by last message time
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.lastMessage?.timestamp.getTime() || 0;
      const bTime = b.lastMessage?.timestamp.getTime() || 0;
      return bTime - aTime;
    });
  }, [conversations, filter, searchTerm]);

  // Handlers
  const handleConversationClick = (conversation: Conversation) => {
    setActiveConversation(conversation.id);
    setShowMobileChat(true); // Show chat on mobile
  };

  const handleBackToConversations = () => {
    setShowMobileChat(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await sendMessage(selectedConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Error is already handled by useMessaging hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Messages' }]}
      onLogout={logout}
    >
      {/* Error Banner */}
      {messagingError && (
        <div className="mx-4 mt-4 md:mx-6 md:mt-6 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-error-100 dark:bg-error-800 flex items-center justify-center">
                <X className="w-4 h-4 text-error-600 dark:text-error-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-error-900 dark:text-error-100">Connection Error</h4>
                <p className="text-xs text-error-700 dark:text-error-300">{messagingError}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && backendConversations.length === 0 && (
        <div className="mx-4 mt-4 md:mx-6 md:mt-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading conversations...</p>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex gap-4 md:gap-6 p-4 md:p-6">
        {/* Conversations Sidebar - Hidden on mobile when chat is open */}
        <Card className={`w-full md:w-96 flex flex-col overflow-hidden ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Messages</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewConversation(true)}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'unread'
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <Badge variant="solidPrimary" size="sm" className="ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setFilter('starred')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'starred'
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Star className="w-3 h-3 inline mr-1" />
                Starred
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`w-full p-4 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                      {conversation.participant.initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">
                            {conversation.title}
                          </h3>
                          {conversation.isPinned && (
                            <Star className="w-3 h-3 text-accent-600 fill-accent-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="solidPrimary" size="sm">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                        {conversation.lastMessage?.text || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Area - Hidden on mobile when no chat is selected */}
        <Card className={`flex-1 flex flex-col overflow-hidden ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={handleBackToConversations}
                    className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
                    {selectedConversation.participant.initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedConversation.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Active now</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" aria-label="Start voice call">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Start video call">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Star conversation">
                    <Star className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="More options">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      showAvatar
                      showTimestamp
                      showReadReceipt
                    />
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="sm" className="flex-shrink-0" aria-label="Attach file">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 pr-12 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <button
                      onClick={() => {}}
                      className="absolute right-3 bottom-3 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
                      aria-label="Add emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                  <Send className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Select a conversation
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Search users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowNewConversation(false)}>
                Start Conversation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
export { MessagesNew };
export default MessagesNew;
