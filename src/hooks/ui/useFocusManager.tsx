import { useCallback, useEffect, useRef, useState } from 'react';

interface UseFocusManagerOptions {
  /** Auto-focus the first focusable element on mount */
  autoFocus?: boolean;
  /** Return focus to trigger element on unmount */
  returnFocusOnClose?: boolean;
  /** Trap focus within the container */
  trapFocus?: boolean;
  /** Announce content to screen readers via aria-live */
  announceOnOpen?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusManager(options: UseFocusManagerOptions = {}) {
  const {
    autoFocus = false,
    returnFocusOnClose = false,
    trapFocus = false,
    announceOnOpen,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  // Store the element that had focus before the container mounted
  useEffect(() => {
    triggerRef.current = document.activeElement;

    if (announceOnOpen) {
      setAnnouncement(announceOnOpen);
    }

    if (autoFocus && containerRef.current) {
      const firstFocusable = containerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        containerRef.current.focus();
      }
    }

    return () => {
      if (returnFocusOnClose && triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trap focus within the container
  useEffect(() => {
    if (!trapFocus) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [trapFocus]);

  function FocusLiveRegion() {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </div>
    );
  }

  return { containerRef, announce, FocusLiveRegion };
}
