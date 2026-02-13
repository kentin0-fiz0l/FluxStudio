/**
 * OnboardingProgress - Progress indicator/stepper
 * Extracted from ClientOnboarding.tsx
 */

import {
  Check,
  Calendar,
  Users,
  Palette,
  FileText,
  CreditCard,
} from 'lucide-react';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';

export const steps = [
  { id: 'organization', title: 'Organization Info', description: 'Tell us about your organization', icon: Users },
  { id: 'project', title: 'Project Details', description: 'Describe your project vision', icon: Palette },
  { id: 'timeline', title: 'Timeline & Budget', description: 'Planning and investment details', icon: Calendar },
  { id: 'requirements', title: 'Requirements', description: 'Specific needs and preferences', icon: FileText },
  { id: 'review', title: 'Review & Payment', description: 'Finalize your project request', icon: CreditCard },
];

interface OnboardingProgressProps {
  currentStep: number;
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Step {currentStep + 1} of {steps.length}</span>
          <span className="text-sm text-gray-600">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex justify-center space-x-1 mb-8">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive ? 'bg-blue-500 text-white' :
                isCompleted ? 'bg-green-500 text-white' :
                'bg-gray-100 text-gray-600'
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <StepIcon className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default OnboardingProgress;
