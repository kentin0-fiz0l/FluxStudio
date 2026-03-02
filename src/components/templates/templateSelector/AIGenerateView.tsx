import { motion } from 'framer-motion';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AI_SUGGESTION_CHIPS } from './TemplateSelector.constants';

interface AIGenerateViewProps {
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function AIGenerateView({
  aiPrompt,
  onAiPromptChange,
  onGenerate,
  isLoading,
}: AIGenerateViewProps) {
  return (
    <motion.div
      key="ai-generate"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6"
    >
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Describe Your Project
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Tell us what you want to create and AI will generate a custom template
          </p>
        </div>

        <textarea
          value={aiPrompt}
          onChange={(e) => onAiPromptChange(e.target.value)}
          placeholder="E.g., A modern SaaS landing page with dark mode, hero section, features grid, pricing table, and testimonials..."
          rows={5}
          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {AI_SUGGESTION_CHIPS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onAiPromptChange(`${aiPrompt} ${suggestion}`.trim())}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              + {suggestion}
            </button>
          ))}
        </div>

        <button
          onClick={onGenerate}
          disabled={!aiPrompt.trim() || isLoading}
          className={cn(
            'w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors',
            aiPrompt.trim() && !isLoading
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" aria-hidden="true" />
              Generate Template
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
