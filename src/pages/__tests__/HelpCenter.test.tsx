/**
 * HelpCenter Page Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/content/help-articles', () => ({
  searchArticles: vi.fn((query: string) => {
    if (query === 'billing') {
      return [{ id: '1', slug: 'billing-payments', title: 'Billing & Payments', summary: 'Manage billing', category: 'Billing', readingTime: 5 }];
    }
    return [];
  }),
  helpArticles: [
    { id: '1', slug: 'getting-started', title: 'Getting Started', summary: 'Learn the basics', category: 'Getting Started', readingTime: 3 },
    { id: '2', slug: 'billing-payments', title: 'Billing & Payments', summary: 'Manage billing', category: 'Billing', readingTime: 5 },
  ],
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { HelpCenter } from '../HelpCenter';

describe('HelpCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <HelpCenter />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('How can we help you?')).toBeInTheDocument();
  });

  test('renders inside dashboard layout', () => {
    renderPage();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search for help...')).toBeInTheDocument();
  });

  test('displays frequently asked questions section', () => {
    renderPage();
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  test('displays browse by category section', () => {
    renderPage();
    expect(screen.getByText('Browse by Category')).toBeInTheDocument();
  });

  test('displays category titles', () => {
    renderPage();
    // Category titles may appear in multiple locations (FAQ + category grid)
    expect(screen.getAllByText('Getting Started').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Projects').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Collaboration').length).toBeGreaterThanOrEqual(1);
  });

  test('displays contact support section', () => {
    renderPage();
    expect(screen.getByText('Still need help?')).toBeInTheDocument();
    expect(screen.getByText('Contact Support')).toBeInTheDocument();
  });

  test('updates search query on input', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search for help...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'billing' } });
    expect(searchInput.value).toBe('billing');
  });
});
