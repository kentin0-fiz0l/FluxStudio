/**
 * Desktop Prompt Component
 *
 * Non-intrusive banner shown to power users (10+ hours of usage) encouraging
 * them to try the native desktop app. Only renders in the web browser, never
 * inside Tauri. Dismissible with a "Don't show again" localStorage flag.
 */

import { useState, useEffect } from 'react';
import { isTauri } from '../../lib/tauri';
import { detectPlatform, getDesktopDownloadUrl, isDesktopAvailable } from '../../lib/platform';

const STORAGE_KEY = 'fluxstudio_desktop_prompt_dismissed';
const USAGE_KEY = 'fluxstudio_total_usage_minutes';
const USAGE_THRESHOLD_MINUTES = 600; // 10 hours

function getStoredUsageMinutes(): number {
  try {
    return Number(localStorage.getItem(USAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function DesktopPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Never show inside the desktop app
    if (isTauri()) return;

    // Never show if no desktop build for this platform
    if (!isDesktopAvailable()) return;

    // Never show if previously dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    } catch {
      return;
    }

    // Only show after 10+ hours of tracked usage
    if (getStoredUsageMinutes() < USAGE_THRESHOLD_MINUTES) return;

    setVisible(true);
  }, []);

  if (!visible) return null;

  const platform = detectPlatform();
  const downloadUrl = getDesktopDownloadUrl(platform);
  const platformLabel = platform === 'macos' ? 'macOS' : 'Windows';

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable; banner just hides for this session
    }
  };

  return (
    <div
      className="w-full bg-indigo-600 text-white px-4 py-2"
      role="banner"
      aria-label="Desktop app promotion"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3 min-w-0">
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
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span>
            Try FluxStudio Desktop for a faster experience.
          </span>
          <a
            href={downloadUrl}
            className="font-medium underline underline-offset-2 hover:text-indigo-200 transition-colors whitespace-nowrap"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download for {platformLabel}
          </a>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-indigo-500 rounded transition-colors"
          aria-label="Dismiss desktop app prompt"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default DesktopPrompt;
