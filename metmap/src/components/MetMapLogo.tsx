'use client';

import { clsx } from 'clsx';

interface MetMapLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Logo colors - Cyan with Pink chromatic aberration
const logoColors = {
  cyan: '#4CC9F0',
  pink: '#FF4DA6',
};

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
        {/* Pink chromatic offset layer (back) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke={logoColors.pink}
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(4, 4)"
          opacity="0.7"
        />

        {/* Cyan main stroke (front) */}
        <path
          d="M 80 340 L 120 180 L 180 320 L 250 100 L 320 320 L 380 200 L 400 280 Q 420 340 380 360 L 360 340"
          stroke={logoColors.cyan}
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default MetMapLogo;
