/**
 * Admin Users Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@/components/LazyImage', () => ({
  LazyImage: ({ alt }: any) => <img alt={alt} data-testid="lazy-image" />,
}));

// Mock apiService to return test users
vi.mock('@/services/apiService', () => {
  const testUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', lastActive: '2 min ago', joined: 'Jan 15, 2024' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'manager', status: 'active', lastActive: '1 hour ago', joined: 'Feb 3, 2024' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'member', status: 'active', lastActive: '3 hours ago', joined: 'Feb 10, 2024' },
    { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', role: 'member', status: 'inactive', lastActive: '2 weeks ago', joined: 'Mar 1, 2024' },
    { id: '5', name: 'Tom Brown', email: 'tom@example.com', role: 'viewer', status: 'pending', lastActive: 'Never', joined: 'Mar 15, 2024' },
  ];
  return {
    apiService: {
      get: vi.fn().mockResolvedValue({
        success: true,
        data: { users: testUsers, total: testUsers.length, page: 1, limit: 10 },
      }),
      post: vi.fn().mockResolvedValue({ success: true, data: {} }),
      patch: vi.fn().mockResolvedValue({ success: true, data: {} }),
      delete: vi.fn().mockResolvedValue({ success: true }),
    },
  };
});

vi.mock('@/config/environment', () => ({
  buildApiUrl: vi.fn((endpoint: string) => `/api${endpoint}`),
  config: { API_TIMEOUT: 30000, API_BASE_URL: '/api' },
}));

import { AdminUsers } from '../admin/Users';

describe('AdminUsers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminUsers />
        </MemoryRouter>
      </QueryClientProvider>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  test('displays page description', () => {
    renderPage();
    expect(
      screen.getByText('Manage user accounts, roles, and permissions.')
    ).toBeInTheDocument();
  });

  test('displays breadcrumb navigation', () => {
    renderPage();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  test('displays Add User button', () => {
    renderPage();
    expect(screen.getByText('Add User')).toBeInTheDocument();
  });

  test('displays Export button', () => {
    renderPage();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  test('displays user data in table after loading', async () => {
    renderPage();
    // Data loads async via useQuery, wait for it
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  test('displays table column headers', () => {
    renderPage();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Last Active')).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
  });

  test('displays search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  test('displays status filter dropdown', () => {
    renderPage();
    expect(screen.getByText('All Users')).toBeInTheDocument();
  });

  test('displays select all checkbox', async () => {
    renderPage();
    // Wait for data to load
    await screen.findByText('John Doe');
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  test('displays pagination info', async () => {
    renderPage();
    // Wait for data to load
    await screen.findByText('John Doe');
    expect(screen.getByText(/Showing 1 to/)).toBeInTheDocument();
  });

  test('selecting a user shows bulk actions', async () => {
    renderPage();
    // Wait for data to load
    await screen.findByText('John Doe');
    const { fireEvent } = await import('@testing-library/react');
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is select-all; click one of the user checkboxes
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('Enable')).toBeInTheDocument();
    expect(screen.getByText('Disable')).toBeInTheDocument();
  });

  test('search filters via API query', async () => {
    renderPage();
    const { fireEvent } = await import('@testing-library/react');
    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    // Search updates the query - the input value should be set
    expect(searchInput).toHaveValue('John');
  });
});
