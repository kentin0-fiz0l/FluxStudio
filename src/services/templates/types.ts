/**
 * Smart Project Templates - Type Definitions
 *
 * Defines the structure for project templates, customization options,
 * and AI-assisted template generation.
 */

// ============================================================================
// Template Categories
// ============================================================================

export type TemplateCategory =
  | 'design'
  | 'development'
  | 'marketing'
  | 'music'
  | 'video'
  | 'photography'
  | 'branding'
  | 'social-media'
  | 'presentation'
  | 'documentation'
  | 'custom';

export type TemplateComplexity = 'starter' | 'basic' | 'advanced' | 'enterprise';

// ============================================================================
// Template Definition
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  complexity: TemplateComplexity;
  thumbnail?: string;
  tags: string[];

  // Template metadata
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  version: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
  rating: number;

  // Feature flags
  featured: boolean;
  official: boolean;
  premium: boolean;

  // Template structure
  structure: TemplateStructure;

  // Customization options
  variables: TemplateVariable[];
  presets: TemplatePreset[];

  // AI generation hints
  aiHints?: AITemplateHints;
}

export interface TemplateStructure {
  // Project settings
  projectType: string;
  defaultSettings: Record<string, unknown>;

  // Folders and files
  folders: TemplateFolderDefinition[];
  files: TemplateFileDefinition[];

  // Pre-created entities
  entities?: TemplateEntityDefinition[];

  // Dependencies and integrations
  dependencies?: string[];
  integrations?: string[];
}

export interface TemplateFolderDefinition {
  path: string;
  name: string;
  description?: string;
}

export interface TemplateFileDefinition {
  path: string;
  name: string;
  type: string;
  content?: string;
  templateContent?: string; // With variable placeholders
  description?: string;
}

export interface TemplateEntityDefinition {
  type: 'board' | 'document' | 'task' | 'asset' | 'timeline';
  name: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Template Variables
// ============================================================================

export interface TemplateVariable {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'date' | 'image';
  defaultValue: unknown;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  options?: { value: string | number; label: string }[];
  group?: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  values: Record<string, unknown>;
  thumbnail?: string;
}

// ============================================================================
// AI Template Generation
// ============================================================================

export interface AITemplateHints {
  // Keywords for AI understanding
  keywords: string[];

  // Industry/domain context
  industry?: string;
  domain?: string;

  // Style preferences
  style?: {
    colors?: string[];
    typography?: string;
    mood?: string[];
  };

  // Content suggestions
  contentSuggestions?: {
    sections?: string[];
    features?: string[];
    integrations?: string[];
  };
}

export interface AITemplateRequest {
  description: string;
  category?: TemplateCategory;
  complexity?: TemplateComplexity;
  industry?: string;
  preferences?: {
    colors?: string[];
    style?: string;
    features?: string[];
  };
}

export interface AITemplateResponse {
  template: Partial<ProjectTemplate>;
  suggestions: {
    name: string;
    description: string;
    variables: TemplateVariable[];
    structure: Partial<TemplateStructure>;
  };
  confidence: number;
  alternatives?: Partial<ProjectTemplate>[];
}

// ============================================================================
// Template Operations
// ============================================================================

export interface CreateFromTemplateOptions {
  templateId: string;
  projectName: string;
  variables: Record<string, unknown>;
  preset?: string;
  targetLocation?: string;
}

export interface CreateFromTemplateResult {
  projectId: string;
  projectName: string;
  createdFiles: string[];
  createdEntities: { type: string; id: string; name: string }[];
  warnings?: string[];
}

export interface CustomTemplateOptions {
  name: string;
  description: string;
  category: TemplateCategory;
  projectId: string; // Source project to create template from
  includeContent: boolean;
  includeAssets: boolean;
  variables?: TemplateVariable[];
}

// ============================================================================
// Template Registry
// ============================================================================

export interface TemplateFilter {
  category?: TemplateCategory;
  complexity?: TemplateComplexity;
  search?: string;
  featured?: boolean;
  official?: boolean;
  premium?: boolean;
  sortBy?: 'downloads' | 'rating' | 'newest' | 'name';
}

export interface TemplateSearchResult {
  templates: ProjectTemplate[];
  total: number;
  page: number;
  hasMore: boolean;
}
