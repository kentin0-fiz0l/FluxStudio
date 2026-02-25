/**
 * BoldLanding Page Tests
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

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'div' || prop === 'section' || prop === 'header' || prop === 'p' || prop === 'h1' || prop === 'h2' || prop === 'button') {
          return ({ children, ...props }: any) => {
            const { initial, animate, whileInView, whileHover, whileTap, variants, viewport, style, transition, custom, ...rest } = props;
            const Tag = typeof prop === 'string' ? prop : 'div';
            return <Tag {...rest}>{children}</Tag>;
          };
        }
        return undefined;
      },
    }
  ) as any,
  useScroll: () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } }),
  useTransform: () => '0',
  useInView: () => true,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0, on: () => vi.fn() }),
  useSpring: () => ({ on: () => vi.fn() }),
}));

import BoldLanding from '../landing/BoldLanding';

describe('BoldLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <BoldLanding />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    const headings = screen.queryAllByText(/FLUXSTUDIO|FluxStudio/);
    expect(headings.length).toBeGreaterThan(0);
  });

  test('displays skip link', () => {
    renderPage();
    expect(screen.getByTestId('skip-link')).toBeInTheDocument();
  });

  test('displays hero heading', () => {
    renderPage();
    expect(screen.getByText('Design in')).toBeInTheDocument();
    expect(screen.getByText('Motion')).toBeInTheDocument();
  });

  test('displays navigation links', () => {
    renderPage();
    const featureLinks = screen.getAllByText('Features');
    expect(featureLinks.length).toBeGreaterThan(0);
  });

  test('displays CTA buttons', () => {
    renderPage();
    const ctaButtons = screen.getAllByText('Start Free Trial');
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  test('displays features section', () => {
    renderPage();
    expect(screen.getByText('Everything You Need to Create')).toBeInTheDocument();
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

  test('displays footer with copyright', () => {
    renderPage();
    expect(screen.getByText(/2026 FluxStudio/)).toBeInTheDocument();
  });
});
