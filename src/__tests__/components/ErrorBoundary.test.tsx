/**
 * ErrorBoundary Component Tests
 * Tests error handling, recovery, and fallback rendering
 * @file src/__tests__/components/ErrorBoundary.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ErrorBoundary,
  MessagingErrorBoundary,
  CollaborationErrorBoundary,
  ProjectsErrorBoundary
} from '../../components/error/ErrorBoundary';

// Mock observability
vi.mock('../../services/observability', () => ({
  observability: {
    errors: {
      captureFromBoundary: vi.fn(),
    },
    session: {
      mark: vi.fn(),
    },
  },
}));

// Mock UI components
vi.mock('../../components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
}));

vi.mock('../../components/ui/button', () => ({
  Button: ({ children, onClick, variant, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} {...props}>{children}</button>
  ),
}));

vi.mock('../../components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

vi.mock('../../components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div data-variant={variant}>{children}</div>,
  AlertTitle: ({ children }: any) => <h3>{children}</h3>,
  AlertDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('../../lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
}

// Component that throws a network error
function NetworkErrorComponent(): JSX.Element {
  throw new Error('Failed to fetch');
}

// Component that throws a chunk load error
function ChunkLoadErrorComponent(): JSX.Element {
  const error = new Error('Loading chunk 123 failed');
  error.name = 'ChunkLoadError';
  throw error;
}

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Suppress React error boundary console errors in tests
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Basic error handling', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch errors and show error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display error message in details', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  describe('Custom fallback', () => {
    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Isolated component mode', () => {
    it('should render minimal error UI when isolateComponent is true', () => {
      render(
        <ErrorBoundary isolateComponent>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component Error')).toBeInTheDocument();
    });
  });

  describe('Error categories', () => {
    it('should categorize network errors correctly', () => {
      render(
        <ErrorBoundary>
          <NetworkErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });

    it('should categorize chunk load errors correctly', () => {
      render(
        <ErrorBoundary>
          <ChunkLoadErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Loading Error')).toBeInTheDocument();
    });
  });

  describe('Retry functionality', () => {
    it('should show retry button when retryable is true', () => {
      render(
        <ErrorBoundary retryable>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should attempt retry when clicking Try Again', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      function ConditionalThrow() {
        if (shouldThrow) {
          throw new Error('Temporary error');
        }
        return <div>Recovered!</div>;
      }

      render(
        <ErrorBoundary retryable key="test-boundary">
          <ConditionalThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // The error won't recover in this test since we can't easily reset the internal state
      // But we can verify the button exists and is clickable
      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      // After retry click, retry count should increase
      expect(screen.getByText(/Retry attempt: 1/)).toBeInTheDocument();
    });
  });

  describe('Action buttons', () => {
    it('should show Reload Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should show Go Home button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should show Report Issue button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Report Issue')).toBeInTheDocument();
    });
  });

  describe('Technical details toggle', () => {
    it('should have a Technical Details button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });
  });
});

describe('Specialized Error Boundaries', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('MessagingErrorBoundary', () => {
    it('should show messaging-specific error message', () => {
      render(
        <MessagingErrorBoundary>
          <ThrowingComponent />
        </MessagingErrorBoundary>
      );

      expect(screen.getByText('Messaging Unavailable')).toBeInTheDocument();
    });
  });

  describe('CollaborationErrorBoundary', () => {
    it('should show collaboration-specific error message', () => {
      render(
        <CollaborationErrorBoundary>
          <ThrowingComponent />
        </CollaborationErrorBoundary>
      );

      expect(screen.getByText('Collaboration Features Limited')).toBeInTheDocument();
    });
  });

  describe('ProjectsErrorBoundary', () => {
    it('should show projects-specific error message', () => {
      render(
        <ProjectsErrorBoundary>
          <ThrowingComponent />
        </ProjectsErrorBoundary>
      );

      expect(screen.getByText('Projects Unavailable')).toBeInTheDocument();
    });

    it('should provide Projects navigation option', () => {
      render(
        <ProjectsErrorBoundary>
          <ThrowingComponent />
        </ProjectsErrorBoundary>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
    });
  });
});
