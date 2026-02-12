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
 *
 * Refactored for Phase 4.2 Technical Debt Resolution:
 * - Types imported from @/components/messaging/types
 * - Components extracted to @/components/messaging/
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useActiveProject } from '@/store';
import { useConversationRealtime } from '../hooks/useConversationRealtime';
import { ConversationMessage } from '../services/messagingSocketService';
// Extracted messaging hooks (Phase 4.2)
import {
  useNewConversation,
  useFileUpload,
  useMessageTransformers,
  useMessageHandlers,
} from '../hooks/messaging';
import {
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Types - imported from extracted types file
import type {
  Message,
  Conversation,
  ConversationListItem,
  ConversationFilter,
} from '../components/messaging/types';

// Extracted messaging components
import {
  MessageComposer as MessageInput,
  EmptyMessagesState,
  PinnedMessagesPanel,
  NewConversationDialog,
  ForwardMessageDialog,
  ChatSidebar,
  ChatHeader,
  MessageListView,
} from '../components/messaging';
import type { MessageListViewRef } from '../components/messaging';

import { MessageSearchPanel } from '../components/messaging/MessageSearchPanel';
import { MessageSearchResult } from '../hooks/useMessageSearch';
import { ThreadPanel } from '../components/messaging/ThreadPanel';
import { ConversationSummary } from '../components/messaging/ConversationSummary';
import { useReportEntityFocus } from '../hooks/useWorkMomentumCapture';

// Main Messages Component
function MessagesNew() {
  const { user, logout } = useAuth();
  const activeProjectContext = useActiveProject();
  const navigate = useNavigate();

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
  // MESSAGE TRANSFORMERS (Phase 4.2)
  // ========================================
  const {
    transformSummaryToConversation,
    transformRealtimeMessage,
  } = useMessageTransformers({
    userId: user?.id,
    pinnedMessageIds: realtime.pinnedMessageIds,
    typingUsers: realtime.typingUsers,
  });

  // Compute messages early so useMessageHandlers can use them
  const messages: Message[] = useMemo(() =>
    realtime.messages.map(transformRealtimeMessage),
    [realtime.messages, transformRealtimeMessage]
  );

  // ========================================
  // LOCAL UI STATE
  // ========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
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

  // ========================================
  // EXTRACTED HOOKS (Phase 4.2)
  // ========================================

  // File upload hook
  const {
    pendingAttachments,
    setPendingAttachments,
    fileInputRef,
    handleAttach,
    handleFileSelect,
    handleFileDrop,
    handleRemoveAttachment,
  } = useFileUpload({ conversationId: selectedConversationId });

  // Message handlers hook (Phase 4.2)
  const {
    newMessage,
    replyTo,
    editingMessageId,
    editingDraft,
    isSending,
    forwardSourceMessage,
    isForwardModalOpen,
    forwardTargetConversationId,
    setReplyTo,
    setEditingDraft,
    setForwardTargetConversationId,
    setIsForwardModalOpen,
    handleSendMessage,
    handleInputChange,
    handleReply,
    handleReact,
    handlePinMessage,
    handleCopyMessage,
    handleStartEdit,
    handleSubmitEdit,
    handleCancelEdit,
    handleDeleteMessage,
    handleStartForward,
    handleConfirmForward,
    handleCancelForward,
  } = useMessageHandlers({
    selectedConversationId,
    messages,
    userId: user?.id,
    realtime,
    pendingAttachments,
    setPendingAttachments,
  });

  // New conversation hook
  const {
    showNewConversation,
    setShowNewConversation,
    availableUsers,
    userSearchTerm,
    setUserSearchTerm,
    loadingUsers,
    selectedUsers,
    newConversationName,
    setNewConversationName,
    toggleUserSelection,
    handleCreateConversation,
    resetDialog: resetNewConversationDialog,
  } = useNewConversation({
    currentUserId: user?.id,
    onConversationCreated: async (conversationId) => {
      setSelectedConversationId(conversationId);
      setShowMobileChat(true);
      await loadConversations();
    },
  });

  const messageListRef = useRef<MessageListViewRef>(null);
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

  // NOTE: User fetching for new conversations is now handled by useNewConversation hook
  // NOTE: Transform functions now provided by useMessageTransformers hook (Phase 4.2)

  // Transformed data for UI
  const conversations: Conversation[] = useMemo(() =>
    conversationSummaries.map(transformSummaryToConversation),
    [conversationSummaries, transformSummaryToConversation]
  );

  const selectedConversation = useMemo(() => {
    const summary = conversationSummaries.find(c => c.id === selectedConversationId);
    return summary ? transformSummaryToConversation(summary) : null;
  }, [conversationSummaries, selectedConversationId, transformSummaryToConversation]);

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
    messageListRef.current?.scrollToEnd();
  }, [messages]);

  // Mark messages as read when they scroll into view (IntersectionObserver)
  useEffect(() => {
    if (!selectedConversationId || !messages.length || !readReceiptsEnabled) return;
    const container = messageListRef.current?.container;
    if (!container) return;
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
  // NOTE: Message handlers (send, reply, edit, delete, react, pin, forward) now provided by useMessageHandlers hook (Phase 4.2)

  // Jump to original message (for reply threading)
  const handleJumpToMessage = useCallback((messageId: string) => {
    const container = messageListRef.current?.container;
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

  // NOTE: handleAttach, handleFileSelect, handleFileDrop, handleRemoveAttachment
  // are now provided by useFileUpload hook

  // Handle viewing attachment in Files app
  const handleViewInFiles = useCallback((assetId: string) => {
    // Navigate to Assets page with the asset selected
    navigate(`/assets?highlight=${assetId}`);
  }, [navigate]);

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setShowMobileChat(true);
    // Report to Work Momentum
    reportConversation(conversation.id);
  };

  // NOTE: handleCreateConversation and toggleUserSelection
  // are now provided by useNewConversation hook

  // Calculate stats
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const onlineCount = conversations.filter(c => c.participant?.isOnline).length;

  // Guard: If auth context indicates no user, return null and let ProtectedRoute redirect
  // This check is AFTER all hooks to satisfy React's rules of hooks
  if (!user) {
    return null;
  }

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
        {/* Conversations Sidebar - extracted component */}
        <ChatSidebar
          conversations={conversations}
          filteredConversations={filteredConversations}
          selectedConversation={selectedConversation}
          isLoading={isLoadingConversations}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filter={filter}
          onFilterChange={setFilter}
          onConversationClick={handleConversationClick}
          onNewConversation={() => setShowNewConversation(true)}
          onNavigateToProjects={() => navigate('/projects')}
          showMobileChat={showMobileChat}
          onlineCount={onlineCount}
          unreadCount={unreadCount}
        />

        {/* Chat Area */}
        <Card className={`flex-1 flex flex-col overflow-hidden border-0 md:border ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header - extracted component */}
              <ChatHeader
                conversation={selectedConversation}
                isTyping={realtime.typingUsers.some(t => t.userId === selectedConversation.participant.id)}
                onBack={() => setShowMobileChat(false)}
                showMessageSearch={showMessageSearch}
                onToggleSearch={() => setShowMessageSearch(!showMessageSearch)}
                showPinnedMessages={showPinnedMessages}
                onTogglePinned={() => setShowPinnedMessages(!showPinnedMessages)}
                showSummary={isSummaryPanelOpen}
                onToggleSummary={() => setIsSummaryPanelOpen(!isSummaryPanelOpen)}
              />

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

              {/* Messages - extracted component */}
              <MessageListView
                ref={messageListRef}
                messages={messages}
                messageById={messageById}
                currentUserId={user?.id}
                pinnedMessageIds={realtime.pinnedMessageIds}
                highlightedMessageId={highlightedMessageId}
                threadHighlightId={threadHighlightId}
                editingMessageId={editingMessageId}
                editingDraft={editingDraft}
                typingUserNames={realtime.typingUsers.map(u => u.userName || u.userEmail?.split('@')[0] || 'Someone')}
                onReply={handleReply}
                onEdit={handleStartEdit}
                onDelete={handleDeleteMessage}
                onPin={handlePinMessage}
                onCopy={handleCopyMessage}
                onJumpToMessage={handleJumpToMessage}
                onForward={handleStartForward}
                onReact={handleReact}
                onOpenThread={handleOpenThread}
                onViewInFiles={handleViewInFiles}
                onChangeEditingDraft={setEditingDraft}
                onSubmitEdit={handleSubmitEdit}
                onCancelEdit={handleCancelEdit}
              />

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

      {/* New Conversation Dialog - using extracted component */}
      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={(open) => {
          if (open) {
            setShowNewConversation(true);
          } else {
            resetNewConversationDialog();
          }
        }}
        selectedUsers={selectedUsers}
        onToggleUser={toggleUserSelection}
        searchTerm={userSearchTerm}
        onSearchChange={setUserSearchTerm}
        groupName={newConversationName}
        onGroupNameChange={setNewConversationName}
        availableUsers={availableUsers}
        isLoading={loadingUsers}
        onCreateConversation={handleCreateConversation}
      />

      {/* Forward Message Dialog - using extracted component */}
      <ForwardMessageDialog
        open={isForwardModalOpen}
        onOpenChange={setIsForwardModalOpen}
        sourceMessage={forwardSourceMessage}
        conversations={conversations}
        currentConversationId={selectedConversation?.id}
        targetConversationId={forwardTargetConversationId}
        onSelectTarget={setForwardTargetConversationId}
        onCancel={handleCancelForward}
        onConfirm={handleConfirmForward}
      />
    </DashboardLayout>
  );
}

export { MessagesNew };
export default MessagesNew;
