/**
 * Socket Slice - Real-time connection and presence state
 *
 * Migrated from SocketContext (Sprint 65).
 * Reactive socket state now lives here. The SocketContext remains as a
 * thin wrapper for imperative socket methods (sendMessage, joinConversation, etc.).
 */

import { StateCreator } from 'zustand';
import type { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export interface SocketState {
  isConnected: boolean;
  connectionError: string | null;
  typingUsers: Record<string, string[]>; // conversationId -> userIds[]
  onlineUsers: Record<string, { userId: string; isOnline: boolean; lastSeen?: string }>;
  activeConversations: string[];
}

export interface SocketActions {
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  addActiveConversation: (conversationId: string) => void;
  removeActiveConversation: (conversationId: string) => void;
}

export interface SocketSlice {
  socket: SocketState & SocketActions;
}

// ============================================================================
// Slice Creator
// ============================================================================

export const createSocketSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  SocketSlice
> = (set) => ({
  socket: {
    // State
    isConnected: false,
    connectionError: null,
    typingUsers: {},
    onlineUsers: {},
    activeConversations: [],

    // Actions
    setConnected: (connected) => set((state) => {
      state.socket.isConnected = connected;
      if (connected) state.socket.connectionError = null;
    }),
    setConnectionError: (error) => set((state) => {
      state.socket.connectionError = error;
    }),
    addTypingUser: (conversationId, userId) => set((state) => {
      if (!state.socket.typingUsers[conversationId]) {
        state.socket.typingUsers[conversationId] = [];
      }
      if (!state.socket.typingUsers[conversationId].includes(userId)) {
        state.socket.typingUsers[conversationId].push(userId);
      }
    }),
    removeTypingUser: (conversationId, userId) => set((state) => {
      const users = state.socket.typingUsers[conversationId];
      if (users) {
        state.socket.typingUsers[conversationId] = users.filter(id => id !== userId);
      }
    }),
    setUserOnline: (userId) => set((state) => {
      state.socket.onlineUsers[userId] = { userId, isOnline: true };
    }),
    setUserOffline: (userId) => set((state) => {
      if (state.socket.onlineUsers[userId]) {
        state.socket.onlineUsers[userId].isOnline = false;
      }
    }),
    addActiveConversation: (conversationId) => set((state) => {
      if (!state.socket.activeConversations.includes(conversationId)) {
        state.socket.activeConversations.push(conversationId);
      }
    }),
    removeActiveConversation: (conversationId) => set((state) => {
      state.socket.activeConversations = state.socket.activeConversations.filter(id => id !== conversationId);
    }),
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { getUseStore as _getUseStore } from '../storeRef';
function getUseStore() {
  return _getUseStore() as typeof import('../store').useStore;
}

export const useSocketStore = () => {
  return getUseStore()((state) => state.socket);
};
