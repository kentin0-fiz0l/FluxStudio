/**
 * Messages Page - Flux Design Language
 *
 * Enhanced messaging interface with:
 * - Online status indicators
 * - Typing indicators
 * - Quick emoji reactions
 * - Fun empty states
 * - Smooth animations
 */

import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowLeft,
  MessageCircle,
  Sparkles,
  Heart,
  ThumbsUp,
  Laugh,
  PartyPopper,
  CheckCheck,
  Check,
  Clock,
  RefreshCw,
  Zap,
  Coffee,
  Rocket
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
  participant: ChatMessageSender & { isOnline?: boolean };
  lastMessage?: ChatMessageType;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isTyping?: boolean;
}

type ConversationFilter = 'all' | 'unread' | 'archived' | 'starred';

// Quick reaction emojis
const quickReactions = ['👍', '❤️', '😂', '🎉', '🔥', '👏'];

// Fun tips for empty state
const messagingTips = [
  { icon: Zap, text: "Press Enter to send, Shift+Enter for new line" },
  { icon: Star, text: "Star important conversations to find them quickly" },
  { icon: Coffee, text: "Take breaks! Messaging will be here when you're back" },
  { icon: Rocket, text: "Real-time updates keep you in sync instantly" },
];

// Typing Indicator Component
function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{name} is typing...</span>
    </div>
  );
}

// Online Status Dot
function OnlineStatus({ isOnline, size = 'sm' }: { isOnline?: boolean; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <span
      className={`${sizeClasses} rounded-full ${isOnline ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'} ring-2 ring-white dark:ring-neutral-900`}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
}

// Message Status Icon
function MessageStatus({ status }: { status: 'sending' | 'sent' | 'delivered' | 'read' }) {
  switch (status) {
    case 'sending':
      return <Clock className="w-3 h-3 text-neutral-400 animate-pulse" />;
    case 'sent':
      return <Check className="w-3 h-3 text-neutral-400" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-neutral-400" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-primary-500" />;
    default:
      return null;
  }
}

// Empty State Component
function EmptyMessagesState({ onStartConversation }: { onStartConversation: () => void }) {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % messagingTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const tip = messagingTips[currentTip];
  const TipIcon = tip.icon;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      {/* Animated Icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center">
          <MessageCircle className="w-12 h-12 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center animate-bounce">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Welcome Text */}
      <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Your messages await! ✨
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm">
        Connect with your team, share ideas, and collaborate in real-time.
        Start a conversation to get going!
      </p>

      {/* CTA Button */}
      <Button onClick={onStartConversation} className="mb-8 shadow-lg hover:shadow-xl transition-shadow">
        <UserPlus className="w-4 h-4 mr-2" />
        Start a Conversation
      </Button>

      {/* Rotating Tips */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl max-w-xs transition-all duration-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
            <TipIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-left">
            {tip.text}
          </p>
        </div>
      </div>
    </div>
  );
}

// Quick Reactions Popup
function QuickReactions({
  onReact,
  visible
}: {
  onReact: (emoji: string) => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="absolute -top-10 left-0 flex gap-1 p-1.5 bg-white dark:bg-neutral-800 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {quickReactions.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-transform hover:scale-125"
        >
          <span className="text-lg">{emoji}</span>
        </button>
      ))}
    </div>
  );
}

// Mock data - kept for fallback
const mockConversations: Conversation[] = [
  {
    id: '1',
    title: 'Sarah Chen',
    participant: {
      id: 'user1',
      name: 'Sarah Chen',
      avatar: undefined,
      initials: 'SC',
      isOnline: true
    },
    lastMessage: {
      id: 'msg1',
      text: 'The latest color palette looks fantastic! Can we schedule a review meeting?',
      sender: { id: 'user1', name: 'Sarah Chen', initials: 'SC' },
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      isCurrentUser: false
    },
    unreadCount: 2,
    isPinned: true,
    isTyping: false
  },
  {
    id: '2',
    title: 'Mike Johnson',
    participant: {
      id: 'user2',
      name: 'Mike Johnson',
      avatar: undefined,
      initials: 'MJ',
      isOnline: true
    },
    lastMessage: {
      id: 'msg2',
      text: "Thanks for the feedback! I'll make those changes and send you an update.",
      sender: { id: 'user2', name: 'Mike Johnson', initials: 'MJ' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isCurrentUser: false
    },
    unreadCount: 0,
    isTyping: true
  },
  {
    id: '3',
    title: 'Alex Rodriguez',
    participant: {
      id: 'user3',
      name: 'Alex Rodriguez',
      avatar: undefined,
      initials: 'AR',
      isOnline: false
    },
    lastMessage: {
      id: 'msg3',
      text: "I've uploaded the wireframes for the checkout flow.",
      sender: { id: 'user3', name: 'Alex Rodriguez', initials: 'AR' },
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
      initials: 'EW',
      isOnline: false
    },
    lastMessage: {
      id: 'msg4',
      text: 'Looking forward to the presentation tomorrow!',
      sender: { id: 'user4', name: 'Emma Wilson', initials: 'EW' },
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
      sender: { id: 'user1', name: 'Sarah Chen', initials: 'SC' },
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isCurrentUser: false,
      read: true
    },
    {
      id: 'msg1-2',
      text: "Thank you! I'm glad you like them. We focused on modernizing the color palette while keeping the brand identity strong.",
      sender: { id: 'current', name: 'You', initials: 'YO' },
      timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
      isCurrentUser: true,
      read: true
    },
    {
      id: 'msg1-3',
      text: 'The latest color palette looks fantastic! Can we schedule a review meeting?',
      sender: { id: 'user1', name: 'Sarah Chen', initials: 'SC' },
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      isCurrentUser: false,
      read: false
    }
  ],
  '2': [
    {
      id: 'msg2-1',
      text: "Hey, I reviewed the latest mockups. Overall they're great, but I have a few suggestions for the navigation.",
      sender: { id: 'current', name: 'You', initials: 'YO' },
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      isCurrentUser: true,
      read: true
    },
    {
      id: 'msg2-2',
      text: "Thanks for the feedback! I'll make those changes and send you an update.",
      sender: { id: 'user2', name: 'Mike Johnson', initials: 'MJ' },
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isCurrentUser: false,
      read: true
    }
  ]
};

function MessagesNew() {
  // Force detection of new code
  React.useEffect(() => {
    document.title = 'Messages - FluxStudio';
    console.log('=== MESSAGES PAGE V4.0 - Enhanced ===');
  }, []);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Use backend conversations or fallback to mock data
  const conversations = backendConversations.length > 0 ? backendConversations : mockConversations;
  const selectedConversation = activeConversation;
  const messages = conversationMessages.length > 0 ? conversationMessages : (selectedConversation ? mockMessages[selectedConversation.id] || [] : []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

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

    if (searchTerm) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage?.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

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
    setShowMobileChat(true);
  };

  const handleBackToConversations = () => {
    setShowMobileChat(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(selectedConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    console.log(`Reacted to ${messageId} with ${emoji}`);
    // TODO: Implement reaction API call
    setHoveredMessageId(null);
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
  const onlineCount = conversations.filter(c => c.participant.isOnline).length;

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Messages' }]}
      onLogout={logout}
    >
      {/* Error Banner */}
      {messagingError && (
        <div className="mx-4 mt-4 md:mx-6 md:mt-6 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg animate-in slide-in-from-top duration-300">
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
              <RefreshCw className="w-4 h-4 mr-1" />
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
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading your conversations...</p>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex gap-4 md:gap-6 p-4 md:p-6">
        {/* Conversations Sidebar */}
        <Card className={`w-full md:w-96 flex flex-col overflow-hidden ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Messages</h2>
                {onlineCount > 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {onlineCount} online now
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewConversation(true)}
                className="group"
              >
                <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 mt-3">
              {(['all', 'unread', 'starred'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                    filter === f
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {f === 'starred' && <Star className="w-3 h-3 inline mr-1" />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'unread' && unreadCount > 0 && (
                    <Badge variant="solidPrimary" size="sm" className="ml-1">
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  {searchTerm ? 'No conversations match your search' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`w-full p-4 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-all duration-200 ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-600'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with Online Status */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                        {conversation.participant.initials}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <OnlineStatus isOnline={conversation.participant.isOnline} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">
                            {conversation.title}
                          </h3>
                          {conversation.isPinned && (
                            <Star className="w-3 h-3 text-accent-500 fill-accent-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="solidPrimary" size="sm" className="animate-pulse">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {conversation.isTyping ? (
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="text-xs text-primary-600 dark:text-primary-400 ml-1">typing...</span>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                          {conversation.lastMessage?.text || 'No messages yet'}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className={`flex-1 flex flex-col overflow-hidden ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToConversations}
                    className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                      {selectedConversation.participant.initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <OnlineStatus isOnline={selectedConversation.participant.isOnline} size="md" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedConversation.title}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {selectedConversation.participant.isOnline ? (
                        <span className="text-green-600 dark:text-green-400">● Online</span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" aria-label="Start voice call" className="hover:bg-primary-50 dark:hover:bg-primary-900/20">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Start video call" className="hover:bg-primary-50 dark:hover:bg-primary-900/20">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="Star conversation" className="hover:bg-accent-50 dark:hover:bg-accent-900/20">
                    <Star className={`w-4 h-4 ${selectedConversation.isPinned ? 'fill-accent-500 text-accent-500' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label="More options">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                        <PartyPopper className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                        Start the conversation with a friendly hello! 👋
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="relative group"
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                      >
                        <ChatMessage
                          message={message}
                          showAvatar
                          showTimestamp
                          showReadReceipt
                        />
                        {/* Quick Reactions - show on hover for non-own messages */}
                        {!message.isCurrentUser && (
                          <QuickReactions
                            visible={hoveredMessageId === message.id}
                            onReact={(emoji) => handleReaction(message.id, emoji)}
                          />
                        )}
                      </div>
                    ))}
                    {/* Typing indicator */}
                    {selectedConversation.isTyping && (
                      <TypingIndicator name={selectedConversation.participant.name} />
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="sm" className="flex-shrink-0 hover:bg-primary-50 dark:hover:bg-primary-900/20" aria-label="Attach file">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 pr-12 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                      disabled={isSending}
                    />
                    <button
                      className="absolute right-3 bottom-3 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                      aria-label="Add emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    className="flex-shrink-0 shadow-md hover:shadow-lg transition-shadow"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 text-center">
                  Press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line
                </p>
              </div>
            </>
          ) : (
            <EmptyMessagesState onStartConversation={() => setShowNewConversation(true)} />
          )}
        </Card>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary-600" />
              New Conversation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Search team members
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

            {/* Quick suggestions */}
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Suggested</p>
              <div className="space-y-2">
                {mockConversations.slice(0, 3).map((conv) => (
                  <button
                    key={conv.id}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    onClick={() => {
                      setShowNewConversation(false);
                      handleConversationClick(conv);
                    }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                        {conv.participant.initials}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <OnlineStatus isOnline={conv.participant.isOnline} />
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{conv.title}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {conv.participant.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowNewConversation(false)}>
                Start Chat
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
