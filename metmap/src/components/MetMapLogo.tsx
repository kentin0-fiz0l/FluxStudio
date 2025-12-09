'use client';

import { clsx } from 'clsx';

interface MetMapLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * MetMap logo - stylized "M" waveform with chromatic aberration effect
 */
export function MetMapLogo({ className = '', size = 'md' }: MetMapLogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={clsx(sizeClasses[size], className)}>
      <svg
        viewBox="0 0 500 500"
        fill="none"
        className="w-full h-full"
      >
        {/* Pink/Magenta offset layer (chromatic aberration) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke="#FF69B4"
          strokeWidth="28"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(-3, -3)"
          opacity="0.7"
        />

        {/* Cyan offset layer (chromatic aberration) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke="#00CED1"
          strokeWidth="28"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(3, 3)"
          opacity="0.7"
        />

        {/* Main cyan/blue stroke */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke="#00BFFF"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default MetMapLogo;
