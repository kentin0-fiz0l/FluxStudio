// React import not needed with JSX transform

interface FluxStudioLogoExportProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'horizontal' | 'stacked' | '3d';
  showSubtitle?: boolean;
  className?: string;
}

// Size configurations - moved outside component for reuse in exported functions
const sizeConfig = {
  sm: {
    fontSize: '1.5rem',
    spacing: '0.25rem',
    subtitleSize: '0.75rem',
    depth: 4
  },
  md: {
    fontSize: '2rem',
    spacing: '0.5rem',
    subtitleSize: '0.875rem',
    depth: 6
  },
  lg: {
    fontSize: '3rem',
    spacing: '0.75rem',
    subtitleSize: '1rem',
    depth: 8
  },
  xl: {
    fontSize: '4rem',
    spacing: '1rem',
    subtitleSize: '1.25rem',
    depth: 10
  },
  hero: {
    fontSize: '6rem',
    spacing: '1.5rem',
    subtitleSize: '1.5rem',
    depth: 12
  }
};

// 3D Text Component for individual letters - moved outside to avoid recreation during render
function Text3DLetter({
  letter,
  color,
  shadowColor,
  fontSize,
  depth
}: {
  letter: string;
  color: string;
  shadowColor: string;
  fontSize: string;
  depth: number;
}) {
  return (
    <div
      className="relative inline-block"
      style={{
        transformStyle: 'preserve-3d',
        transform: 'rotateX(25deg) rotateY(-15deg)',
        marginRight: letter === ' ' ? '0.5em' : '0.02em'
      }}
    >
      {letter === ' ' ? (
        <div style={{ width: '0.3em' }} />
      ) : (
        <>
          {/* Front face */}
          <div
            className="relative z-20 font-black"
            style={{
              color: color,
              fontSize: fontSize,
              fontFamily: 'Outfit, "PP Neue Machina", "Space Grotesk", sans-serif',
              textShadow: `0 0 20px ${color}40`,
              letterSpacing: '-0.02em'
            }}
          >
            {letter}
          </div>

          {/* 3D depth layers */}
          {[...Array(depth)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 left-0 font-black"
              style={{
                color: shadowColor,
                fontSize: fontSize,
                fontFamily: 'Outfit, "PP Neue Machina", "Space Grotesk", sans-serif',
                transform: `translateZ(-${i + 1}px) translateX(${i * 0.5}px) translateY(${i * 0.5}px)`,
                opacity: Math.max(0.1, 1 - (i * 0.15)),
                zIndex: 19 - i,
                letterSpacing: '-0.02em'
              }}
            >
              {letter}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// Regular flat text component - moved outside to avoid recreation during render
function FlatText({
  text,
  color,
  isGradient = false,
  fontSize
}: {
  text: string;
  color: string;
  isGradient?: boolean;
  fontSize: string;
}) {
  return (
    <span
      className="font-black"
      style={{
        fontSize: fontSize,
        fontFamily: '"PP Neue Machina", "Space Grotesk", sans-serif',
        letterSpacing: '-0.02em',
        color: isGradient ? 'transparent' : color,
        background: isGradient ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' : 'none',
        WebkitBackgroundClip: isGradient ? 'text' : 'none',
        WebkitTextFillColor: isGradient ? 'transparent' : 'inherit',
        backgroundClip: isGradient ? 'text' : 'none',
        textShadow: isGradient
          ? `1px 1px 0 #8B5CF6, 2px 2px 0 #8B5CF6, 3px 3px 0 #8B5CF6, 4px 4px 8px rgba(139, 92, 246, 0.3)`
          : `1px 1px 0 #1a1a1a, 2px 2px 0 #1a1a1a, 3px 3px 0 #1a1a1a, 4px 4px 8px rgba(0, 0, 0, 0.5)`
      }}
    >
      {text}
    </span>
  );
}

export function FluxStudioLogoExport({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = false,
  className = ''
}: FluxStudioLogoExportProps) {

  const config = sizeConfig[size];

  // Layout wrapper based on variant
  const layoutClasses = {
    horizontal: `inline-flex items-center`,
    stacked: `flex flex-col items-center`,
    '3d': `flex items-center justify-center`
  };

  return (
    <div className={`${layoutClasses[variant]} ${className}`}>
      {/* Logo Container */}
      <div 
        className={`
          ${variant === 'stacked' ? 'flex flex-col items-center space-y-2' : 'flex items-center'}
          ${variant === 'horizontal' ? `space-x-4` : ''}
          ${variant === '3d' ? 'perspective-1000' : ''}
        `}
        style={{
          perspective: variant === '3d' ? '1200px' : 'none'
        }}
      >
        {/* FLUX */}
        <div className="relative">
          {variant === '3d' ? (
            <div className="flex" style={{ perspective: '1000px' }}>
              {'FLUX'.split('').map((letter, index) => (
                <Text3DLetter
                  key={index}
                  letter={letter}
                  color="#f8f8f8"
                  shadowColor="#1a1a1a"
                  fontSize={config.fontSize}
                  depth={config.depth}
                />
              ))}
            </div>
          ) : (
            <FlatText text="FLUX" color="#f8f8f8" fontSize={config.fontSize} />
          )}
        </div>

        {/* STUDIO */}
        <div className="relative">
          {variant === '3d' ? (
            <div className="flex" style={{ perspective: '1000px' }}>
              {'STUDIO'.split('').map((letter, index) => (
                <Text3DLetter
                  key={index}
                  letter={letter}
                  color="#EC4899"
                  shadowColor="#8B5CF6"
                  fontSize={config.fontSize}
                  depth={config.depth}
                />
              ))}
            </div>
          ) : (
            <FlatText text="STUDIO" color="#EC4899" isGradient fontSize={config.fontSize} />
          )}
        </div>
      </div>

      {/* Subtitle */}
      {showSubtitle && (
        <div 
          className={`
            text-center mt-4
            ${variant === 'horizontal' ? 'ml-6' : ''}
          `}
        >
          <p
            className="font-medium tracking-widest uppercase opacity-80"
            style={{
              fontSize: config.subtitleSize,
              fontFamily: '"PP Neue Machina", "Space Grotesk", sans-serif',
              color: '#f8f8f8',
              letterSpacing: '0.2em'
            }}
          >
            Marching Arts Creative Design Shop
          </p>
          <p
            className="font-normal mt-1 opacity-60"
            style={{
              fontSize: `calc(${config.subtitleSize} * 0.8)`,
              fontFamily: 'Inter, sans-serif',
              color: '#f8f8f8'
            }}
          >
            Creative Direction by Kentino
          </p>
        </div>
      )}
    </div>
  );
}

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

// Individual Logo Elements for Figma Symbol Creation
export function FluxText({ size = 'md' }: { size?: keyof typeof sizeConfig }) {
  const config = sizeConfig[size];
  return (
    <span
      className="font-black"
      style={{
        fontSize: config.fontSize,
        fontFamily: '"PP Neue Machina", "Space Grotesk", sans-serif',
        letterSpacing: '-0.02em',
        color: '#f8f8f8',
        textShadow: '1px 1px 0 #1a1a1a, 2px 2px 0 #1a1a1a, 3px 3px 0 #1a1a1a, 4px 4px 8px rgba(0, 0, 0, 0.5)'
      }}
    >
      FLUX
    </span>
  );
}

export function StudioText({ size = 'md' }: { size?: keyof typeof sizeConfig }) {
  const config = sizeConfig[size];
  return (
    <span
      className="font-black"
      style={{
        fontSize: config.fontSize,
        fontFamily: '"PP Neue Machina", "Space Grotesk", sans-serif',
        letterSpacing: '-0.02em',
        color: 'transparent',
        background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textShadow: '1px 1px 0 #8B5CF6, 2px 2px 0 #8B5CF6, 3px 3px 0 #8B5CF6, 4px 4px 8px rgba(139, 92, 246, 0.3)'
      }}
    >
      STUDIO
    </span>
  );
}

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