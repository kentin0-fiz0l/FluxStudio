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
// DRILL TEMPLATES
// ============================================================================

// Company Front - performers in a straight line across the field
const companyFrontTemplate: DrillTemplate = createTemplate(
  'drill-company-front',
  'Company Front',
  'All performers in a straight horizontal line across the field, the signature marching band formation',
  'drill',
  Array.from({ length: 12 }, (_, i) => ({
    index: i,
    label: String(i + 1),
    relativePosition: { x: 10 + (i * 80) / 11, y: 50, rotation: 0 },
  })),
  [
    createInitialKeyframe(
      new Map(Array.from({ length: 12 }, (_, i) => [i, { x: 10 + (i * 80) / 11, y: 50, rotation: 0 }]))
    ),
  ],
  {
    tags: ['drill', 'company-front', 'line', 'marching'],
    parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Wedge - inverted V formation moving forward
const wedgeTemplate: DrillTemplate = createTemplate(
  'drill-wedge',
  'Wedge',
  'Inverted V-shape with point performer at the front, classic marching band attack formation',
  'drill',
  [
    { index: 0, label: '1', relativePosition: { x: 50, y: 30, rotation: 0 } },
    { index: 1, label: '2', relativePosition: { x: 42, y: 38, rotation: 0 } },
    { index: 2, label: '3', relativePosition: { x: 58, y: 38, rotation: 0 } },
    { index: 3, label: '4', relativePosition: { x: 34, y: 46, rotation: 0 } },
    { index: 4, label: '5', relativePosition: { x: 66, y: 46, rotation: 0 } },
    { index: 5, label: '6', relativePosition: { x: 26, y: 54, rotation: 0 } },
    { index: 6, label: '7', relativePosition: { x: 74, y: 54, rotation: 0 } },
    { index: 7, label: '8', relativePosition: { x: 18, y: 62, rotation: 0 } },
    { index: 8, label: '9', relativePosition: { x: 82, y: 62, rotation: 0 } },
  ],
  [
    createInitialKeyframe(
      new Map([
        [0, { x: 50, y: 30, rotation: 0 }],
        [1, { x: 42, y: 38, rotation: 0 }],
        [2, { x: 58, y: 38, rotation: 0 }],
        [3, { x: 34, y: 46, rotation: 0 }],
        [4, { x: 66, y: 46, rotation: 0 }],
        [5, { x: 26, y: 54, rotation: 0 }],
        [6, { x: 74, y: 54, rotation: 0 }],
        [7, { x: 18, y: 62, rotation: 0 }],
        [8, { x: 82, y: 62, rotation: 0 }],
      ])
    ),
  ],
  {
    tags: ['drill', 'wedge', 'v-shape', 'marching'],
    parameters: { minPerformers: 3, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Stagger - offset rows for visual density
const staggerTemplate: DrillTemplate = createTemplate(
  'drill-stagger',
  'Stagger',
  'Offset rows creating a checkerboard pattern for visual density on the field',
  'drill',
  Array.from({ length: 12 }, (_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const offset = row % 2 === 1 ? 10 : 0;
    return {
      index: i,
      label: String(i + 1),
      relativePosition: { x: 20 + col * 20 + offset, y: 30 + row * 15, rotation: 0 },
    };
  }),
  [
    createInitialKeyframe(
      new Map(Array.from({ length: 12 }, (_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const offset = row % 2 === 1 ? 10 : 0;
        return [i, { x: 20 + col * 20 + offset, y: 30 + row * 15, rotation: 0 }];
      }))
    ),
  ],
  {
    tags: ['drill', 'stagger', 'offset', 'checkerboard', 'marching'],
    parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Fan Spread - performers spread out from a central point in a fan/arc
const fanSpreadTemplate: DrillTemplate = (() => {
  const count = 9;
  const performers: TemplatePerformer[] = [];
  const positions = new Map<number, TemplatePosition>();

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + ((i / (count - 1)) * Math.PI); // 180-degree fan
    const radius = 30;
    const x = 50 + Math.cos(angle) * radius;
    const y = 70 + Math.sin(angle) * radius;
    performers.push({ index: i, label: String(i + 1), relativePosition: { x, y, rotation: 0 } });
    positions.set(i, { x, y, rotation: 0 });
  }

  return createTemplate(
    'drill-fan-spread',
    'Fan Spread',
    'Performers arranged in a semicircular fan shape, spreading from a pivot point',
    'drill',
    performers,
    [createInitialKeyframe(positions)],
    {
      tags: ['drill', 'fan', 'spread', 'arc', 'marching'],
      parameters: { minPerformers: 5, scalable: true, reversible: true, mirrorable: true, rotatable: true },
    }
  );
})();

// Follow-the-Leader - curved serpentine path
const followTheLeaderTemplate: DrillTemplate = (() => {
  const count = 10;
  const performers: TemplatePerformer[] = [];
  const positions = new Map<number, TemplatePosition>();

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = 20 + t * 60;
    const y = 50 + Math.sin(t * 2 * Math.PI) * 15;
    performers.push({ index: i, label: String(i + 1), relativePosition: { x, y, rotation: 0 } });
    positions.set(i, { x, y, rotation: 0 });
  }

  return createTemplate(
    'drill-follow-the-leader',
    'Follow the Leader',
    'Performers along a serpentine curve, classic follow-the-leader drill move',
    'drill',
    performers,
    [createInitialKeyframe(positions)],
    {
      tags: ['drill', 'follow-the-leader', 'serpentine', 'curve', 'marching'],
      parameters: { minPerformers: 5, scalable: true, reversible: true, mirrorable: true, rotatable: true },
    }
  );
})();

// Gate Turn - two lines that pivot open like a gate
const gateTurnTemplate: DrillTemplate = createTemplate(
  'drill-gate-turn',
  'Gate Turn',
  'Two mirrored lines that pivot from a center point, opening like a gate',
  'drill',
  [
    // Left gate
    { index: 0, label: '1', relativePosition: { x: 50, y: 35, rotation: 0 } },
    { index: 1, label: '2', relativePosition: { x: 42, y: 35, rotation: 0 } },
    { index: 2, label: '3', relativePosition: { x: 34, y: 35, rotation: 0 } },
    { index: 3, label: '4', relativePosition: { x: 26, y: 35, rotation: 0 } },
    // Right gate
    { index: 4, label: '5', relativePosition: { x: 50, y: 65, rotation: 0 } },
    { index: 5, label: '6', relativePosition: { x: 58, y: 65, rotation: 0 } },
    { index: 6, label: '7', relativePosition: { x: 66, y: 65, rotation: 0 } },
    { index: 7, label: '8', relativePosition: { x: 74, y: 65, rotation: 0 } },
  ],
  [
    createInitialKeyframe(
      new Map([
        [0, { x: 50, y: 35, rotation: 0 }],
        [1, { x: 42, y: 35, rotation: 0 }],
        [2, { x: 34, y: 35, rotation: 0 }],
        [3, { x: 26, y: 35, rotation: 0 }],
        [4, { x: 50, y: 65, rotation: 0 }],
        [5, { x: 58, y: 65, rotation: 0 }],
        [6, { x: 66, y: 65, rotation: 0 }],
        [7, { x: 74, y: 65, rotation: 0 }],
      ])
    ),
  ],
  {
    tags: ['drill', 'gate', 'turn', 'pivot', 'marching'],
    parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  }
);

// Pinwheel - performers arranged in radial arms from center
const pinwheelTemplate: DrillTemplate = (() => {
  const arms = 4;
  const perArm = 3;
  const performers: TemplatePerformer[] = [];
  const positions = new Map<number, TemplatePosition>();

  for (let arm = 0; arm < arms; arm++) {
    const baseAngle = (arm / arms) * 2 * Math.PI - Math.PI / 2;
    for (let j = 0; j < perArm; j++) {
      const idx = arm * perArm + j;
      const radius = 10 + j * 12;
      const x = 50 + Math.cos(baseAngle) * radius;
      const y = 50 + Math.sin(baseAngle) * radius;
      performers.push({ index: idx, label: String(idx + 1), relativePosition: { x, y, rotation: 0 } });
      positions.set(idx, { x, y, rotation: 0 });
    }
  }

  return createTemplate(
    'drill-pinwheel',
    'Pinwheel',
    'Performers arranged in radial arms from a center point, spinning pinwheel formation',
    'drill',
    performers,
    [createInitialKeyframe(positions)],
    {
      tags: ['drill', 'pinwheel', 'radial', 'spin', 'marching'],
      parameters: { minPerformers: 4, scalable: true, reversible: true, mirrorable: true, rotatable: true },
    }
  );
})();

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
      companyFrontTemplate,
      wedgeTemplate,
      staggerTemplate,
      fanSpreadTemplate,
      followTheLeaderTemplate,
      gateTurnTemplate,
      pinwheelTemplate,
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
