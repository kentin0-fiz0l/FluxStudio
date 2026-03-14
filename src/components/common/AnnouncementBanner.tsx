/**
 * AnnouncementBanner - Dismissible top banner for announcements
 * Stores dismissed state in localStorage keyed by announcement ID
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

interface Announcement {
  id: string;
  message: string;
  ctaText: string;
  ctaLink: string;
}

const CURRENT_ANNOUNCEMENT: Announcement = {
  id: 'sprint-92-public-beta',
  message: 'FluxStudio is now in public beta!',
  ctaText: "See what's new",
  ctaLink: '/changelog',
};

export function AnnouncementBanner() {
  const storageKey = `announcement-dismissed-${CURRENT_ANNOUNCEMENT.id}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // localStorage may be unavailable
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
        <span>{CURRENT_ANNOUNCEMENT.message}</span>
        <Link
          to={CURRENT_ANNOUNCEMENT.ctaLink}
          className="font-semibold underline underline-offset-2 hover:text-blue-100 transition-colors"
        >
          {CURRENT_ANNOUNCEMENT.ctaText} →
        </Link>
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
