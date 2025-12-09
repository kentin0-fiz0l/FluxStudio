'use client';

interface FlatLogoProps {
  size?: number;
  className?: string;
}

// Logo colors - Cyan with Pink chromatic aberration
const logoColors = {
  cyan: '#4CC9F0',
  pink: '#FF4DA6',
};

/**
 * Flat SVG MetMap Logo
 * Stylized "M" waveform with chromatic aberration effect
 * Uses cyan main stroke with pink offset
 */
export function FlatLogo({
  size = 48,
  className = '',
}: FlatLogoProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 500 500"
        fill="none"
        className="w-full h-full"
        aria-label="MetMap Logo"
      >
        <defs>
          {/* Glow filters */}
          <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowPink" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pink chromatic offset layer (back) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke={logoColors.pink}
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(4, 4)"
          opacity="0.7"
          filter="url(#glowPink)"
        />

        {/* Cyan main stroke (front) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke={logoColors.cyan}
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowCyan)"
        />
      </svg>
    </div>
  );
}

/**
 * Responsive Logo that switches between Spline (large) and Flat (small)
 * For use in navigation and headers
 */
export function ResponsiveLogo({
  className = '',
}: {
  className?: string;
}) {
  // Using CSS to handle responsive display
  return (
    <div className={className}>
      {/* Always show flat logo - Spline is for landing page hero only */}
      <FlatLogo size={32} />
    </div>
  );
}

export default FlatLogo;
