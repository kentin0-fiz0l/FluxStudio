'use client';

import Spline from '@splinetool/react-spline';
import { useState } from 'react';
import { FlatLogo } from './FlatLogo';

interface SplineLogoProps {
  size?: number;
  interactive?: boolean;
  className?: string;
  showFallbackOnError?: boolean;
}

/**
 * 3D Spline Pulse Prism Logo
 * Uses the animated 3D scene for hero/landing contexts
 * Falls back to FlatLogo on error or while loading
 */
export function SplineLogo({
  size = 420,
  interactive = false,
  className = '',
  showFallbackOnError = true,
}: SplineLogoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (hasError && showFallbackOnError) {
    return <FlatLogo size={size} className={className} />;
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Loading state - show flat logo while 3D loads */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FlatLogo size={size * 0.8} className="animate-pulse" />
        </div>
      )}

      {/* 3D Spline scene */}
      <div
        className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          width: size,
          height: size,
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      >
        <Spline
          scene="https://prod.spline.design/Ys91FXhmJNo9GVQo/scene.splinecode"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
}

export default SplineLogo;
