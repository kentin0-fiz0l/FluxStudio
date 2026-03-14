/**
 * TemplateDetail Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/components/SEOHead', () => ({
  SEOHead: ({ title, description, canonicalUrl }: any) => (
    <div
      data-testid="seo-head"
      data-title={title}
      data-description={description}
      data-canonical={canonicalUrl}
    />
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/services/analytics/eventTracking', () => ({
  eventTracker: { trackEvent: vi.fn() },
}));

const mockWedge = {
  id: 'wedge',
  name: 'Wedge Formation',
  description: 'A V-shaped formation for marching drills',
  category: 'basic' as const,
  tags: ['basic', 'wedge', 'marching'],
  parameters: { minPerformers: 4, maxPerformers: 20, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  performers: [],
  keyframes: [],
  author: 'FluxStudio',
  version: '1.0.0',
  createdAt: '2025-01-01',
};

const mockDiamond = {
  id: 'diamond',
  name: 'Diamond Formation',
  description: 'Diamond shape formation',
  category: 'basic' as const,
  tags: ['basic', 'diamond'],
  parameters: { minPerformers: 8, maxPerformers: 24, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  performers: [],
  keyframes: [],
};

const mockAdvanced = {
  id: 'starburst',
  name: 'Starburst',
  description: 'Radial starburst pattern',
  category: 'advanced' as const,
  tags: ['advanced'],
  parameters: { minPerformers: 12, scalable: true, reversible: true, mirrorable: true, rotatable: true },
  performers: [],
  keyframes: [],
};

const allTemplates = [mockWedge, mockDiamond, mockAdvanced];

vi.mock('@/services/formationTemplates/registry', () => ({
  templateRegistry: {
    getTemplate: vi.fn((id: string) => allTemplates.find(t => t.id === id)),
    getAllTemplates: vi.fn(() => allTemplates),
    scaleTemplateForPerformers: vi.fn(() => [
      { x: 30, y: 50 },
      { x: 50, y: 30 },
      { x: 70, y: 50 },
    ]),
  },
}));

import TemplateDetail from '../TemplateDetail';
import { eventTracker } from '@/services/analytics/eventTracking';

describe('TemplateDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock canvas getContext for DetailPreview
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    })) as any;
  });

  const renderWithRoute = (templateId: string) =>
    render(
      <MemoryRouter initialEntries={[`/templates/${templateId}`]}>
        <Routes>
          <Route path="/templates/:templateId" element={<TemplateDetail />} />
        </Routes>
      </MemoryRouter>
    );

  // ---------- Valid template rendering ----------

  test('renders template name and description', () => {
    renderWithRoute('wedge');
    expect(screen.getByText('Wedge Formation')).toBeInTheDocument();
    expect(screen.getByText('A V-shaped formation for marching drills')).toBeInTheDocument();
  });

  test('renders SEOHead with correct props', () => {
    renderWithRoute('wedge');
    const seo = screen.getByTestId('seo-head');
    expect(seo.dataset.title).toBe('Wedge Formation - Formation Template');
    expect(seo.dataset.description).toBe('A V-shaped formation for marching drills');
    expect(seo.dataset.canonical).toBe('https://fluxstudio.art/templates/wedge');
  });

  test('renders category badge', () => {
    renderWithRoute('wedge');
    // 'Basic' appears on the main template badge and also on related templates
    const badges = screen.getAllByText('Basic');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  test('renders performer count range', () => {
    renderWithRoute('wedge');
    expect(screen.getByText(/4.*20.*performers/)).toBeInTheDocument();
  });

  test('renders tags', () => {
    renderWithRoute('wedge');
    expect(screen.getByText('#basic')).toBeInTheDocument();
    expect(screen.getByText('#wedge')).toBeInTheDocument();
    expect(screen.getByText('#marching')).toBeInTheDocument();
  });

  test('tracks template_detail_view event', () => {
    renderWithRoute('wedge');
    expect(eventTracker.trackEvent).toHaveBeenCalledWith('template_detail_view', {
      templateId: 'wedge',
      templateName: 'Wedge Formation',
    });
  });

  // ---------- CTA buttons ----------

  test('renders "Use this template" CTA linking to editor', () => {
    renderWithRoute('wedge');
    const cta = screen.getByText('Use this template');
    expect(cta).toBeInTheDocument();
    expect(cta.closest('a')).toHaveAttribute('href', '/try?template=wedge');
  });

  test('renders "Sign up free to save" CTA', () => {
    renderWithRoute('wedge');
    const signupCta = screen.getByText('Sign up free to save');
    expect(signupCta).toBeInTheDocument();
    expect(signupCta.closest('a')).toHaveAttribute('href', '/signup');
  });

  // ---------- Navigation ----------

  test('renders back link to template library', () => {
    renderWithRoute('wedge');
    const backLink = screen.getByText('All templates');
    expect(backLink.closest('a')).toHaveAttribute('href', '/templates');
  });

  test('renders top nav links', () => {
    renderWithRoute('wedge');
    expect(screen.getByText('Flux Studio')).toBeInTheDocument();
    expect(screen.getByText('Try Editor')).toBeInTheDocument();
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getByText('Sign up free')).toBeInTheDocument();
  });

  // ---------- Related templates ----------

  test('renders related templates from same category', () => {
    renderWithRoute('wedge');
    // Diamond is also 'basic' category, so it should appear as related
    expect(screen.getByText('Diamond Formation')).toBeInTheDocument();
  });

  test('does not show current template in related list', () => {
    renderWithRoute('wedge');
    // The heading shows "Wedge Formation" but the related list should not include a second link for it
    const relatedSection = screen.getByText('Related templates');
    expect(relatedSection).toBeInTheDocument();
    // There should be exactly one card in related (Diamond), not Wedge again
    const links = screen.getAllByText('Diamond Formation');
    expect(links).toHaveLength(1);
  });

  test('does not show related templates when none share the category', () => {
    renderWithRoute('starburst');
    // starburst is 'advanced' and no other template shares that category
    expect(screen.queryByText('Related templates')).not.toBeInTheDocument();
  });

  // ---------- Invalid template / not found ----------

  test('renders not-found state for invalid template ID', () => {
    renderWithRoute('nonexistent');
    expect(screen.getByText('Template not found')).toBeInTheDocument();
    expect(
      screen.getByText(/doesn't exist or has been removed/)
    ).toBeInTheDocument();
  });

  test('renders back-to-templates link in not-found state', () => {
    renderWithRoute('nonexistent');
    const backLink = screen.getByText('Back to templates');
    expect(backLink.closest('a')).toHaveAttribute('href', '/templates');
  });

  test('does not track event for invalid template', () => {
    renderWithRoute('nonexistent');
    expect(eventTracker.trackEvent).not.toHaveBeenCalled();
  });
});
