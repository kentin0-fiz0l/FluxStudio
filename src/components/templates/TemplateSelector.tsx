/**
 * TemplateSelector - UI for browsing and selecting project templates
 *
 * Features:
 * - Browse templates by category
 * - Search and filter
 * - Preview template details
 * - AI template generation
 * - Custom variable input
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  ChevronRight,
  Check,
  X,
  Wand2,
  FolderPlus,
  Star,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { TemplateCategory, CreateFromTemplateOptions } from '@/services/templates/types';
import { cn } from '@/lib/utils';

import { useTemplateSelector } from './templateSelector/useTemplateSelector';
import { TemplateCard } from './templateSelector/TemplateCard';
import { VariableInput } from './templateSelector/VariableInput';
import { AIGenerateView } from './templateSelector/AIGenerateView';
import { categoryIcons } from './templateSelector/TemplateSelector.constants';

// Re-export for backward compatibility
export { useTemplateSelector } from './templateSelector/useTemplateSelector';
export type { ViewState } from './templateSelector/useTemplateSelector';
export { TemplateCard } from './templateSelector/TemplateCard';
export { VariableInput } from './templateSelector/VariableInput';
export { AIGenerateView } from './templateSelector/AIGenerateView';
export { categoryIcons, AI_SUGGESTION_CHIPS } from './templateSelector/TemplateSelector.constants';

interface TemplateSelectorProps {
  onSelect: (options: CreateFromTemplateOptions) => void;
  onCancel: () => void;
  initialCategory?: TemplateCategory;
}

export function TemplateSelector({
  onSelect,
  onCancel,
  initialCategory,
}: TemplateSelectorProps) {
  const {
    viewState,
    setViewState,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    templates,
    selectedTemplate,
    variables,
    setVariables,
    isLoading,
    aiPrompt,
    setAiPrompt,
    projectName,
    setProjectName,
    handleSelectTemplate,
    handleCustomize,
    handleCreate,
    handleAIGenerate,
  } = useTemplateSelector({ onSelect, initialCategory });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {viewState !== 'browse' && (
              <button
                onClick={() => setViewState('browse')}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <FolderPlus className="w-6 h-6 text-indigo-600" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {viewState === 'browse' && 'New Project'}
              {viewState === 'detail' && selectedTemplate?.name}
              {viewState === 'customize' && 'Customize Template'}
              {viewState === 'ai-generate' && 'AI Template Generator'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {viewState === 'browse' && (
              <motion.div
                key="browse"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6"
              >
                {/* AI Generator Card */}
                <div className="mb-6">
                  <button
                    onClick={() => setViewState('ai-generate')}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white hover:from-indigo-600 hover:to-purple-700 transition-colors"
                  >
                    <div className="p-3 bg-white/20 rounded-lg">
                      <Wand2 className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold">Generate with AI</h3>
                      <p className="text-sm text-white/80">
                        Describe your project and let AI create the perfect template
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      selectedCategory === null
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    All Templates
                  </button>
                  {Object.entries(categoryIcons).slice(0, 8).map(([cat, icon]) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat as TemplateCategory)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                        selectedCategory === cat
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      {icon}
                      <span className="capitalize">{cat.replace('-', ' ')}</span>
                    </button>
                  ))}
                </div>

                {/* Templates Grid */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onClick={() => handleSelectTemplate(template)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {viewState === 'detail' && selectedTemplate && (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Preview */}
                  <div>
                    <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl mb-4 flex items-center justify-center">
                      <span className="text-6xl">{categoryIcons[selectedTemplate.category]}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Download className="w-4 h-4" aria-hidden="true" />
                        {selectedTemplate.downloads.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
                        {selectedTemplate.rating.toFixed(1)}
                      </span>
                      {selectedTemplate.official && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Check className="w-4 h-4" aria-hidden="true" />
                          Official
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {selectedTemplate.description}
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Quick variables */}
                      {selectedTemplate.variables.slice(0, 2).map((variable) => (
                        <div key={variable.id}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {variable.name}
                          </label>
                          <VariableInput
                            variable={variable}
                            value={variables[variable.id]}
                            onChange={(value) =>
                              setVariables((prev) => ({ ...prev, [variable.id]: value }))
                            }
                          />
                        </div>
                      ))}

                      {selectedTemplate.variables.length > 2 && (
                        <button
                          onClick={handleCustomize}
                          className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          + {selectedTemplate.variables.length - 2} more options
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {viewState === 'customize' && selectedTemplate && (
              <motion.div
                key="customize"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="space-y-6">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.id}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {variable.name}
                        {variable.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {variable.description && (
                        <p className="text-xs text-gray-500 mb-2">{variable.description}</p>
                      )}
                      <VariableInput
                        variable={variable}
                        value={variables[variable.id]}
                        onChange={(value) =>
                          setVariables((prev) => ({ ...prev, [variable.id]: value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {viewState === 'ai-generate' && (
              <AIGenerateView
                aiPrompt={aiPrompt}
                onAiPromptChange={setAiPrompt}
                onGenerate={handleAIGenerate}
                isLoading={isLoading}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {(viewState === 'detail' || viewState === 'customize') && selectedTemplate && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setViewState('browse')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              {viewState === 'detail' && selectedTemplate.variables.length > 0 && (
                <button
                  onClick={handleCustomize}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Customize
                </button>
              )}
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                <FolderPlus className="w-4 h-4" aria-hidden="true" />
                Create Project
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default TemplateSelector;
