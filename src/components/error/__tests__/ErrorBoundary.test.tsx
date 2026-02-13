import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies
vi.mock('../../../services/observability', () => ({
  observability: {
    errors: { captureFromBoundary: vi.fn() },
    session: { mark: vi.fn() },
  },
}));

vi.mock('../../../lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { ErrorBoundary, MessagingErrorBoundary, WorkflowErrorBoundary, CollaborationErrorBoundary } from '../ErrorBoundary';

// Component that throws
function ThrowingComponent({ error }: { error: Error }): JSX.Element {
  throw error;
}

function GoodComponent() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders default error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Test crash')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test crash/)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent error={new Error('fail')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent error={new Error('callback test')} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('callback test');
  });

  it('shows isolated component error UI when isolateComponent is true', () => {
    render(
      <ErrorBoundary isolateComponent>
        <ThrowingComponent error={new Error('isolated')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Component Error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows Try Again button which can be clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('still broken')} />
      </ErrorBoundary>
    );

    const tryAgain = screen.getByText('Try Again');
    expect(tryAgain).toBeInTheDocument();

    // Clicking retry resets and the child throws again
    fireEvent.click(tryAgain);

    // After retry, error boundary catches again and shows retry count
    expect(screen.getByText(/Retry attempt: 1\/3/)).toBeInTheDocument();
  });

  it('disables retry when retryable is false', () => {
    render(
      <ErrorBoundary retryable={false}>
        <ThrowingComponent error={new Error('no retry')} />
      </ErrorBoundary>
    );
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('categorizes ChunkLoadError as Loading Error', () => {
    const error = new Error('Loading chunk 5 failed');
    error.name = 'ChunkLoadError';
    render(
      <ErrorBoundary>
        <ThrowingComponent error={error} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Loading Error')).toBeInTheDocument();
  });

  it('categorizes network errors', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('NetworkError when attempting to fetch')} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('categorizes TypeError', () => {
    const error = new TypeError('Cannot read properties of undefined');
    render(
      <ErrorBoundary>
        <ThrowingComponent error={error} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Type Error')).toBeInTheDocument();
  });

  it('categorizes ReferenceError', () => {
    const error = new ReferenceError('x is not defined');
    render(
      <ErrorBoundary>
        <ThrowingComponent error={error} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Reference Error')).toBeInTheDocument();
  });

  it('shows technical details on toggle', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('detail test')} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Technical Details'));
    expect(screen.getByText('Error Message')).toBeInTheDocument();
    expect(screen.getByText('Stack Trace')).toBeInTheDocument();
  });

  it('shows auto recovery info for retryable errors', () => {
    const error = new Error('Failed to fetch');
    render(
      <ErrorBoundary>
        <ThrowingComponent error={error} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Auto Recovery')).toBeInTheDocument();
  });
});

describe('MessagingErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <MessagingErrorBoundary>
        <div>Chat works</div>
      </MessagingErrorBoundary>
    );
    expect(screen.getByText('Chat works')).toBeInTheDocument();
  });

  it('renders messaging-specific fallback on error', () => {
    render(
      <MessagingErrorBoundary>
        <ThrowingComponent error={new Error('chat broke')} />
      </MessagingErrorBoundary>
    );
    expect(screen.getByText('Messaging Unavailable')).toBeInTheDocument();
  });
});

describe('WorkflowErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders workflow-specific fallback on error', () => {
    render(
      <WorkflowErrorBoundary>
        <ThrowingComponent error={new Error('workflow broke')} />
      </WorkflowErrorBoundary>
    );
    expect(screen.getByText('Workflow Engine Error')).toBeInTheDocument();
  });
});

describe('CollaborationErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders collaboration-specific fallback on error', () => {
    render(
      <CollaborationErrorBoundary>
        <ThrowingComponent error={new Error('collab broke')} />
      </CollaborationErrorBoundary>
    );
    expect(screen.getByText('Collaboration Features Limited')).toBeInTheDocument();
  });
});
