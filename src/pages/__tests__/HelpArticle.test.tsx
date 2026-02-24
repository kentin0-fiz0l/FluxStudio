/**
 * HelpArticle Page Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
  getArticleById: vi.fn((id: string) => {
    if (id === 'getting-started') {
      return {
        id: '1',
        slug: 'getting-started',
        title: 'Getting Started with FluxStudio',
        summary: 'Learn the basics of FluxStudio',
        content: '## Welcome\n\nThis guide will help you get started.',
        category: 'Getting Started',
        categoryId: 'getting-started',
        readingTime: 3,
        lastUpdated: '2025-01-15',
      };
    }
    return null;
  }),
  getRelatedArticles: vi.fn(() => [
    {
      id: '2',
      slug: 'creating-first-project',
      title: 'Creating Your First Project',
      summary: 'Step by step guide',
      readingTime: 5,
    },
  ]),
  searchArticles: vi.fn(() => []),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { HelpArticlePage } from '../HelpArticle';

describe('HelpArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (articleId = 'getting-started') => {
    return render(
      <MemoryRouter initialEntries={[`/help/article/${articleId}`]}>
        <Routes>
          <Route path="/help/article/:articleId" element={<HelpArticlePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays article content', () => {
    renderPage();
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  test('displays reading time', () => {
    renderPage();
    expect(screen.getByText('3 min read')).toBeInTheDocument();
  });

  test('displays back to help center link', () => {
    renderPage();
    expect(screen.getByText('Back to Help Center')).toBeInTheDocument();
  });

  test('displays related articles', () => {
    renderPage();
    expect(screen.getByText('Related Articles')).toBeInTheDocument();
    expect(screen.getByText('Creating Your First Project')).toBeInTheDocument();
  });

  test('displays article feedback section', () => {
    renderPage();
    expect(screen.getByText('Was this article helpful?')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  test('shows feedback confirmation when clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Yes'));
    expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument();
  });

  test('displays article not found for invalid id', () => {
    renderPage('nonexistent-article');
    expect(screen.getByText('Article Not Found')).toBeInTheDocument();
  });

  test('displays contact support links', () => {
    renderPage();
    const links = screen.getAllByText('Contact Support');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  test('displays search button', () => {
    renderPage();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });
});
