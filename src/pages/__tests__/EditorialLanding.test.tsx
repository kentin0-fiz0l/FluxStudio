/**
 * EditorialLanding Page Tests
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
  useInView: () => true,
  useMotionValue: () => ({ set: vi.fn(), get: () => 0, on: () => vi.fn() }),
  useSpring: () => ({ on: () => vi.fn() }),
}));

import EditorialLanding from '../landing/EditorialLanding';

describe('EditorialLanding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <EditorialLanding />
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

  test('displays hero lines', () => {
    renderPage();
    expect(screen.getByText('Design in Motion.')).toBeInTheDocument();
    expect(screen.getByText('Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Elevated.')).toBeInTheDocument();
  });

  test('displays navigation links', () => {
    renderPage();
    const featureLinks = screen.getAllByText('Features');
    expect(featureLinks.length).toBeGreaterThan(0);
  });

  test('displays CTA buttons in hero', () => {
    renderPage();
    const trialButtons = screen.getAllByText('Start Free Trial');
    expect(trialButtons.length).toBeGreaterThan(0);
    const editorLinks = screen.getAllByText('Try the Editor');
    expect(editorLinks.length).toBeGreaterThan(0);
  });

  test('displays stats', () => {
    renderPage();
    expect(screen.getByText('10K+')).toBeInTheDocument();
    expect(screen.getByText('50K+')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
  });

  test('displays features section with heading', () => {
    renderPage();
    expect(screen.getByText('Everything You Need to Create')).toBeInTheDocument();
  });

  test('displays all feature cards', () => {
    renderPage();
    expect(screen.getByText('Design Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Smart File Management')).toBeInTheDocument();
    expect(screen.getByText('Team Communication')).toBeInTheDocument();
    expect(screen.getByText('Workflow Automation')).toBeInTheDocument();
    expect(screen.getByText('Project Analytics')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Security')).toBeInTheDocument();
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
    expect(screen.getByText('Michael Torres')).toBeInTheDocument();
    expect(screen.getByText('Emily Johnson')).toBeInTheDocument();
  });

  test('displays pricing section', () => {
    renderPage();
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
  });

  test('displays CTA footer section', () => {
    renderPage();
    const readyTexts = screen.getAllByText(/Ready to Transform/);
    expect(readyTexts.length).toBeGreaterThan(0);
  });

  test('displays footer with copyright', () => {
    renderPage();
    expect(screen.getByText(/FluxStudio. All rights reserved/)).toBeInTheDocument();
  });

  test('displays footer legal links', () => {
    renderPage();
    const privacyLinks = screen.getAllByText('Privacy');
    const termsLinks = screen.getAllByText('Terms');
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(termsLinks.length).toBeGreaterThan(0);
  });
});
