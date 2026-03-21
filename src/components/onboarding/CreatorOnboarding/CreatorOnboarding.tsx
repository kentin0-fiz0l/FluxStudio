/**
 * CreatorOnboarding - 3-step wizard for new creators
 *
 * Steps: Auth -> Template Selection -> In-Tool Welcome
 * Gated on `useFeatureFlag('creator_onboarding')`.
 * Uses framer-motion for step transitions matching existing onboarding patterns.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { AuthenticationStep } from './AuthenticationStep';
import { TemplateSelection } from './TemplateSelection';
import { InToolWelcome } from './InToolWelcome';
import { ProductTour } from '@/components/onboarding/ProductTour';
import type { TemplateType } from '@/services/onboarding/templateProjectCreator';

interface CreatorOnboardingProps {
  onComplete?: () => void;
}

type Step = 'auth' | 'template' | 'welcome';

const STEP_INDEX: Record<Step, number> = { auth: 0, template: 1, welcome: 2 };
const TOTAL_STEPS = 3;

export function CreatorOnboarding({ onComplete }: CreatorOnboardingProps) {
  const navigate = useNavigate();
  const isEnabled = useFeatureFlag('creator_onboarding');
  const { completeWelcome, completeOnboarding } = useOnboardingState();

  const [step, setStep] = useState<Step>('auth');
  const [templateType, setTemplateType] = useState<TemplateType>('custom');
  const [redirectPath, setRedirectPath] = useState('/projects');
  const [showTour, setShowTour] = useState(false);

  const handleAuthComplete = useCallback(
    (_user: { name: string; email: string; authMethod: string }) => {
      setStep('template');
    },
    [],
  );

  const handleTemplateComplete = useCallback(
    (type: TemplateType, path: string) => {
      setTemplateType(type);
      setRedirectPath(path);
      completeWelcome();
      setStep('welcome');
    },
    [completeWelcome],
  );

  const handleWelcomeDismiss = useCallback(() => {
    completeOnboarding();
    onComplete?.();
    navigate(redirectPath);
  }, [completeOnboarding, onComplete, navigate, redirectPath]);

  const handleStartTour = useCallback(() => {
    setShowTour(true);
  }, []);

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
    completeOnboarding();
    onComplete?.();
    navigate(redirectPath);
  }, [completeOnboarding, onComplete, navigate, redirectPath]);

  if (!isEnabled) return null;

  // When in the welcome step, render the overlay directly
  if (step === 'welcome') {
    return (
      <>
        <InToolWelcome
          templateType={templateType}
          onDismiss={handleWelcomeDismiss}
          onStartTour={handleStartTour}
        />
        <ProductTour isActive={showTour} onComplete={handleTourComplete} />
      </>
    );
  }

  const currentIndex = STEP_INDEX[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          {/* Accent strip */}
          <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Welcome to Flux Studio
              </h1>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-8" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i <= currentIndex
                      ? 'w-8 bg-indigo-500'
                      : 'w-4 bg-neutral-200 dark:bg-neutral-700'
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 'auth' && (
                  <AuthenticationStep onComplete={handleAuthComplete} />
                )}
                {step === 'template' && (
                  <TemplateSelection onComplete={handleTemplateComplete} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default CreatorOnboarding;
