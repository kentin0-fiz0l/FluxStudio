/**
 * TemplateService - Smart Project Template Management
 *
 * Handles template discovery, customization, and project creation.
 */

import {
  ProjectTemplate,
  TemplateCategory,
  TemplateFilter,
  TemplateSearchResult,
  TemplateVariable,
  CreateFromTemplateOptions,
  CreateFromTemplateResult,
  CustomTemplateOptions,
  AITemplateRequest,
  AITemplateResponse,
} from './types';
import { apiFetch } from '@/utils/apiHelpers';

class TemplateService {
  private templates: Map<string, ProjectTemplate> = new Map();
  private customTemplates: Map<string, ProjectTemplate> = new Map();

  constructor() {
    this.loadBuiltInTemplates();
    this.loadCustomTemplates();
  }

  // ============================================================================
  // Template Discovery
  // ============================================================================

  async search(filter: TemplateFilter = {}): Promise<TemplateSearchResult> {
    // Try fetching from API (includes both built-in and user custom templates)
    try {
      const params = new URLSearchParams();
      if (filter.category) params.set('category', filter.category);
      if (filter.complexity) params.set('complexity', filter.complexity);
      if (filter.featured) params.set('featured', 'true');
      if (filter.search) params.set('search', filter.search);
      if (filter.sortBy) params.set('sortBy', filter.sortBy);

      const res = await apiFetch(`/api/templates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.templates) {
          return {
            templates: data.templates,
            total: data.total || data.templates.length,
            page: 1,
            hasMore: false,
          };
        }
      }
    } catch {
      // API unavailable, fall back to local
    }

    // Fallback: local search
    let results = [...this.templates.values(), ...this.customTemplates.values()];

    if (filter.category) {
      results = results.filter((t) => t.category === filter.category);
    }
    if (filter.complexity) {
      results = results.filter((t) => t.complexity === filter.complexity);
    }
    if (filter.featured) {
      results = results.filter((t) => t.featured);
    }
    if (filter.official) {
      results = results.filter((t) => t.official);
    }
    if (filter.premium !== undefined) {
      results = results.filter((t) => t.premium === filter.premium);
    }
    if (filter.search) {
      const query = filter.search.toLowerCase();
      results = results.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    switch (filter.sortBy) {
      case 'downloads':
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        results.sort((a, b) => {
          if (a.featured !== b.featured) return b.featured ? 1 : -1;
          return b.downloads - a.downloads;
        });
    }

    return {
      templates: results,
      total: results.length,
      page: 1,
      hasMore: false,
    };
  }

  async getTemplate(templateId: string): Promise<ProjectTemplate | null> {
    return this.templates.get(templateId) || this.customTemplates.get(templateId) || null;
  }

  async getFeatured(): Promise<ProjectTemplate[]> {
    const result = await this.search({ featured: true });
    return result.templates.slice(0, 6);
  }

  async getByCategory(category: TemplateCategory): Promise<ProjectTemplate[]> {
    const result = await this.search({ category });
    return result.templates;
  }

  async getCategories(): Promise<{ id: TemplateCategory; name: string; count: number }[]> {
    const categoryMap = new Map<TemplateCategory, number>();

    for (const template of [...this.templates.values(), ...this.customTemplates.values()]) {
      categoryMap.set(template.category, (categoryMap.get(template.category) || 0) + 1);
    }

    const categoryNames: Record<TemplateCategory, string> = {
      design: 'Design',
      development: 'Development',
      marketing: 'Marketing',
      music: 'Music Production',
      video: 'Video',
      photography: 'Photography',
      branding: 'Branding',
      'social-media': 'Social Media',
      presentation: 'Presentations',
      documentation: 'Documentation',
      custom: 'Custom',
    };

    return Array.from(categoryMap.entries())
      .map(([id, count]) => ({ id, name: categoryNames[id], count }))
      .sort((a, b) => b.count - a.count);
  }

  // ============================================================================
  // Project Creation
  // ============================================================================

  async createFromTemplate(options: CreateFromTemplateOptions): Promise<CreateFromTemplateResult> {
    const template = await this.getTemplate(options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    // Apply preset if specified
    let variables = { ...options.variables };
    if (options.preset) {
      const preset = template.presets.find((p) => p.id === options.preset);
      if (preset) {
        variables = { ...preset.values, ...variables };
      }
    }

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && variables[variable.id] === undefined) {
        throw new Error(`Required variable '${variable.name}' is missing`);
      }
    }

    // Create project via backend API with template reference
    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: options.projectName || String(variables.projectName || 'New Project'),
          description: String(variables.description || template.description || ''),
          projectType: template.structure.projectType || template.category,
          templateId: options.templateId,
          templateVariables: variables,
          tags: template.tags,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const project = data.project;

        // Compute what was created for the result
        const createdFiles = [
          ...template.structure.folders.map((f) => this.interpolateVariables(f.path, variables)),
          ...template.structure.files.map((f) => this.interpolateVariables(f.path, variables)),
        ];
        const createdEntities = (template.structure.entities || []).map((e) => ({
          type: e.type,
          id: `${e.type}-${Date.now()}`,
          name: this.interpolateVariables(e.name, variables),
        }));

        return {
          projectId: project.id,
          projectName: project.name,
          createdFiles,
          createdEntities,
        };
      }
    } catch {
      // API unavailable, fall through to local fallback
    }

    // Fallback: local-only creation
    const createdFiles: string[] = [];
    const createdEntities: { type: string; id: string; name: string }[] = [];

    for (const folder of template.structure.folders) {
      createdFiles.push(this.interpolateVariables(folder.path, variables));
    }
    for (const file of template.structure.files) {
      createdFiles.push(this.interpolateVariables(file.path, variables));
    }
    for (const entity of template.structure.entities || []) {
      const name = this.interpolateVariables(entity.name, variables);
      createdEntities.push({ type: entity.type, id: `${entity.type}-${Date.now()}`, name });
    }

    return {
      projectId: `proj-${Date.now()}`,
      projectName: options.projectName,
      createdFiles,
      createdEntities,
    };
  }

  async previewTemplate(
    templateId: string,
    variables: Record<string, unknown>
  ): Promise<{ files: string[]; entities: string[] }> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const files = template.structure.files.map((f) =>
      this.interpolateVariables(f.path, variables)
    );

    const entities = (template.structure.entities || []).map((e) =>
      `${e.type}: ${this.interpolateVariables(e.name, variables)}`
    );

    return { files, entities };
  }

  // ============================================================================
  // Custom Templates
  // ============================================================================

  async createCustomTemplate(options: CustomTemplateOptions): Promise<ProjectTemplate> {
    const now = new Date().toISOString();

    // Try saving to backend
    try {
      const res = await apiFetch('/api/templates/custom', {
        method: 'POST',
        body: JSON.stringify({
          name: options.name,
          description: options.description,
          category: options.category,
          structure: {
            projectType: options.category,
            defaultSettings: {},
            folders: [],
            files: [],
            entities: [],
          },
          variables: options.variables || [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const row = data.template;
        const template: ProjectTemplate = {
          id: row.id,
          name: row.name,
          description: row.description || '',
          category: row.category || 'custom',
          complexity: 'basic',
          tags: [],
          author: { id: 'current-user', name: 'You' },
          version: '1.0.0',
          createdAt: row.created_at || now,
          updatedAt: row.updated_at || now,
          downloads: 0,
          rating: 0,
          featured: false,
          official: false,
          premium: false,
          structure: row.structure || { projectType: options.category, defaultSettings: {}, folders: [], files: [], entities: [] },
          variables: row.variables || options.variables || [],
          presets: [],
        };
        this.customTemplates.set(template.id, template);
        return template;
      }
    } catch {
      // API unavailable, fall back to local
    }

    // Fallback: local-only
    const id = `custom-${Date.now()}`;
    const template: ProjectTemplate = {
      id,
      name: options.name,
      description: options.description,
      category: options.category,
      complexity: 'basic',
      tags: [],
      author: { id: 'current-user', name: 'You' },
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      downloads: 0,
      rating: 0,
      featured: false,
      official: false,
      premium: false,
      structure: { projectType: options.category, defaultSettings: {}, folders: [], files: [], entities: [] },
      variables: options.variables || [],
      presets: [],
    };

    this.customTemplates.set(id, template);
    this.persistCustomTemplates();
    return template;
  }

  async updateCustomTemplate(
    templateId: string,
    updates: Partial<ProjectTemplate>
  ): Promise<ProjectTemplate> {
    const template = this.customTemplates.get(templateId);
    if (!template) {
      throw new Error(`Custom template ${templateId} not found`);
    }

    const updated = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.customTemplates.set(templateId, updated);
    this.persistCustomTemplates();

    return updated;
  }

  async deleteCustomTemplate(templateId: string): Promise<void> {
    // Try deleting from backend
    try {
      await apiFetch(`/api/templates/custom/${templateId}`, { method: 'DELETE' });
    } catch {
      // API unavailable, just remove locally
    }

    this.customTemplates.delete(templateId);
    this.persistCustomTemplates();
  }

  getCustomTemplates(): ProjectTemplate[] {
    return Array.from(this.customTemplates.values());
  }

  // ============================================================================
  // AI Template Generation
  // ============================================================================

  async generateTemplate(request: AITemplateRequest): Promise<AITemplateResponse> {
    // Try real AI generation via backend
    try {
      const res = await apiFetch('/api/ai/generate-template', {
        method: 'POST',
        body: JSON.stringify({
          description: request.description,
          category: request.category,
          complexity: request.complexity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.template) {
          const template = data.data.template as Partial<ProjectTemplate>;
          return {
            template,
            suggestions: {
              name: template.name || 'New Project',
              description: template.description || '',
              variables: template.variables || [],
              structure: template.structure || {},
            },
            confidence: data.data.confidence || 0.85,
            alternatives: this.generateAlternatives(request),
          };
        }
      }
    } catch {
      // AI unavailable, fall back to local generation
    }

    // Fallback: local generation
    const category = request.category || this.inferCategory(request.description);
    const complexity = request.complexity || 'basic';

    const template: Partial<ProjectTemplate> = {
      name: this.generateName(request.description),
      description: request.description,
      category,
      complexity,
      tags: this.extractTags(request.description),
      structure: this.generateStructure(request),
      variables: this.generateVariables(request),
      presets: this.generatePresets(request),
    };

    return {
      template,
      suggestions: {
        name: template.name || 'New Project',
        description: template.description || '',
        variables: template.variables || [],
        structure: template.structure || {},
      },
      confidence: 0.65,
      alternatives: this.generateAlternatives(request),
    };
  }

  async suggestVariables(context: {
    category: TemplateCategory;
    description: string;
  }): Promise<TemplateVariable[]> {
    // AI-suggested variables based on context
    const baseVariables: TemplateVariable[] = [
      {
        id: 'projectName',
        name: 'Project Name',
        description: 'Name of your project',
        type: 'text',
        defaultValue: 'My Project',
        required: true,
      },
      {
        id: 'primaryColor',
        name: 'Primary Color',
        description: 'Main brand color',
        type: 'color',
        defaultValue: '#6366f1',
        required: false,
      },
    ];

    // Add category-specific variables
    switch (context.category) {
      case 'design':
        baseVariables.push({
          id: 'canvasSize',
          name: 'Canvas Size',
          description: 'Default canvas dimensions',
          type: 'select',
          defaultValue: '1920x1080',
          required: false,
          options: [
            { value: '1920x1080', label: 'HD (1920x1080)' },
            { value: '3840x2160', label: '4K (3840x2160)' },
            { value: '1080x1920', label: 'Portrait (1080x1920)' },
            { value: '1200x630', label: 'Social (1200x630)' },
          ],
        });
        break;

      case 'development':
        baseVariables.push({
          id: 'framework',
          name: 'Framework',
          description: 'Development framework',
          type: 'select',
          defaultValue: 'react',
          required: true,
          options: [
            { value: 'react', label: 'React' },
            { value: 'vue', label: 'Vue' },
            { value: 'svelte', label: 'Svelte' },
            { value: 'vanilla', label: 'Vanilla JS' },
          ],
        });
        break;

      case 'marketing':
        baseVariables.push({
          id: 'targetAudience',
          name: 'Target Audience',
          description: 'Primary audience for the campaign',
          type: 'text',
          defaultValue: '',
          required: false,
        });
        break;
    }

    return baseVariables;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private interpolateVariables(text: string, variables: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(variables[key] ?? `{{${key}}}`);
    });
  }

  private inferCategory(description: string): TemplateCategory {
    const lower = description.toLowerCase();

    if (lower.includes('design') || lower.includes('ui') || lower.includes('mockup')) {
      return 'design';
    }
    if (lower.includes('code') || lower.includes('app') || lower.includes('website')) {
      return 'development';
    }
    if (lower.includes('campaign') || lower.includes('marketing') || lower.includes('ad')) {
      return 'marketing';
    }
    if (lower.includes('music') || lower.includes('audio') || lower.includes('song')) {
      return 'music';
    }
    if (lower.includes('video') || lower.includes('film') || lower.includes('movie')) {
      return 'video';
    }
    if (lower.includes('photo') || lower.includes('gallery') || lower.includes('portfolio')) {
      return 'photography';
    }
    if (lower.includes('brand') || lower.includes('logo') || lower.includes('identity')) {
      return 'branding';
    }
    if (lower.includes('social') || lower.includes('instagram') || lower.includes('twitter')) {
      return 'social-media';
    }
    if (lower.includes('presentation') || lower.includes('slides') || lower.includes('pitch')) {
      return 'presentation';
    }
    if (lower.includes('docs') || lower.includes('documentation') || lower.includes('wiki')) {
      return 'documentation';
    }

    return 'custom';
  }

  private generateName(description: string): string {
    // Extract key words for name
    const words = description.split(' ').slice(0, 4);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  private extractTags(description: string): string[] {
    const words = description.toLowerCase().split(/\s+/);
    const keywords = ['design', 'app', 'web', 'mobile', 'dashboard', 'landing', 'portfolio'];
    return words.filter((w) => keywords.includes(w) || w.length > 6).slice(0, 5);
  }

  private generateStructure(request: AITemplateRequest): ProjectTemplate['structure'] {
    const category = request.category || 'design';

    const baseStructure: ProjectTemplate['structure'] = {
      projectType: category,
      defaultSettings: {},
      folders: [
        { path: '/assets', name: 'Assets', description: 'Project assets and resources' },
        { path: '/docs', name: 'Documentation', description: 'Project documentation' },
      ],
      files: [
        { path: '/README.md', name: 'README', type: 'markdown', content: '# {{projectName}}\n\n{{description}}' },
      ],
      entities: [],
    };

    // Add category-specific structure
    switch (category) {
      case 'design':
        baseStructure.folders.push(
          { path: '/designs', name: 'Designs', description: 'Design files' },
          { path: '/exports', name: 'Exports', description: 'Exported assets' }
        );
        baseStructure.entities = [
          { type: 'board', name: 'Main Canvas', data: {} },
        ];
        break;

      case 'development':
        baseStructure.folders.push(
          { path: '/src', name: 'Source', description: 'Source code' },
          { path: '/tests', name: 'Tests', description: 'Test files' }
        );
        break;
    }

    return baseStructure;
  }

  private generateVariables(request: AITemplateRequest): TemplateVariable[] {
    return [
      {
        id: 'projectName',
        name: 'Project Name',
        description: 'Name of your project',
        type: 'text',
        defaultValue: 'My Project',
        required: true,
      },
      {
        id: 'description',
        name: 'Description',
        description: 'Project description',
        type: 'text',
        defaultValue: request.description || '',
        required: false,
      },
    ];
  }

  private generatePresets(_request: AITemplateRequest): ProjectTemplate['presets'] {
    return [
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Simple, clean setup',
        values: { complexity: 'starter' },
      },
      {
        id: 'standard',
        name: 'Standard',
        description: 'Balanced configuration',
        values: { complexity: 'basic' },
      },
      {
        id: 'full',
        name: 'Full Featured',
        description: 'All features enabled',
        values: { complexity: 'advanced' },
      },
    ];
  }

  private generateAlternatives(request: AITemplateRequest): Partial<ProjectTemplate>[] {
    return [
      {
        name: `${this.generateName(request.description)} - Lite`,
        description: 'Simplified version',
        complexity: 'starter',
      },
      {
        name: `${this.generateName(request.description)} - Pro`,
        description: 'Full-featured version',
        complexity: 'advanced',
      },
    ];
  }

  private loadBuiltInTemplates(): void {
    const builtIn: ProjectTemplate[] = [
      this.createBuiltInTemplate('landing-page', 'Landing Page', 'Modern landing page with hero, features, and CTA', 'design'),
      this.createBuiltInTemplate('dashboard-ui', 'Dashboard UI', 'Admin dashboard with charts and data tables', 'design'),
      this.createBuiltInTemplate('mobile-app', 'Mobile App Screens', 'iOS/Android app UI kit', 'design'),
      this.createBuiltInTemplate('brand-identity', 'Brand Identity Kit', 'Logo, colors, typography, and guidelines', 'branding'),
      this.createBuiltInTemplate('social-media-pack', 'Social Media Pack', 'Templates for all major platforms', 'social-media'),
      this.createBuiltInTemplate('pitch-deck', 'Pitch Deck', 'Investor presentation template', 'presentation'),
      this.createBuiltInTemplate('music-project', 'Music Project', 'Audio project with tracks and timeline', 'music'),
      this.createBuiltInTemplate('video-project', 'Video Project', 'Video editing project structure', 'video'),
    ];

    for (const template of builtIn) {
      this.templates.set(template.id, template);
    }
  }

  private createBuiltInTemplate(
    id: string,
    name: string,
    description: string,
    category: TemplateCategory
  ): ProjectTemplate {
    const now = new Date().toISOString();
    return {
      id,
      name,
      description,
      category,
      complexity: 'basic',
      tags: [category],
      author: { id: 'fluxstudio', name: 'FluxStudio Team' },
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      downloads: Math.floor(Math.random() * 10000) + 1000,
      rating: 4 + Math.random(),
      featured: Math.random() > 0.5,
      official: true,
      premium: false,
      structure: {
        projectType: category,
        defaultSettings: {},
        folders: [
          { path: '/assets', name: 'Assets' },
          { path: '/exports', name: 'Exports' },
        ],
        files: [],
        entities: [],
      },
      variables: [
        {
          id: 'projectName',
          name: 'Project Name',
          description: 'Name of your project',
          type: 'text',
          defaultValue: name,
          required: true,
        },
      ],
      presets: [],
    };
  }

  private loadCustomTemplates(): void {
    const stored = localStorage.getItem('flux_custom_templates');
    if (stored) {
      try {
        const templates: ProjectTemplate[] = JSON.parse(stored);
        for (const template of templates) {
          this.customTemplates.set(template.id, template);
        }
      } catch (error) {
        console.error('Failed to load custom templates:', error);
      }
    }
  }

  private persistCustomTemplates(): void {
    const templates = Array.from(this.customTemplates.values());
    localStorage.setItem('flux_custom_templates', JSON.stringify(templates));
  }
}

export const templateService = new TemplateService();
export default templateService;
