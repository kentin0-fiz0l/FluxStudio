/**
 * EmbedFormation Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../services/formationsApi', () => ({
  fetchSharedFormation: vi.fn().mockRejectedValue(new Error('Not found')),
}));

vi.mock('../../../components/formation/Formation3DView', () => ({
  Formation3DView: () => <div data-testid="formation-3d-view" />,
}));

import EmbedFormation from '../EmbedFormation';

describe('EmbedFormation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (formationId = 'test-formation-123') =>
    render(
      <MemoryRouter initialEntries={[`/embed/${formationId}`]}>
        <Routes>
          <Route path="/embed/:formationId" element={<EmbedFormation />} />
        </Routes>
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    const { container } = renderPage();
    expect(container.firstChild).toBeTruthy();
  });

  test('shows error state when formation not available', async () => {
    renderPage();
    expect(await screen.findByText('Formation not available')).toBeInTheDocument();
  });

  test('shows retry button on error', async () => {
    renderPage();
    expect(await screen.findByText('Retry')).toBeInTheDocument();
  });

  test('shows formation not available for invalid formation', async () => {
    renderPage('nonexistent-id');
    expect(await screen.findByText('Formation not available')).toBeInTheDocument();
  });
});
