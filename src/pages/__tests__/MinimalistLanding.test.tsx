/**
 * MinimalistLanding Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/Logo3D', () => ({
  Logo3D: ({ variant }: any) => <div data-testid="logo-3d" data-variant={variant} />,
}));

vi.mock('@/components/ui/SkipLink', () => ({
  SkipLink: ({ href }: any) => <a href={href} data-testid="skip-link">Skip to content</a>,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        return ({ children, ...props }: any) => {
          const { initial, animate, whileInView, whileHover, whileTap, variants, viewport, style, transition, custom, ...rest } = props;
          const Tag = typeof prop === 'string' ? prop : 'div';
          return <Tag {...rest}>{children}</Tag>;
        };
      },
    }
  ) as any,
  useScroll: () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } }),
  useTransform: () => '0',
}));

import MinimalistLanding from '../landing/MinimalistLanding';

describe('MinimalistLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <MinimalistLanding />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    const headings = screen.queryAllByText(/FluxStudio/);
    expect(headings.length).toBeGreaterThan(0);
  });

  test('displays skip link', () => {
    renderPage();
    expect(screen.getByTestId('skip-link')).toBeInTheDocument();
  });

  test('displays hero heading', () => {
    renderPage();
    expect(screen.getByText('Design in Motion')).toBeInTheDocument();
  });

  test('displays navigation links', () => {
    renderPage();
    const featureLinks = screen.getAllByText('Features');
    expect(featureLinks.length).toBeGreaterThan(0);
  });

  test('displays login and CTA buttons', () => {
    renderPage();
    const loginButtons = screen.getAllByText('Login');
    expect(loginButtons.length).toBeGreaterThan(0);
    const ctaButtons = screen.getAllByText('Start Free Trial');
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  test('displays stats', () => {
    renderPage();
    expect(screen.getByText('10K+')).toBeInTheDocument();
    expect(screen.getByText('50K+')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
  });

  test('displays features section', () => {
    renderPage();
    expect(screen.getByText('Everything You Need')).toBeInTheDocument();
    expect(screen.getByText('Design Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Smart File Management')).toBeInTheDocument();
  });

  test('displays use cases section', () => {
    renderPage();
    expect(screen.getByText('Built for Every Creative')).toBeInTheDocument();
    expect(screen.getByText('For Design Teams')).toBeInTheDocument();
    expect(screen.getByText('For Agencies')).toBeInTheDocument();
    expect(screen.getByText('For Freelancers')).toBeInTheDocument();
  });

  test('displays testimonials section', () => {
    renderPage();
    expect(screen.getByText('Loved by Creatives')).toBeInTheDocument();
    // Testimonial names are inside a <footer> with other text, so use a substring match
    expect(screen.getByText(/Sarah Chen/)).toBeInTheDocument();
  });

  test('displays pricing comparison table', () => {
    renderPage();
    expect(screen.getByText('Simple, Transparent')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
  });

  test('displays CTA footer', () => {
    renderPage();
    const readyTexts = screen.getAllByText(/Ready to Transform/);
    expect(readyTexts.length).toBeGreaterThan(0);
  });

  test('displays footer with legal links', () => {
    renderPage();
    expect(screen.getByText(/2026 FluxStudio/)).toBeInTheDocument();
    const privacyLinks = screen.getAllByText('Privacy');
    expect(privacyLinks.length).toBeGreaterThan(0);
  });
});
