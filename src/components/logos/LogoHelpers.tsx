import { sizeConfig } from './logo-types';

// 3D Text Component for individual letters
export function Text3DLetter({
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

// Regular flat text component
export function FlatText({
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
