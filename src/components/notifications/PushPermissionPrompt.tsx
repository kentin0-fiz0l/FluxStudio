/**
 * PushPermissionPrompt - Non-intrusive push notification permission banner
 *
 * Shows after the user has been active for 30 seconds, only when:
 * - Push notifications are supported in the browser
 * - Permission state is 'default' (not yet asked)
 * - The user hasn't dismissed the prompt before (tracked in localStorage)
 *
 * Uses the existing pushNotifications utility for permission requests
 * and subscription management.
 *
 * Sprint 89 - Push Notification UI
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
} from '@/utils/pushNotifications';
import { useAuth } from '@/store/slices/authSlice';
import { useStore } from '@/store/store';
import { toast } from '@/lib/toast';

const DISMISS_KEY = 'flux-push-prompt-dismissed';
const SHOW_DELAY_MS = 30_000;

export function PushPermissionPrompt() {
  const { user } = useAuth();
  const setPushPermission = useStore((s) => s.notifications.setPushPermission);
  const setPushEnabled = useStore((s) => s.notifications.setPushEnabled);

  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Show the prompt after 30 seconds of activity, if conditions are met
  useEffect(() => {
    if (!user) return;
    if (!isPushSupported()) return;
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      const state = await getPermissionState();
      if (cancelled) return;

      // Only show when permission hasn't been granted or denied yet
      if (state.permission === 'default') {
        setVisible(true);
      }
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user]);

  const handleEnable = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setLoading(true);
    try {
      await subscribeToPush(token);
      const state = await getPermissionState();
      setPushPermission(state.permission);
      setPushEnabled(true);
      toast.success('Push notifications enabled');
      setVisible(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable push notifications';
      if (message === 'Notification permission denied') {
        const state = await getPermissionState();
        setPushPermission(state.permission);
        toast.error('Browser notification permission was denied. You can change this in browser settings.');
      } else {
        toast.error(message);
      }
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }, [setPushPermission, setPushEnabled]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <Bell className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Stay in the loop
          </h3>
          <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">
            Get notified about new messages, project updates, and team activity.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleEnable}
              disabled={loading}
            >
              {loading ? 'Enabling...' : 'Enable notifications'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              disabled={loading}
            >
              Not now
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
          aria-label="Dismiss push notification prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default PushPermissionPrompt;
