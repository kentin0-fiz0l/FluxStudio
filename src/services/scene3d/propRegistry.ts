/**
 * Prop Registry - Predefined marching arts prop catalog
 *
 * Catalog of low-poly GLB models shipped with the app.
 * Models are served from public/assets/props/.
 */

// ============================================================================
// Types
// ============================================================================

export interface PropDefinition {
  id: string;
  name: string;
  category: PropCategory;
  description: string;
  /** Path relative to public/assets/props/ */
  modelPath: string;
  /** Thumbnail path relative to public/assets/props/thumbnails/ */
  thumbnailPath: string;
  /** Default scale when placed in scene */
  defaultScale: number;
  /** Available color variants (hex colors the material can be tinted) */
  colorVariants?: string[];
  /** Tags for search */
  tags: string[];
  /** Approximate poly count */
  polyCount: number;
}

export type PropCategory =
  | 'flags'
  | 'instruments'
  | 'equipment'
  | 'staging'
  | 'effects'
  | 'markers';

export interface PropCategoryInfo {
  id: PropCategory;
  label: string;
  icon: string;
}

// ============================================================================
// Category Definitions
// ============================================================================

export const PROP_CATEGORIES: PropCategoryInfo[] = [
  { id: 'flags', label: 'Flags & Silks', icon: 'flag' },
  { id: 'instruments', label: 'Instruments', icon: 'music' },
  { id: 'equipment', label: 'Equipment', icon: 'wrench' },
  { id: 'staging', label: 'Staging & Platforms', icon: 'box' },
  { id: 'effects', label: 'Effects & Props', icon: 'sparkles' },
  { id: 'markers', label: 'Markers & Cones', icon: 'map-pin' },
];

// ============================================================================
// Prop Catalog
// ============================================================================

export const PROP_CATALOG: PropDefinition[] = [
  // Flags & Silks
  {
    id: 'flag-standard',
    name: 'Standard Flag',
    category: 'flags',
    description: 'Standard 6-foot color guard flag with pole',
    modelPath: 'flags/flag-standard.glb',
    thumbnailPath: 'thumbnails/flag-standard.png',
    defaultScale: 1,
    colorVariants: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ffffff'],
    tags: ['flag', 'color guard', 'silk', 'standard'],
    polyCount: 1200,
  },
  {
    id: 'flag-swing',
    name: 'Swing Flag',
    category: 'flags',
    description: 'Short swing flag for fast work',
    modelPath: 'flags/flag-swing.glb',
    thumbnailPath: 'thumbnails/flag-swing.png',
    defaultScale: 0.8,
    colorVariants: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6'],
    tags: ['flag', 'swing', 'color guard', 'short'],
    polyCount: 900,
  },
  // Instruments
  {
    id: 'rifle',
    name: 'Rifle',
    category: 'instruments',
    description: 'Color guard rifle prop',
    modelPath: 'instruments/rifle.glb',
    thumbnailPath: 'thumbnails/rifle.png',
    defaultScale: 1,
    colorVariants: ['#f5f5f4', '#1e293b', '#78716c'],
    tags: ['rifle', 'color guard', 'toss'],
    polyCount: 800,
  },
  {
    id: 'sabre',
    name: 'Sabre',
    category: 'instruments',
    description: 'Color guard sabre',
    modelPath: 'instruments/sabre.glb',
    thumbnailPath: 'thumbnails/sabre.png',
    defaultScale: 1,
    colorVariants: ['#c0c0c0', '#ffd700'],
    tags: ['sabre', 'color guard', 'blade'],
    polyCount: 600,
  },
  {
    id: 'snare-drum',
    name: 'Snare Drum',
    category: 'instruments',
    description: 'Marching snare drum with carrier',
    modelPath: 'instruments/snare-drum.glb',
    thumbnailPath: 'thumbnails/snare-drum.png',
    defaultScale: 1,
    tags: ['drum', 'snare', 'percussion', 'battery'],
    polyCount: 2400,
  },
  {
    id: 'bass-drum',
    name: 'Bass Drum',
    category: 'instruments',
    description: 'Marching bass drum with carrier',
    modelPath: 'instruments/bass-drum.glb',
    thumbnailPath: 'thumbnails/bass-drum.png',
    defaultScale: 1,
    tags: ['drum', 'bass', 'percussion', 'battery'],
    polyCount: 2200,
  },
  // Equipment
  {
    id: 'cone-traffic',
    name: 'Traffic Cone',
    category: 'equipment',
    description: 'Standard practice field cone',
    modelPath: 'equipment/cone-traffic.glb',
    thumbnailPath: 'thumbnails/cone-traffic.png',
    defaultScale: 0.5,
    colorVariants: ['#f97316', '#eab308', '#22c55e'],
    tags: ['cone', 'marker', 'practice'],
    polyCount: 400,
  },
  {
    id: 'ladder',
    name: 'Drill Ladder',
    category: 'equipment',
    description: 'Scaffolding observation ladder',
    modelPath: 'equipment/ladder.glb',
    thumbnailPath: 'thumbnails/ladder.png',
    defaultScale: 1,
    tags: ['ladder', 'scaffold', 'observation'],
    polyCount: 1800,
  },
  // Staging
  {
    id: 'podium',
    name: 'Podium',
    category: 'staging',
    description: 'Conductor/drum major podium',
    modelPath: 'staging/podium.glb',
    thumbnailPath: 'thumbnails/podium.png',
    defaultScale: 1,
    tags: ['podium', 'platform', 'conductor', 'drum major'],
    polyCount: 1500,
  },
  {
    id: 'platform-small',
    name: 'Small Platform',
    category: 'staging',
    description: '4x4 performance platform',
    modelPath: 'staging/platform-small.glb',
    thumbnailPath: 'thumbnails/platform-small.png',
    defaultScale: 1,
    tags: ['platform', 'stage', 'riser'],
    polyCount: 200,
  },
  {
    id: 'backdrop-frame',
    name: 'Backdrop Frame',
    category: 'staging',
    description: 'Backdrop/banner frame structure',
    modelPath: 'staging/backdrop-frame.glb',
    thumbnailPath: 'thumbnails/backdrop-frame.png',
    defaultScale: 1,
    tags: ['backdrop', 'banner', 'frame', 'structure'],
    polyCount: 1200,
  },
  // Effects
  {
    id: 'tarp-rectangle',
    name: 'Ground Tarp',
    category: 'effects',
    description: 'Rectangular ground tarp/mat',
    modelPath: 'effects/tarp-rectangle.glb',
    thumbnailPath: 'thumbnails/tarp-rectangle.png',
    defaultScale: 1,
    colorVariants: ['#1e293b', '#ef4444', '#3b82f6', '#22c55e'],
    tags: ['tarp', 'mat', 'ground', 'floor'],
    polyCount: 100,
  },
  {
    id: 'arch',
    name: 'Performance Arch',
    category: 'effects',
    description: 'Decorative arch structure',
    modelPath: 'effects/arch.glb',
    thumbnailPath: 'thumbnails/arch.png',
    defaultScale: 1,
    tags: ['arch', 'gate', 'structure', 'decorative'],
    polyCount: 2000,
  },
  // Markers
  {
    id: 'marker-dot',
    name: 'Field Dot',
    category: 'markers',
    description: 'Small field position marker',
    modelPath: 'markers/marker-dot.glb',
    thumbnailPath: 'thumbnails/marker-dot.png',
    defaultScale: 0.3,
    colorVariants: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ffffff'],
    tags: ['dot', 'marker', 'position'],
    polyCount: 100,
  },
  {
    id: 'marker-arrow',
    name: 'Direction Arrow',
    category: 'markers',
    description: 'Directional arrow marker for the field',
    modelPath: 'markers/marker-arrow.glb',
    thumbnailPath: 'thumbnails/marker-arrow.png',
    defaultScale: 0.5,
    colorVariants: ['#ef4444', '#3b82f6', '#22c55e', '#eab308'],
    tags: ['arrow', 'direction', 'marker'],
    polyCount: 200,
  },
];

// ============================================================================
// Lookup Utilities
// ============================================================================

const catalogMap = new Map(PROP_CATALOG.map((p) => [p.id, p]));

export function getPropById(id: string): PropDefinition | undefined {
  return catalogMap.get(id);
}

export function getPropsByCategory(category: PropCategory): PropDefinition[] {
  return PROP_CATALOG.filter((p) => p.category === category);
}

export function searchProps(query: string): PropDefinition[] {
  const lower = query.toLowerCase();
  return PROP_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags.some((t) => t.includes(lower))
  );
}

export function getPropModelUrl(prop: PropDefinition): string {
  return `/assets/props/${prop.modelPath}`;
}

export function getPropThumbnailUrl(prop: PropDefinition): string {
  return `/assets/props/${prop.thumbnailPath}`;
}
