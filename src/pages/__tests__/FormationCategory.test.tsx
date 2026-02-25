/**
 * FormationCategory Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/components/SEOHead', () => ({
  SEOHead: () => <div data-testid="seo-head" />,
}));

import FormationCategory from '../FormationCategory';

describe('FormationCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (category = 'marching-band') =>
    render(
      <MemoryRouter initialEntries={[`/formations/${category}`]}>
        <Routes>
          <Route path="/formations/:category" element={<FormationCategory />} />
        </Routes>
      </MemoryRouter>
    );

  test('renders without crashing for marching-band category', () => {
    renderPage('marching-band');
    expect(screen.getByText('Marching Band Formation Designer')).toBeInTheDocument();
  });

  test('displays category not found for invalid category', () => {
    renderPage('invalid-category');
    expect(screen.getByText('Category not found')).toBeInTheDocument();
    expect(screen.getByText('Back to home')).toBeInTheDocument();
  });

  test('displays template gallery for marching-band', () => {
    renderPage('marching-band');
    expect(screen.getByText('Popular Marching Band Formations')).toBeInTheDocument();
    expect(screen.getByText('Company Front')).toBeInTheDocument();
    expect(screen.getByText('Wedge')).toBeInTheDocument();
    expect(screen.getByText('Diamond')).toBeInTheDocument();
  });

  test('displays FAQ section', () => {
    renderPage('marching-band');
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('How many performers can I add?')).toBeInTheDocument();
  });

  test('displays navigation links', () => {
    renderPage('marching-band');
    expect(screen.getByText('Flux Studio')).toBeInTheDocument();
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getByText('Sign up free')).toBeInTheDocument();
  });

  test('displays CTA buttons', () => {
    renderPage('marching-band');
    const tryLinks = screen.queryAllByText(/Try it free|Start designing now|Open the editor/);
    expect(tryLinks.length).toBeGreaterThan(0);
  });

  test('renders dance-team category correctly', () => {
    renderPage('dance-team');
    expect(screen.getByText('Dance Team Formation Planner')).toBeInTheDocument();
    expect(screen.getByText('V-Formation')).toBeInTheDocument();
  });

  test('renders drum-corps category correctly', () => {
    renderPage('drum-corps');
    expect(screen.getByText('Drum Corps Drill Design Tool')).toBeInTheDocument();
    expect(screen.getByText('Gate Turn')).toBeInTheDocument();
  });
});
