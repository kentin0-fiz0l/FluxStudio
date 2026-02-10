/**
 * Formation Template Registry - FluxStudio Drill Writer
 *
 * Registry of built-in and custom drill formation templates.
 * Provides templates for common formations like lines, V-shapes, diamonds, etc.
 */

import {
  DrillTemplate,
  TemplateCategory,
  TemplateFilter,
  TemplatePerformer,
  TemplateKeyframe,
  TemplatePosition,
} from './types';

// ============================================================================
// TEMPLATE CREATION HELPERS
// ============================================================================

function createTemplate(
  id: string,
  name: string,
  description: string,
  category: TemplateCategory,
  performers: TemplatePerformer[],
  keyframes: TemplateKeyframe[],
  options: Partial<DrillTemplate> = {}
): DrillTemplate {
  return {
    id,
    name,
    description,
    category,
    performers,
    keyframes,
    parameters: {
      minPerformers: options.parameters?.minPerformers ?? performers.length,
      maxPerformers: options.parameters?.maxPerformers,
      scalable: options.parameters?.scalable ?? true,
      reversible: options.parameters?.reversible ?? true,
      mirrorable: options.parameters?.mirrorable ?? true,
      rotatable: options.parameters?.rotatable ?? true,
    },
    tags: options.tags ?? [category],
    author: options.author ?? 'FluxStudio',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    ...options,
  };
}

function createInitialKeyframe(
  positions: Map<number, TemplatePosition>
): TemplateKeyframe {
  return {
    index: 0,
    timestamp: 0,
    transition: 'linear',
    positions,
  };
}

// ============================================================================
// BUILT-IN TEMPLATES
// ============================================================================

// Horizontal Line Formation
const lineTemplate: DrillTemplate = createTemplate(
  'line-horizontal',
  'Horizontal Line',
  'Performers arranged in a straight horizontal line',
  'basic',
  Array.from({ length: 8 }, (_, i) => ({
    index: i,
    label: String(i + 1),
    relativePosition: {
      x: 15 + (i * 70) / 7,
      y: 50,
      rotation: 0,
    },
  })),
  [
    createInitialKeyframe(
      new Map(
        Array.from({ length: 8 }, (_, i) => [
          i,
          { x: 15 + (i * 70) / 7, y: 50, rotation: 0 },
        ])
      )
    ),
  ],
  {
    tags: ['basic', 'line', 'row'],
    parameters: { minPerformers: 2, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// V-Formation
const vFormationTemplate: DrillTemplate = createTemplate(
  'v-formation',
  'V-Formation',
  'Classic V-shape pointing forward',
  'basic',
  [
    { index: 0, label: 'L', relativePosition: { x: 50, y: 25, rotation: 0 } },
    { index: 1, label: '1', relativePosition: { x: 40, y: 35, rotation: 0 } },
    { index: 2, label: '2', relativePosition: { x: 60, y: 35, rotation: 0 } },
    { index: 3, label: '3', relativePosition: { x: 30, y: 45, rotation: 0 } },
    { index: 4, label: '4', relativePosition: { x: 70, y: 45, rotation: 0 } },
    { index: 5, label: '5', relativePosition: { x: 20, y: 55, rotation: 0 } },
    { index: 6, label: '6', relativePosition: { x: 80, y: 55, rotation: 0 } },
    { index: 7, label: '7', relativePosition: { x: 10, y: 65, rotation: 0 } },
    { index: 8, label: '8', relativePosition: { x: 90, y: 65, rotation: 0 } },
  ],
  [
    createInitialKeyframe(
      new Map([
        [0, { x: 50, y: 25, rotation: 0 }],
        [1, { x: 40, y: 35, rotation: 0 }],
        [2, { x: 60, y: 35, rotation: 0 }],
        [3, { x: 30, y: 45, rotation: 0 }],
        [4, { x: 70, y: 45, rotation: 0 }],
        [5, { x: 20, y: 55, rotation: 0 }],
        [6, { x: 80, y: 55, rotation: 0 }],
        [7, { x: 10, y: 65, rotation: 0 }],
        [8, { x: 90, y: 65, rotation: 0 }],
      ])
    ),
  ],
  {
    tags: ['basic', 'v-shape', 'wedge', 'arrow'],
    parameters: { minPerformers: 3, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Diamond Formation
const diamondTemplate: DrillTemplate = createTemplate(
  'diamond',
  'Diamond',
  'Classic diamond shape formation',
  'basic',
  [
    { index: 0, label: '1', relativePosition: { x: 50, y: 20, rotation: 0 } },
    { index: 1, label: '2', relativePosition: { x: 30, y: 40, rotation: 0 } },
    { index: 2, label: '3', relativePosition: { x: 70, y: 40, rotation: 0 } },
    { index: 3, label: '4', relativePosition: { x: 50, y: 60, rotation: 0 } },
    { index: 4, label: '5', relativePosition: { x: 30, y: 60, rotation: 0 } },
    { index: 5, label: '6', relativePosition: { x: 70, y: 60, rotation: 0 } },
    { index: 6, label: '7', relativePosition: { x: 50, y: 80, rotation: 0 } },
  ],
  [
    createInitialKeyframe(
      new Map([
        [0, { x: 50, y: 20, rotation: 0 }],
        [1, { x: 30, y: 40, rotation: 0 }],
        [2, { x: 70, y: 40, rotation: 0 }],
        [3, { x: 50, y: 60, rotation: 0 }],
        [4, { x: 30, y: 60, rotation: 0 }],
        [5, { x: 70, y: 60, rotation: 0 }],
        [6, { x: 50, y: 80, rotation: 0 }],
      ])
    ),
  ],
  {
    tags: ['basic', 'diamond', 'rhombus'],
    parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Circle/Ring Formation
const circleTemplate: DrillTemplate = (() => {
  const count = 12;
  const performers: TemplatePerformer[] = [];
  const positions = new Map<number, TemplatePosition>();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + Math.cos(angle) * 35;
    const y = 50 + Math.sin(angle) * 35;
    const rotation = (angle + Math.PI / 2) * (180 / Math.PI);

    performers.push({
      index: i,
      label: String(i + 1),
      relativePosition: { x, y, rotation },
    });
    positions.set(i, { x, y, rotation });
  }

  return createTemplate(
    'circle',
    'Circle',
    'Performers arranged in a circle facing inward',
    'basic',
    performers,
    [createInitialKeyframe(positions)],
    {
      tags: ['basic', 'circle', 'ring'],
      parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
    }
  );
})();

// Box/Square Formation
const boxTemplate: DrillTemplate = createTemplate(
  'box',
  'Box',
  'Square/rectangular formation',
  'basic',
  [
    { index: 0, label: '1', relativePosition: { x: 25, y: 25, rotation: 0 } },
    { index: 1, label: '2', relativePosition: { x: 50, y: 25, rotation: 0 } },
    { index: 2, label: '3', relativePosition: { x: 75, y: 25, rotation: 0 } },
    { index: 3, label: '4', relativePosition: { x: 25, y: 50, rotation: 0 } },
    { index: 4, label: '5', relativePosition: { x: 75, y: 50, rotation: 0 } },
    { index: 5, label: '6', relativePosition: { x: 25, y: 75, rotation: 0 } },
    { index: 6, label: '7', relativePosition: { x: 50, y: 75, rotation: 0 } },
    { index: 7, label: '8', relativePosition: { x: 75, y: 75, rotation: 0 } },
  ],
  [
    createInitialKeyframe(
      new Map([
        [0, { x: 25, y: 25, rotation: 0 }],
        [1, { x: 50, y: 25, rotation: 0 }],
        [2, { x: 75, y: 25, rotation: 0 }],
        [3, { x: 25, y: 50, rotation: 0 }],
        [4, { x: 75, y: 50, rotation: 0 }],
        [5, { x: 25, y: 75, rotation: 0 }],
        [6, { x: 50, y: 75, rotation: 0 }],
        [7, { x: 75, y: 75, rotation: 0 }],
      ])
    ),
  ],
  {
    tags: ['basic', 'box', 'square', 'rectangle'],
    parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Scatter/Random Formation
const scatterTemplate: DrillTemplate = createTemplate(
  'scatter',
  'Scatter',
  'Random scattered positions across the stage',
  'basic',
  [
    { index: 0, label: '1', relativePosition: { x: 20, y: 30, rotation: 0 } },
    { index: 1, label: '2', relativePosition: { x: 65, y: 25, rotation: 0 } },
    { index: 2, label: '3', relativePosition: { x: 35, y: 55, rotation: 0 } },
    { index: 3, label: '4', relativePosition: { x: 80, y: 45, rotation: 0 } },
    { index: 4, label: '5', relativePosition: { x: 15, y: 70, rotation: 0 } },
    { index: 5, label: '6', relativePosition: { x: 55, y: 75, rotation: 0 } },
    { index: 6, label: '7', relativePosition: { x: 75, y: 70, rotation: 0 } },
    { index: 7, label: '8', relativePosition: { x: 45, y: 35, rotation: 0 } },
  ],
  [
    createInitialKeyframe(
      new Map([
        [0, { x: 20, y: 30, rotation: 0 }],
        [1, { x: 65, y: 25, rotation: 0 }],
        [2, { x: 35, y: 55, rotation: 0 }],
        [3, { x: 80, y: 45, rotation: 0 }],
        [4, { x: 15, y: 70, rotation: 0 }],
        [5, { x: 55, y: 75, rotation: 0 }],
        [6, { x: 75, y: 70, rotation: 0 }],
        [7, { x: 45, y: 35, rotation: 0 }],
      ])
    ),
  ],
  {
    tags: ['basic', 'scatter', 'random', 'spread'],
    parameters: { minPerformers: 2, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Spiral Formation
const spiralTemplate: DrillTemplate = (() => {
  const count = 12;
  const performers: TemplatePerformer[] = [];
  const positions = new Map<number, TemplatePosition>();

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 3 * Math.PI; // 1.5 rotations
    const radius = 10 + (i / count) * 35;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    const rotation = (angle + Math.PI / 2) * (180 / Math.PI);

    performers.push({
      index: i,
      label: String(i + 1),
      relativePosition: { x, y, rotation },
    });
    positions.set(i, { x, y, rotation });
  }

  return createTemplate(
    'spiral',
    'Spiral',
    'Performers arranged in a spiral pattern',
    'intermediate',
    performers,
    [createInitialKeyframe(positions)],
    {
      tags: ['intermediate', 'spiral', 'swirl'],
      parameters: { minPerformers: 5, scalable: true, reversible: true, mirrorable: true, rotatable: true },
    }
  );
})();

// Arrow Formation
const arrowTemplate: DrillTemplate = createTemplate(
  'arrow',
  'Arrow',
  'Arrow pointing forward with shaft',
  'intermediate',
  [
    // Arrow head
    { index: 0, label: '1', relativePosition: { x: 50, y: 20, rotation: 0 } },
    { index: 1, label: '2', relativePosition: { x: 35, y: 35, rotation: 0 } },
    { index: 2, label: '3', relativePosition: { x: 65, y: 35, rotation: 0 } },
    // Arrow shaft
    { index: 3, label: '4', relativePosition: { x: 50, y: 45, rotation: 0 } },
    { index: 4, label: '5', relativePosition: { x: 50, y: 55, rotation: 0 } },
    { index: 5, label: '6', relativePosition: { x: 50, y: 65, rotation: 0 } },
    { index: 6, label: '7', relativePosition: { x: 50, y: 75, rotation: 0 } },
  ],
  [
    createInitialKeyframe(
      new Map([
        [0, { x: 50, y: 20, rotation: 0 }],
        [1, { x: 35, y: 35, rotation: 0 }],
        [2, { x: 65, y: 35, rotation: 0 }],
        [3, { x: 50, y: 45, rotation: 0 }],
        [4, { x: 50, y: 55, rotation: 0 }],
        [5, { x: 50, y: 65, rotation: 0 }],
        [6, { x: 50, y: 75, rotation: 0 }],
      ])
    ),
  ],
  {
    tags: ['intermediate', 'arrow', 'pointer'],
    parameters: { minPerformers: 5, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Two Lines Formation
const twoLinesTemplate: DrillTemplate = createTemplate(
  'two-lines',
  'Two Lines',
  'Two parallel horizontal lines',
  'basic',
  Array.from({ length: 8 }, (_, i) => ({
    index: i,
    label: String(i + 1),
    relativePosition: {
      x: 20 + ((i % 4) * 60) / 3,
      y: i < 4 ? 35 : 65,
      rotation: 0,
    },
  })),
  [
    createInitialKeyframe(
      new Map(
        Array.from({ length: 8 }, (_, i) => [
          i,
          {
            x: 20 + ((i % 4) * 60) / 3,
            y: i < 4 ? 35 : 65,
            rotation: 0,
          },
        ])
      )
    ),
  ],
  {
    tags: ['basic', 'lines', 'rows', 'parallel'],
    parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Diagonal Line Formation
const diagonalTemplate: DrillTemplate = createTemplate(
  'diagonal',
  'Diagonal Line',
  'Performers arranged in a diagonal line',
  'basic',
  Array.from({ length: 8 }, (_, i) => ({
    index: i,
    label: String(i + 1),
    relativePosition: {
      x: 15 + (i * 70) / 7,
      y: 15 + (i * 70) / 7,
      rotation: 45,
    },
  })),
  [
    createInitialKeyframe(
      new Map(
        Array.from({ length: 8 }, (_, i) => [
          i,
          { x: 15 + (i * 70) / 7, y: 15 + (i * 70) / 7, rotation: 45 },
        ])
      )
    ),
  ],
  {
    tags: ['basic', 'diagonal', 'line'],
    parameters: { minPerformers: 2, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// ============================================================================
// TEMPLATE REGISTRY CLASS
// ============================================================================

class FormationTemplateRegistry {
  private templates: Map<string, DrillTemplate> = new Map();
  private customTemplates: Map<string, DrillTemplate> = new Map();

  constructor() {
    this.loadBuiltInTemplates();
  }

  private loadBuiltInTemplates(): void {
    const builtIn = [
      lineTemplate,
      vFormationTemplate,
      diamondTemplate,
      circleTemplate,
      boxTemplate,
      scatterTemplate,
      spiralTemplate,
      arrowTemplate,
      twoLinesTemplate,
      diagonalTemplate,
    ];

    for (const template of builtIn) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get all templates
   */
  getAllTemplates(): DrillTemplate[] {
    return [
      ...this.templates.values(),
      ...this.customTemplates.values(),
    ];
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): DrillTemplate | undefined {
    return this.templates.get(id) || this.customTemplates.get(id);
  }

  /**
   * Search/filter templates
   */
  searchTemplates(filter: TemplateFilter = {}): DrillTemplate[] {
    let results = this.getAllTemplates();

    if (filter.category) {
      results = results.filter(t => t.category === filter.category);
    }

    if (filter.search) {
      const query = filter.search.toLowerCase();
      results = results.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filter.minPerformers !== undefined) {
      results = results.filter(
        t => t.parameters.minPerformers <= filter.minPerformers!
      );
    }

    if (filter.maxPerformers !== undefined) {
      results = results.filter(
        t =>
          !t.parameters.maxPerformers ||
          t.parameters.maxPerformers >= filter.maxPerformers!
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(t =>
        filter.tags!.some(tag => t.tags.includes(tag))
      );
    }

    return results;
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): DrillTemplate[] {
    return this.searchTemplates({ category });
  }

  /**
   * Get all categories with counts
   */
  getCategories(): { category: TemplateCategory; count: number }[] {
    const categoryMap = new Map<TemplateCategory, number>();

    for (const template of this.getAllTemplates()) {
      categoryMap.set(
        template.category,
        (categoryMap.get(template.category) || 0) + 1
      );
    }

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Add a custom template
   */
  addCustomTemplate(template: DrillTemplate): void {
    this.customTemplates.set(template.id, template);
  }

  /**
   * Remove a custom template
   */
  removeCustomTemplate(id: string): boolean {
    return this.customTemplates.delete(id);
  }

  /**
   * Scale template positions for a given performer count
   * Returns adjusted positions that fit the available performers
   */
  scaleTemplateForPerformers(
    template: DrillTemplate,
    performerCount: number
  ): TemplatePosition[] {
    if (!template.parameters.scalable) {
      return template.performers.slice(0, performerCount).map(p => p.relativePosition);
    }

    const templateCount = template.performers.length;

    if (performerCount === templateCount) {
      return template.performers.map(p => p.relativePosition);
    }

    // Scale positions based on template type
    const scaledPositions: TemplatePosition[] = [];

    // For line-like templates, evenly distribute
    if (template.id.includes('line') || template.id === 'diagonal') {
      for (let i = 0; i < performerCount; i++) {
        const t = performerCount > 1 ? i / (performerCount - 1) : 0.5;
        const first = template.performers[0].relativePosition;
        const last = template.performers[template.performers.length - 1].relativePosition;

        scaledPositions.push({
          x: first.x + (last.x - first.x) * t,
          y: first.y + (last.y - first.y) * t,
          rotation: first.rotation,
        });
      }
    }
    // For circular templates, distribute around circle
    else if (template.id === 'circle') {
      for (let i = 0; i < performerCount; i++) {
        const angle = (i / performerCount) * 2 * Math.PI - Math.PI / 2;
        scaledPositions.push({
          x: 50 + Math.cos(angle) * 35,
          y: 50 + Math.sin(angle) * 35,
          rotation: (angle + Math.PI / 2) * (180 / Math.PI),
        });
      }
    }
    // Default: use first N positions or repeat last
    else {
      for (let i = 0; i < performerCount; i++) {
        if (i < templateCount) {
          scaledPositions.push(template.performers[i].relativePosition);
        } else {
          // Generate additional positions around the center
          const angle = ((i - templateCount) / (performerCount - templateCount)) * 2 * Math.PI;
          scaledPositions.push({
            x: 50 + Math.cos(angle) * 20,
            y: 50 + Math.sin(angle) * 20,
            rotation: 0,
          });
        }
      }
    }

    return scaledPositions;
  }
}

// Export singleton instance
export const templateRegistry = new FormationTemplateRegistry();
export default templateRegistry;
