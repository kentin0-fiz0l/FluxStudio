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

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Star,
  Download,
  ChevronRight,
  Check,
  X,
  Wand2,
  FolderPlus,
  Palette,
  Code,
  Music,
  Video,
  Camera,
  Megaphone,
  Image,
  FileText,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { templateService } from '@/services/templates/TemplateService';
import {
  ProjectTemplate,
  TemplateCategory,
  TemplateVariable,
  CreateFromTemplateOptions,
} from '@/services/templates/types';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  onSelect: (options: CreateFromTemplateOptions) => void;
  onCancel: () => void;
  initialCategory?: TemplateCategory;
}

type ViewState = 'browse' | 'detail' | 'customize' | 'ai-generate';

export function TemplateSelector({
  onSelect,
  onCancel,
  initialCategory,
}: TemplateSelectorProps) {
  const [viewState, setViewState] = React.useState<ViewState>('browse');
  const [selectedCategory, setSelectedCategory] = React.useState<TemplateCategory | null>(
    initialCategory || null
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [templates, setTemplates] = React.useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<ProjectTemplate | null>(null);
  const [variables, setVariables] = React.useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState('');
  const [projectName, setProjectName] = React.useState('');

  // Load templates
  React.useEffect(() => {
    loadTemplates();
  }, [selectedCategory, searchQuery]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const result = await templateService.search({
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      });
      setTemplates(result.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    // Initialize variables with defaults
    const defaults: Record<string, unknown> = {};
    for (const variable of template.variables) {
      defaults[variable.id] = variable.defaultValue;
    }
    setVariables(defaults);
    setProjectName(template.name);
    setViewState('detail');
  };

  const handleCustomize = () => {
    setViewState('customize');
  };

  const handleCreate = () => {
    if (!selectedTemplate) return;

    onSelect({
      templateId: selectedTemplate.id,
      projectName: projectName || selectedTemplate.name,
      variables,
    });
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsLoading(true);
    try {
      const result = await templateService.generateTemplate({
        description: aiPrompt,
      });

      // Create a temporary template from AI result
      const aiTemplate: ProjectTemplate = {
        id: 'ai-generated',
        name: result.suggestions.name,
        description: aiPrompt,
        category: 'custom',
        complexity: 'basic',
        tags: [],
        author: { id: 'ai', name: 'AI Generated' },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        downloads: 0,
        rating: 0,
        featured: false,
        official: false,
        premium: false,
        structure: result.suggestions.structure as ProjectTemplate['structure'],
        variables: result.suggestions.variables,
        presets: [],
      };

      setSelectedTemplate(aiTemplate);
      setProjectName(result.suggestions.name);
      setViewState('detail');
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
    design: <Palette className="w-5 h-5" aria-hidden="true" />,
    development: <Code className="w-5 h-5" aria-hidden="true" />,
    marketing: <Megaphone className="w-5 h-5" aria-hidden="true" />,
    music: <Music className="w-5 h-5" aria-hidden="true" />,
    video: <Video className="w-5 h-5" aria-hidden="true" />,
    photography: <Camera className="w-5 h-5" aria-hidden="true" />,
    branding: <Image className="w-5 h-5" aria-hidden="true" />,
    'social-media': <Star className="w-5 h-5" aria-hidden="true" />,
    presentation: <FileText className="w-5 h-5" aria-hidden="true" />,
    documentation: <FileText className="w-5 h-5" aria-hidden="true" />,
    custom: <FolderPlus className="w-5 h-5" aria-hidden="true" />,
  };

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
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="E.g., A modern SaaS landing page with dark mode, hero section, features grid, pricing table, and testimonials..."
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    {['Landing page', 'Dashboard', 'Mobile app', 'Portfolio', 'E-commerce'].map(
                      (suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setAiPrompt((prev) => `${prev} ${suggestion}`.trim())}
                          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          + {suggestion}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    onClick={handleAIGenerate}
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

interface TemplateCardProps {
  template: ProjectTemplate;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
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

interface VariableInputProps {
  variable: TemplateVariable;
  value: unknown;
  onChange: (value: unknown) => void;
}

function VariableInput({ variable, value, onChange }: VariableInputProps) {
  switch (variable.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
        </label>
      );

    case 'select':
      return (
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {variable.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
          />
          <input
            type="text"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      );

    case 'number':
      return (
        <input
          type="number"
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          min={variable.validation?.min}
          max={variable.validation?.max}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );

    default:
      return (
        <input
          type="text"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );
  }
}

export default TemplateSelector;
