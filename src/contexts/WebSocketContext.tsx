/**
 * WebSocket Context - Flux Design Language
 *
 * Provides real-time WebSocket connection for messaging and collaboration.
 * Handles authentication, reconnection, and event management.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

// WebSocket connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// WebSocket context interface
interface WebSocketContextType {
  socket: Socket | null;
  status: ConnectionStatus;
  error: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  autoConnect?: boolean;
}

export function WebSocketProvider({
  children,
  url = process.env.REACT_APP_MESSAGING_URL || 'http://localhost:3001/messaging',
  autoConnect = true
}: WebSocketProviderProps) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!user || !token) {
      console.log('WebSocket: Cannot connect - no user or token');
      return;
    }

    if (socket?.connected) {
      console.log('WebSocket: Already connected');
      return;
    }

    console.log('WebSocket: Connecting to', url);
    setStatus('connecting');
    setError(null);

    const newSocket = io(url, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 10000
    });

    // Connection successful
    newSocket.on('connect', () => {
      console.log('WebSocket: Connected successfully', newSocket.id);
      setStatus('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;
    });

    // Connection error
    newSocket.on('connect_error', (err) => {
      console.error('WebSocket: Connection error', err.message);
      setStatus('error');
      setError(err.message);

      // Attempt reconnection with exponential backoff
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
        console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          newSocket.connect();
        }, delay);
      } else {
        console.error('WebSocket: Max reconnection attempts reached');
        setError('Failed to connect after multiple attempts. Please refresh the page.');
      }
    });

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket: Disconnected', reason);
      setStatus('disconnected');

      // Auto-reconnect unless it was a manual disconnect
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        newSocket.connect();
      }
    });

    // Authentication error
    newSocket.on('auth:error', (err) => {
      console.error('WebSocket: Authentication error', err);
      setStatus('error');
      setError('Authentication failed. Please log in again.');
      newSocket.disconnect();
    });

    // Generic error handler
    newSocket.on('error', (err) => {
      console.error('WebSocket: Error', err);
      setError(err.message || 'An unknown error occurred');
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, [user, token, url, socket]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    console.log('WebSocket: Disconnecting');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
    }
    setStatus('disconnected');
    setError(null);
  }, [socket]);

  // Emit event to server
  const emit = useCallback((event: string, data: any) => {
    if (!socket?.connected) {
      console.warn('WebSocket: Cannot emit, not connected');
      return;
    }
    socket.emit(event, data);
  }, [socket]);

  // Subscribe to event
  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (!socket) {
      console.warn('WebSocket: Cannot subscribe, socket not initialized');
      return;
    }
    socket.on(event, handler);
  }, [socket]);

  // Unsubscribe from event
  const off = useCallback((event: string, handler?: (data: any) => void) => {
    if (!socket) {
      return;
    }
    if (handler) {
      socket.off(event, handler);
    } else {
      socket.off(event);
    }
  }, [socket]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (autoConnect && user && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user, token]); // Only reconnect when user/token changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const value: WebSocketContextType = {
    socket,
    status,
    error,
    isConnected: status === 'connected',
    connect,
    disconnect,
    emit,
    on,
    off
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook to use WebSocket context
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;
