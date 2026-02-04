/**
 * useTypingIndicator Hook
 * Manages typing indicator debouncing for real-time chat
 *
 * Features:
 * - Debounces typing events to avoid spamming the server
 * - Auto-stops typing after configurable timeout
 * - Cleans up on unmount
 */

import { useRef, useCallback, useEffect, useState } from 'react';

interface UseTypingIndicatorOptions {
  /** Callback when typing starts (debounced) */
  onStartTyping: () => void;
  /** Callback when typing stops */
  onStopTyping: () => void;
  /** Minimum time between typing events in ms (default: 1000) */
  debounceMs?: number;
  /** Auto-stop typing after this many ms of no input (default: 5000) */
  timeoutMs?: number;
}

interface UseTypingIndicatorReturn {
  /** Call this when input content changes */
  handleInputChange: (hasContent: boolean) => void;
  /** Whether user is currently marked as typing */
  isTyping: boolean;
  /** Manually stop typing */
  stopTyping: () => void;
}

export function useTypingIndicator({
  onStartTyping,
  onStopTyping,
  debounceMs = 1000,
  timeoutMs = 5000,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const lastTypingSentRef = useRef<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref to track typing state for callbacks that shouldn't trigger re-renders
  const isTypingRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Stop typing if active when unmounting
      if (isTypingRef.current) {
        onStopTyping();
      }
    };
  }, [onStopTyping]);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      onStopTyping();
      isTypingRef.current = false;
      setIsTyping(false);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [onStopTyping]);

  const handleInputChange = useCallback((hasContent: boolean) => {
    if (hasContent) {
      const now = Date.now();

      // Only send typing event if enough time has passed (debounce)
      if (now - lastTypingSentRef.current > debounceMs) {
        onStartTyping();
        lastTypingSentRef.current = now;
        isTypingRef.current = true;
        setIsTyping(true);
      }

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set auto-stop timeout
      timeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          onStopTyping();
          isTypingRef.current = false;
          setIsTyping(false);
        }
      }, timeoutMs);
    } else {
      // Content cleared - stop typing immediately
      stopTyping();
    }
  }, [debounceMs, timeoutMs, onStartTyping, onStopTyping, stopTyping]);

  return {
    handleInputChange,
    isTyping,
    stopTyping,
  };
}

export default useTypingIndicator;
