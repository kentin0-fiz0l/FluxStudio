import { ReactNode } from 'react';

interface FloatingContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function FloatingContainer({
  children,
  className = '',
  variant = 'default',
  size = 'lg'
}: FloatingContainerProps) {
  const variants = {
    default: 'bg-white/10 backdrop-blur-sm border border-white/20',
    elevated: 'bg-white/15 backdrop-blur-sm border border-white/30 shadow-2xl',
    glass: 'bg-white/10 border border-white/10',
    subtle: 'bg-white/10 border border-white/15'
  };

  const sizes = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none'
  };

  return (
    <div className={`
      relative mx-auto mb-24 mt-16
      ${sizes[size]}
      ${variants[variant]}
      rounded-2xl p-8 md:p-12 lg:p-16
      stationary-container
      performance-optimized
      ${className}
    `}>
      {/* Floating glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-3xl blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}