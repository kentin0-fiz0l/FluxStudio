/**
 * TemplateLibrary Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/SEOHead', () => ({
  SEOHead: () => <div data-testid="seo-head" />,
}));

vi.mock('@/components/ui/UniversalEmptyState', () => ({
  UniversalEmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/services/formationTemplates/registry', () => ({
  templateRegistry: {
    getAllTemplates: vi.fn(() => [
      {
        id: 'wedge',
        name: 'Wedge',
        description: 'V-shaped formation',
        category: 'basic',
        tags: ['basic', 'wedge'],
        parameters: { minPerformers: 4, maxPerformers: 20 },
        generate: vi.fn(),
      },
      {
        id: 'diamond',
        name: 'Diamond',
        description: 'Diamond shape formation',
        category: 'intermediate',
        tags: ['intermediate', 'diamond'],
        parameters: { minPerformers: 8, maxPerformers: 24 },
        generate: vi.fn(),
      },
    ]),
    getCategories: vi.fn(() => [
      { category: 'basic', count: 1 },
      { category: 'intermediate', count: 1 },
    ]),
    scaleTemplateForPerformers: vi.fn(() => []),
  },
}));

import TemplateLibrary from '../TemplateLibrary';

describe('TemplateLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <TemplateLibrary />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Formation Template Library')).toBeInTheDocument();
  });

  test('displays search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
  });

  test('displays template cards', () => {
    renderPage();
    expect(screen.getByText('Wedge')).toBeInTheDocument();
    expect(screen.getByText('Diamond')).toBeInTheDocument();
  });

  test('displays category filter buttons', () => {
    renderPage();
    const allButton = screen.getByText('All (2)');
    expect(allButton).toBeInTheDocument();
  });

  test('displays navigation links', () => {
    renderPage();
    expect(screen.getByText('Flux Studio')).toBeInTheDocument();
    expect(screen.getByText('Try Editor')).toBeInTheDocument();
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  test('displays results count', () => {
    renderPage();
    expect(screen.getByText('2 templates')).toBeInTheDocument();
  });

  test('displays bottom CTA section', () => {
    renderPage();
    expect(screen.getByText('Ready to build your formation?')).toBeInTheDocument();
    expect(screen.getByText('Open the editor')).toBeInTheDocument();
  });

  test('displays sort dropdown', () => {
    renderPage();
    const sortSelect = screen.getByDisplayValue('Sort by name');
    expect(sortSelect).toBeInTheDocument();
  });
});
