/**
 * TemplatePicker - UI for browsing and selecting drill formation templates
 *
 * Features:
 * - Browse templates by category (basic/intermediate/advanced)
 * - Search and filter
 * - Animated preview of template formations
 * - Apply template to current formation
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  ArrowLeft,
  Users,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { templateRegistry } from '@/services/formationTemplates/registry';
import {
  DrillTemplate,
  TemplateCategory,
  ApplyTemplateOptions,
} from '@/services/formationTemplates/types';
import { cn } from '@/lib/utils';
import { categoryIcons, categoryLabels } from './templatePickerConstants';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';

interface TemplatePickerProps {
  onApply: (options: Omit<ApplyTemplateOptions, 'formationId'>) => void;
  onCancel: () => void;
  performerCount: number;
  initialCategory?: TemplateCategory;
  /** When true, shown as the empty-state welcome — "Start from scratch" dismisses */
  emptyState?: boolean;
}

type ViewState = 'browse' | 'preview';

export function TemplatePicker({
  onApply,
  onCancel,
  performerCount,
  initialCategory,
  emptyState = false,
}: TemplatePickerProps) {
  const [viewState, setViewState] = React.useState<ViewState>('browse');
  const [selectedCategory, setSelectedCategory] = React.useState<TemplateCategory | null>(
    initialCategory || null
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [templates, setTemplates] = React.useState<DrillTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<DrillTemplate | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(new Set());
  const [performerRange, setPerformerRange] = React.useState<{ min: number; max: number }>({
    min: 0,
    max: 100,
  });

  // Preview options
  const [previewScale, setPreviewScale] = React.useState(1);
  const [previewRotation, setPreviewRotation] = React.useState(0);
  const [isPreviewAnimating, setIsPreviewAnimating] = React.useState(true);

  // Collect all available tags from the full template list
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    templateRegistry.getAllTemplates().forEach((t) => t.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, []);

  // Load templates
  const loadTemplates = React.useCallback(() => {
    setIsLoading(true);
    try {
      let result: DrillTemplate[];

      if (searchQuery) {
        result = templateRegistry.searchTemplates({ search: searchQuery });
      } else if (selectedCategory) {
        result = templateRegistry.getByCategory(selectedCategory);
      } else {
        result = templateRegistry.getAllTemplates();
      }

      // Filter by performer count compatibility (skip filter in empty state — show all templates)
      if (!emptyState && performerCount > 0) {
        result = result.filter(t =>
          performerCount >= t.parameters.minPerformers &&
          (!t.parameters.maxPerformers || performerCount <= t.parameters.maxPerformers)
        );
      }

      // Filter by performer range
      if (performerRange.min > 0 || performerRange.max < 100) {
        result = result.filter(t =>
          t.parameters.minPerformers >= performerRange.min &&
          (!t.parameters.maxPerformers || t.parameters.maxPerformers <= performerRange.max)
        );
      }

      // Filter by selected tags
      if (selectedTags.size > 0) {
        result = result.filter(t =>
          t.tags?.some((tag) => selectedTags.has(tag))
        );
      }

      setTemplates(result);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, selectedTags, performerRange, emptyState, performerCount]);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleSelectTemplate = (template: DrillTemplate) => {
    setSelectedTemplate(template);
    setPreviewScale(1);
    setPreviewRotation(0);
    setViewState('preview');
  };

  const handleApply = () => {
    if (!selectedTemplate) return;

    onApply({
      templateId: selectedTemplate.id,
      scale: previewScale,
      rotation: previewRotation,
      createMissingPerformers: performerCount < selectedTemplate.parameters.minPerformers,
    });
  };

  const categories = templateRegistry.getCategories();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {viewState !== 'browse' && (
              <button
                onClick={() => setViewState('browse')}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Back to template list"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <LayoutGrid className="w-6 h-6 text-indigo-600" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {emptyState && viewState === 'browse' && 'Choose a Starting Formation'}
                {!emptyState && viewState === 'browse' && 'Formation Templates'}
                {viewState === 'preview' && selectedTemplate?.name}
              </h2>
              {emptyState && viewState === 'browse' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Pick a template to get started, or start with a blank canvas
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {emptyState && viewState === 'browse' && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Start from scratch
              </button>
            )}
            {!emptyState && (
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                aria-label="Close template picker"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
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
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    aria-label="Search templates"
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
                    aria-pressed={selectedCategory === null}
                  >
                    All Templates
                  </button>
                  {categories.map(({ category: cat }) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                        selectedCategory === cat
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      )}
                      aria-pressed={selectedCategory === cat}
                    >
                      {categoryIcons[cat]}
                      <span>{categoryLabels[cat]}</span>
                    </button>
                  ))}
                </div>

                {/* Tag filters */}
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                          selectedTags.has(tag)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                        aria-pressed={selectedTags.has(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Performer count range */}
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Performers:</span>
                  <input
                    type="number"
                    min={0}
                    max={performerRange.max}
                    value={performerRange.min}
                    onChange={(e) => setPerformerRange((prev) => ({ ...prev, min: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-16 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-center"
                    aria-label="Minimum performers"
                  />
                  <span className="text-gray-400">—</span>
                  <input
                    type="number"
                    min={performerRange.min}
                    max={100}
                    value={performerRange.max}
                    onChange={(e) => setPerformerRange((prev) => ({ ...prev, max: Math.max(prev.min, parseInt(e.target.value) || 100) }))}
                    className="w-16 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-center"
                    aria-label="Maximum performers"
                  />
                </div>

                {/* Templates Grid */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" aria-hidden="true" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                    <p>No templates found for {performerCount} performers</p>
                    <p className="text-sm mt-1">Try adjusting your search or add more performers</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        performerCount={performerCount}
                        onClick={() => handleSelectTemplate(template)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {viewState === 'preview' && selectedTemplate && (
              <TemplatePreviewPanel
                template={selectedTemplate}
                performerCount={performerCount}
                previewScale={previewScale}
                previewRotation={previewRotation}
                isPreviewAnimating={isPreviewAnimating}
                onScaleChange={setPreviewScale}
                onRotationChange={setPreviewRotation}
                onToggleAnimation={() => setIsPreviewAnimating(!isPreviewAnimating)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {viewState === 'preview' && selectedTemplate && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={() => setViewState('browse')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Back
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              Apply Template
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default TemplatePicker;
