/**
 * NotFound Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { NotFound } from '../NotFound';

describe('NotFound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (path = '/some-nonexistent-page') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <NotFound />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  test('displays 404 text', () => {
    renderPage();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  test('displays description message', () => {
    renderPage();
    expect(
      screen.getByText("The page you're looking for doesn't exist or has been moved.")
    ).toBeInTheDocument();
  });

  test('displays quick action buttons', () => {
    renderPage();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  test('displays quick links section', () => {
    renderPage();
    expect(screen.getByText('Quick Links')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('displays contact support link', () => {
    renderPage();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  test('displays the attempted path', () => {
    renderPage('/some-nonexistent-page');
    expect(screen.getByText('/some-nonexistent-page')).toBeInTheDocument();
  });
});
