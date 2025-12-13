/**
 * useHighlightElement Hook
 *
 * Reads `highlight=<id>` from URL search params and applies a visual pulse
 * to the target element, then scrolls it into view.
 *
 * Usage:
 * - Add `data-message-id={message.id}` to the target element
 * - Call `useHighlightElement()` in the component
 * - Navigation with `?highlight=<id>` will auto-scroll and pulse the element
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const HIGHLIGHT_DURATION_MS = 3000;

export function useHighlightElement() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (!highlightId) return;

    // Small delay to allow DOM to render
    const timer = setTimeout(() => {
      const element = document.querySelector(`[data-message-id="${highlightId}"]`);
      if (!element) return;

      // Scroll into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight class
      element.classList.add('notification-highlight');

      // Remove highlight after duration
      const removeTimer = setTimeout(() => {
        element.classList.remove('notification-highlight');

        // Clean up URL param
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('highlight');
        setSearchParams(newParams, { replace: true });
      }, HIGHLIGHT_DURATION_MS);

      return () => clearTimeout(removeTimer);
    }, 100);

    return () => clearTimeout(timer);
  }, [searchParams, setSearchParams]);
}

export default useHighlightElement;
