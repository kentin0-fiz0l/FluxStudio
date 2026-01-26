/**
 * Flux Studio Service Types & Product Offerings
 * Aligned with the creative design shop's specialization in marching arts
 */

// Core service categories based on Flux Studio's offerings
export type ServiceCategory =
  | 'design-concepts'
  | 'visual-production'
  | 'performance-design'
  | 'consultation'
  | 'full-season';

// Specific project types that align with Flux Studio services
export type ProjectType =
  // Design Concepts
  | 'show-concept'           // Complete show design concept with mood boards
  | 'visual-identity'         // Brand identity for ensemble
  | 'theme-development'       // Show theme and narrative development

  // Visual Production
  | 'storyboarding'          // Key frames and visual mockups
  | 'uniform-design'         // Costume and uniform designs
  | 'props-scenic'           // Props and scenic element design
  | 'backdrop-design'        // Stage backdrops and visual elements

  // Performance Design
  | 'drill-design'           // Full drill writing and staging
  | 'choreography'           // Movement and dance choreography
  | 'formation-design'       // Specific formation and transition design
  | 'staging-coordination'   // Complete staging and visual coordination

  // Consultation Services
  | 'design-consultation'    // One-on-one sessions with Kentino
  | 'show-analysis'          // Current show analysis and recommendations
  | 'visual-coaching'        // Visual performance coaching
  | 'staff-training'         // Staff development and training

  // Full Season Support
  | 'season-package'         // Complete season-long support package
  | 'monthly-support'        // Ongoing monthly check-ins and updates
  | 'competition-prep'       // Competition-specific preparation
  | 'mid-season-redesign';   // Mid-season show adjustments

// Ensemble types that Flux Studio serves
export type EnsembleType =
  | 'marching-band'
  | 'indoor-winds'
  | 'winter-guard'
  | 'indoor-percussion'
  | 'drum-corps'
  | 'parade-band'
  | 'pep-band'
  | 'concert-band';

// Service package tiers
export type ServiceTier =
  | 'foundation'      // Basic design concepts and initial direction
  | 'standard'        // Full design with deliverables
  | 'premium'         // Complete package with ongoing support
  | 'elite';          // Founder-led comprehensive service

// Project metadata interface
export interface ProjectMetadata {
  projectType: ProjectType;
  ensembleType: EnsembleType;
  serviceCategory: ServiceCategory;
  serviceTier: ServiceTier;

  // Show-specific details
  showDetails?: {
    title: string;
    theme: string;
    musicSelections?: string[];
    duration?: number; // in minutes
    performers?: number;
    ageGroup?: 'elementary' | 'middle-school' | 'high-school' | 'university' | 'independent' | 'all-age';
  };

  // Competition/Performance details
  performanceDetails?: {
    venue?: 'field' | 'gym' | 'stage' | 'street' | 'multi-venue';
    competitions?: string[];
    premiereDate?: string;
    seasonEndDate?: string;
  };

  // Design specifications
  designSpecs?: {
    colorPalette?: string[];
    styleDirection?: 'contemporary' | 'traditional' | 'avant-garde' | 'theatrical' | 'minimalist' | 'cinematic';
    visualElements?: ('props' | 'backdrops' | 'costumes' | 'flags' | 'screens' | 'lighting')[];
    specialRequirements?: string[];
  };

  // Deliverables tracking
  deliverables?: {
    conceptBoards?: boolean;
    storyboards?: boolean;
    drillCharts?: boolean;
    uniformDesigns?: boolean;
    propDesigns?: boolean;
    coordinationGuides?: boolean;
    videoFeedback?: boolean;
  };

  tags: string[];
}

// Service offerings with descriptions
export const SERVICE_OFFERINGS = {
  'design-concepts': {
    name: 'Design Concepts',
    description: 'Foundation packages with creative direction, mood boards, and initial concepts',
    icon: 'Palette',
    projectTypes: ['show-concept', 'visual-identity', 'theme-development'],
    defaultTier: 'foundation' as ServiceTier
  },
  'visual-production': {
    name: 'Visual Production',
    description: 'Complete visual design including storyboards, uniforms, props, and scenic elements',
    icon: 'Image',
    projectTypes: ['storyboarding', 'uniform-design', 'props-scenic', 'backdrop-design'],
    defaultTier: 'standard' as ServiceTier
  },
  'performance-design': {
    name: 'Performance Design',
    description: 'Drill writing, choreography, and complete staging coordination',
    icon: 'Users',
    projectTypes: ['drill-design', 'choreography', 'formation-design', 'staging-coordination'],
    defaultTier: 'premium' as ServiceTier
  },
  'consultation': {
    name: 'Design Consultation',
    description: 'Direct consultation with Kentino for show refinement and creative guidance',
    icon: 'MessageCircle',
    projectTypes: ['design-consultation', 'show-analysis', 'visual-coaching', 'staff-training'],
    defaultTier: 'standard' as ServiceTier
  },
  'full-season': {
    name: 'Full Season Support',
    description: 'Comprehensive season-long support with ongoing updates and feedback',
    icon: 'Calendar',
    projectTypes: ['season-package', 'monthly-support', 'competition-prep', 'mid-season-redesign'],
    defaultTier: 'elite' as ServiceTier
  }
} as const;

// Project type details for UI display
export const PROJECT_TYPE_DETAILS = {
  // Design Concepts
  'show-concept': {
    name: 'Complete Show Concept',
    category: 'design-concepts',
    description: 'Full show design with theme, visual identity, and creative direction',
    estimatedDuration: '2-3 weeks',
    deliverables: ['Concept boards', 'Color systems', 'Shape language', 'Scene breakdowns']
  },
  'visual-identity': {
    name: 'Visual Identity Package',
    category: 'design-concepts',
    description: 'Brand identity for your ensemble including logos, colors, and style guide',
    estimatedDuration: '1-2 weeks',
    deliverables: ['Logo design', 'Color palette', 'Typography guide', 'Application examples']
  },
  'theme-development': {
    name: 'Theme & Narrative Development',
    category: 'design-concepts',
    description: 'Show theme exploration with narrative arc and emotional journey mapping',
    estimatedDuration: '1 week',
    deliverables: ['Theme statement', 'Narrative outline', 'Musical suggestions', 'Visual concepts']
  },

  // Visual Production
  'storyboarding': {
    name: 'Storyboarding & Mockups',
    category: 'visual-production',
    description: 'Key frame designs and visual mockups for show moments',
    estimatedDuration: '2 weeks',
    deliverables: ['Key frames', 'Transition guides', 'Visual mockups', 'Scene flow']
  },
  'uniform-design': {
    name: 'Uniform & Costume Design',
    category: 'visual-production',
    description: 'Complete costume designs for all ensemble sections',
    estimatedDuration: '2-3 weeks',
    deliverables: ['Design sketches', 'Fabric specs', 'Color variations', 'Accessory details']
  },
  'props-scenic': {
    name: 'Props & Scenic Design',
    category: 'visual-production',
    description: 'Custom prop and scenic element designs',
    estimatedDuration: '2-3 weeks',
    deliverables: ['Concept sketches', 'Construction guides', 'Material lists', 'Staging maps']
  },
  'backdrop-design': {
    name: 'Backdrop & Stage Design',
    category: 'visual-production',
    description: 'Stage backdrop and environmental design elements',
    estimatedDuration: '1-2 weeks',
    deliverables: ['Backdrop artwork', 'Placement guides', 'Lighting notes', 'Setup diagrams']
  },

  // Performance Design
  'drill-design': {
    name: 'Complete Drill Design',
    category: 'performance-design',
    description: 'Full show drill writing with all formations and transitions',
    estimatedDuration: '4-6 weeks',
    deliverables: ['Drill charts', 'Count sheets', 'Transition guides', 'Coordinate files']
  },
  'choreography': {
    name: 'Movement Choreography',
    category: 'performance-design',
    description: 'Body movement and dance choreography for all performers',
    estimatedDuration: '3-4 weeks',
    deliverables: ['Choreography videos', 'Count breakdowns', 'Teaching guides', 'Style notes']
  },
  'formation-design': {
    name: 'Formation & Transition Design',
    category: 'performance-design',
    description: 'Specific formation designs and transition pathways',
    estimatedDuration: '2-3 weeks',
    deliverables: ['Formation charts', 'Path diagrams', 'Timing guides', 'Visual references']
  },
  'staging-coordination': {
    name: 'Complete Staging Coordination',
    category: 'performance-design',
    description: 'Full visual coordination integrating all elements',
    estimatedDuration: '3-4 weeks',
    deliverables: ['Staging bible', 'Integration timeline', 'Rehearsal guides', 'Equipment lists']
  },

  // Consultation
  'design-consultation': {
    name: 'Design Consultation Session',
    category: 'consultation',
    description: 'One-on-one consultation with Kentino for creative guidance',
    estimatedDuration: 'Ongoing',
    deliverables: ['Meeting notes', 'Action items', 'Design recommendations', 'Follow-up support']
  },
  'show-analysis': {
    name: 'Show Analysis & Review',
    category: 'consultation',
    description: 'Comprehensive analysis of current show with improvement recommendations',
    estimatedDuration: '1 week',
    deliverables: ['Analysis report', 'Video feedback', 'Priority fixes', 'Enhancement ideas']
  },
  'visual-coaching': {
    name: 'Visual Performance Coaching',
    category: 'consultation',
    description: 'Performance coaching for visual excellence',
    estimatedDuration: 'Ongoing',
    deliverables: ['Coaching sessions', 'Performance notes', 'Training exercises', 'Video reviews']
  },
  'staff-training': {
    name: 'Staff Development Training',
    category: 'consultation',
    description: 'Training sessions for instructional staff',
    estimatedDuration: 'Varies',
    deliverables: ['Training materials', 'Workshop sessions', 'Resource guides', 'Q&A support']
  },

  // Full Season
  'season-package': {
    name: 'Complete Season Package',
    category: 'full-season',
    description: 'Comprehensive season-long design and support package',
    estimatedDuration: 'Full season',
    deliverables: ['All design elements', 'Monthly updates', 'Competition prep', 'Ongoing support']
  },
  'monthly-support': {
    name: 'Monthly Support Package',
    category: 'full-season',
    description: 'Regular check-ins with updates and adjustments',
    estimatedDuration: 'Monthly',
    deliverables: ['Monthly meetings', 'Design updates', 'Video feedback', 'Quick fixes']
  },
  'competition-prep': {
    name: 'Competition Preparation',
    category: 'full-season',
    description: 'Focused preparation for specific competitions',
    estimatedDuration: '2-4 weeks',
    deliverables: ['Judge sheets review', 'Visual cleaning', 'Impact moments', 'Final touches']
  },
  'mid-season-redesign': {
    name: 'Mid-Season Redesign',
    category: 'full-season',
    description: 'Strategic show adjustments based on feedback and growth',
    estimatedDuration: '2-3 weeks',
    deliverables: ['Redesign plan', 'New elements', 'Transition strategy', 'Implementation guide']
  }
} as const;

// Pricing tiers (for reference - actual pricing would be in database)
export const SERVICE_TIERS = {
  foundation: {
    name: 'Foundation',
    description: 'Essential design elements to get started',
    features: ['Initial concepts', 'Basic deliverables', 'Email support'],
    priceRange: '$500-$2000'
  },
  standard: {
    name: 'Standard',
    description: 'Complete design package with full deliverables',
    features: ['Full design suite', 'All deliverables', 'Video consultations', '2 revisions'],
    priceRange: '$2000-$5000'
  },
  premium: {
    name: 'Premium',
    description: 'Comprehensive service with ongoing support',
    features: ['Complete package', 'Priority support', 'Unlimited revisions', 'Monthly check-ins'],
    priceRange: '$5000-$10000'
  },
  elite: {
    name: 'Elite',
    description: 'Founder-led service with white-glove support',
    features: ['Direct with Kentino', 'Custom solutions', '24/7 support', 'Season-long partnership'],
    priceRange: '$10000+'
  }
} as const;

// Helper function to get project types by category
export function getProjectTypesByCategory(category: ServiceCategory): ProjectType[] {
  return Object.entries(PROJECT_TYPE_DETAILS)
    .filter(([_, details]) => details.category === category)
    .map(([type]) => type as ProjectType);
}

// Helper function to validate project configuration
export function validateProjectConfiguration(
  _projectType: ProjectType,
  _ensembleType: EnsembleType,
  _serviceTier: ServiceTier
): boolean {
  // Add any business rules for valid combinations
  // For now, all combinations are valid
  return true;
}