import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
  forceNew?: boolean;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

const DEFAULT_OPTIONS: UseWebSocketOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  forceNew: false,
};

export function useWebSocket(
  namespace: string = '/',
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      // Base URL for the auth service which handles performance monitoring
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://your-production-domain.com'
        : 'http://localhost:3001';

      const fullUrl = namespace.startsWith('/') ? `${baseUrl}${namespace}` : `${baseUrl}/${namespace}`;

      const socket = io(fullUrl, {
        autoConnect: optionsRef.current.autoConnect,
        reconnection: optionsRef.current.reconnection,
        reconnectionDelay: optionsRef.current.reconnectionDelay,
        reconnectionAttempts: optionsRef.current.reconnectionAttempts,
        forceNew: optionsRef.current.forceNew,
        transports: ['websocket', 'polling'],
        timeout: 5000,
      });

      socket.on('connect', () => {
        console.log(`🔌 WebSocket connected to ${fullUrl}`);
        setConnected(true);
        setError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log(`🔌 WebSocket disconnected from ${fullUrl}:`, reason);
        setConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.error(`🔌 WebSocket connection error to ${fullUrl}:`, err.message);
        setError(err.message);
        setConnected(false);
      });

      socket.on('error', (err) => {
        console.error(`🔌 WebSocket error:`, err);
        setError(err.message || 'Unknown WebSocket error');
      });

      socketRef.current = socket;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create WebSocket connection';
      console.error('WebSocket connection error:', errorMessage);
      setError(errorMessage);
    }
  }, [namespace]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  useEffect(() => {
    if (optionsRef.current.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    connected,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}

export default useWebSocket;