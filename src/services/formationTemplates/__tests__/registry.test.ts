import { describe, it, expect } from 'vitest';

// Import the class via a fresh instance for testing
// (the module exports a singleton, but we can test its methods)
import { templateRegistry } from '../registry';

// ============================================================================
// templateRegistry
// ============================================================================

describe('templateRegistry', () => {
  // ==========================================================================
  // getAllTemplates
  // ==========================================================================

  describe('getAllTemplates', () => {
    it('returns all built-in templates', () => {
      const templates = templateRegistry.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('includes known template IDs', () => {
      const templates = templateRegistry.getAllTemplates();
      const ids = templates.map(t => t.id);
      expect(ids).toContain('line-horizontal');
      expect(ids).toContain('v-formation');
      expect(ids).toContain('diamond');
      expect(ids).toContain('circle');
      expect(ids).toContain('box');
      expect(ids).toContain('scatter');
      expect(ids).toContain('spiral');
      expect(ids).toContain('arrow');
      expect(ids).toContain('drill-company-front');
      expect(ids).toContain('drill-wedge');
    });

    it('includes Phase 4 transition templates', () => {
      const templates = templateRegistry.getAllTemplates();
      const ids = templates.map(t => t.id);
      expect(ids).toContain('show-concert-arc');
      expect(ids).toContain('show-diamond-to-box');
      expect(ids).toContain('show-diagonal-to-front');
      expect(ids).toContain('show-scatter-to-logo');
      expect(ids).toContain('show-basic-block-band');
    });

    it('all templates have required fields', () => {
      const templates = templateRegistry.getAllTemplates();
      for (const t of templates) {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.performers.length).toBeGreaterThan(0);
        expect(t.keyframes.length).toBeGreaterThan(0);
        expect(t.tags.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // getTemplate
  // ==========================================================================

  describe('getTemplate', () => {
    it('returns a template by ID', () => {
      const template = templateRegistry.getTemplate('line-horizontal');
      expect(template).toBeDefined();
      expect(template!.id).toBe('line-horizontal');
      expect(template!.name).toBe('Horizontal Line');
    });

    it('returns undefined for non-existent ID', () => {
      expect(templateRegistry.getTemplate('does-not-exist')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(templateRegistry.getTemplate('')).toBeUndefined();
    });

    it('returns correct template data for circle', () => {
      const template = templateRegistry.getTemplate('circle');
      expect(template).toBeDefined();
      expect(template!.category).toBe('basic');
      expect(template!.performers.length).toBe(12);
      expect(template!.parameters.minPerformers).toBe(4);
    });

    it('returns correct template data for v-formation', () => {
      const template = templateRegistry.getTemplate('v-formation');
      expect(template).toBeDefined();
      expect(template!.performers.length).toBe(9);
      expect(template!.tags).toContain('v-shape');
    });
  });

  // ==========================================================================
  // getByCategory (getTemplatesByCategory)
  // ==========================================================================

  describe('getByCategory', () => {
    it('returns templates filtered by basic category', () => {
      const templates = templateRegistry.getByCategory('basic');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('basic'));
    });

    it('returns templates filtered by intermediate category', () => {
      const templates = templateRegistry.getByCategory('intermediate');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('intermediate'));
    });

    it('returns templates filtered by drill category', () => {
      const templates = templateRegistry.getByCategory('drill');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach(t => expect(t.category).toBe('drill'));
    });

    it('returns empty array for category with no templates', () => {
      const templates = templateRegistry.getByCategory('advanced');
      expect(templates).toEqual([]);
    });

    it('returns empty array for custom category (no custom templates added)', () => {
      const templates = templateRegistry.getByCategory('custom');
      expect(templates).toEqual([]);
    });
  });

  // ==========================================================================
  // searchTemplates
  // ==========================================================================

  describe('searchTemplates', () => {
    it('returns all templates with empty filter', () => {
      const all = templateRegistry.getAllTemplates();
      const searched = templateRegistry.searchTemplates({});
      expect(searched.length).toBe(all.length);
    });

    it('filters by search term in name', () => {
      const results = templateRegistry.searchTemplates({ search: 'diamond' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        const matchesName = t.name.toLowerCase().includes('diamond');
        const matchesDesc = t.description.toLowerCase().includes('diamond');
        const matchesTags = t.tags.some(tag => tag.includes('diamond'));
        expect(matchesName || matchesDesc || matchesTags).toBe(true);
      });
    });

    it('filters by tag', () => {
      const results = templateRegistry.searchTemplates({ tags: ['marching'] });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.tags.some(tag => tag === 'marching')).toBe(true);
      });
    });

    it('filters by minPerformers', () => {
      const results = templateRegistry.searchTemplates({ minPerformers: 4 });
      // minPerformers filter keeps templates whose minPerformers <= the filter value
      results.forEach(t => {
        expect(t.parameters.minPerformers).toBeLessThanOrEqual(4);
      });
    });

    it('filters by maxPerformers', () => {
      const results = templateRegistry.searchTemplates({ maxPerformers: 8 });
      results.forEach(t => {
        // Templates without maxPerformers pass the filter
        if (t.parameters.maxPerformers) {
          expect(t.parameters.maxPerformers).toBeGreaterThanOrEqual(8);
        }
      });
    });

    it('combines category and search filters', () => {
      const results = templateRegistry.searchTemplates({ category: 'drill', search: 'wedge' });
      expect(results.length).toBeGreaterThan(0);
      results.forEach(t => {
        expect(t.category).toBe('drill');
      });
    });
  });

  // ==========================================================================
  // getCategories
  // ==========================================================================

  describe('getCategories', () => {
    it('returns categories with counts', () => {
      const categories = templateRegistry.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach(c => {
        expect(c.category).toBeTruthy();
        expect(c.count).toBeGreaterThan(0);
      });
    });

    it('includes basic and drill categories', () => {
      const categories = templateRegistry.getCategories();
      const categoryNames = categories.map(c => c.category);
      expect(categoryNames).toContain('basic');
      expect(categoryNames).toContain('drill');
    });

    it('sorts by count descending', () => {
      const categories = templateRegistry.getCategories();
      for (let i = 1; i < categories.length; i++) {
        expect(categories[i - 1].count).toBeGreaterThanOrEqual(categories[i].count);
      }
    });
  });

  // ==========================================================================
  // Custom templates
  // ==========================================================================

  describe('custom templates', () => {
    // Clean up after custom template tests
    afterEach(() => {
      templateRegistry.removeCustomTemplate('test-custom');
    });

    it('addCustomTemplate makes template available via getTemplate', () => {
      templateRegistry.addCustomTemplate({
        id: 'test-custom',
        name: 'Custom Test',
        description: 'A custom test template',
        category: 'custom',
        performers: [{ index: 0, label: '1', relativePosition: { x: 50, y: 50, rotation: 0 } }],
        keyframes: [{ index: 0, timestamp: 0, transition: 'linear', positions: new Map([[0, { x: 50, y: 50, rotation: 0 }]]) }],
        parameters: { minPerformers: 1, scalable: true, reversible: true, mirrorable: true, rotatable: true },
        tags: ['custom', 'test'],
        author: 'Test',
        version: '1.0.0',
      });

      expect(templateRegistry.getTemplate('test-custom')).toBeDefined();
      expect(templateRegistry.getTemplate('test-custom')!.name).toBe('Custom Test');
    });

    it('custom templates appear in getAllTemplates', () => {
      const beforeCount = templateRegistry.getAllTemplates().length;
      templateRegistry.addCustomTemplate({
        id: 'test-custom',
        name: 'Custom Test',
        description: 'A custom test template',
        category: 'custom',
        performers: [{ index: 0, label: '1', relativePosition: { x: 50, y: 50, rotation: 0 } }],
        keyframes: [{ index: 0, timestamp: 0, transition: 'linear', positions: new Map([[0, { x: 50, y: 50, rotation: 0 }]]) }],
        parameters: { minPerformers: 1, scalable: true, reversible: true, mirrorable: true, rotatable: true },
        tags: ['custom'],
      });

      expect(templateRegistry.getAllTemplates().length).toBe(beforeCount + 1);
    });

    it('removeCustomTemplate removes the template', () => {
      templateRegistry.addCustomTemplate({
        id: 'test-custom',
        name: 'Custom Test',
        description: 'A custom test template',
        category: 'custom',
        performers: [{ index: 0, label: '1', relativePosition: { x: 50, y: 50, rotation: 0 } }],
        keyframes: [{ index: 0, timestamp: 0, transition: 'linear', positions: new Map([[0, { x: 50, y: 50, rotation: 0 }]]) }],
        parameters: { minPerformers: 1, scalable: true, reversible: true, mirrorable: true, rotatable: true },
        tags: ['custom'],
      });

      const result = templateRegistry.removeCustomTemplate('test-custom');
      expect(result).toBe(true);
      expect(templateRegistry.getTemplate('test-custom')).toBeUndefined();
    });

    it('removeCustomTemplate returns false for non-existent ID', () => {
      expect(templateRegistry.removeCustomTemplate('does-not-exist')).toBe(false);
    });
  });

  // ==========================================================================
  // scaleTemplateForPerformers
  // ==========================================================================

  describe('scaleTemplateForPerformers', () => {
    it('returns original positions when count matches', () => {
      const template = templateRegistry.getTemplate('line-horizontal')!;
      const scaled = templateRegistry.scaleTemplateForPerformers(template, template.performers.length);
      expect(scaled.length).toBe(template.performers.length);
    });

    it('scales line template to fewer performers', () => {
      const template = templateRegistry.getTemplate('line-horizontal')!;
      const scaled = templateRegistry.scaleTemplateForPerformers(template, 4);
      expect(scaled.length).toBe(4);
      // First and last should be at template start/end
      expect(scaled[0].x).toBeCloseTo(template.performers[0].relativePosition.x);
      expect(scaled[3].x).toBeCloseTo(template.performers[template.performers.length - 1].relativePosition.x);
    });

    it('scales circle template to different count', () => {
      const template = templateRegistry.getTemplate('circle')!;
      const scaled = templateRegistry.scaleTemplateForPerformers(template, 8);
      expect(scaled.length).toBe(8);
      // All positions should be roughly on a circle of radius 35 around (50,50)
      for (const pos of scaled) {
        const dist = Math.sqrt((pos.x - 50) ** 2 + (pos.y - 50) ** 2);
        expect(dist).toBeCloseTo(35, 0);
      }
    });

    it('handles single performer for scalable template', () => {
      const template = templateRegistry.getTemplate('line-horizontal')!;
      const scaled = templateRegistry.scaleTemplateForPerformers(template, 1);
      expect(scaled.length).toBe(1);
    });

    it('generates extra positions for non-line/circle templates with more performers', () => {
      const template = templateRegistry.getTemplate('v-formation')!;
      const more = template.performers.length + 4;
      const scaled = templateRegistry.scaleTemplateForPerformers(template, more);
      expect(scaled.length).toBe(more);
    });

    it('uses first N positions for non-scalable templates', () => {
      // Create a non-scalable template
      const template = templateRegistry.getTemplate('v-formation')!;
      const nonScalable = { ...template, parameters: { ...template.parameters, scalable: false } };
      const scaled = templateRegistry.scaleTemplateForPerformers(nonScalable, 3);
      expect(scaled.length).toBe(3);
      // Should just slice the first 3 positions
      for (let i = 0; i < 3; i++) {
        expect(scaled[i]).toEqual(template.performers[i].relativePosition);
      }
    });
  });
});
