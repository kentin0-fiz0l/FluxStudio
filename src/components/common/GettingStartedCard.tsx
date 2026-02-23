/**
 * GettingStartedCard Component
 *
 * Onboarding card shown to first-time users on the dashboard.
 * Creative Studio tone: warm, clear, non-corporate.
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Check,
  FolderOpen,
  MessageSquare,
  FileUp,
  Music,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingStep } from '@/hooks/useFirstTimeExperience';

interface GettingStartedCardProps {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  onDismiss: () => void;
  onStepComplete?: (stepId: string) => void;
  className?: string;
}

// Icon mapping for steps
const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  project: FolderOpen,
  message: MessageSquare,
  file: FileUp,
  metmap: Music,
};

export function GettingStartedCard({
  steps,
  completedCount,
  totalSteps,
  onDismiss,
  onStepComplete,
  className,
}: GettingStartedCardProps) {
  const navigate = useNavigate();

  const handleCtaClick = (step: OnboardingStep) => {
    // Mark step as complete when user clicks CTA
    if (onStepComplete && !step.isComplete) {
      onStepComplete(step.id);
    }
    navigate(step.ctaHref);
  };

  const allComplete = completedCount === totalSteps;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-primary-200 dark:border-primary-800 bg-gradient-to-br from-white to-primary-50/30 dark:from-neutral-900 dark:to-primary-900/10',
        className
      )}
    >
      {/* Decorative sparkle */}
      <div className="absolute top-4 right-4 text-primary-400 dark:text-primary-600">
        <Sparkles className="h-6 w-6" aria-hidden="true" />
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4 pr-8">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              Welcome to FluxStudio
              <span role="img" aria-label="wave">
                👋
              </span>
            </CardTitle>
            <CardDescription className="mt-1 text-neutral-600 dark:text-neutral-400">
              Your creative workspace for ideas, conversations, and tools — all in one place.
            </CardDescription>
            {/* Project-first framing */}
            <p className="mt-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
              Projects are the home for everything you create in FluxStudio.
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 dark:bg-primary-400 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(completedCount / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
            {completedCount}/{totalSteps} complete
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          Start your first flow:
        </p>

        {/* Steps checklist */}
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = stepIcons[step.id] || FolderOpen;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg transition-all',
                  step.isComplete
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
              >
                {/* Completion indicator */}
                <div
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                    step.isComplete
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                  )}
                >
                  {step.isComplete ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        'font-medium text-sm',
                        step.isComplete
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-neutral-900 dark:text-neutral-100'
                      )}
                    >
                      {step.title}
                    </h4>
                    {step.isComplete && (
                      <Badge
                        variant="success"
                        className="text-xs px-1.5 py-0"
                      >
                        Done
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* CTA button */}
                {!step.isComplete && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCtaClick(step)}
                    className="flex-shrink-0"
                  >
                    {step.ctaLabel}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="pt-4 flex items-center justify-between">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          You can jump in anywhere — this just helps you get oriented.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {allComplete ? "I'm good" : 'Dismiss'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default GettingStartedCard;
