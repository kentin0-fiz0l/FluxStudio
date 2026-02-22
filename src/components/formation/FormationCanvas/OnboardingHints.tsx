/**
 * OnboardingHints — Lightweight first-visit tooltip overlay
 *
 * Shows 3-4 contextual tips for new users. Dismisses on click-through
 * or "Skip". Persists dismissal in localStorage so it only shows once.
 */

import { useState, useEffect } from 'react';
import { X, MousePointer2, Undo2, Keyboard, LayoutTemplate } from 'lucide-react';

const STORAGE_KEY = 'flux_onboarding_seen';

interface Hint {
  icon: React.ReactNode;
  title: string;
  body: string;
}

const HINTS: Hint[] = [
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
    body: 'Arrow keys nudge performers. Delete removes them. Ctrl+A selects all. Ctrl+D duplicates.',
  },
];

export function OnboardingHints() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  const next = () => {
    if (step < HINTS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const hint = HINTS[step];

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Subtle backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={next} />

      {/* Hint card — centered */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 max-w-xs w-72 border border-gray-200 dark:border-gray-700">
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + content */}
          <div className="flex items-start gap-3 mb-4">
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
              {HINTS.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step
                      ? 'bg-indigo-600 dark:bg-indigo-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={dismiss}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Skip
              </button>
              <button
                onClick={next}
                className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                {step < HINTS.length - 1 ? 'Next' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
