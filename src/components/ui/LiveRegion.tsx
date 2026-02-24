/* eslint-disable react-refresh/only-export-components */
/**
 * LiveRegion - ARIA live region for screen reader announcements
 *
 * Provides a way to announce dynamic content changes to screen reader users.
 * Essential for WCAG 2.1 AA compliance when content updates dynamically.
 *
 * @example
 * const { announce } = useLiveRegion();
 * announce('Form submitted successfully');
 */

import * as React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';

interface LiveRegionContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

interface LiveRegionProviderProps {
  children: React.ReactNode;
}

export function LiveRegionProvider({ children }: LiveRegionProviderProps) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear existing message first to ensure it announces again if same message
    if (priority === 'assertive') {
      setAssertiveMessage('');
      // Small delay to ensure the clear registers
      setTimeout(() => setAssertiveMessage(message), 50);
      // Clear after announcement
      setTimeout(() => setAssertiveMessage(''), 1000);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
      setTimeout(() => setPoliteMessage(''), 1000);
    }
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      {/* Polite live region - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive live region - for urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

/**
 * Hook to access live region announcements
 */
export function useLiveRegion(): LiveRegionContextValue {
  const context = useContext(LiveRegionContext);
  if (!context) {
    // Return a no-op if used outside provider
    return {
      announce: () => {
        console.warn('useLiveRegion used outside of LiveRegionProvider');
      },
    };
  }
  return context;
}

/**
 * Standalone function to announce to screen readers
 * Creates a temporary live region for one-off announcements
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(liveRegion);

  // Small delay to ensure the element is in the DOM before updating
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);

  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion);
  }, 1000);
}

export default LiveRegionProvider;
