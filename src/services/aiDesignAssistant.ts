/**
 * AI Design Assistant Service
 * Provides intelligent design suggestions, color palette generation,
 * layout optimization, and collaborative feedback analysis.
 *
 * When the `ai_design_real` feature flag is on, methods call the
 * streaming backend endpoints and collect the full response.
 * When the flag is off, the original hardcoded mock data is returned.
 */

import { getFlagSync } from '@/services/featureFlagService';
import {
  streamDesignAnalysis,
  streamColorPaletteGeneration,
  streamLayoutAnalysis,
  streamAccessibilityReport,
} from '@/services/aiDesignFeedbackService';

// ============================================================================
// TYPES (all exported — keep unchanged)
// ============================================================================

export interface DesignSuggestion {
  id: string;
  type: 'color' | 'layout' | 'typography' | 'spacing' | 'accessibility';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  implementation: {
    css?: string;
    instructions: string;
    codeExample?: string;
  };
  reasoning: string;
  tags: string[];
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: {
    hex: string;
    name: string;
    role: 'primary' | 'secondary' | 'accent' | 'neutral' | 'background';
    accessibility: {
      contrastRatio: number;
      wcagCompliant: boolean;
    };
  }[];
  mood: string[];
  industry: string[];
  harmony: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary';
}

export interface LayoutAnalysis {
  id: string;
  score: number;
  issues: {
    type: 'hierarchy' | 'spacing' | 'alignment' | 'balance' | 'contrast';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
    location?: { x: number; y: number; width: number; height: number };
  }[];
  strengths: string[];
  improvements: DesignSuggestion[];
}

export interface CollaborationInsight {
  id: string;
  type: 'feedback_summary' | 'design_trend' | 'user_preference' | 'iteration_analysis';
  title: string;
  insight: string;
  confidence: number;
  actionable: boolean;
  suggestions: string[];
  data: Record<string, unknown>;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Collect all SSE chunks into a single string, then parse as JSON.
 * Returns the parsed object or null on failure.
 */
function collectStream<T>(
  startStream: (callbacks: {
    onChunk: (text: string) => void;
    onDone: (data?: unknown) => void;
    onError: (err: Error) => void;
    onStatus?: (message: string) => void;
  }) => AbortController,
): Promise<T | null> {
  return new Promise((resolve) => {
    let fullText = '';
    startStream({
      onChunk(text) {
        fullText += text;
      },
      onDone() {
        try {
          // Try to extract JSON from the response
          const jsonMatch = fullText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            resolve(JSON.parse(jsonMatch[0]) as T);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      },
      onError() {
        resolve(null);
      },
    });
  });
}

// ============================================================================
// MOCK DATA (fallback when feature flag is off)
// ============================================================================

const MOCK_SUGGESTIONS: DesignSuggestion[] = [
  {
    id: 'color-harmony-1',
    type: 'color',
    title: 'Improve Color Harmony',
    description: 'Consider using a more cohesive color palette to enhance visual unity',
    confidence: 0.85,
    impact: 'medium',
    implementation: {
      css: `
        :root {
          --primary: #6366f1;
          --secondary: #8b5cf6;
          --accent: #f59e0b;
          --neutral: #6b7280;
        }
      `,
      instructions: 'Replace current color variables with the suggested palette',
      codeExample: 'Update your CSS custom properties to use the recommended values'
    },
    reasoning: 'Current colors lack visual cohesion. The suggested palette uses complementary colors that create better harmony.',
    tags: ['color-theory', 'branding', 'accessibility']
  },
  {
    id: 'layout-spacing-1',
    type: 'spacing',
    title: 'Optimize Vertical Spacing',
    description: 'Increase spacing between sections to improve readability',
    confidence: 0.78,
    impact: 'medium',
    implementation: {
      css: '.section { margin-bottom: 3rem; }',
      instructions: 'Add consistent vertical spacing between major sections',
      codeExample: 'Use margin-bottom: 3rem for section spacing'
    },
    reasoning: 'Proper spacing improves content hierarchy and reduces cognitive load.',
    tags: ['spacing', 'readability', 'ux']
  },
  {
    id: 'typography-hierarchy-1',
    type: 'typography',
    title: 'Enhance Typography Hierarchy',
    description: 'Create clearer distinction between heading levels',
    confidence: 0.92,
    impact: 'high',
    implementation: {
      css: `
        h1 { font-size: 2.5rem; font-weight: 700; }
        h2 { font-size: 2rem; font-weight: 600; }
        h3 { font-size: 1.5rem; font-weight: 500; }
      `,
      instructions: 'Apply progressive font sizes and weights to establish clear hierarchy',
      codeExample: 'Update heading styles with the provided CSS'
    },
    reasoning: 'Clear typography hierarchy guides users through content and improves information architecture.',
    tags: ['typography', 'hierarchy', 'accessibility']
  },
  {
    id: 'accessibility-contrast-1',
    type: 'accessibility',
    title: 'Improve Color Contrast',
    description: 'Some text elements may not meet WCAG accessibility guidelines',
    confidence: 0.88,
    impact: 'high',
    implementation: {
      css: '.text-secondary { color: #374151; }',
      instructions: 'Update secondary text color to meet WCAG AA standards',
      codeExample: 'Ensure contrast ratio of at least 4.5:1 for normal text'
    },
    reasoning: 'Proper contrast ensures your design is accessible to users with visual impairments.',
    tags: ['accessibility', 'wcag', 'inclusive-design']
  }
];

const MOCK_PALETTES: ColorPalette[] = [
  {
    id: 'modern-tech-1',
    name: 'Modern Tech',
    colors: [
      { hex: '#6366f1', name: 'Indigo Blue', role: 'primary', accessibility: { contrastRatio: 4.8, wcagCompliant: true } },
      { hex: '#8b5cf6', name: 'Purple', role: 'secondary', accessibility: { contrastRatio: 4.2, wcagCompliant: true } },
      { hex: '#f59e0b', name: 'Amber', role: 'accent', accessibility: { contrastRatio: 5.1, wcagCompliant: true } },
      { hex: '#6b7280', name: 'Cool Gray', role: 'neutral', accessibility: { contrastRatio: 7.2, wcagCompliant: true } },
      { hex: '#f9fafb', name: 'Light Gray', role: 'background', accessibility: { contrastRatio: 15.8, wcagCompliant: true } }
    ],
    mood: ['professional', 'innovative', 'trustworthy'],
    industry: ['technology', 'design', 'finance'],
    harmony: 'split-complementary'
  },
  {
    id: 'creative-vibrant-1',
    name: 'Creative Vibrant',
    colors: [
      { hex: '#ef4444', name: 'Red', role: 'primary', accessibility: { contrastRatio: 5.2, wcagCompliant: true } },
      { hex: '#f97316', name: 'Orange', role: 'secondary', accessibility: { contrastRatio: 4.6, wcagCompliant: true } },
      { hex: '#eab308', name: 'Yellow', role: 'accent', accessibility: { contrastRatio: 4.3, wcagCompliant: true } },
      { hex: '#475569', name: 'Slate', role: 'neutral', accessibility: { contrastRatio: 8.1, wcagCompliant: true } },
      { hex: '#fef2f2', name: 'Warm White', role: 'background', accessibility: { contrastRatio: 16.2, wcagCompliant: true } }
    ],
    mood: ['energetic', 'creative', 'bold'],
    industry: ['creative', 'entertainment', 'marketing'],
    harmony: 'analogous'
  }
];

const MOCK_LAYOUT_ANALYSIS: LayoutAnalysis = {
  id: 'layout-analysis-mock',
  score: 8.2,
  issues: [
    {
      type: 'spacing',
      severity: 'medium',
      description: 'Inconsistent spacing between elements',
      suggestion: 'Use a consistent spacing system (8px grid)',
      location: { x: 100, y: 200, width: 300, height: 150 }
    },
    {
      type: 'hierarchy',
      severity: 'low',
      description: 'Secondary headings could be more prominent',
      suggestion: 'Increase font size of h2 elements by 4px'
    }
  ],
  strengths: [
    'Good use of white space',
    'Clear call-to-action placement',
    'Consistent color usage'
  ],
  improvements: [
    {
      id: 'layout-improve-1',
      type: 'layout',
      title: 'Implement 8px Grid System',
      description: 'Use consistent spacing based on 8px increments',
      confidence: 0.9,
      impact: 'medium',
      implementation: {
        css: `.spacing-sm { margin: 8px; } .spacing-md { margin: 16px; } .spacing-lg { margin: 24px; }`,
        instructions: 'Apply consistent spacing classes throughout your layout',
        codeExample: 'Replace arbitrary spacing values with grid-based system'
      },
      reasoning: 'Consistent spacing creates visual rhythm and professional appearance.',
      tags: ['spacing', 'grid-system', 'consistency']
    }
  ]
};

const MOCK_COLLABORATION_INSIGHTS: CollaborationInsight[] = [
  {
    id: 'collab-insight-1',
    type: 'feedback_summary',
    title: 'Most Common Feedback Themes',
    insight: 'Team members frequently mention color choices and spacing. Consider establishing design system guidelines.',
    confidence: 0.87,
    actionable: true,
    suggestions: [
      'Create a design system documentation',
      'Establish color palette guidelines',
      'Define spacing standards'
    ],
    data: {
      topKeywords: ['color', 'spacing', 'alignment'],
      feedbackCount: 24,
      averageSentiment: 0.6
    }
  },
  {
    id: 'collab-insight-2',
    type: 'design_trend',
    title: 'Design Iteration Patterns',
    insight: 'Your team tends to iterate on typography and layout more than color schemes, suggesting strong color direction.',
    confidence: 0.73,
    actionable: true,
    suggestions: [
      'Document successful color decisions',
      'Focus iteration time on layout refinements',
      'Create typography style guide'
    ],
    data: {
      iterationsByCategory: {
        typography: 8,
        layout: 12,
        color: 3,
        spacing: 6
      }
    }
  }
];

const MOCK_REALTIME_SUGGESTIONS: DesignSuggestion[] = [
  {
    id: 'realtime-1',
    type: 'spacing',
    title: 'Quick Spacing Fix',
    description: 'Add margin-top to align with design system',
    confidence: 0.75,
    impact: 'low',
    implementation: {
      css: 'margin-top: 16px;',
      instructions: 'Add spacing to maintain consistency',
      codeExample: 'element.style.marginTop = "16px"'
    },
    reasoning: 'Maintains spacing consistency with surrounding elements.',
    tags: ['quick-fix', 'spacing']
  }
];

const MOCK_ACCESSIBILITY_REPORT = {
  score: 8.5,
  issues: [
    {
      type: 'contrast',
      severity: 'medium',
      element: 'secondary-text',
      description: 'Contrast ratio of 3.8:1 is below WCAG AA standard',
      fix: 'Darken text color to #374151'
    }
  ],
  recommendations: [
    {
      id: 'a11y-1',
      type: 'accessibility' as const,
      title: 'Improve Color Contrast',
      description: 'Ensure all text meets WCAG AA contrast requirements',
      confidence: 0.95,
      impact: 'high' as const,
      implementation: {
        css: '.text-secondary { color: #374151; }',
        instructions: 'Update secondary text colors for better accessibility',
        codeExample: 'Aim for 4.5:1 contrast ratio minimum'
      },
      reasoning: 'Better contrast improves readability for all users, especially those with visual impairments.',
      tags: ['accessibility', 'wcag', 'contrast']
    }
  ]
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AIDesignAssistant {
  constructor() {
    this.initializeAPI();
  }

  private async initializeAPI() {
    // Reserved for future AI API key initialization
  }

  /**
   * Analyze design and provide intelligent suggestions
   */
  async analyzeDesign(designData: {
    imageUrl?: string;
    designElements?: Record<string, unknown>[];
    context?: string;
    userPreferences?: Record<string, unknown>;
  }): Promise<DesignSuggestion[]> {
    try {
      if (getFlagSync('ai_design_real')) {
        const result = await collectStream<DesignSuggestion[]>((callbacks) =>
          streamDesignAnalysis(
            {
              imageUrl: designData.imageUrl,
              designElements: designData.designElements,
              context: designData.context,
            },
            callbacks,
          ),
        );
        if (result && Array.isArray(result)) return result;
        // If the AI response wraps suggestions in an object, handle that
        if (result && typeof result === 'object' && 'suggestions' in result) {
          return (result as { suggestions: DesignSuggestion[] }).suggestions;
        }
      }

      // Mock fallback
      await this.delay(1500);
      return MOCK_SUGGESTIONS;
    } catch (error) {
      console.error('AI design analysis failed:', error);
      return [];
    }
  }

  /**
   * Generate intelligent color palettes based on context
   */
  async generateColorPalette(context: {
    industry?: string;
    mood?: string[];
    brand?: string;
    preferences?: Record<string, unknown>;
  }): Promise<ColorPalette[]> {
    try {
      if (getFlagSync('ai_design_real')) {
        const result = await collectStream<ColorPalette[]>((callbacks) =>
          streamColorPaletteGeneration(
            { industry: context.industry, mood: context.mood, brand: context.brand },
            callbacks,
          ),
        );
        if (result && Array.isArray(result)) return result;
        if (result && typeof result === 'object' && 'palettes' in result) {
          return (result as { palettes: ColorPalette[] }).palettes;
        }
      }

      // Mock fallback
      await this.delay(1200);
      return MOCK_PALETTES;
    } catch (error) {
      console.error('Color palette generation failed:', error);
      return [];
    }
  }

  /**
   * Analyze layout for usability and aesthetic issues
   */
  async analyzeLayout(layoutData: {
    elements: Record<string, unknown>[];
    viewport: { width: number; height: number };
    userFlow?: string[];
  }): Promise<LayoutAnalysis> {
    if (getFlagSync('ai_design_real')) {
      try {
        const result = await collectStream<LayoutAnalysis>((callbacks) =>
          streamLayoutAnalysis(
            { elements: layoutData.elements, viewport: layoutData.viewport },
            callbacks,
          ),
        );
        if (result) {
          return {
            ...MOCK_LAYOUT_ANALYSIS,
            ...result,
            id: result.id || `layout-analysis-${Date.now()}`,
          };
        }
      } catch (error) {
        console.error('Layout analysis failed, falling back to mock:', error);
      }
    }

    // Mock fallback
    await this.delay(1800);
    return { ...MOCK_LAYOUT_ANALYSIS, id: `layout-analysis-${Date.now()}` };
  }

  /**
   * Analyze collaboration patterns and provide insights
   */
  async analyzeCollaboration(_collaborationData: {
    messages: Record<string, unknown>[];
    feedback: Record<string, unknown>[];
    designIterations: Record<string, unknown>[];
    teamMembers: Record<string, unknown>[];
  }): Promise<CollaborationInsight[]> {
    try {
      await this.delay(2000);
      return MOCK_COLLABORATION_INSIGHTS;
    } catch (error) {
      console.error('Collaboration analysis failed:', error);
      return [];
    }
  }

  /**
   * Get real-time design suggestions during editing
   */
  async getRealTimeSuggestions(_currentContext: {
    selectedElement?: Record<string, unknown>;
    recentActions?: string[];
    userIntent?: string;
  }): Promise<DesignSuggestion[]> {
    try {
      await this.delay(500);
      return MOCK_REALTIME_SUGGESTIONS;
    } catch (error) {
      console.error('Real-time suggestions failed:', error);
      return [];
    }
  }

  /**
   * Generate accessibility report
   */
  async generateAccessibilityReport(designData: Record<string, unknown>): Promise<{
    score: number;
    issues: { type: string; severity: string; element: string; description: string; fix: string }[];
    recommendations: DesignSuggestion[];
  }> {
    if (getFlagSync('ai_design_real')) {
      try {
        const result = await collectStream<typeof MOCK_ACCESSIBILITY_REPORT>((callbacks) =>
          streamAccessibilityReport({ designData }, callbacks),
        );
        if (result && typeof result === 'object' && 'score' in result) {
          return {
            score: result.score ?? MOCK_ACCESSIBILITY_REPORT.score,
            issues: result.issues ?? MOCK_ACCESSIBILITY_REPORT.issues,
            recommendations: result.recommendations ?? MOCK_ACCESSIBILITY_REPORT.recommendations,
          };
        }
      } catch (error) {
        console.error('Accessibility report failed, falling back to mock:', error);
      }
    }

    // Mock fallback
    await this.delay(1000);
    return MOCK_ACCESSIBILITY_REPORT;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiDesignAssistant = new AIDesignAssistant();
export default aiDesignAssistant;
