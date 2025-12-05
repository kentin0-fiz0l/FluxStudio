'use client';

import { useState, useEffect } from 'react';
import { X, Music, Clock, Target, ChevronRight, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { isFeatureEnabled } from '@/lib/featureFlags';

const ONBOARDING_KEY = 'metmap-onboarding-complete';

interface OnboardingPanelProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: <Music className="w-8 h-8" />,
    title: 'Add Your Songs',
    description: 'Create a song and break it into sections like verse, chorus, and bridge.',
  },
  {
    icon: <Clock className="w-8 h-8" />,
    title: 'Map the Tempo',
    description: 'Set the BPM and add tempo changes for complex songs with accelerandos or time signature changes.',
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: 'Practice Smart',
    description: 'Loop weak sections with the metronome, track confidence, and focus on what needs work.',
  },
];

/**
 * Check if onboarding has been completed
 */
export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/**
 * Mark onboarding as complete
 */
export function completeOnboarding(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

/**
 * Reset onboarding status (for testing)
 */
export function resetOnboarding(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ONBOARDING_KEY);
}

export function OnboardingPanel({ onComplete, onDismiss }: OnboardingPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if we should show onboarding
    if (isFeatureEnabled('onboarding') && !isOnboardingComplete()) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    completeOnboarding();
    setIsVisible(false);
    onComplete?.();
  };

  const handleDismiss = () => {
    completeOnboarding();
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl w-full max-w-md overflow-hidden border border-gray-800 shadow-2xl">
        {/* Header with dismiss */}
        <div className="flex justify-end p-3">
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-500 hover:text-gray-300 rounded-lg"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Welcome badge */}
        <div className="flex justify-center -mt-2">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-metmap-500/20 text-metmap-400 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Welcome to MetMap
          </div>
        </div>

        {/* Step content */}
        <div className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-metmap-500/10 flex items-center justify-center text-metmap-400">
            {step.icon}
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            {step.title}
          </h2>

          <p className="text-gray-400 text-lg leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={clsx(
                'w-2 h-2 rounded-full transition-all',
                i === currentStep
                  ? 'bg-metmap-500 w-6'
                  : i < currentStep
                  ? 'bg-metmap-500/50'
                  : 'bg-gray-700'
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-800 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-4 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3 px-6 bg-metmap-500 hover:bg-metmap-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isLastStep ? "Let's Go!" : 'Next'}
            {!isLastStep && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * First-use checklist component for inline display
 */
export function FirstUseChecklist() {
  const [isComplete, setIsComplete] = useState(true);

  useEffect(() => {
    setIsComplete(isOnboardingComplete());
  }, []);

  if (isComplete) return null;

  return (
    <div className="p-4 bg-metmap-500/10 border border-metmap-500/30 rounded-xl mb-4">
      <h3 className="font-medium text-metmap-400 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Quick Start Checklist
      </h3>
      <ul className="space-y-2 text-sm text-gray-300">
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
          <span>Try the <strong>Demo Song</strong> to explore tempo changes</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
          <span>Add your own song and map out the sections</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
          <span>Start a practice session and loop your weak spots</span>
        </li>
      </ul>
    </div>
  );
}
