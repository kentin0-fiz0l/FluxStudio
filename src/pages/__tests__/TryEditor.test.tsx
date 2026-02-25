/**
 * TryEditor Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/formation', () => ({
  FormationCanvas: ({ sandboxMode }: any) => (
    <div data-testid="formation-canvas" data-sandbox={sandboxMode}>
      Formation Canvas
    </div>
  ),
}));

vi.mock('@/components/error/ErrorBoundary', () => ({
  FormationEditorErrorBoundary: ({ children }: any) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

vi.mock('@/components/SEOHead', () => ({
  SEOHead: () => <div data-testid="seo-head" />,
}));

vi.mock('@/services/analytics/eventTracking', () => ({
  eventTracker: {
    trackEvent: vi.fn(),
  },
}));

import TryEditor from '../TryEditor';

describe('TryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <TryEditor />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('formation-canvas')).toBeInTheDocument();
  });

  test('displays formation canvas in sandbox mode', () => {
    renderPage();
    const canvas = screen.getByTestId('formation-canvas');
    expect(canvas).toHaveAttribute('data-sandbox', 'true');
  });

  test('wraps canvas in error boundary', () => {
    renderPage();
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  test('displays sign up banner', () => {
    renderPage();
    expect(screen.getByText('Sign up free')).toBeInTheDocument();
  });

  test('displays log in link', () => {
    renderPage();
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  test('renders SEO head component', () => {
    renderPage();
    expect(screen.getByTestId('seo-head')).toBeInTheDocument();
  });
});
