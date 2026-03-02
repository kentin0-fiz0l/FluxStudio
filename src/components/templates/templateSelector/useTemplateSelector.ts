import * as React from 'react';
import { templateService } from '@/services/templates/TemplateService';
import {
  ProjectTemplate,
  TemplateCategory,
  CreateFromTemplateOptions,
} from '@/services/templates/types';
import { observability } from '@/services/observability';

export type ViewState = 'browse' | 'detail' | 'customize' | 'ai-generate';

interface UseTemplateSelectorOptions {
  onSelect: (options: CreateFromTemplateOptions) => void;
  initialCategory?: TemplateCategory;
}

export function useTemplateSelector({ onSelect, initialCategory }: UseTemplateSelectorOptions) {
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
  const loadTemplates = React.useCallback(async () => {
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
  }, [selectedCategory, searchQuery]);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSelectTemplate = React.useCallback((template: ProjectTemplate) => {
    setSelectedTemplate(template);
    // Initialize variables with defaults
    const defaults: Record<string, unknown> = {};
    for (const variable of template.variables) {
      defaults[variable.id] = variable.defaultValue;
    }
    setVariables(defaults);
    setProjectName(template.name);
    setViewState('detail');
  }, []);

  const handleCustomize = React.useCallback(() => {
    setViewState('customize');
  }, []);

  const handleCreate = React.useCallback(() => {
    if (!selectedTemplate) return;

    observability.analytics.track('template_used', {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      category: selectedTemplate.category,
      source: 'project_template_selector',
    });

    onSelect({
      templateId: selectedTemplate.id,
      projectName: projectName || selectedTemplate.name,
      variables,
    });
  }, [selectedTemplate, projectName, variables, onSelect]);

  const handleAIGenerate = React.useCallback(async () => {
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
  }, [aiPrompt]);

  return {
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
  };
}
