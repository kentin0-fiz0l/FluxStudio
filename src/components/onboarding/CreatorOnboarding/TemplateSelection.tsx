/**
 * TemplateSelection - Choose a starting project template
 *
 * Three category cards: Drill Design, Practice Chart, Custom Project.
 * Single-click creates the project and returns the redirect path.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Music, FolderPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createProjectFromTemplate, type TemplateType } from '@/services/onboarding/templateProjectCreator';
import { useAuth } from '@/store/slices/authSlice';

interface TemplateCard {
  type: TemplateType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const TEMPLATES: TemplateCard[] = [
  {
    type: 'drill',
    title: 'Drill Design',
    description: 'Create formations and transitions with the Drill Writer',
    icon: <PenTool className="w-6 h-6" aria-hidden="true" />,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    type: 'practice-chart',
    title: 'Practice Chart',
    description: 'Map tempo, sections, and rehearsal flow with MetMap',
    icon: <Music className="w-6 h-6" aria-hidden="true" />,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    type: 'custom',
    title: 'Custom Project',
    description: 'Start from scratch on the dashboard',
    icon: <FolderPlus className="w-6 h-6" aria-hidden="true" />,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
];

interface TemplateSelectionProps {
  onComplete: (templateType: TemplateType, redirectPath: string) => void;
}

export function TemplateSelection({ onComplete }: TemplateSelectionProps) {
  const { user } = useAuth();
  const [creating, setCreating] = useState<TemplateType | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (templateType: TemplateType) => {
    setCreating(templateType);
    setError('');

    try {
      const { redirectPath } = await createProjectFromTemplate(
        templateType,
        user?.id ?? '',
      );
      onComplete(templateType, redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setCreating(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          What would you like to create?
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Pick a starting point. You can always switch later.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {TEMPLATES.map((template) => (
          <button
            key={template.type}
            onClick={() => handleSelect(template.type)}
            disabled={creating !== null}
            aria-label={`Create ${template.title} project`}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all',
              'hover:border-primary-500 hover:shadow-md',
              creating === template.type
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-neutral-200 dark:border-neutral-700',
              creating !== null && creating !== template.type && 'opacity-50',
            )}
          >
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', template.color)}>
              {creating === template.type ? (
                <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              ) : (
                template.icon
              )}
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {template.title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {template.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
