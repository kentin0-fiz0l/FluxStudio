/**
 * StepIndicator - Wizard progress indicator for roster import steps
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { STEPS } from './types';
import type { WizardStep } from './types';

export interface StepIndicatorProps {
  currentStep: WizardStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const { t } = useTranslation('common');
  const currentIndex = STEPS.indexOf(currentStep);

  const stepLabels: Record<WizardStep, string> = {
    upload: t('formation.steps.upload', 'Upload File'),
    map: t('formation.steps.map', 'Map Columns'),
    preview: t('formation.steps.preview', 'Preview'),
    import: t('formation.steps.import', 'Import'),
  };

  return (
    <div className="flex items-center justify-center gap-1 px-6 py-3">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <div
                className={`h-px w-8 mx-1 ${
                  index <= currentIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  isCompleted
                    ? 'bg-blue-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300 dark:ring-blue-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isCurrent
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCompleted
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {stepLabels[step]}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
