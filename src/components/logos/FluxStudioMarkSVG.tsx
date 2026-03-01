export function FluxStudioMarkSVG({
  size = 120
}: {
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="markGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="33%" stopColor="#8B5CF6" />
          <stop offset="66%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Geometric mark inspired by marching formations */}
      <g transform="translate(60,60)">
        {/* Outer ring */}
        <circle
          cx="0"
          cy="0"
          r="45"
          fill="none"
          stroke="url(#markGradient)"
          strokeWidth="3"
          opacity="0.6"
        />

        {/* Inner formation pattern */}
        <g fill="url(#markGradient)" filter="url(#glow)">
          {/* Center diamond */}
          <path d="M0,-20 L15,0 L0,20 L-15,0 Z" opacity="0.9" />

          {/* Formation dots */}
          <circle cx="0" cy="-30" r="3" />
          <circle cx="21" cy="-15" r="3" />
          <circle cx="21" cy="15" r="3" />
          <circle cx="0" cy="30" r="3" />
          <circle cx="-21" cy="15" r="3" />
          <circle cx="-21" cy="-15" r="3" />
        </g>
      </g>
    </svg>
  );
}
