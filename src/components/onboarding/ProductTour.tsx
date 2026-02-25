/**
 * ProductTour — Lightweight step-by-step overlay tour
 *
 * Sprint 43: Phase 6.1 — First-Run Experience
 *
 * Uses CSS spotlight + positioned tooltip (no external dependency).
 * Integrates with useFirstTimeExperience for state persistence.
 *
 * Tour steps:
 * 1. Welcome spotlight on project list → "Create your first project"
 * 2. Highlight MetMap canvas → "This is your creative workspace"
 * 3. Highlight collaboration → "Invite your team"
 * 4. Done → success state, dismiss tour
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Check, Sparkles, FolderPlus, Music, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { eventTracker } from '@/services/analytics/eventTracking';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  /** CSS selector to spotlight (optional — if absent, centered modal) */
  targetSelector?: string;
  icon: React.ReactNode;
  ctaLabel: string;
  /** If provided, navigate here when CTA is clicked */
  ctaHref?: string;
}

const DEFAULT_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Flux Studio',
    description:
      'Everything starts with a project. Create one to organize your ideas, files, and collaboration.',
    targetSelector: '[data-tour="create-project"]',
    icon: <FolderPlus className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Create a Project',
    ctaHref: '/projects/new',
  },
  {
    id: 'metmap',
    title: 'Your Creative Workspace',
    description:
      'MetMap is where you map tempo changes, chord progressions, and rehearse with your team.',
    targetSelector: '[data-tour="metmap"]',
    icon: <Music className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Explore MetMap',
    ctaHref: '/tools/metmap',
  },
  {
    id: 'collaborate',
    title: 'Collaborate in Real Time',
    description:
      'Invite team members to edit, comment, and brainstorm together — changes sync instantly.',
    targetSelector: '[data-tour="collaborate"]',
    icon: <Users className="w-5 h-5" aria-hidden="true" />,
    ctaLabel: 'Got it!',
  },
];

interface ProductTourProps {
  /** Override default steps */
  steps?: TourStep[];
  /** Called when the tour is completed or dismissed */
  onComplete: () => void;
  /** Whether the tour is active */
  isActive: boolean;
}

export function ProductTour({
  steps = DEFAULT_STEPS,
  onComplete,
  isActive,
}: ProductTourProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Find and measure the target element for spotlight
  useEffect(() => {
    if (!isActive || !step?.targetSelector) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
    } else {
      setSpotlightRect(null);
    }
  }, [isActive, step, currentStep]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      eventTracker.trackEvent('product_tour_completed', { steps: steps.length });
      onComplete();
    } else {
      eventTracker.trackEvent('product_tour_step', { step: currentStep + 1, stepId: step?.id });
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete, currentStep, step, steps.length]);

  const handleCTA = useCallback(() => {
    eventTracker.trackEvent('product_tour_cta_clicked', { stepId: step?.id, href: step?.ctaHref });
    if (step?.ctaHref) {
      onComplete();
      navigate(step.ctaHref);
    } else {
      handleNext();
    }
  }, [step, navigate, onComplete, handleNext]);

  const handleSkip = useCallback(() => {
    eventTracker.trackEvent('product_tour_skipped', { atStep: currentStep, stepId: step?.id });
    onComplete();
  }, [onComplete, currentStep, step]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleSkip, handleNext, currentStep]);

  if (!isActive || !step) return null;

  // Calculate tooltip position
  const tooltipPosition = spotlightRect
    ? {
        top: spotlightRect.bottom + 16,
        left: Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 380)),
      }
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{
          background: spotlightRect
            ? undefined
            : 'rgba(0, 0, 0, 0.7)',
        }}
        role="presentation"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Spotlight cutout (SVG mask) */}
      {spotlightRect && (
        <svg
          className="fixed inset-0 z-[9998] pointer-events-none"
          width="100%"
          height="100%"
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotlightRect.left - 8}
                y={spotlightRect.top - 8}
                width={spotlightRect.width + 16}
                height={spotlightRect.height + 16}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
      )}

      {/* Spotlight ring */}
      {spotlightRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent animate-pulse"
          style={{
            top: spotlightRect.top - 8,
            left: spotlightRect.left - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-[10000] w-[360px] bg-white dark:bg-neutral-900',
          'rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700',
          'p-5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4',
        )}
        style={
          typeof tooltipPosition.top === 'number'
            ? { top: tooltipPosition.top, left: tooltipPosition.left as number }
            : { top: tooltipPosition.top, left: tooltipPosition.left, transform: tooltipPosition.transform }
        }
        role="dialog"
        aria-label={`Tour step ${currentStep + 1} of ${steps.length}`}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-t-xl overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500 mb-3">
          <Sparkles className="w-3 h-3 text-indigo-400" aria-hidden="true" />
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            {step.icon}
          </div>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white pt-1">
            {step.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 ml-12">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between ml-12">
          <button
            onClick={handleSkip}
            className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleCTA}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
            >
              {isLastStep ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  {step.ctaLabel}
                </>
              ) : (
                <>
                  {step.ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
