import { useEffect, useState } from 'react';

interface LiveRegionProps {
  /** Message to announce to screen readers */
  message: string;
  /** Priority level for the announcement */
  priority?: 'polite' | 'assertive';
}

export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
  // Toggle key forces re-announcement of repeated messages
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (message) {
      setKey((k) => k + 1);
    }
  }, [message]);

  return (
    <div
      key={key}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
