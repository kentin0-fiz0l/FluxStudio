/**
 * Admin Users Page Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@/components/LazyImage', () => ({
  LazyImage: ({ alt }: any) => <img alt={alt} data-testid="lazy-image" />,
}));

import { AdminUsers } from '../admin/Users';

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>
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

  test('displays user data in table', () => {
    renderPage();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
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

  test('search filters users by name', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  test('displays status filter dropdown', () => {
    renderPage();
    expect(screen.getByText('All Users')).toBeInTheDocument();
  });

  test('displays select all checkbox', () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  test('selecting a user shows bulk actions', () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is select-all; click one of the user checkboxes
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('Enable')).toBeInTheDocument();
    expect(screen.getByText('Disable')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('displays pagination info', () => {
    renderPage();
    expect(screen.getByText(/Showing 1 to/)).toBeInTheDocument();
  });
});
