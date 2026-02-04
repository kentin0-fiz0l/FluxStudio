/**
 * usePrintWebSocket Hook
 * Phase 3A: WebSocket Real-Time Updates
 *
 * Manages WebSocket connection to FluxStudio's /printing namespace for real-time
 * printer status, temperature, and progress updates.
 *
 * Features:
 * - Automatic connection/reconnection with exponential backoff
 * - Connection status tracking
 * - Real-time event handling (status, temperature, progress, job events)
 * - Auto-cleanup on unmount
 * - Error handling and recovery
 * - Type-safe event handlers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  PrinterStatus,
  TemperatureReading,
  TemperatureData,
} from '../types/printing';

/**
 * WebSocket connection status
 */
export interface WebSocketStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Real-time printer data from WebSocket
 */
export interface PrinterWebSocketData {
  status: PrinterStatus | null;
  temperature: TemperatureReading | null;
  progress: number | null;
  lastUpdate: Date | null;
}

/**
 * Job event data
 */
export interface JobEvent {
  filename: string;
  printTime?: number;
  reason?: string;
  timestamp: number;
}

/**
 * Connection event data
 */
export interface ConnectionEvent {
  connected: boolean;
  error?: string;
  reason?: string;
  reconnectAttempts?: number;
  timestamp: number;
}

/**
 * Hook options
 */
export interface UsePrintWebSocketOptions {
  /**
   * Enable WebSocket connection
   * @default true
   */
  enabled?: boolean;

  /**
   * Auto-reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Callback for job completion
   */
  onJobComplete?: (event: JobEvent) => void;

  /**
   * Callback for job failure
   */
  onJobFailed?: (event: JobEvent) => void;

  /**
   * Callback for connection status changes
   */
  onConnectionChange?: (event: ConnectionEvent) => void;
}

/**
 * Hook return type
 */
export interface UsePrintWebSocketReturn {
  /** WebSocket connection status */
  connectionStatus: WebSocketStatus;

  /** Real-time printer data */
  data: PrinterWebSocketData;

  /** Manually request status update */
  requestStatus: () => void;

  /** Manually connect */
  connect: () => void;

  /** Manually disconnect */
  disconnect: () => void;
}

/**
 * WebSocket server URL
 */
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3001';

/**
 * Custom hook for managing printer WebSocket connection
 */
export function usePrintWebSocket(
  options: UsePrintWebSocketOptions = {}
): UsePrintWebSocketReturn {
  const {
    enabled = true,
    autoReconnect = true,
    onJobComplete,
    onJobFailed,
    onConnectionChange,
  } = options;

  // State
  const [connectionStatus, setConnectionStatus] = useState<WebSocketStatus>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const [data, setData] = useState<PrinterWebSocketData>({
    status: null,
    temperature: null,
    progress: null,
    lastUpdate: null,
  });

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      // WebSocket already connected, skip
      return;
    }

    if (!enabled) {
      // WebSocket disabled, skip
      return;
    }

    // SECURITY: Get JWT token from localStorage
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      console.error('❌ No authentication token available for WebSocket');
      setConnectionStatus({
        connected: false,
        connecting: false,
        error: 'Authentication required',
        reconnectAttempts: 0,
      });
      return;
    }

    // Connecting to printer WebSocket

    setConnectionStatus((prev) => ({
      ...prev,
      connecting: true,
      error: null,
    }));

    // Create Socket.IO connection with JWT authentication
    // SECURITY: Token is sent in socket.handshake.auth.token
    // Backend verifies this token before allowing connection
    const socket = io(`${WEBSOCKET_URL}/printing`, {
      auth: {
        token: authToken,
      },
      reconnection: autoReconnect,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      // Connected to printer WebSocket

      setConnectionStatus({
        connected: true,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
      });

      // Subscribe to printer updates
      socket.emit('printer:subscribe');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Disconnected from printer WebSocket:', reason);

      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: `Disconnected: ${reason}`,
      }));

      if (onConnectionChange) {
        onConnectionChange({
          connected: false,
          reason,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);

      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));
    });

    // Printer event handlers
    socket.on('printer:status', (status: PrinterStatus) => {
      setData((prev) => ({
        ...prev,
        status,
        lastUpdate: new Date(),
      }));
    });

    socket.on('printer:temperature', (temperature: { bed: TemperatureData; tool0: TemperatureData; tool1?: TemperatureData }) => {
      const reading: TemperatureReading = {
        time: Date.now(),
        bed: temperature.bed,
        tool0: temperature.tool0,
        tool1: temperature.tool1,
      };

      setData((prev) => ({
        ...prev,
        temperature: reading,
        lastUpdate: new Date(),
      }));
    });

    socket.on('printer:progress', (progressData: { completion: number; printTime: number; printTimeLeft?: number; state: string }) => {
      setData((prev) => ({
        ...prev,
        progress: progressData.completion,
        lastUpdate: new Date(),
      }));
    });

    socket.on('printer:job_complete', (event: JobEvent) => {
      // Print job completed

      if (onJobComplete) {
        onJobComplete(event);
      }

      // Reset progress
      setData((prev) => ({
        ...prev,
        progress: null,
        lastUpdate: new Date(),
      }));
    });

    socket.on('printer:job_failed', (event: JobEvent) => {
      console.warn('❌ Print job failed:', event.filename, event.reason);

      if (onJobFailed) {
        onJobFailed(event);
      }

      // Reset progress
      setData((prev) => ({
        ...prev,
        progress: null,
        lastUpdate: new Date(),
      }));
    });

    socket.on('printer:connection', (event: ConnectionEvent) => {
      // Printer connection status updated

      if (onConnectionChange) {
        onConnectionChange(event);
      }

      // Update connection status if needed
      if (event.error) {
        setConnectionStatus((prev) => ({
          ...prev,
          error: event.error || null,
        }));
      }
    });

    socket.on('printer:subscribed', () => {
      // Subscribed to printer updates
    });
  }, [enabled, autoReconnect, onJobComplete, onJobFailed, onConnectionChange]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      // Disconnecting from printer WebSocket
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionStatus({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    });
  }, []);

  /**
   * Request immediate status update
   */
  const requestStatus = useCallback(() => {
    if (socketRef.current?.connected) {
      // Requesting printer status
      socketRef.current.emit('printer:request_status');
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      // Use queueMicrotask to avoid calling setState synchronously in effect
      queueMicrotask(() => {
        connect();
      });
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionStatus,
    data,
    requestStatus,
    connect,
    disconnect,
  };
}

export default usePrintWebSocket;
