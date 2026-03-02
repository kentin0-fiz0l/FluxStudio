import { Check, Star } from 'lucide-react';
import { ProjectTemplate } from '@/services/templates/types';

interface TemplateCardProps {
  template: ProjectTemplate;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all"
    >
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-3 flex items-center justify-center">
        <span className="text-4xl opacity-50 group-hover:scale-110 transition-transform">
          {template.category === 'design' && '🎨'}
          {template.category === 'development' && '💻'}
          {template.category === 'marketing' && '📣'}
          {template.category === 'music' && '🎵'}
          {template.category === 'video' && '🎬'}
          {template.category === 'branding' && '🏷️'}
          {template.category === 'social-media' && '📱'}
          {!['design', 'development', 'marketing', 'music', 'video', 'branding', 'social-media'].includes(template.category) && '📁'}
        </span>
      </div>
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
        {template.name}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {template.description}
      </p>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        {template.official && (
          <span className="flex items-center gap-0.5 text-blue-500">
            <Check className="w-3 h-3" aria-hidden="true" />
            Official
          </span>
        )}
        {template.featured && (
          <span className="flex items-center gap-0.5 text-amber-500">
            <Star className="w-3 h-3" aria-hidden="true" />
            Featured
          </span>
        )}
      </div>
    </button>
  );
}
