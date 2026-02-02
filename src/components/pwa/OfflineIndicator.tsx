/**
 * Offline Indicator Component - FluxStudio
 *
 * Displays network status and PWA-related notifications.
 * Shows when user is offline and provides sync status.
 *
 * Features:
 * - Offline/Online status banner
 * - Pending sync indicator
 * - Install prompt
 * - Update available notification
 *
 * WCAG 2.1 Level A Compliant
 */

import { useState, useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';

interface OfflineIndicatorProps {
  position?: 'top' | 'bottom';
  showInstallPrompt?: boolean;
  showUpdatePrompt?: boolean;
}

export function OfflineIndicator({
  position = 'bottom',
  showInstallPrompt = true,
  showUpdatePrompt = true
}: OfflineIndicatorProps) {
  const {
    isOnline,
    canInstall,
    isUpdateAvailable,
    pendingSyncCount,
    installApp,
    updateApp,
    syncOfflineData
  } = usePWA();

  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [dismissedInstall, setDismissedInstall] = useState(false);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  // Show offline banner with delay to avoid flashing
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isOnline) {
      timeout = setTimeout(() => {
        setShowOfflineBanner(true);
      }, 500);
    } else {
      setShowOfflineBanner(false);
    }

    return () => clearTimeout(timeout);
  }, [isOnline]);

  // Show install banner
  useEffect(() => {
    if (canInstall && showInstallPrompt && !dismissedInstall) {
      // Delay showing to not interrupt user
      const timeout = setTimeout(() => {
        setShowInstallBanner(true);
      }, 30000); // Show after 30 seconds

      return () => clearTimeout(timeout);
    }
  }, [canInstall, showInstallPrompt, dismissedInstall]);

  // Show update banner
  useEffect(() => {
    if (isUpdateAvailable && showUpdatePrompt && !dismissedUpdate) {
      setShowUpdateBanner(true);
    }
  }, [isUpdateAvailable, showUpdatePrompt, dismissedUpdate]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowInstallBanner(false);
    }
  };

  const handleDismissInstall = () => {
    setDismissedInstall(true);
    setShowInstallBanner(false);
  };

  const handleUpdate = () => {
    updateApp();
    setShowUpdateBanner(false);
  };

  const handleDismissUpdate = () => {
    setDismissedUpdate(true);
    setShowUpdateBanner(false);
  };

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  return (
    <>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div
          className={`fixed ${positionClasses} z-50 bg-amber-500 text-white px-4 py-3 shadow-lg`}
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
                />
              </svg>
              <div>
                <span className="font-medium">You're offline</span>
                <span className="hidden sm:inline ml-2 opacity-90">
                  Some features may be limited
                </span>
              </div>
            </div>
            {pendingSyncCount > 0 && (
              <div className="text-sm opacity-90">
                {pendingSyncCount} change{pendingSyncCount !== 1 ? 's' : ''} pending
              </div>
            )}
          </div>
        </div>
      )}

      {/* Back Online Banner */}
      {!isOnline && showOfflineBanner && pendingSyncCount > 0 && (
        <OnlineRestoredBanner
          onSync={syncOfflineData}
          pendingCount={pendingSyncCount}
          position={position}
        />
      )}

      {/* Install Banner */}
      {showInstallBanner && (
        <div
          className={`fixed ${position === 'top' ? 'top-14' : 'bottom-14'} left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50`}
        >
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Install FluxStudio
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Get quick access and work offline
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismissInstall}
                    className="px-3 py-1.5 text-neutral-600 dark:text-neutral-400 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismissInstall}
                className="flex-shrink-0 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {showUpdateBanner && (
        <div
          className={`fixed ${position === 'top' ? 'top-14' : 'bottom-14'} left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50`}
        >
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Update available
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  A new version of FluxStudio is ready
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleUpdate}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Update now
                  </button>
                  <button
                    onClick={handleDismissUpdate}
                    className="px-3 py-1.5 text-neutral-600 dark:text-neutral-400 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismissUpdate}
                className="flex-shrink-0 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Component shown when coming back online
function OnlineRestoredBanner({
  onSync,
  pendingCount,
  position
}: {
  onSync: () => void;
  pendingCount: number;
  position: 'top' | 'bottom';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = usePWA();

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOnline, pendingCount]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed ${position === 'top' ? 'top-14' : 'bottom-14'} left-0 right-0 z-50 bg-green-500 text-white px-4 py-3 shadow-lg`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            Back online! {pendingCount} change{pendingCount !== 1 ? 's' : ''} to sync.
          </span>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isSyncing ? 'Syncing...' : 'Sync now'}
        </button>
      </div>
    </div>
  );
}

/**
 * Network status badge for compact display
 */
export function NetworkStatusBadge() {
  const { isOnline, pendingSyncCount } = usePWA();

  if (isOnline && pendingSyncCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {!isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-amber-600 dark:text-amber-400">Offline</span>
        </>
      ) : pendingSyncCount > 0 ? (
        <>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-blue-600 dark:text-blue-400">
            {pendingSyncCount} pending
          </span>
        </>
      ) : null}
    </div>
  );
}

export default OfflineIndicator;
