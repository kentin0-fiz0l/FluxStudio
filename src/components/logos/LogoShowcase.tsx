import { FluxStudioLogoExport } from './FluxStudioLogoExport';

// Export configurations for easy Figma recreation
export const FluxStudioLogoSpecs = {
  // Color Palette
  colors: {
    primary: '#f8f8f8', // Off-white for FLUX
    accent: '#EC4899',  // Pink for STUDIO
    gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    shadow: '#1a1a1a',  // Deep shadow
    background: '#0a0a0a' // Ink black
  },

  // Typography
  fonts: {
    primary: 'PP Neue Machina',
    fallback: 'Space Grotesk',
    body: 'Inter',
    display: 'Outfit'
  },

  // Text Effects
  shadows: {
    flat: 'text-shadow: 1px 1px 0 #1a1a1a, 2px 2px 0 #1a1a1a, 3px 3px 0 #1a1a1a, 4px 4px 8px rgba(0, 0, 0, 0.5)',
    gradient: 'text-shadow: 1px 1px 0 #8B5CF6, 2px 2px 0 #8B5CF6, 3px 3px 0 #8B5CF6, 4px 4px 8px rgba(139, 92, 246, 0.3)',
    glow: 'text-shadow: 0 0 20px currentColor'
  },

  // Dimensions (in rem)
  sizes: {
    sm: { fontSize: 1.5, spacing: 0.25 },
    md: { fontSize: 2, spacing: 0.5 },
    lg: { fontSize: 3, spacing: 0.75 },
    xl: { fontSize: 4, spacing: 1 },
    hero: { fontSize: 6, spacing: 1.5 }
  },

  // 3D Properties
  threeD: {
    perspective: '1000px',
    rotation: 'rotateX(25deg) rotateY(-15deg)',
    depthLayers: 12,
    depthOffset: { x: 0.5, y: 0.5, z: 1 }
  }
};

// Usage Examples Component for Documentation
export function LogoShowcase() {
  return (
    <div className="space-y-8 p-8 bg-ink">
      <h2 className="text-2xl text-off-white mb-6">Flux Studio Logo Variations</h2>

      {/* Size Variations */}
      <div className="space-y-4">
        <h3 className="text-lg text-off-white/80">Size Variations</h3>
        <FluxStudioLogoExport size="sm" />
        <FluxStudioLogoExport size="md" />
        <FluxStudioLogoExport size="lg" />
      </div>

      {/* Layout Variations */}
      <div className="space-y-4">
        <h3 className="text-lg text-off-white/80">Layout Variations</h3>
        <FluxStudioLogoExport variant="horizontal" />
        <FluxStudioLogoExport variant="stacked" />
        <FluxStudioLogoExport variant="3d" />
      </div>

      {/* With Subtitle */}
      <div className="space-y-4">
        <h3 className="text-lg text-off-white/80">With Subtitle</h3>
        <FluxStudioLogoExport showSubtitle />
      </div>
    </div>
  );
}
