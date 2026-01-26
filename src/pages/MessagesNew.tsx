/**
 * Messages Page - Modern Mobile Chat Experience
 *
 * Complete messaging interface with:
 * - Mobile-first responsive design
 * - Swipe gestures (reply, delete, pin)
 * - Pull-to-refresh & infinite scroll
 * - Reply threading with quoted messages
 * - Link previews
 * - Image lightbox
 * - Emoji picker
 * - File attachments with progress
 * - Message editing & deletion
 * - Read receipts
 * - Pinned messages
 * - Mute/notification settings
 * - Voice message UI
 * - Message search
 * - Forward messages
 */

import * as React from 'react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useActiveProjectOptional } from '../contexts/ActiveProjectContext';
import { useConversationRealtime } from '../hooks/useConversationRealtime';
import { ConversationMessage } from '../services/messagingSocketService';
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  UserPlus,
  Star,
  X,
  ArrowLeft,
  MessageCircle,
  Check,
  RefreshCw,
  Pin,
  BellOff,
  Users,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

// Extracted messaging components
import {
  ChatMessageBubble as ExtractedMessageBubble,
  ChatAvatar as ExtractedChatAvatar,
  MessageComposer as ExtractedMessageComposer,
  ConversationItem as ExtractedConversationItem,
  EmptyMessagesState as ExtractedEmptyMessagesState,
  PinnedMessagesPanel as ExtractedPinnedMessagesPanel,
  getInitials as extractedGetInitials,
  type PendingAttachment,
} from '../components/messaging';

import { MessageSearchPanel } from '../components/messaging/MessageSearchPanel';
import { MessageSearchResult } from '../hooks/useMessageSearch';
import { ThreadPanel } from '../components/messaging/ThreadPanel';
import { ConversationHeaderPresence } from '../components/messaging/PresenceIndicator';
import { ConversationSummary } from '../components/messaging/ConversationSummary';
import { EmptyState, emptyStateConfigs } from '../components/common/EmptyState';
import { useReportEntityFocus } from '../hooks/useWorkMomentumCapture';

// Types
interface MessageUser {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  size: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

interface ReactionCount {
  emoji: string;
  count: number;
  userIds: string[];
}

interface MessageAsset {
  id: string;
  name: string;
  kind: 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';
  ownerId?: string;
  organizationId?: string;
  description?: string;
  createdAt?: string;
  file: {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    thumbnailUrl?: string;
    storageKey?: string;
  };
}

interface Message {
  id: string;
  content: string;
  author: MessageUser;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEdited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  isSystemMessage?: boolean;
  replyTo?: {
    id: string;
    content: string;
    author: MessageUser;
  };
  attachments?: MessageAttachment[];
  asset?: MessageAsset | null;
  linkPreviews?: LinkPreview[];
  reactions?: ReactionCount[];
  isPinned?: boolean;
  isForwarded?: boolean;
  voiceMessage?: {
    duration: number;
    waveform: number[];
    url: string;
  };
  threadReplyCount?: number;
  threadRootMessageId?: string | null;
  threadLastReplyAt?: Date;
}

interface Conversation {
  id: string;
  title: string;
  type: 'direct' | 'group' | 'channel';
  participant: MessageUser;
  participants?: MessageUser[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isTyping?: boolean;
  typingUsers?: string[];
  // Project context for project-scoped conversations
  projectId?: string | null;
  projectName?: string | null;
}

type ConversationFilter = 'all' | 'unread' | 'archived' | 'starred' | 'muted';

// API response type for conversations (renamed to avoid conflict with ConversationSummary component)
interface ConversationListItem {
  id: string;
  organizationId: string | null;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  // Project context for project-scoped conversations
  // See docs/project-context-followups.md for backend integration
  projectId?: string | null;
  projectName?: string | null;
  members?: Array<{
    id: string;
    conversationId: string;
    userId: string;
    role: string;
    user?: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
}

// Utility functions - using extracted versions from @/components/messaging
const getInitials = extractedGetInitials;

// Date separator for message grouping
const getDateSeparator = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

// Components

// Typing Indicator - collapses when > 3 users
function TypingIndicator({ users }: { users: string[] }) {
  let text: string;
  if (users.length === 1) {
    text = `${users[0]} is typing...`;
  } else if (users.length === 2) {
    text = `${users[0]} and ${users[1]} are typing...`;
  } else if (users.length === 3) {
    text = `${users[0]}, ${users[1]}, and ${users[2]} are typing...`;
  } else {
    // > 3 users: show first 2 + count
    text = `${users[0]}, ${users[1]}, + ${users.length - 2} others are typing...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs">{text}</span>
    </div>
  );
}

// Avatar Component - now using extracted ChatAvatar from @/components/messaging
const Avatar = ExtractedChatAvatar;

// Date Separator
function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {getDateSeparator(date)}
        </span>
      </div>
    </div>
  );
}

// Message Bubble - now using extracted component from @/components/messaging
const MessageBubble = ExtractedMessageBubble;

// Conversation List Item - now using extracted component from @/components/messaging
const ConversationItem = ExtractedConversationItem;

// Empty State - now using extracted component from @/components/messaging
const EmptyMessagesState = ExtractedEmptyMessagesState;

// Message Input Component - now using extracted component from @/components/messaging
const MessageInput = ExtractedMessageComposer;

// Pinned Messages Panel - now using extracted component from @/components/messaging
const PinnedMessagesPanel = ExtractedPinnedMessagesPanel;

// Main Messages Component
function MessagesNew() {
  const { user, logout } = useAuth();
  const activeProjectContext = useActiveProjectOptional();
  const navigate = useNavigate();

  // Guard: If auth context indicates no user, return null and let ProtectedRoute redirect
  if (!user) {
    return null;
  }

  // Safe destructure with fallback values (handles hydration and 401 race conditions)
  const activeProject = activeProjectContext?.activeProject ?? null;
  const hasFocus = activeProjectContext?.hasFocus ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const { reportConversation } = useReportEntityFocus();

  // ========================================
  // CONVERSATION STATE (REST API based)
  // ========================================
  const [conversationSummaries, setConversationSummaries] = useState<ConversationListItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);

  // ========================================
  // REAL-TIME MESSAGING HOOK
  // ========================================
  const handleNewMessage = useCallback((data: { conversationId: string; message: ConversationMessage }) => {
    // Update conversation list with new message preview
    setConversationSummaries(prev => {
      const existing = prev.find(c => c.id === data.conversationId);
      if (!existing) return prev;

      const isActive = data.conversationId === selectedConversationId;
      const updated: ConversationListItem = {
        ...existing,
        lastMessageAt: data.message.createdAt,
        lastMessagePreview: data.message.content?.slice(0, 100) || '',
        unreadCount: isActive ? 0 : (existing.unreadCount || 0) + 1,
      };

      // Move to top
      const others = prev.filter(c => c.id !== data.conversationId);
      return [updated, ...others];
    });
  }, [selectedConversationId]);

  // Thread panel state (declared early for use in handleThreadSummaryUpdate)
  const [activeThreadRootId, setActiveThreadRootId] = useState<string | null>(null);
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false);
  const [threadHighlightId, setThreadHighlightId] = useState<string | null>(null);

  // Handle thread summary updates - highlight root message when thread panel is closed
  const handleThreadSummaryUpdate = useCallback((data: { threadRootMessageId: string }) => {
    // Only highlight if thread panel is closed or it's a different thread
    if (!isThreadPanelOpen || activeThreadRootId !== data.threadRootMessageId) {
      setThreadHighlightId(data.threadRootMessageId);
      // Clear highlight after 2 seconds
      setTimeout(() => {
        setThreadHighlightId(prev => prev === data.threadRootMessageId ? null : prev);
      }, 2000);
    }
  }, [isThreadPanelOpen, activeThreadRootId]);

  const realtime = useConversationRealtime({
    conversationId: selectedConversationId || undefined,
    autoConnect: true,
    onNewMessage: handleNewMessage,
    onThreadSummaryUpdate: handleThreadSummaryUpdate,
  });

  // ========================================
  // LOCAL UI STATE
  // ========================================
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [replyTo, setReplyTo] = useState<Message['replyTo'] | undefined>();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');
  const [forwardSourceMessage, setForwardSourceMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTargetConversationId, setForwardTargetConversationId] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);

  // Additional thread panel state
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Summary panel state
  const [isSummaryPanelOpen, setIsSummaryPanelOpen] = useState(false);

  // Thread micro-hint (shown for first-time users)
  const THREAD_MICRO_HINT_KEY = 'fx_message_thread_hint_dismissed_v1';
  const [showThreadHint, setShowThreadHint] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THREAD_MICRO_HINT_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const dismissThreadHint = useCallback(() => {
    setShowThreadHint(false);
    try {
      localStorage.setItem(THREAD_MICRO_HINT_KEY, 'true');
    } catch {
      // localStorage not available
    }
  }, []);

  // Read receipts state
  const [readReceiptsEnabled, _setReadReceiptsEnabled] = useState(true);
  const lastReadMessageIdRef = useRef<string | null>(null);

  // Pending attachments state
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

  // Typing debounce state
  const lastTypingSentRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);

  // User search state for new conversations
  const [availableUsers, setAvailableUsers] = useState<MessageUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<MessageUser[]>([]);
  const [newConversationName, setNewConversationName] = useState('');

  // Typing debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // ========================================
  // FETCH CONVERSATIONS FROM REST API
  // ========================================
  const loadConversations = useCallback(async () => {
    if (!user) return;

    setIsLoadingConversations(true);
    setConversationError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/conversations?limit=50&offset=0', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load conversations: ${res.status}`);
      }

      const data = await res.json();
      const list = (data.conversations || []) as ConversationListItem[];

      // Sort by lastMessageAt (newest first)
      list.sort((a, b) => {
        const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
        const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
        return tb - ta;
      });

      setConversationSummaries(list);

      // Auto-select first conversation if none selected
      if (!selectedConversationId && list.length > 0) {
        setSelectedConversationId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setConversationError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, selectedConversationId]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ========================================
  // FETCH USERS FOR NEW CONVERSATION
  // ========================================
  useEffect(() => {
    if (showNewConversation) {
      fetchUsers();
    }
  }, [showNewConversation]);

  const fetchUsers = async (search?: string) => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = search ? `/api/users?search=${encodeURIComponent(search)}` : '/api/users';
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const users = (data.users || data || []).map((u: any) => ({
          id: u.id,
          name: u.name || u.email?.split('@')[0] || 'Unknown',
          avatar: u.avatar,
          initials: getInitials(u.name || u.email?.split('@')[0] || 'U'),
          isOnline: u.isOnline || false,
        }));
        setAvailableUsers(users.filter((u: MessageUser) => u.id !== user?.id));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Debounced user search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (userSearchTerm) {
        fetchUsers(userSearchTerm);
      } else if (showNewConversation) {
        fetchUsers();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearchTerm, showNewConversation]);

  // ========================================
  // TRANSFORM DATA FOR UI
  // ========================================

  // Transform ConversationListItem to Conversation for UI
  const transformSummaryToConversation = useCallback((summary: ConversationListItem): Conversation => {
    const members = summary.members || [];
    const otherMember = members.find(m => m.userId !== user?.id) || members[0];
    const otherUser = otherMember?.user;

    return {
      id: summary.id,
      title: summary.name || otherUser?.name || otherUser?.email?.split('@')[0] || 'Conversation',
      type: summary.isGroup ? 'group' : 'direct',
      participant: {
        id: otherUser?.id || otherMember?.userId || '',
        name: otherUser?.name || otherUser?.email?.split('@')[0] || 'Unknown',
        initials: getInitials(otherUser?.name || otherUser?.email?.split('@')[0] || 'U'),
        isOnline: false,
      },
      participants: members.map(m => ({
        id: m.user?.id || m.userId,
        name: m.user?.name || m.user?.email?.split('@')[0] || 'Unknown',
        initials: getInitials(m.user?.name || m.user?.email?.split('@')[0] || 'U'),
        isOnline: false,
      })),
      lastMessage: summary.lastMessagePreview ? {
        id: '',
        content: summary.lastMessagePreview,
        author: { id: '', name: '', initials: '' },
        timestamp: summary.lastMessageAt ? new Date(summary.lastMessageAt) : new Date(),
        isCurrentUser: false,
      } : undefined,
      unreadCount: summary.unreadCount || 0,
      isPinned: false,
      isArchived: false,
      isMuted: false,
      isTyping: realtime.typingUsers.some(t => t.conversationId === summary.id),
      typingUsers: realtime.typingUsers
        .filter(t => t.conversationId === summary.id)
        .map(t => t.userEmail),
      // Project context
      projectId: summary.projectId || null,
      projectName: summary.projectName || null,
    };
  }, [user?.id, realtime.typingUsers]);

  // Transform ConversationMessage to Message for UI
  const transformRealtimeMessage = useCallback((msg: ConversationMessage): Message => {
    // Get user ID from different possible fields
    const authorId = msg.authorId || msg.userId || '';
    // Get content from different possible fields
    const content = msg.content || msg.text || '';
    // Get author name from different possible sources
    const authorName = msg.author?.displayName || msg.author?.email?.split('@')[0] || msg.userName || 'Unknown';

    return {
      id: msg.id,
      content,
      author: {
        id: authorId,
        name: authorName,
        initials: getInitials(authorName || 'U'),
        isOnline: false,
        avatar: msg.userAvatar,
      },
      timestamp: new Date(msg.createdAt),
      isCurrentUser: authorId === user?.id,
      status: 'sent',
      isEdited: !!msg.editedAt,
      editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
      isDeleted: false,
      replyTo: msg.replyToMessageId ? {
        id: msg.replyToMessageId,
        content: '',
        author: { id: '', name: '', initials: '' },
      } : undefined,
      attachments: [],
      asset: msg.asset ? {
        id: msg.asset.id,
        name: msg.asset.name,
        kind: msg.asset.kind,
        ownerId: msg.asset.ownerId,
        organizationId: msg.asset.organizationId,
        description: msg.asset.description,
        createdAt: msg.asset.createdAt,
        file: msg.asset.file,
      } : undefined,
      reactions: msg.reactions || [],
      isPinned: realtime.pinnedMessageIds.includes(msg.id),
      isForwarded: false,
      isSystemMessage: msg.isSystemMessage,
      threadReplyCount: msg.threadReplyCount,
      threadRootMessageId: msg.threadRootMessageId,
      threadLastReplyAt: msg.threadLastReplyAt ? new Date(msg.threadLastReplyAt) : undefined,
    };
  }, [user?.id, realtime.pinnedMessageIds]);

  // Transformed data for UI
  const conversations: Conversation[] = useMemo(() =>
    conversationSummaries.map(transformSummaryToConversation),
    [conversationSummaries, transformSummaryToConversation]
  );

  const selectedConversation = useMemo(() => {
    const summary = conversationSummaries.find(c => c.id === selectedConversationId);
    return summary ? transformSummaryToConversation(summary) : null;
  }, [conversationSummaries, selectedConversationId, transformSummaryToConversation]);

  const messages: Message[] = useMemo(() =>
    realtime.messages.map(transformRealtimeMessage),
    [realtime.messages, transformRealtimeMessage]
  );

  // Message lookup map for finding parent messages (used for reply threading)
  const messageById = useMemo(
    () => new Map(messages.map(m => [m.id, m])),
    [messages]
  );

  // Highlighted message state (for jump-to-original animation)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Pinned messages derived from real-time state
  const pinnedMessages = useMemo(() =>
    messages.filter(m => realtime.pinnedMessageIds.includes(m.id)),
    [messages, realtime.pinnedMessageIds]
  );

  // Filter conversations (with active project scoping)
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // Apply active project filter when a project is focused
    if (hasFocus && activeProject) {
      result = result.filter(c => c.projectId === activeProject.id);
    }

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
      case 'muted':
        result = result.filter(c => c.isMuted);
        break;
    }

    if (searchTerm) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.lastMessage?.timestamp.getTime() || 0;
      const bTime = b.lastMessage?.timestamp.getTime() || 0;
      return bTime - aTime;
    });
  }, [conversations, filter, searchTerm, hasFocus, activeProject]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they scroll into view (IntersectionObserver)
  useEffect(() => {
    if (!selectedConversationId || !messages.length || !readReceiptsEnabled) return;
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const observedMessages = new Map<Element, string>();

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most recent visible message
        let mostRecentVisibleId: string | null = null;
        let mostRecentVisibleIndex = -1;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = observedMessages.get(entry.target);
            if (messageId) {
              const messageIndex = messages.findIndex(m => m.id === messageId);
              if (messageIndex > mostRecentVisibleIndex) {
                mostRecentVisibleIndex = messageIndex;
                mostRecentVisibleId = messageId;
              }
            }
          }
        });

        // Mark the most recent visible message as read
        if (mostRecentVisibleId && mostRecentVisibleId !== lastReadMessageIdRef.current) {
          // Check if this message is newer than the last read message
          const currentIndex = messages.findIndex(m => m.id === mostRecentVisibleId);
          const lastReadIndex = lastReadMessageIdRef.current
            ? messages.findIndex(m => m.id === lastReadMessageIdRef.current)
            : -1;

          if (currentIndex > lastReadIndex) {
            lastReadMessageIdRef.current = mostRecentVisibleId;
            realtime.markAsRead(mostRecentVisibleId);

            // Zero out unread count locally
            setConversationSummaries(prev =>
              prev.map(c =>
                c.id === selectedConversationId ? { ...c, unreadCount: 0 } : c
              )
            );
          }
        }
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0.5, // Message is considered visible when 50% in view
      }
    );

    // Observe all message elements
    const messageElements = container.querySelectorAll('[data-message-id]');
    messageElements.forEach((element) => {
      const messageId = element.getAttribute('data-message-id');
      if (messageId) {
        observedMessages.set(element, messageId);
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [selectedConversationId, messages, realtime, readReceiptsEnabled]);

  // Reset last read message when conversation changes
  useEffect(() => {
    lastReadMessageIdRef.current = null;
  }, [selectedConversationId]);

  // Keyboard shortcut for search (Ctrl+F / Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate when we have a conversation selected
      if (!selectedConversationId) return;

      // Ctrl+F or Cmd+F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowMessageSearch(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConversationId]);

  // NOTE: Deep-link highlight useEffect is placed after handleJumpToMessage definition below

  // ========================================
  // MESSAGE HANDLERS (WebSocket based)
  // ========================================

  const handleSendMessage = async () => {
    // Get uploaded attachments (those with assetId and no error)
    const uploadedAttachments = pendingAttachments.filter(a => a.assetId && !a.error && !a.uploading);
    const hasText = newMessage.trim().length > 0;
    const hasAttachments = uploadedAttachments.length > 0;

    // Need either text or attachments
    if ((!hasText && !hasAttachments) || !selectedConversationId || isSending) return;

    setIsSending(true);
    try {
      // Send attachments first (one message per attachment)
      for (let i = 0; i < uploadedAttachments.length; i++) {
        const attachment = uploadedAttachments[i];
        // For the first attachment, include any text
        const messageText = (i === 0 && hasText) ? newMessage.trim() : '';

        realtime.sendMessage(messageText, {
          replyToMessageId: i === 0 ? replyTo?.id : undefined,
          assetId: attachment.assetId,
        });
      }

      // If we have text but no attachments, send text-only message
      if (hasText && !hasAttachments) {
        realtime.sendMessage(newMessage.trim(), {
          replyToMessageId: replyTo?.id,
        });
      }

      // Clear state
      setNewMessage('');
      setReplyTo(undefined);
      // Clean up pending attachments (revoke object URLs)
      pendingAttachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setPendingAttachments([]);
      // Stop typing indicator
      realtime.stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator with debouncing (max 1 event per second)
  const handleInputChange = (value: string) => {
    setNewMessage(value);

    // Start typing indicator with debouncing
    if (value.trim()) {
      const now = Date.now();
      // Only send typing event at most once per second
      if (now - lastTypingSentRef.current > 1000) {
        realtime.startTyping();
        lastTypingSentRef.current = now;
        isTypingRef.current = true;
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 5 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          realtime.stopTyping();
          isTypingRef.current = false;
        }
      }, 5000);
    } else {
      // Text cleared - stop typing immediately
      if (isTypingRef.current) {
        realtime.stopTyping();
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo({
      id: message.id,
      content: message.content,
      author: message.author
    });
    // Scroll composer into view
    setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    // Find the message to check if user has already reacted
    const msg = messages.find(m => m.id === messageId);
    const reactions = msg?.reactions || [];
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const hasUserReacted = existingReaction?.userIds?.includes(user?.id || '') || false;

    if (hasUserReacted) {
      realtime.removeReaction(messageId, emoji);
    } else {
      realtime.addReaction(messageId, emoji);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    // Check if message is already pinned
    const isPinned = realtime.pinnedMessageIds.includes(messageId);
    if (isPinned) {
      realtime.unpinMessage(messageId);
    } else {
      realtime.pinMessage(messageId);
    }
  };

  const handleCopyMessage = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.content) return;
    try {
      await navigator.clipboard.writeText(msg.content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // Start editing a message
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingDraft(message.content || '');
  };

  // Submit edited message
  const handleSubmitEdit = () => {
    if (!editingMessageId || !editingDraft.trim()) return;
    realtime.editMessage(editingMessageId, editingDraft.trim());
    setEditingMessageId(null);
    setEditingDraft('');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingDraft('');
  };

  // Jump to original message (for reply threading)
  const handleJumpToMessage = useCallback((messageId: string) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`
    );
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);

    // Add pulse animation
    el.classList.add('animate-pulse');
    setTimeout(() => el.classList.remove('animate-pulse'), 2000);

    // Clear highlight after a short timeout
    setTimeout(() => {
      setHighlightedMessageId(prev => (prev === messageId ? null : prev));
    }, 2000);
  }, []);

  // Handle deep-link highlight from URL (e.g., ?highlight=<messageId>)
  useEffect(() => {
    const highlightParam = searchParams.get('highlight');
    if (!highlightParam || messages.length === 0) return;

    // Wait a short delay for the DOM to render
    const timer = setTimeout(() => {
      handleJumpToMessage(highlightParam);
      // Clear the highlight param from URL to prevent re-highlighting on refresh
      searchParams.delete('highlight');
      setSearchParams(searchParams, { replace: true });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams, messages.length, handleJumpToMessage]);

  // Handle search result click - switch conversation if needed, then jump to message
  const handleSearchResultClick = useCallback((result: MessageSearchResult) => {
    // If it's a different conversation, switch to it first
    if (result.conversationId !== selectedConversationId) {
      setSelectedConversationId(result.conversationId);
      setShowMobileChat(true);
      // Wait for messages to load, then jump
      setTimeout(() => {
        handleJumpToMessage(result.id);
      }, 500);
    } else {
      handleJumpToMessage(result.id);
    }
    setShowMessageSearch(false);
  }, [selectedConversationId, handleJumpToMessage]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConversationId) return;
    try {
      realtime.deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Start forward flow - open modal
  const handleStartForward = (message: Message) => {
    setForwardSourceMessage(message);
    setForwardTargetConversationId(null);
    setIsForwardModalOpen(true);
  };

  // Confirm forward - send to selected conversation
  const handleConfirmForward = () => {
    if (!forwardSourceMessage || !forwardTargetConversationId) return;

    realtime.forwardMessage(forwardTargetConversationId, forwardSourceMessage.id);
    setIsForwardModalOpen(false);
    setForwardSourceMessage(null);
    setForwardTargetConversationId(null);
  };

  // Close forward modal
  const handleCancelForward = () => {
    setIsForwardModalOpen(false);
    setForwardSourceMessage(null);
    setForwardTargetConversationId(null);
  };

  // ========================================
  // THREAD HANDLERS
  // ========================================

  // Open thread panel and load thread messages
  const handleOpenThread = useCallback(async (messageId: string) => {
    if (!selectedConversationId) return;

    setActiveThreadRootId(messageId);
    setIsThreadPanelOpen(true);
    setIsLoadingThread(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `/api/conversations/${selectedConversationId}/threads/${messageId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Transform to Message format
        const transformedMessages = (data.messages || []).map((m: any) => ({
          id: m.id,
          content: m.text,
          timestamp: new Date(m.createdAt),
          author: {
            id: m.userId,
            name: m.userName || 'Unknown',
            initials: (m.userName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          },
          status: 'delivered' as const,
        }));
        setThreadMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error);
    } finally {
      setIsLoadingThread(false);
    }
  }, [selectedConversationId]);

  // Close thread panel
  const handleCloseThread = useCallback(() => {
    setIsThreadPanelOpen(false);
    setActiveThreadRootId(null);
    setThreadMessages([]);
  }, []);

  // Reply to thread
  const handleThreadReply = useCallback(async (text: string) => {
    if (!selectedConversationId || !activeThreadRootId) return;

    // Send message with thread root reference
    realtime.sendMessage(text, {
      replyToMessageId: activeThreadRootId,
    });

    // Optimistically add to thread messages
    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      content: text,
      timestamp: new Date(),
      author: {
        id: user?.id || '',
        name: user?.name || user?.email?.split('@')[0] || 'You',
        initials: (user?.name || user?.email || 'Y').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      },
      status: 'sending',
      isCurrentUser: true,
    };
    setThreadMessages(prev => [...prev, newMessage]);
  }, [selectedConversationId, activeThreadRootId, realtime, user]);

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedConversationId) return;

    const token = localStorage.getItem('auth_token');

    for (const file of Array.from(files)) {
      const attachmentId = `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let preview: string | undefined;

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Add to pending with uploading state
      setPendingAttachments(prev => [...prev, {
        id: attachmentId,
        file,
        preview,
        uploading: true,
        progress: 0
      }]);

      // Upload file
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/conversations/${selectedConversationId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        // Update attachment with assetId and completed state
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, assetId: data.asset.id, asset: data.asset }
            : a
        ));
      } catch (error) {
        console.error('Failed to upload file:', error);
        // Mark as error
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, error: 'Upload failed' }
            : a
        ));
      }
    }

    // Clear the input
    e.target.value = '';
  };

  // Handle dropped files (for drag & drop support)
  const handleFileDrop = async (files: FileList) => {
    if (!selectedConversationId) return;

    const token = localStorage.getItem('auth_token');

    for (const file of Array.from(files)) {
      const attachmentId = `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let preview: string | undefined;

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Add to pending with uploading state
      setPendingAttachments(prev => [...prev, {
        id: attachmentId,
        file,
        preview,
        uploading: true,
        progress: 0
      }]);

      // Upload file
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/conversations/${selectedConversationId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        // Update attachment with assetId and completed state
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, assetId: data.asset.id, asset: data.asset }
            : a
        ));
      } catch (error) {
        console.error('Failed to upload dropped file:', error);
        // Mark as error
        setPendingAttachments(prev => prev.map(a =>
          a.id === attachmentId
            ? { ...a, uploading: false, error: 'Upload failed' }
            : a
        ));
      }
    }
  };

  // Handle viewing attachment in Files app
  const handleViewInFiles = useCallback((assetId: string) => {
    // Navigate to Assets page with the asset selected
    navigate(`/assets?highlight=${assetId}`);
  }, [navigate]);

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      // Revoke object URL to free memory
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setShowMobileChat(true);
    // Report to Work Momentum
    reportConversation(conversation.id);
  };

  // Create new conversation via REST API
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const isGroup = selectedUsers.length > 1;
      const name = isGroup ? newConversationName || `Group with ${selectedUsers.map(u => u.name).join(', ')}` : null;

      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          isGroup,
          memberIds: selectedUsers.map(u => u.id),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await res.json();
      const conversationId = data.conversation?.id;

      // Close dialog and open new conversation
      setShowNewConversation(false);
      setSelectedUsers([]);
      setNewConversationName('');
      setUserSearchTerm('');

      if (conversationId) {
        setSelectedConversationId(conversationId);
        setShowMobileChat(true);
        // Refresh conversation list
        await loadConversations();
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Toggle user selection for new conversation
  const toggleUserSelection = (user: MessageUser) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  // Calculate stats
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const onlineCount = conversations.filter(c => c.participant?.isOnline).length;

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[{ label: 'Messages' }]}
      onLogout={logout}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Error Banner */}
      {conversationError && (
        <div className="mx-4 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Connection Error</p>
                <p className="text-xs text-red-700 dark:text-red-300">{conversationError}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={loadConversations}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {!realtime.isConnected && selectedConversationId && (
        <div className="mx-4 mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting to real-time messaging...
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-4rem)] flex gap-0 md:gap-6 md:p-6">
        {/* Conversations Sidebar */}
        <Card className={`w-full md:w-96 flex flex-col overflow-hidden border-0 md:border ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Messages</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {onlineCount} online · {unreadCount} unread
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowNewConversation(true)}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(['all', 'unread', 'starred', 'muted'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
                    filter === f
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {f === 'starred' && <Star className="w-3 h-3 inline mr-1" />}
                  {f === 'muted' && <BellOff className="w-3 h-3 inline mr-1" />}
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations && conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              searchTerm ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    No conversations match your search
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={MessageCircle}
                  title={emptyStateConfigs.messages.title}
                  description={emptyStateConfigs.messages.description}
                  primaryCtaLabel={emptyStateConfigs.messages.primaryCtaLabel}
                  onPrimaryCta={() => setShowNewConversation(true)}
                  secondaryCtaLabel="Go to Projects"
                  onSecondaryCta={() => navigate('/projects')}
                  learnMoreItems={emptyStateConfigs.messages.learnMoreItems as unknown as string[]}
                  size="sm"
                />
              )
            ) : (
              filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                />
              ))
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className={`flex-1 flex flex-col overflow-hidden border-0 md:border ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-900">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <Avatar user={selectedConversation.participant} size="md" showStatus />
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedConversation.title}
                    </h3>
                    <ConversationHeaderPresence
                      isOnline={selectedConversation.participant.isOnline}
                      lastSeen={selectedConversation.participant.lastSeen}
                      isTyping={realtime.typingUsers.some(t => t.userId === selectedConversation.participant.id)}
                      isGroup={selectedConversation.type === 'group'}
                      memberCount={selectedConversation.participants?.length}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowMessageSearch(!showMessageSearch)}
                    className={`p-2 rounded-lg transition-colors ${showMessageSearch ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title="Search messages (Ctrl+F)"
                  >
                    <Search className={`w-5 h-5 ${showMessageSearch ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'}`} />
                  </button>
                  <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Voice call">
                    <Phone className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Video call">
                    <Video className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                  <button
                    onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                    className={`p-2 rounded-lg transition-colors ${showPinnedMessages ? 'bg-accent-100 dark:bg-accent-900/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title="Pinned messages"
                  >
                    <Pin className={`w-5 h-5 ${showPinnedMessages ? 'text-accent-600' : 'text-neutral-600 dark:text-neutral-400'}`} />
                  </button>
                  <button
                    onClick={() => setIsSummaryPanelOpen(!isSummaryPanelOpen)}
                    className={`p-2 rounded-lg transition-colors ${isSummaryPanelOpen ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                    title="Conversation summary"
                  >
                    <Sparkles className={`w-5 h-5 ${isSummaryPanelOpen ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'}`} />
                  </button>
                  <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="More options">
                    <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Pinned Messages Panel */}
              {showPinnedMessages && (
                <PinnedMessagesPanel
                  messages={pinnedMessages}
                  onClose={() => setShowPinnedMessages(false)}
                  onUnpin={(id) => handlePinMessage(id)}
                  onJumpTo={(id) => {
                    // Scroll to message
                    const messageEl = document.querySelector(`[data-message-id="${id}"]`);
                    if (messageEl) {
                      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      messageEl.classList.add('ring-2', 'ring-primary-500');
                      setTimeout(() => messageEl.classList.remove('ring-2', 'ring-primary-500'), 2000);
                    }
                    setShowPinnedMessages(false);
                  }}
                />
              )}

              {/* Message Search Panel */}
              {showMessageSearch && (
                <MessageSearchPanel
                  conversationId={selectedConversationId}
                  onResultClick={handleSearchResultClick}
                  onClose={() => setShowMessageSearch(false)}
                />
              )}

              {/* Thread micro-hint for first-time users */}
              {showThreadHint && messages.length > 0 && (
                <div className="mx-4 mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-indigo-900 dark:text-indigo-100">
                        <span className="font-medium">Threads keep replies organized.</span>
                        {' '}Click the reply icon on any message to start a focused thread.
                      </p>
                    </div>
                    <button
                      onClick={dismissThreadHint}
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded transition-colors flex-shrink-0"
                      aria-label="Dismiss hint"
                    >
                      <X className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto py-4"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                        <MessageCircle className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Start the conversation!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const prevMessage = messages[index - 1];
                      const showDateSeparator = !prevMessage ||
                        message.timestamp.toDateString() !== prevMessage.timestamp.toDateString();
                      const isGrouped = prevMessage &&
                        prevMessage.author.id === message.author.id &&
                        message.timestamp.getTime() - prevMessage.timestamp.getTime() < 60000;

                      // Look up parent message for reply threading
                      const parentMessage = message.replyTo?.id
                        ? messageById.get(message.replyTo.id)
                        : undefined;

                      // Enrich message with parent data if available
                      const enrichedMessage = parentMessage && message.replyTo
                        ? {
                            ...message,
                            replyTo: {
                              id: parentMessage.id,
                              content: parentMessage.content,
                              author: parentMessage.author,
                            },
                          }
                        : message;

                      return (
                        <React.Fragment key={message.id}>
                          {showDateSeparator && <DateSeparator date={message.timestamp} />}
                          <MessageBubble
                            message={enrichedMessage}
                            onReply={() => handleReply(message)}
                            onEdit={() => handleStartEdit(message)}
                            onDelete={() => handleDeleteMessage(message.id)}
                            onPin={() => handlePinMessage(message.id)}
                            onCopy={() => handleCopyMessage(message.id)}
                            onJumpToMessage={handleJumpToMessage}
                            onForward={() => handleStartForward(message)}
                            onReact={(emoji) => handleReact(message.id, emoji)}
                            onOpenThread={() => handleOpenThread(message.id)}
                            onViewInFiles={handleViewInFiles}
                            isGrouped={isGrouped}
                            currentUserId={user?.id}
                            isPinned={realtime.pinnedMessageIds.includes(message.id)}
                            isHighlighted={highlightedMessageId === message.id || threadHighlightId === message.id}
                            isEditing={editingMessageId === message.id}
                            editingDraft={editingMessageId === message.id ? editingDraft : ''}
                            onChangeEditingDraft={setEditingDraft}
                            onSubmitEdit={handleSubmitEdit}
                            onCancelEdit={handleCancelEdit}
                          />
                        </React.Fragment>
                      );
                    })}

                    {/* Typing indicator - from real-time hook (uses userName for better display) */}
                    {realtime.typingUsers.length > 0 && (
                      <TypingIndicator users={realtime.typingUsers.map(u => u.userName || u.userEmail?.split('@')[0] || 'Someone')} />
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input - with typing indicators */}
              <div ref={composerRef}>
                <MessageInput
                  value={newMessage}
                  onChange={handleInputChange}
                  onSend={handleSendMessage}
                  onAttach={handleAttach}
                  onFileDrop={handleFileDrop}
                  replyTo={replyTo}
                  onClearReply={() => setReplyTo(undefined)}
                  disabled={isSending || !realtime.isConnected}
                  pendingAttachments={pendingAttachments}
                  onRemoveAttachment={handleRemoveAttachment}
                />
              </div>
            </>
          ) : (
            <EmptyMessagesState onStartConversation={() => setShowNewConversation(true)} />
          )}
        </Card>

        {/* Thread Panel */}
        {isThreadPanelOpen && activeThreadRootId && selectedConversation && (
          <ThreadPanel
            conversationId={selectedConversation.id}
            rootMessage={{
              id: activeThreadRootId,
              userId: messages.find(m => m.id === activeThreadRootId)?.author.id || '',
              conversationId: selectedConversation.id,
              text: messages.find(m => m.id === activeThreadRootId)?.content || '',
              userName: messages.find(m => m.id === activeThreadRootId)?.author.name,
              createdAt: messages.find(m => m.id === activeThreadRootId)?.timestamp.toISOString() || new Date().toISOString(),
            }}
            messages={threadMessages.map(m => ({
              id: m.id,
              userId: m.author.id,
              conversationId: selectedConversation.id,
              text: m.content,
              userName: m.author.name,
              createdAt: m.timestamp.toISOString(),
            }))}
            isLoading={isLoadingThread}
            onClose={handleCloseThread}
            onReply={handleThreadReply}
            currentUserId={user?.id}
          />
        )}

        {/* Summary Panel */}
        {isSummaryPanelOpen && selectedConversation && (
          <ConversationSummary
            conversationId={selectedConversation.id}
            projectId={selectedConversation.projectId}
            onClose={() => setIsSummaryPanelOpen(false)}
          />
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={(open) => {
        setShowNewConversation(open);
        if (!open) {
          setSelectedUsers([]);
          setUserSearchTerm('');
          setNewConversationName('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary-600" />
              New Conversation
            </DialogTitle>
            <DialogDescription>
              Search for team members to start a conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                  >
                    <span>{u.name}</span>
                    <button
                      onClick={() => toggleUserSelection(u)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Group name input (when multiple users selected) */}
            {selectedUsers.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Group Name (optional)
                </label>
                <input
                  type="text"
                  value={newConversationName}
                  onChange={(e) => setNewConversationName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* User list */}
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                {userSearchTerm ? 'Search Results' : 'Team Members'}
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {userSearchTerm ? 'No users found' : 'No team members available'}
                    </p>
                  </div>
                ) : (
                  availableUsers.map((u) => {
                    const isSelected = selectedUsers.some(s => s.id === u.id);
                    return (
                      <button
                        key={u.id}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => toggleUserSelection(u)}
                      >
                        <Avatar user={u} size="md" showStatus />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{u.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {u.isOnline ? (
                              <span className="text-green-600 dark:text-green-400">Online</span>
                            ) : (
                              'Offline'
                            )}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateConversation}
                disabled={selectedUsers.length === 0}
              >
                {selectedUsers.length > 1 ? (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Create Group
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Chat
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Message Modal */}
      <Dialog open={isForwardModalOpen} onOpenChange={setIsForwardModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forward message</DialogTitle>
            <DialogDescription>
              Select a conversation to forward this message to.
            </DialogDescription>
          </DialogHeader>

          {/* Message preview */}
          {forwardSourceMessage?.content && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-4">
              <p className="text-xs text-neutral-500 mb-1">Message preview:</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">
                {forwardSourceMessage.content}
              </p>
            </div>
          )}

          {/* Conversation list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {conversations
              .filter(c => c.id !== selectedConversation?.id)
              .map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setForwardTargetConversationId(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                    forwardTargetConversationId === conv.id
                      ? 'bg-primary-100 dark:bg-primary-900 border border-primary-300'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-transparent'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-medium">
                    {conv.type === 'group' ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      conv.participant?.initials || conv.participants?.[0]?.initials || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {conv.title}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {forwardTargetConversationId === conv.id && (
                    <Check className="w-5 h-5 text-primary-600" />
                  )}
                </button>
              ))}

            {conversations.filter(c => c.id !== selectedConversation?.id).length === 0 && (
              <p className="text-center text-sm text-neutral-500 py-4">
                No other conversations available
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={handleCancelForward}>
              Cancel
            </Button>
            <Button
              disabled={!forwardTargetConversationId}
              onClick={handleConfirmForward}
            >
              Forward
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export { MessagesNew };
export default MessagesNew;
