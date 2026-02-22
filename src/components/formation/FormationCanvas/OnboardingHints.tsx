/**
 * OnboardingHints — Lightweight first-visit tooltip overlay
 *
 * Shows contextual tips for new users. Dismisses on click-through
 * or "Skip". Persists dismissal in localStorage so it only shows once.
 * Adapts hints for touch vs desktop (no keyboard shortcuts on mobile).
 */

import { useState, useEffect, useMemo } from 'react';
import { X, MousePointer2, Undo2, Keyboard, LayoutTemplate, Hand } from 'lucide-react';
import { eventTracker } from '@/services/analytics/eventTracking';

const STORAGE_KEY = 'flux_onboarding_seen';

interface Hint {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const DESKTOP_HINTS: Hint[] = [
  {
    icon: <MousePointer2 className="w-5 h-5" />,
    title: 'Drag to rearrange',
    body: 'Click and drag any performer to move them. Hold Shift to select multiple.',
  },
  {
    icon: <LayoutTemplate className="w-5 h-5" />,
    title: 'Apply templates',
    body: 'Use the Templates button in the toolbar to quickly apply wedge, line, block, and other formations.',
  },
  {
    icon: <Undo2 className="w-5 h-5" />,
    title: 'Undo & redo',
    body: 'Made a mistake? Press Ctrl+Z to undo or Ctrl+Y to redo. (Cmd on Mac)',
  },
  {
    icon: <Keyboard className="w-5 h-5" />,
    title: 'Keyboard shortcuts',
    body: 'Arrow keys nudge performers. Delete removes them. Ctrl+A selects all.',
  },
];

const MOBILE_HINTS: Hint[] = [
  {
    icon: <Hand className="w-5 h-5" />,
    title: 'Tap & drag',
    body: 'Tap any performer to select, then drag to move them around the field.',
  },
  {
    icon: <LayoutTemplate className="w-5 h-5" />,
    title: 'Apply templates',
    body: 'Use the Templates button to quickly apply wedge, line, block, and other formations.',
  },
  {
    icon: <Undo2 className="w-5 h-5" />,
    title: 'Undo mistakes',
    body: 'Use the undo button in the toolbar to reverse your last action.',
  },
];

export function OnboardingHints() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 640px)').matches || 'ontouchstart' in window;
  }, []);

  const hints = isMobile ? MOBILE_HINTS : DESKTOP_HINTS;

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
        eventTracker.trackEvent('onboarding_shown', { device: isMobile ? 'mobile' : 'desktop' });
      }
    } catch {
      // localStorage unavailable
    }
  }, [isMobile]);

  const dismiss = () => {
    setVisible(false);
    eventTracker.trackEvent('onboarding_dismissed', { step, total: hints.length });
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  const next = () => {
    if (step < hints.length - 1) {
      setStep(step + 1);
    } else {
      eventTracker.trackEvent('onboarding_completed', { total: hints.length });
      dismiss();
    }
  };

  if (!visible) return null;

  const hint = hints[step];

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Subtle backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={next} />

      {/* Hint card — centered, responsive width */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto w-[calc(100%-2rem)] max-w-xs">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 border border-gray-200 dark:border-gray-700">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close hints"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + content */}
          <div className="flex items-start gap-3 mb-4 pr-6">
            <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
              {hint.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {hint.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 leading-relaxed">
                {hint.body}
              </p>
            </div>
          </div>

          {/* Footer: dots + actions */}
          <div className="flex items-center justify-between">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {hints.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step
                      ? 'bg-indigo-600 dark:bg-indigo-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={dismiss}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 px-2"
              >
                Skip
              </button>
              <button
                onClick={next}
                className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors font-medium min-h-[36px]"
              >
                {step < hints.length - 1 ? 'Next' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
