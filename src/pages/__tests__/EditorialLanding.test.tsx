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

vi.mock('@/components/landing/FeatureVideos', () => {
  const Stub = () => null;
  return {
    CollabAnimation: Stub,
    FileManagementAnimation: Stub,
    TeamChatAnimation: Stub,
    WorkflowAnimation: Stub,
    AnalyticsAnimation: Stub,
    SecurityAnimation: Stub,
    FEATURE_ANIMATIONS: new Proxy({}, { get: () => Stub }),
  };
});

vi.mock('@/components/landing/HeroDemo', () => ({
  HeroDemo: () => <div data-testid="hero-demo" />,
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
  AnimatePresence: ({ children }: any) => <>{children}</>,
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
    expect(screen.getByText('Drill Design.')).toBeInTheDocument();
    expect(screen.getByText('Reimagined.')).toBeInTheDocument();
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
  });

  test('displays stats', () => {
    renderPage();
    expect(screen.getByText('70+')).toBeInTheDocument();
    expect(screen.getByText('Real-Time')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
  });

  test('displays features section with heading', () => {
    renderPage();
    expect(screen.getByText('Everything You Need to Design Your Show')).toBeInTheDocument();
  });

  test('displays all feature cards', () => {
    renderPage();
    expect(screen.getByText('Formation Editor')).toBeInTheDocument();
    expect(screen.getByText('Audio Sync')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Production Sheets')).toBeInTheDocument();
    expect(screen.getByText('Mobile Rehearsal')).toBeInTheDocument();
  });

  test('displays use cases section', () => {
    renderPage();
    expect(screen.getByText('Built for Marching Arts')).toBeInTheDocument();
    expect(screen.getByText('For Band Directors')).toBeInTheDocument();
    expect(screen.getByText('For Drill Writers')).toBeInTheDocument();
  });

  test('displays testimonials section', () => {
    renderPage();
    const testimonialHeading = screen.queryAllByText(/Loved by/);
    expect(testimonialHeading.length).toBeGreaterThan(0);
  });

  test('displays pricing section', () => {
    renderPage();
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
  });

  test('displays CTA footer section', () => {
    renderPage();
    const readyTexts = screen.getAllByText(/Ready to Design/);
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
