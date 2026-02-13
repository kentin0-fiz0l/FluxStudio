/**
 * useNewConversation Hook
 *
 * Extracts new conversation creation logic from MessagesNew.tsx:
 * - User search and selection
 * - Group name management
 * - Create conversation API call
 *
 * Phase 4.2 Technical Debt Resolution
 */

import { useState, useEffect, useCallback } from 'react';
import type { MessageUser } from '@/components/messaging/types';
import { getInitials } from '@/components/messaging';

interface UseNewConversationOptions {
  currentUserId?: string;
  onConversationCreated?: (conversationId: string) => void;
}

interface UseNewConversationReturn {
  // Dialog state
  showNewConversation: boolean;
  setShowNewConversation: React.Dispatch<React.SetStateAction<boolean>>;

  // User search state
  availableUsers: MessageUser[];
  userSearchTerm: string;
  setUserSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  loadingUsers: boolean;

  // Selection state
  selectedUsers: MessageUser[];
  newConversationName: string;
  setNewConversationName: React.Dispatch<React.SetStateAction<string>>;

  // Handlers
  toggleUserSelection: (user: MessageUser) => void;
  handleCreateConversation: () => Promise<void>;
  resetDialog: () => void;
}

export function useNewConversation({
  currentUserId,
  onConversationCreated,
}: UseNewConversationOptions): UseNewConversationReturn {
  // Dialog visibility
  const [showNewConversation, setShowNewConversation] = useState(false);

  // User search state
  const [availableUsers, setAvailableUsers] = useState<MessageUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<MessageUser[]>([]);
  const [newConversationName, setNewConversationName] = useState('');

  // Fetch users from API
  const fetchUsers = useCallback(async (search?: string) => {
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
        const users = (data.users || data || []).map((u: { id: string; name?: string; email?: string; avatar?: string; isOnline?: boolean }) => ({
          id: u.id,
          name: u.name || u.email?.split('@')[0] || 'Unknown',
          avatar: u.avatar,
          initials: getInitials(u.name || u.email?.split('@')[0] || 'U'),
          isOnline: u.isOnline || false,
        }));
        // Filter out current user
        setAvailableUsers(users.filter((u: MessageUser) => u.id !== currentUserId));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUserId]);

  // Load users when dialog opens
  useEffect(() => {
    if (showNewConversation) {
      fetchUsers();
    }
  }, [showNewConversation, fetchUsers]);

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
  }, [userSearchTerm, showNewConversation, fetchUsers]);

  // Toggle user selection
  const toggleUserSelection = useCallback((user: MessageUser) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      }
      return [...prev, user];
    });
  }, []);

  // Create conversation via REST API
  const handleCreateConversation = useCallback(async () => {
    if (selectedUsers.length === 0) return;

    try {
      const isGroup = selectedUsers.length > 1;
      const name = isGroup
        ? newConversationName || `Group with ${selectedUsers.map(u => u.name).join(', ')}`
        : null;

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

      // Reset dialog state
      setShowNewConversation(false);
      setSelectedUsers([]);
      setNewConversationName('');
      setUserSearchTerm('');

      // Callback with new conversation ID
      if (conversationId && onConversationCreated) {
        onConversationCreated(conversationId);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [selectedUsers, newConversationName, onConversationCreated]);

  // Reset dialog to initial state
  const resetDialog = useCallback(() => {
    setShowNewConversation(false);
    setSelectedUsers([]);
    setNewConversationName('');
    setUserSearchTerm('');
  }, []);

  return {
    // Dialog state
    showNewConversation,
    setShowNewConversation,

    // User search state
    availableUsers,
    userSearchTerm,
    setUserSearchTerm,
    loadingUsers,

    // Selection state
    selectedUsers,
    newConversationName,
    setNewConversationName,

    // Handlers
    toggleUserSelection,
    handleCreateConversation,
    resetDialog,
  };
}

export default useNewConversation;
