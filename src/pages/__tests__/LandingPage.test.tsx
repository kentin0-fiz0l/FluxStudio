/**
 * LandingPage (Composed) Tests
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

vi.mock('../../components/SEOHead', () => ({
  SEOHead: () => null,
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
  useInView: () => true,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0, on: () => vi.fn() }),
  useSpring: () => ({ on: () => vi.fn() }),
}));

import LandingPage from '../landing/LandingPage';

describe('LandingPage (composed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    const headings = screen.queryAllByText(/FluxStudio/);
    expect(headings.length).toBeGreaterThan(0);
  });

  test('renders header from EditorialLanding', () => {
    renderPage();
    const navLinks = screen.getAllByText('Features');
    expect(navLinks.length).toBeGreaterThan(0);
  });

  test('renders hero from EditorialLanding', () => {
    renderPage();
    expect(screen.getByText('Design in Motion.')).toBeInTheDocument();
    // 'Collaboration' and 'Elevated.' may appear in multiple sections
    const collabTexts = screen.getAllByText('Collaboration');
    expect(collabTexts.length).toBeGreaterThan(0);
    const elevatedTexts = screen.getAllByText('Elevated.');
    expect(elevatedTexts.length).toBeGreaterThan(0);
  });

  test('renders features from BoldLanding (bento grid)', () => {
    renderPage();
    expect(screen.getByText('Everything You Need to Create')).toBeInTheDocument();
  });

  test('renders pricing from MinimalistLanding (comparison table)', () => {
    renderPage();
    expect(screen.getByText('Simple, Transparent')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  test('renders testimonials', () => {
    renderPage();
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
  });

  test('renders CTA footer', () => {
    renderPage();
    const readyTexts = screen.getAllByText(/Ready to Transform/);
    expect(readyTexts.length).toBeGreaterThan(0);
  });

  test('has main content landmark', () => {
    renderPage();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
