interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'button' | 'avatar' | 'image';
  lines?: number;
}

export function LoadingSkeleton({
  className = '',
  variant = 'text',
  lines = 1
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded';

  const variants = {
    text: 'h-4 w-full',
    card: 'h-48 w-full',
    button: 'h-10 w-24',
    avatar: 'h-12 w-12 rounded-full',
    image: 'h-32 w-full'
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variants.text} ${
              i === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
            style={{
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variants[variant]} ${className}`}
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }}
    />
  );
}