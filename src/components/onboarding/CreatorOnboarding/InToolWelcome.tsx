/**
 * InToolWelcome - Non-blocking welcome overlay with contextual tips
 *
 * Shows 3 quick tips based on the chosen tool, with a dismiss button
 * and a secondary "Take a full tour" action that delegates to ProductTour.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TemplateType } from '@/services/onboarding/templateProjectCreator';

const TIPS: Record<TemplateType, string[]> = {
  drill: [
    'Drag performers to position them on the field',
    'Use the prompt bar for AI-assisted formation generation',
    'Press Space to play transitions between sets',
  ],
  'practice-chart': [
    'Click sections to edit tempo and time signature',
    'Link to a formation for auto-sync during rehearsal',
    'Export practice charts as PDF for your ensemble',
  ],
  custom: [
    'Create your first project from the dashboard',
    'Invite collaborators to work in real time',
    'Explore templates for drill, MetMap, and more',
  ],
};

interface InToolWelcomeProps {
  templateType: TemplateType;
  onDismiss: () => void;
  onStartTour: () => void;
}

export function InToolWelcome({ templateType, onDismiss, onStartTour }: InToolWelcomeProps) {
  const [visible, setVisible] = useState(true);
  const tips = TIPS[templateType];

  const handleDismiss = () => {
    setVisible(false);
    // Mark as dismissed in localStorage
    localStorage.setItem('creator_onboarding_welcome_dismissed', 'true');
    onDismiss();
  };

  const handleTour = () => {
    setVisible(false);
    localStorage.setItem('creator_onboarding_welcome_dismissed', 'true');
    onStartTour();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 right-6 z-50 w-[340px] bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-5"
          role="complementary"
          aria-label="Welcome tips"
        >
          {/* Close */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            aria-label="Dismiss tips"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-indigo-500" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">
              Quick tips to get started
            </h3>
          </div>

          {/* Tips */}
          <ul className="space-y-3 mb-5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleTour}
              className="text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              Take a full tour
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
            <Button size="sm" onClick={handleDismiss}>
              Got it
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
