import React from 'react';
import { ErrorFallbackProps, accentColors } from './error-fallback-types';
import { ErrorInline } from './ErrorInline';
import { ErrorCard } from './ErrorCard';
import { ErrorFullPage } from './ErrorFullPage';

export type { ErrorFallbackProps };

export function ErrorFallback({
  error,
  componentStack,
  variant = 'card',
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  onReset,
  showDetails = true,
  className,
  accentColor = 'red',
}: ErrorFallbackProps) {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const colors = accentColors[accentColor];

  const copyErrorDetails = async () => {
    const errorDetails = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${componentStack || 'No component stack'}
Browser: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
    } catch {
      // Clipboard write failed silently
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onReset) {
      onReset();
    } else {
      window.location.href = '/projects';
    }
  };

  if (variant === 'inline') {
    return (
      <ErrorInline
        title={title}
        message={message}
        onRetry={onRetry}
        handleRetry={handleRetry}
        className={className}
      />
    );
  }

  if (variant === 'card') {
    return (
      <ErrorCard
        title={title}
        message={message}
        error={error}
        showDetails={showDetails}
        detailsExpanded={detailsExpanded}
        setDetailsExpanded={setDetailsExpanded}
        handleRetry={handleRetry}
        handleGoHome={handleGoHome}
        copyErrorDetails={copyErrorDetails}
        colors={colors}
        className={className}
      />
    );
  }

  return (
    <ErrorFullPage
      title={title}
      message={message}
      error={error}
      componentStack={componentStack}
      showDetails={showDetails}
      detailsExpanded={detailsExpanded}
      setDetailsExpanded={setDetailsExpanded}
      handleRetry={handleRetry}
      handleGoHome={handleGoHome}
      copyErrorDetails={copyErrorDetails}
      colors={colors}
      className={className}
    />
  );
}

export default ErrorFallback;
