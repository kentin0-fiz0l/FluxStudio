/**
 * SharedFormation Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/formationsApi', () => ({
  fetchSharedFormation: vi.fn().mockRejectedValue(new Error('Not found')),
}));

vi.mock('../components/SEOHead', () => ({
  SEOHead: () => <div data-testid="seo-head" />,
}));

vi.mock('../services/analytics/eventTracking', () => ({
  eventTracker: {
    trackEvent: vi.fn(),
  },
}));

vi.mock('../components/formation/Formation3DView', () => ({
  Formation3DView: () => <div data-testid="formation-3d-view" />,
}));

import SharedFormation from '../SharedFormation';

describe('SharedFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (formationId = 'shared-123') =>
    render(
      <MemoryRouter initialEntries={[`/share/${formationId}`]}>
        <Routes>
          <Route path="/share/:formationId" element={<SharedFormation />} />
        </Routes>
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    const { container } = renderPage();
    expect(container.firstChild).toBeTruthy();
  });

  test('shows formation not found on error', async () => {
    renderPage();
    expect(await screen.findByText('Formation Not Found')).toBeInTheDocument();
  });

  test('shows retry button on error', async () => {
    renderPage();
    expect(await screen.findByText('Retry')).toBeInTheDocument();
  });

  test('shows go to FluxStudio button on error', async () => {
    renderPage();
    expect(await screen.findByText('Go to FluxStudio')).toBeInTheDocument();
  });

  test('displays error message text', async () => {
    renderPage();
    expect(
      await screen.findByText('This formation is not available or the link has expired.')
    ).toBeInTheDocument();
  });
});
