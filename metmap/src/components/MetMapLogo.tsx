'use client';

import Spline from '@splinetool/react-spline';

interface MetMapLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 3D MetMap logo using Spline
 */
export function MetMapLogo({ className = '', size = 'md' }: MetMapLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative overflow-hidden`}>
      <Spline
        scene="https://prod.spline.design/Ys91FXhmJNo9GVQo/scene.splinecode"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default MetMapLogo;
