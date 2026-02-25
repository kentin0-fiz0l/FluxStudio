/**
 * SimpleHomePage Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../components/Logo3D', () => ({
  Logo3D: () => <div data-testid="logo-3d" />,
}));

vi.mock('@/components/ui/SkipLink', () => ({
  SkipLink: ({ href }: any) => <a href={href} data-testid="skip-link">Skip to content</a>,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
}));

import { SimpleHomePage } from '../SimpleHomePage';

describe('SimpleHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <SimpleHomePage />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    const headings = screen.queryAllByText('FluxStudio');
    expect(headings.length).toBeGreaterThan(0);
  });

  test('displays hero heading', () => {
    renderPage();
    expect(screen.getByText('Design in Motion')).toBeInTheDocument();
    expect(screen.getByText('Collaboration Elevated')).toBeInTheDocument();
  });

  test('displays features section', () => {
    renderPage();
    expect(screen.getByText('Everything You Need to Create')).toBeInTheDocument();
    expect(screen.getByText('Design Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Smart File Management')).toBeInTheDocument();
  });

  test('displays testimonials section', () => {
    renderPage();
    expect(screen.getByText('Loved by Creative Teams')).toBeInTheDocument();
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
  });

  test('displays pricing section', () => {
    renderPage();
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  test('displays stats', () => {
    renderPage();
    expect(screen.getByText('10K+')).toBeInTheDocument();
    expect(screen.getByText('50K+')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });

  test('displays CTA section', () => {
    renderPage();
    expect(screen.getByText('Ready to Transform Your Workflow?')).toBeInTheDocument();
  });

  test('displays footer with legal links', () => {
    renderPage();
    const privacyLinks = screen.queryAllByText('Privacy');
    expect(privacyLinks.length).toBeGreaterThan(0);
    const termsLinks = screen.queryAllByText('Terms');
    expect(termsLinks.length).toBeGreaterThan(0);
  });
});
