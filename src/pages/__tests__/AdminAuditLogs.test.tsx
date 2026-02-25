/**
 * Admin Audit Logs Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));

vi.mock('@/config/environment', () => ({
  buildApiUrl: (path: string) => `http://localhost:3001${path}`,
  config: { API_TIMEOUT: 30000 },
}));

import { apiService } from '@/services/apiService';

const mockLogsResponse = {
  success: true,
  data: {
    logs: [
      {
        id: 'log-1',
        timestamp: '2026-02-20T10:30:00Z',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        action: 'login',
        resourceType: 'session',
        resourceId: 'session-1',
        details: 'User logged in',
        ip: '192.168.1.1',
      },
      {
        id: 'log-2',
        timestamp: '2026-02-20T11:00:00Z',
        userId: 'user-2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        action: 'create',
        resourceType: 'project',
        resourceId: 'proj-1',
        details: 'Created project',
        ip: '192.168.1.2',
      },
    ],
    pagination: { total: 2, page: 1, limit: 50 },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiService.get).mockReset();
  vi.mocked(apiService.get).mockResolvedValue(mockLogsResponse);
  localStorage.setItem('accessToken', 'test-token');
});

import { AdminAuditLogs } from '../admin/AuditLogs';

describe('AdminAuditLogs', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminAuditLogs />
      </MemoryRouter>
    );

  test('renders without crashing', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Audit Logs');
  });

  test('displays page description', () => {
    renderPage();
    expect(
      screen.getByText('Track all activities and changes across your organization.')
    ).toBeInTheDocument();
  });

  test('displays breadcrumb navigation', () => {
    renderPage();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  test('displays refresh button', () => {
    renderPage();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  test('displays export button', () => {
    renderPage();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  test('displays table column headers', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Resource')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('IP Address')).toBeInTheDocument();
    });
  });

  test('fetches logs on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalledWith(
        '/admin/audit-logs',
        expect.objectContaining({
          params: expect.objectContaining({
            page: '1',
            limit: '50',
          }),
        })
      );
    });
  });

  test('displays fetched log data', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  test('displays search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument();
  });

  test('displays category filter dropdown', () => {
    renderPage();
    expect(screen.getByText('All Events')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
  });

  test('search input can be updated', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    expect(searchInput).toHaveValue('john');
  });

  test('displays date range inputs', () => {
    renderPage();
    const dateInputs = screen.getAllByDisplayValue('');
    const dateFields = dateInputs.filter(
      (el) => el.getAttribute('type') === 'date'
    );
    expect(dateFields.length).toBe(2);
  });
});
