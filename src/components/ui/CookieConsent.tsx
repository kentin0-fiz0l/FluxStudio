/**
 * CookieConsent - GDPR cookie consent banner
 *
 * Shows a consent banner on first visit. Stores the user's choice
 * in localStorage so the banner is not shown again after a decision.
 *
 * - "Accept" stores consent and enables analytics cookies.
 * - "Decline" stores the refusal; no analytics cookies are set.
 */

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONSENT_KEY = 'fluxstudio.cookie_consent';

export type ConsentValue = 'accepted' | 'declined';

/**
 * Read the stored consent value (if any).
 */
export function getConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === 'accepted' || value === 'declined') return value;
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns true when the user has explicitly accepted cookies.
 */
export function hasAcceptedCookies(): boolean {
  return getConsent() === 'accepted';
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show banner when no decision has been recorded
    if (getConsent() === null) {
      setVisible(true);
    }
  }, []);

  const handleAccept = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, 'accepted');
    } catch {
      // localStorage unavailable -- degrade gracefully
    }
    setVisible(false);
  }, []);

  const handleDecline = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined');
    } catch {
      // localStorage unavailable -- degrade gracefully
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className={cn(
        'fixed bottom-0 inset-x-0 z-[9999] p-4',
        'flex items-center justify-center',
        'animate-in slide-in-from-bottom-4 duration-300',
      )}
    >
      <div
        className={cn(
          'w-full max-w-3xl mx-auto rounded-xl shadow-lg',
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-700',
          'p-4 sm:p-5',
          'flex flex-col sm:flex-row items-start sm:items-center gap-4',
        )}
      >
        {/* Text */}
        <p className="flex-1 text-sm text-gray-600 dark:text-gray-300">
          We use cookies and similar technologies to improve your experience, analyze
          site traffic, and personalize content. By clicking &ldquo;Accept&rdquo;, you
          consent to our use of cookies. See our{' '}
          <a
            href="/privacy"
            className="underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Privacy Policy
          </a>{' '}
          for more details.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'border border-gray-300 dark:border-gray-600',
              'text-gray-700 dark:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'transition-colors',
            )}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'bg-indigo-600 text-white',
              'hover:bg-indigo-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
              'transition-colors',
            )}
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            aria-label="Dismiss cookie banner"
            className={cn(
              'p-1.5 rounded-lg',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'transition-colors',
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
