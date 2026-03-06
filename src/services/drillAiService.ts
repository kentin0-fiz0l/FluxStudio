/**
 * Drill AI Service - FluxStudio
 *
 * AI-powered drill analysis and generation features:
 * - Drill critique (visual effectiveness, marching feasibility)
 * - Formation-from-description (text-to-drill)
 * - Section-aware generation
 * - Quick-start show builder
 */

import type {
  Formation,
  DrillSet,
  Position,
  Performer,
  FieldConfig,
} from './formationTypes';
import { fullDrillAnalysis, DEFAULT_ANALYSIS_CONFIG, type AnalysisResult } from './drillAnalysis';
// NCAA_FOOTBALL_FIELD available from fieldConfigService for field-specific analysis

// ============================================================================
// TYPES
// ============================================================================

export interface DrillCritiqueRequest {
  formation: Formation;
  sets: DrillSet[];
  fieldConfig?: FieldConfig;
  /** Focus on specific sets (by index range) */
  setRange?: { start: number; end: number };
  /** Specific aspects to critique */
  focus?: ('visual' | 'feasibility' | 'transitions' | 'spacing')[];
}

export interface DrillCritiqueResult {
  overallScore: number; // 0-100
  summary: string;
  categories: DrillCritiqueCategory[];
  suggestions: DrillSuggestion[];
  analysisData: AnalysisResult;
}

export interface DrillCritiqueCategory {
  name: string;
  score: number;
  details: string;
}

export interface DrillSuggestion {
  type: 'improvement' | 'warning' | 'tip';
  setIndex?: number;
  setName?: string;
  performerIds?: string[];
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FormationFromDescriptionRequest {
  description: string;
  performers: Performer[];
  fieldConfig?: FieldConfig;
  /** Target number of counts per set */
  defaultCounts?: number;
  /** Whether to keep sections together */
  sectionAware?: boolean;
}

export interface FormationFromDescriptionResult {
  sets: Array<{
    name: string;
    counts: number;
    positions: Map<string, Position>;
    notes?: string;
  }>;
  description: string;
}

export interface QuickStartConfig {
  showName: string;
  bandSize: number;
  fieldType: FieldConfig['type'];
  showDuration: number; // in minutes
  sections: Array<{ name: string; instrument: string; count: number }>;
  musicBpm?: number;
}

// ============================================================================
// DRILL CRITIQUE
// ============================================================================

/**
 * Generate a comprehensive drill critique using analysis data.
 * This runs locally (no API call) using the drill analysis engine.
 * For AI-enhanced critique, pass the result to the AI endpoint.
 */
export function generateDrillCritique(
  request: DrillCritiqueRequest,
): DrillCritiqueResult {
  const analysis = fullDrillAnalysis(request.formation, request.sets, DEFAULT_ANALYSIS_CONFIG);

  // Categorize issues
  const collisionIssues = analysis.issues.filter((i) => i.type === 'collision');
  const strideIssues = analysis.issues.filter((i) => i.type === 'stride');
  const directionIssues = analysis.issues.filter((i) => i.type === 'direction_change');

  // Score each category
  const categories: DrillCritiqueCategory[] = [];

  // 1. Spacing/Collisions
  const collisionScore = Math.max(0, 100 - collisionIssues.length * 15);
  categories.push({
    name: 'Spacing & Collisions',
    score: collisionScore,
    details: collisionIssues.length === 0
      ? 'No collision issues detected.'
      : `${collisionIssues.length} collision(s) found where performers are too close.`,
  });

  // 2. Stride Feasibility
  const strideScore = Math.max(0, 100 - strideIssues.length * 10);
  categories.push({
    name: 'Stride Feasibility',
    score: strideScore,
    details: strideIssues.length === 0
      ? 'All step sizes are within comfortable range.'
      : `${strideIssues.length} transition(s) require uncomfortable step sizes.`,
  });

  // 3. Direction Changes
  const directionScore = Math.max(0, 100 - directionIssues.length * 8);
  categories.push({
    name: 'Movement Flow',
    score: directionScore,
    details: directionIssues.length === 0
      ? 'Smooth movement with no abrupt direction changes.'
      : `${directionIssues.length} abrupt direction change(s) detected.`,
  });

  // Overall score (weighted average)
  const overallScore = Math.round(
    collisionScore * 0.35 + strideScore * 0.4 + directionScore * 0.25,
  );

  // Generate suggestions from issues
  const suggestions: DrillSuggestion[] = [];

  for (const issue of collisionIssues.slice(0, 5)) {
    suggestions.push({
      type: 'warning',
      setName: issue.setName,
      performerIds: issue.performerIds,
      message: issue.message,
      priority: 'high',
    });
  }

  for (const issue of strideIssues.slice(0, 5)) {
    suggestions.push({
      type: 'improvement',
      setName: issue.setName,
      performerIds: issue.performerIds,
      message: issue.message,
      priority: issue.severity === 'error' ? 'high' : 'medium',
    });
  }

  for (const issue of directionIssues.slice(0, 3)) {
    suggestions.push({
      type: 'improvement',
      setName: issue.setName,
      performerIds: issue.performerIds,
      message: issue.message,
      priority: 'medium',
    });
  }

  // General tips based on analysis
  if (request.sets.length > 0) {
    const avgCounts = request.sets.reduce((s, set) => s + set.counts, 0) / request.sets.length;
    if (avgCounts < 6) {
      suggestions.push({
        type: 'tip',
        message: `Average set duration is only ${avgCounts.toFixed(0)} counts. Consider longer sets (8-16 counts) for cleaner transitions.`,
        priority: 'medium',
      });
    }
  }

  if (overallScore >= 80) {
    suggestions.push({
      type: 'tip',
      message: 'This drill is well-written with good spacing and achievable step sizes.',
      priority: 'low',
    });
  }

  const summary = overallScore >= 80
    ? 'Excellent drill with clean transitions and safe spacing.'
    : overallScore >= 60
      ? 'Good drill with some areas that could be improved.'
      : 'Several issues need attention before this drill is ready for the field.';

  return {
    overallScore,
    summary,
    categories,
    suggestions,
    analysisData: analysis,
  };
}

// ============================================================================
// FORMATION FROM DESCRIPTION (local generation)
// ============================================================================

/**
 * Generate basic formations from a text description.
 * This is a local heuristic generator; for AI-powered generation,
 * use the FormationDraftPanel which connects to the AI backend.
 *
 * Supports simple patterns:
 * - "company front" -> horizontal line
 * - "block" -> grid block
 * - "scatter" -> random scatter
 * - "diagonal" -> diagonal line
 * - "circle" / "arc" -> circular arrangement
 */
export function generateFormationFromDescription(
  request: FormationFromDescriptionRequest,
): FormationFromDescriptionResult {
  const desc = request.description.toLowerCase();
  const count = request.performers.length;
  const defaultCounts = request.defaultCounts ?? 8;

  const sets: FormationFromDescriptionResult['sets'] = [];

  // Parse simple multi-set descriptions: "X to Y in N counts"
  const transitionMatch = desc.match(/(.+?)\s+to\s+(.+?)(?:\s+in\s+(\d+)\s+counts?)?$/);

  if (transitionMatch) {
    const [, fromDesc, toDesc, countsStr] = transitionMatch;
    const counts = countsStr ? parseInt(countsStr, 10) : defaultCounts;

    sets.push({
      name: 'Set 1',
      counts,
      positions: generatePattern(fromDesc, request.performers),
      notes: `Starting: ${fromDesc}`,
    });
    sets.push({
      name: 'Set 2',
      counts,
      positions: generatePattern(toDesc, request.performers),
      notes: `Ending: ${toDesc}`,
    });
  } else {
    // Single formation
    sets.push({
      name: 'Set 1',
      counts: defaultCounts,
      positions: generatePattern(desc, request.performers),
    });
  }

  return {
    sets,
    description: `Generated ${sets.length} set(s) for ${count} performers.`,
  };
}

function generatePattern(
  description: string,
  performers: Performer[],
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const count = performers.length;

  if (description.includes('company front') || description.includes('line')) {
    const y = 50;
    for (let i = 0; i < count; i++) {
      const x = 10 + (80 * i) / Math.max(1, count - 1);
      positions.set(performers[i].id, { x, y });
    }
  } else if (description.includes('block') || description.includes('grid')) {
    const cols = Math.ceil(Math.sqrt(count * 1.5));
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 15 + (70 * col) / Math.max(1, cols - 1);
      const y = 20 + (60 * row) / Math.max(1, rows - 1);
      positions.set(performers[i].id, { x, y });
    }
  } else if (description.includes('scatter')) {
    for (let i = 0; i < count; i++) {
      const angle = (i * 137.508) * (Math.PI / 180); // golden angle
      const r = 35 * Math.sqrt(i / count);
      const x = 50 + r * Math.cos(angle);
      const y = 50 + r * Math.sin(angle);
      positions.set(performers[i].id, {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
      });
    }
  } else if (description.includes('circle') || description.includes('arc')) {
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      const x = 50 + 30 * Math.cos(angle);
      const y = 50 + 30 * Math.sin(angle);
      positions.set(performers[i].id, { x, y });
    }
  } else if (description.includes('diagonal')) {
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      positions.set(performers[i].id, { x: 10 + 80 * t, y: 15 + 70 * t });
    }
  } else if (description.includes('v') || description.includes('wedge')) {
    const half = Math.ceil(count / 2);
    for (let i = 0; i < count; i++) {
      const side = i < half ? -1 : 1;
      const idx = i < half ? i : i - half;
      const depth = idx / Math.max(1, half - 1);
      const x = 50 + side * (5 + depth * 30);
      const y = 20 + depth * 50;
      positions.set(performers[i].id, { x, y });
    }
  } else {
    // Default: company front
    const y = 50;
    for (let i = 0; i < count; i++) {
      const x = 10 + (80 * i) / Math.max(1, count - 1);
      positions.set(performers[i].id, { x, y });
    }
  }

  return positions;
}

// ============================================================================
// QUICK START
// ============================================================================

/**
 * Generate a quick-start show skeleton from configuration.
 * Creates performers with proper section/instrument assignment
 * and a basic show structure.
 */
export function generateQuickStartShow(
  config: QuickStartConfig,
): {
  performers: Omit<Performer, 'id'>[];
  initialSets: Array<{ name: string; counts: number; description: string }>;
} {
  const performers: Omit<Performer, 'id'>[] = [];
  const sectionColors: Record<string, string> = {
    Brass: '#f59e0b',
    Woodwinds: '#10b981',
    Percussion: '#ef4444',
    'Color Guard': '#8b5cf6',
    'Drum Major': '#3b82f6',
  };

  let drillNum = 1;
  for (const section of config.sections) {
    const color = sectionColors[section.name] || '#6b7280';
    for (let i = 0; i < section.count; i++) {
      const prefix = section.instrument.charAt(0).toUpperCase();
      performers.push({
        name: `${section.instrument} ${i + 1}`,
        label: `${prefix}${i + 1}`,
        color,
        instrument: section.instrument,
        section: section.name,
        drillNumber: `${prefix}${drillNum}`,
      });
      drillNum++;
    }
  }

  // Estimate number of sets based on show duration and BPM
  const bpm = config.musicBpm ?? 120;
  const totalCounts = Math.round((config.showDuration * 60 * bpm) / 60);
  const avgCountsPerSet = 12;
  const estimatedSets = Math.max(4, Math.round(totalCounts / avgCountsPerSet));

  // Generate basic show structure
  const initialSets: Array<{ name: string; counts: number; description: string }> = [];

  const openerSets = Math.max(2, Math.round(estimatedSets * 0.25));
  for (let i = 0; i < openerSets; i++) {
    initialSets.push({
      name: `Opener ${i + 1}`,
      counts: i === 0 ? 16 : 8,
      description: i === 0 ? 'Opening formation' : 'Opener transition',
    });
  }

  const balladSets = Math.max(2, Math.round(estimatedSets * 0.2));
  for (let i = 0; i < balladSets; i++) {
    initialSets.push({
      name: `Ballad ${i + 1}`,
      counts: 16,
      description: 'Ballad section',
    });
  }

  const closerSets = estimatedSets - openerSets - balladSets;
  for (let i = 0; i < closerSets; i++) {
    initialSets.push({
      name: `Closer ${i + 1}`,
      counts: i === closerSets - 1 ? 16 : 8,
      description: i === closerSets - 1 ? 'Final set' : 'Closer transition',
    });
  }

  return { performers, initialSets };
}
