/**
 * useMessagesPageState - Page-level state hook for MessagesNew
 *
 * Manages conversation loading, filtering, selection, real-time messaging,
 * thread state, read receipts, search, and all derived data.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/store/slices/authSlice';
import { useActiveProject } from '@/store';
import { useConversationRealtime } from './useConversationRealtime';
import { ConversationMessage } from '../services/messagingSocketService';
import {
  useNewConversation,
  useFileUpload,
  useMessageTransformers,
  useMessageHandlers,
} from './messaging';
import { useReportEntityFocus } from './useWorkMomentumCapture';
import { apiService } from '@/services/apiService';
import { messagingService } from '@/services/messagingService';
import { toast } from '@/lib/toast';

import type {
  Message,
  Conversation,
  ConversationListItem,
  ConversationFilter,
} from '../components/messaging/types';
import type { MessageListViewRef } from '../components/messaging';

export function useMessagesPageState() {
  const { user, logout } = useAuth();
  const activeProjectContext = useActiveProject();
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

      const others = prev.filter(c => c.id !== data.conversationId);
      return [updated, ...others];
    });
  }, [selectedConversationId]);

  // Thread panel state
  const [activeThreadRootId, setActiveThreadRootId] = useState<string | null>(null);
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false);
  const [threadHighlightId, setThreadHighlightId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Read receipt states (declared early so handleReadReceipt can reference setReadStates)
  const [readStates, setReadStates] = useState<Array<{ userId: string; userName?: string; avatarUrl?: string; lastReadMessageId: string }>>([]);

  const handleThreadSummaryUpdate = useCallback((data: { threadRootMessageId: string }) => {
    if (!isThreadPanelOpen || activeThreadRootId !== data.threadRootMessageId) {
      setThreadHighlightId(data.threadRootMessageId);
      setTimeout(() => {
        setThreadHighlightId(prev => prev === data.threadRootMessageId ? null : prev);
      }, 2000);
    }
  }, [isThreadPanelOpen, activeThreadRootId]);

  const handleReadReceipt = useCallback((data: { conversationId: string; userId: string; messageId: string; userName?: string; avatarUrl?: string }) => {
    setReadStates(prev => {
      const existing = prev.find(rs => rs.userId === data.userId);
      if (existing) {
        return prev.map(rs =>
          rs.userId === data.userId
            ? { ...rs, lastReadMessageId: data.messageId, userName: data.userName || rs.userName, avatarUrl: data.avatarUrl || rs.avatarUrl }
            : rs
        );
      }
      return [...prev, { userId: data.userId, userName: data.userName, avatarUrl: data.avatarUrl, lastReadMessageId: data.messageId }];
    });
  }, []);

  const realtime = useConversationRealtime({
    conversationId: selectedConversationId || undefined,
    autoConnect: true,
    onNewMessage: handleNewMessage,
    onThreadSummaryUpdate: handleThreadSummaryUpdate,
    onReadReceipt: handleReadReceipt,
  });

  // ========================================
  // MESSAGE TRANSFORMERS
  // ========================================
  // Build stable message ID list for read receipt computation
  const realtimeMessageIds = useMemo(() =>
    realtime.messages.map(m => m.id),
    [realtime.messages]
  );

  const {
    transformSummaryToConversation,
    transformRealtimeMessage,
  } = useMessageTransformers({
    userId: user?.id,
    pinnedMessageIds: realtime.pinnedMessageIds,
    typingUsers: realtime.typingUsers,
    readStates,
    messageIds: realtimeMessageIds,
  });

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
  const [isSummaryPanelOpen, setIsSummaryPanelOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Thread micro-hint
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

  // Read receipts
  const [readReceiptsEnabled] = useState(true);
  const lastReadMessageIdRef = useRef<string | null>(null);

  // Refs
  const messageListRef = useRef<MessageListViewRef>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  // ========================================
  // EXTRACTED HOOKS
  // ========================================
  const {
    pendingAttachments,
    setPendingAttachments,
    fileInputRef,
    handleAttach,
    handleFileSelect,
    handleFileDrop,
    handleRemoveAttachment,
  } = useFileUpload({ conversationId: selectedConversationId });

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

  // ========================================
  // FETCH CONVERSATIONS
  // ========================================
  const [isRetrying, setIsRetrying] = useState(false);
  const retryAbortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;

    // Cancel any in-flight retry sequence
    retryAbortRef.current?.abort();
    const abortController = new AbortController();
    retryAbortRef.current = abortController;

    setIsLoadingConversations(true);
    setConversationError(null);
    setIsRetrying(false);

    const MAX_RETRIES = 3;
    const BASE_DELAY = 2000;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (abortController.signal.aborted) return;

      // Show retrying state for attempts after the first
      if (attempt > 0) {
        setIsRetrying(true);
        setConversationError(`Retrying... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
        const delay = BASE_DELAY * Math.pow(2, attempt - 1); // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        if (abortController.signal.aborted) return;
      }

      try {
        const res = await apiService.get<{ conversations: ConversationListItem[] }>('/conversations?limit=50&offset=0');
        const list = (res.data?.conversations || []) as ConversationListItem[];

        list.sort((a, b) => {
          const ta = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
          const tb = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
          return tb - ta;
        });

        setConversationSummaries(list);
        setConversationError(null);
        setIsRetrying(false);
        setIsLoadingConversations(false);

        if (!selectedConversationId && list.length > 0) {
          setSelectedConversationId(list[0].id);
        }
        return; // Success — exit retry loop
      } catch (err: unknown) {
        console.error('Error loading conversations:', err);
        const message = err instanceof Error ? err.message : 'Failed to load conversations';

        // Only retry on 5xx or network errors, not 4xx
        const isRetryable = /HTTP 5\d{2}|network|fetch|timeout|unexpected/i.test(message);
        if (!isRetryable || attempt === MAX_RETRIES) {
          setConversationError(message);
          setIsRetrying(false);
          break;
        }
      }
    }

    setIsLoadingConversations(false);
  }, [user, selectedConversationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ========================================
  // DERIVED DATA
  // ========================================
  const conversations: Conversation[] = useMemo(() =>
    conversationSummaries.map(transformSummaryToConversation),
    [conversationSummaries, transformSummaryToConversation]
  );

  const selectedConversation = useMemo(() => {
    const summary = conversationSummaries.find(c => c.id === selectedConversationId);
    return summary ? transformSummaryToConversation(summary) : null;
  }, [conversationSummaries, selectedConversationId, transformSummaryToConversation]);

  const messageById = useMemo(
    () => new Map(messages.map(m => [m.id, m])),
    [messages]
  );

  const pinnedMessages = useMemo(() =>
    messages.filter(m => realtime.pinnedMessageIds.includes(m.id)),
    [messages, realtime.pinnedMessageIds]
  );

  const filteredConversations = useMemo(() => {
    let result = [...conversations];

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

  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const onlineCount = conversations.filter(c => c.participant?.isOnline).length;

  // ========================================
  // EFFECTS
  // ========================================

  // Auto-scroll to bottom
  useEffect(() => {
    messageListRef.current?.scrollToEnd();
  }, [messages]);

  // Read receipts observer
  useEffect(() => {
    if (!selectedConversationId || !messages.length || !readReceiptsEnabled) return;
    const container = messageListRef.current?.container;
    if (!container) return;
    const observedMessages = new Map<Element, string>();

    const observer = new IntersectionObserver(
      (entries) => {
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

        if (mostRecentVisibleId && mostRecentVisibleId !== lastReadMessageIdRef.current) {
          const currentIndex = messages.findIndex(m => m.id === mostRecentVisibleId);
          const lastReadIndex = lastReadMessageIdRef.current
            ? messages.findIndex(m => m.id === lastReadMessageIdRef.current)
            : -1;

          if (currentIndex > lastReadIndex) {
            lastReadMessageIdRef.current = mostRecentVisibleId;
            realtime.markAsRead(mostRecentVisibleId);

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
        threshold: 0.5,
      }
    );

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

  // Fetch read states when conversation changes
  useEffect(() => {
    if (!selectedConversationId) {
      setReadStates([]);
      return;
    }
    let cancelled = false;
    messagingService.getReadStates(selectedConversationId).then(states => {
      if (!cancelled) setReadStates(states);
    });
    return () => { cancelled = true; };
  }, [selectedConversationId]);

  // Keyboard shortcut for search (Ctrl+F / Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedConversationId) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowMessageSearch(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConversationId]);

  // ========================================
  // HANDLERS
  // ========================================

  const handleJumpToMessage = useCallback((messageId: string) => {
    const container = messageListRef.current?.container;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`
    );
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    el.classList.add('animate-pulse');
    setTimeout(() => el.classList.remove('animate-pulse'), 2000);
    setTimeout(() => {
      setHighlightedMessageId(prev => (prev === messageId ? null : prev));
    }, 2000);
  }, []);

  // Deep-link highlight from URL
  useEffect(() => {
    const highlightParam = searchParams.get('highlight');
    if (!highlightParam || messages.length === 0) return;

    const timer = setTimeout(() => {
      handleJumpToMessage(highlightParam);
      searchParams.delete('highlight');
      setSearchParams(searchParams, { replace: true });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams, messages.length, handleJumpToMessage]);

  const handleSearchResultClick = useCallback((result: { id: string; conversationId: string }) => {
    if (result.conversationId !== selectedConversationId) {
      setSelectedConversationId(result.conversationId);
      setShowMobileChat(true);
      setTimeout(() => {
        handleJumpToMessage(result.id);
      }, 500);
    } else {
      handleJumpToMessage(result.id);
    }
    setShowMessageSearch(false);
  }, [selectedConversationId, handleJumpToMessage]);

  const handleOpenThread = useCallback(async (messageId: string) => {
    if (!selectedConversationId) return;

    setActiveThreadRootId(messageId);
    setIsThreadPanelOpen(true);
    setIsLoadingThread(true);

    try {
      const res = await apiService.get<{ messages: Array<{ id: string; text: string; createdAt: string; userId: string; userName?: string }> }>(
        `/conversations/${selectedConversationId}/threads/${messageId}/messages`
      );

      const transformedMessages = (res.data?.messages || []).map((m) => ({
        id: m.id,
        content: m.text,
        timestamp: new Date(m.createdAt),
        author: {
          id: m.userId,
          name: m.userName || 'Unknown',
          initials: (m.userName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        },
        status: 'delivered' as const,
        isCurrentUser: m.userId === user?.id,
      }));
      setThreadMessages(transformedMessages);
    } catch (error: unknown) {
      console.error('Failed to load thread messages:', error);
    } finally {
      setIsLoadingThread(false);
    }
  }, [selectedConversationId, user?.id]);

  const handleCloseThread = useCallback(() => {
    setIsThreadPanelOpen(false);
    setActiveThreadRootId(null);
    setThreadMessages([]);
  }, []);

  const handleThreadReply = useCallback(async (text: string) => {
    if (!selectedConversationId || !activeThreadRootId) return;

    realtime.sendMessage(text, {
      replyToMessageId: activeThreadRootId,
    });

    const newMsg: Message = {
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
    setThreadMessages(prev => [...prev, newMsg]);
  }, [selectedConversationId, activeThreadRootId, realtime, user]);

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setShowMobileChat(true);
    reportConversation(conversation.id);
  };

  const handleMuteConversation = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || selectedConversationId;
    if (!targetId) return;
    const summary = conversationSummaries.find(c => c.id === targetId);
    const currentlyMuted = summary?.isMuted;

    try {
      if (currentlyMuted) {
        await messagingService.unmuteConversation(targetId);
        toast.success('Notifications unmuted');
      } else {
        await messagingService.muteConversation(targetId);
        toast.success('Notifications muted');
      }
      // Update local state
      setConversationSummaries(prev =>
        prev.map(c => c.id === targetId ? { ...c, isMuted: !currentlyMuted } : c)
      );
    } catch {
      toast.error('Failed to update mute status');
    }
  }, [selectedConversationId, conversationSummaries]);

  const handleArchiveConversation = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || selectedConversationId;
    if (!targetId) return;
    const summary = conversationSummaries.find(c => c.id === targetId);
    const currentlyArchived = summary?.isArchived;

    try {
      await messagingService.archiveConversation(targetId, !currentlyArchived);
      toast.success(currentlyArchived ? 'Conversation unarchived' : 'Conversation archived');
      setConversationSummaries(prev =>
        prev.map(c => c.id === targetId ? { ...c, isArchived: !currentlyArchived } : c)
      );
    } catch {
      toast.error('Failed to update archive status');
    }
  }, [selectedConversationId, conversationSummaries]);

  const handlePinConversation = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || selectedConversationId;
    if (!targetId) return;
    const summary = conversationSummaries.find(c => c.id === targetId);
    const currentlyPinned = summary?.isPinned;

    // Toggle pin in local state (no backend pin API for conversations — local-only)
    setConversationSummaries(prev =>
      prev.map(c => c.id === targetId ? { ...c, isPinned: !currentlyPinned } : c)
    );
    toast.success(currentlyPinned ? 'Conversation unpinned' : 'Conversation pinned');
  }, [selectedConversationId, conversationSummaries]);

  const handleMarkAsRead = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || selectedConversationId;
    if (!targetId) return;

    setConversationSummaries(prev =>
      prev.map(c => c.id === targetId ? { ...c, unreadCount: 0 } : c)
    );

    // If there are messages, mark the last one as read
    if (targetId === selectedConversationId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      realtime.markAsRead(lastMsg.id);
    }
  }, [selectedConversationId, messages, realtime]);

  const handleLeaveConversation = useCallback(async () => {
    if (!selectedConversationId) return;
    const ok = await messagingService.leaveConversation(selectedConversationId);
    if (ok) {
      toast.success('Left conversation');
      setConversationSummaries(prev => prev.filter(c => c.id !== selectedConversationId));
      setSelectedConversationId(null);
      setShowMobileChat(false);
    } else {
      toast.error('Failed to leave conversation');
    }
  }, [selectedConversationId]);

  const handleSendVoice = useCallback(async (file: File) => {
    if (!selectedConversationId) return;
    try {
      // Get audio duration from file
      let duration = 0;
      try {
        const audioCtx = new AudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        duration = audioBuffer.duration;
        audioCtx.close();
      } catch {
        // Duration extraction failed — send 0
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('duration', String(duration));
      await apiService.post(`/conversations/${selectedConversationId}/voice-message`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // The backend creates the message and broadcasts via WebSocket — no need to send a text placeholder
    } catch {
      toast.error('Failed to send voice message');
    }
  }, [selectedConversationId]);

  return {
    // Auth
    user,
    logout,

    // Conversations
    conversations,
    filteredConversations,
    selectedConversation,
    selectedConversationId,
    isLoadingConversations,
    conversationError,
    setConversationError,
    isRetrying,
    loadConversations,
    handleConversationClick,
    unreadCount,
    onlineCount,

    // Messages
    messages,
    messageById,
    pinnedMessages,
    highlightedMessageId,

    // Real-time
    realtime,

    // UI state
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
    showMobileChat,
    setShowMobileChat,
    showPinnedMessages,
    setShowPinnedMessages,
    showMessageSearch,
    setShowMessageSearch,
    isSummaryPanelOpen,
    setIsSummaryPanelOpen,
    isInfoPanelOpen,
    setIsInfoPanelOpen,
    isOptionsMenuOpen,
    setIsOptionsMenuOpen,

    // Thread
    activeThreadRootId,
    isThreadPanelOpen,
    threadHighlightId,
    threadMessages,
    isLoadingThread,
    handleOpenThread,
    handleCloseThread,
    handleThreadReply,
    showThreadHint,
    dismissThreadHint,

    // Message handlers
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
    handleJumpToMessage,
    handleSearchResultClick,
    handleMuteConversation,
    handleArchiveConversation,
    handlePinConversation,
    handleMarkAsRead,
    handleLeaveConversation,
    handleSendVoice,

    // File upload
    pendingAttachments,
    fileInputRef,
    handleAttach,
    handleFileSelect,
    handleFileDrop,
    handleRemoveAttachment,

    // New conversation
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
    resetNewConversationDialog,

    // Refs
    messageListRef,
    composerRef,
  };
}
