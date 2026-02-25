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

  test('renders color-guard category correctly', () => {
    renderPage('color-guard');
    expect(screen.getByText('Color Guard Formation Designer')).toBeInTheDocument();
    expect(screen.getByText('Flag Line')).toBeInTheDocument();
  });

  test('renders winter-guard category correctly', () => {
    renderPage('winter-guard');
    expect(screen.getByText('Winter Guard Formation Planner')).toBeInTheDocument();
    expect(screen.getByText('Floor Spread')).toBeInTheDocument();
  });

  test('renders indoor-drumline category correctly', () => {
    renderPage('indoor-drumline');
    expect(screen.getByText('Indoor Drumline Formation Tool')).toBeInTheDocument();
    expect(screen.getByText('Battery Arc')).toBeInTheDocument();
  });

  test('renders cheerleading category correctly', () => {
    renderPage('cheerleading');
    expect(screen.getByText('Cheerleading Formation Builder')).toBeInTheDocument();
    expect(screen.getByText('Pyramid Base')).toBeInTheDocument();
  });

  test('renders pep-band category correctly', () => {
    renderPage('pep-band');
    expect(screen.getByText('Pep Band Formation Planner')).toBeInTheDocument();
    expect(screen.getByText('Bleacher Layout')).toBeInTheDocument();
  });

  test('renders drill-team category correctly', () => {
    renderPage('drill-team');
    expect(screen.getByText('Drill Team Formation Designer')).toBeInTheDocument();
    expect(screen.getByText('Kick Line')).toBeInTheDocument();
  });

  test('displays visible breadcrumb navigation', () => {
    renderPage('marching-band');
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Formations')).toBeInTheDocument();
    expect(screen.getByText('Marching Band Formations')).toBeInTheDocument();
  });
});
