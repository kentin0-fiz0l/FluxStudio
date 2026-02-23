/**
 * UpdateBanner - Shows when a new service worker version is available.
 */

import React, { useState, useEffect } from 'react';
import { setOnUpdateAvailable, applyUpdate } from '@/services/serviceWorker';
import { RefreshCw, X } from 'lucide-react';

export const UpdateBanner = React.memo(function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setOnUpdateAvailable(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm text-white shadow-xl"
    >
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      <span>A new version is available.</span>
      <button
        onClick={applyUpdate}
        className="font-medium underline underline-offset-2 hover:text-blue-200"
      >
        Update now
      </button>
      <button onClick={() => setShow(false)} className="ml-1 hover:text-blue-200" aria-label="Dismiss update notification">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
});
