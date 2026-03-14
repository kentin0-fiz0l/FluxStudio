/**
 * SupportWidget - Crisp live chat integration
 * Only renders for authenticated users. Positions bottom-left.
 */

import { useEffect } from 'react';
import { useAuth } from '@/store/slices/authSlice';

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

const CRISP_WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID || '';

export function SupportWidget() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !CRISP_WEBSITE_ID) return;

    // Don't re-initialize if already loaded
    if (window.$crisp) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    // Pass user info to Crisp once loaded
    if (user?.email) {
      window.$crisp.push(['set', 'user:email', [user.email]]);
    }
    if (user?.name) {
      window.$crisp.push(['set', 'user:nickname', [user.name]]);
    }

    return () => {
      // Cleanup script on unmount
      const existing = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (existing) existing.remove();
    };
  }, [isAuthenticated, user?.email, user?.name]);

  return null; // Crisp renders its own UI
}
