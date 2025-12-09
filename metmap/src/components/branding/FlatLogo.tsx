'use client';

import { brand } from '@/styles/tokens/brand';

interface FlatLogoProps {
  size?: number;
  className?: string;
}

/**
 * Flat SVG Pulse Prism Logo
 * Stylized "M" waveform with chromatic aberration effect
 * Uses brand colors: mint, violet, coral
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
          <filter id="glowMint" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowViolet" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Coral offset layer (back) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke={brand.colors.coral}
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(4, 4)"
          opacity="0.6"
        />

        {/* Violet offset layer (middle) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke={brand.colors.violet}
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(-2, -2)"
          opacity="0.7"
          filter="url(#glowViolet)"
        />

        {/* Mint main stroke (front) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke={brand.colors.mint}
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowMint)"
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
