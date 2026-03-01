export function FluxStudioLogoSVG({
  width = 400,
  height = 120,
  variant = 'horizontal'
}: {
  width?: number;
  height?: number;
  variant?: 'horizontal' | 'stacked'
}) {
  const viewBox = variant === 'horizontal' ? '0 0 400 120' : '0 0 300 180';

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      style={{ fontFamily: '"PP Neue Machina", "Space Grotesk", sans-serif' }}
    >
      <defs>
        {/* Gradient for STUDIO */}
        <linearGradient id="studioGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>

        {/* Text shadows */}
        <filter id="fluxShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="#1a1a1a" />
          <feDropShadow dx="4" dy="4" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
        </filter>

        <filter id="studioShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="#8B5CF6" />
          <feDropShadow dx="4" dy="4" stdDeviation="2" floodColor="#8B5CF6" floodOpacity="0.3" />
        </filter>
      </defs>

      {variant === 'horizontal' ? (
        <g>
          {/* FLUX */}
          <text
            x="20"
            y="80"
            fontSize="64"
            fontWeight="900"
            fill="#f8f8f8"
            filter="url(#fluxShadow)"
            letterSpacing="-1.28"
          >
            FLUX
          </text>

          {/* STUDIO */}
          <text
            x="220"
            y="80"
            fontSize="64"
            fontWeight="900"
            fill="url(#studioGradient)"
            filter="url(#studioShadow)"
            letterSpacing="-1.28"
          >
            STUDIO
          </text>
        </g>
      ) : (
        <g>
          {/* FLUX */}
          <text
            x="150"
            y="70"
            fontSize="56"
            fontWeight="900"
            fill="#f8f8f8"
            filter="url(#fluxShadow)"
            textAnchor="middle"
            letterSpacing="-1.12"
          >
            FLUX
          </text>

          {/* STUDIO */}
          <text
            x="150"
            y="140"
            fontSize="56"
            fontWeight="900"
            fill="url(#studioGradient)"
            filter="url(#studioShadow)"
            textAnchor="middle"
            letterSpacing="-1.12"
          >
            STUDIO
          </text>
        </g>
      )}
    </svg>
  );
}
