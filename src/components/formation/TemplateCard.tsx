import { Users } from 'lucide-react';
import { DrillTemplate } from '@/services/formationTemplates/types';
import { TemplatePreviewCanvas } from './TemplatePreviewCanvas';

interface TemplateCardProps {
  template: DrillTemplate;
  performerCount: number;
  onClick: () => void;
}

export function TemplateCard({ template, performerCount, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all"
    >
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-3 relative overflow-hidden">
        <TemplatePreviewCanvas
          template={template}
          performerCount={Math.min(performerCount, template.parameters.maxPerformers || performerCount)}
          scale={1}
          rotation={0}
          isAnimating={false}
          isMinimal
        />
      </div>
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
        {template.name}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {template.description}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
          {template.category}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" aria-hidden="true" />
          {template.parameters.minPerformers}+
        </span>
      </div>
    </button>
  );
}
